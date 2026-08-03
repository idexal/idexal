// Idexal Cloud Gateway — router
// Picks an upstream for a request based on the requested model, the
// upstream's model map, and usability (local / keyed). Tries upstreams in
// priority order and falls back when one fails or lacks the model, so a
// busy or missing provider never breaks the client — the gateway itself
// mirrors the resilience the core gets from its own provider fallback.

import type { UpstreamConfig } from './config.ts';
import { getModel, listModels } from './models.ts';
import type { UpstreamAdapter } from './upstream/types.ts';
import { OpenAiCompatibleAdapter } from './upstream/openai.ts';
import { AnthropicAdapter } from './upstream/anthropic.ts';

export class GatewayError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(message: string, status: number, code: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export class Router {
	private readonly adapters: UpstreamAdapter[];

	constructor(upstreams: UpstreamConfig[]) {
		this.adapters = upstreams
			.sort((a, b) => a.priority - b.priority)
			.map((c) => (c.kind === 'anthropic' ? new AnthropicAdapter(c) : new OpenAiCompatibleAdapter(c)));
	}

	/** Public models this router can serve (advertised by /v1/models). */
	advertisedModels(): string[] {
		return listModels().map((m) => m.id);
	}

	/**
	 * Chat request (stream or not) with fallback: try each usable adapter in
	 * priority order; a non-2xx status or unusable adapter moves to the
	 * next. Throws GatewayError(503) when all upstreams fail so the core
	 * falls back to the user's own providers.
	 */
	async chat(req: {
		model: string;
		messages: unknown[];
		stream?: boolean;
		temperature?: number;
		max_tokens?: number;
		maxTokens?: number;
		stop?: string | string[];
		tools?: unknown[];
		tool_choice?: unknown;
		stream_options?: unknown;
	}): Promise<{ status: number; body?: unknown; stream?: ReadableStream<Uint8Array> }> {
		const model = getModel(req.model);
		if (!model) {
			throw new GatewayError(`Unknown model: ${req.model}`, 400, 'unknown_model');
		}
		const errors: string[] = [];
		for (const adapter of this.adapters) {
			if (!adapter.usable()) {
				errors.push(`${adapter.config.id}: unusable`);
				continue;
			}
			if (!adapter.config.modelMap[req.model] && !adapter.config.embeddingModel) {
				errors.push(`${adapter.config.id}: no model for ${req.model}`);
				continue;
			}
			try {
				if (req.stream) {
					const result = await adapter.chatStream({ ...req, model: req.model });
					if (result.status === 200) {
						return { status: 200, stream: result.stream };
					}
					// Non-200 before any chunk — relay the error body but keep
					// trying the next upstream (a 429/503 upstream shouldn't
					// fail the whole gateway when another works).
					const text = await streamToString(result.stream).catch(() => '');
					errors.push(`${adapter.config.id}: HTTP ${result.status} ${trim(text)}`);
					continue;
				}
				const result = await adapter.chat({ ...req, model: req.model });
				if (result.status === 200) {
					return { status: 200, body: result.body };
				}
				errors.push(`${adapter.config.id}: HTTP ${result.status} ${trim(JSON.stringify(result.body))}`);
			} catch (err) {
				errors.push(`${adapter.config.id}: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
		throw new GatewayError(
			`All upstreams failed for "${req.model}": ${errors.join(' | ') || 'no upstreams configured'}`,
			503,
			'upstream_unavailable',
		);
	}

	/** Embeddings request with fallback across adapters that support them. */
	async embeddings(req: { model: string; input: string | string[] }): Promise<{ status: number; body: unknown }> {
		const errors: string[] = [];
		for (const adapter of this.adapters) {
			if (!adapter.usable()) {
				errors.push(`${adapter.config.id}: unusable`);
				continue;
			}
			const result = await adapter.embeddings({ ...req, model: req.model });
			if (result.status === 200) {
				return { status: 200, body: result.body };
			}
			errors.push(`${adapter.config.id}: HTTP ${result.status}`);
		}
		throw new GatewayError(
			`No upstream could serve embeddings for "${req.model}": ${errors.join(' | ') || 'no upstreams configured'}`,
			503,
			'upstream_unavailable',
		);
	}

	health(): { adapters: number; upstreams: string[] } {
		return {
			adapters: this.adapters.length,
			upstreams: this.adapters.map((a) => a.config.id),
		};
	}
}

async function streamToString(s: ReadableStream<Uint8Array>): Promise<string> {
	const reader = s.getReader();
	const decoder = new TextDecoder();
	let out = '';
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		out += decoder.decode(value, { stream: true });
	}
	return out;
}

function trim(s: string): string {
	const t = s.replace(/\s+/g, ' ').trim();
	return t.length > 160 ? t.slice(0, 160) + '…' : t;
}
