// Idexal Cloud Gateway — OpenAI-compatible upstream adapter
// Passes the client's OpenAI-format request straight to the upstream
// (OpenAI, OpenRouter, Groq, vLLM, Ollama /v1, LM Studio, …) and relays
// the response unchanged, including SSE chunks when streaming.

import type { UpstreamConfig } from '../config.ts';
import { upstreamKey } from '../config.ts';
import {
	readJson,
	type ChatCompletionRequest,
	type EmbeddingsRequest,
	type UpstreamAdapter,
	type UpstreamChatResult,
	type UpstreamChatStreamResult,
	type UpstreamEmbedResult,
} from './types.ts';

export class OpenAiCompatibleAdapter implements UpstreamAdapter {
	readonly config: UpstreamConfig;

	constructor(config: UpstreamConfig) {
		this.config = config;
	}

	modelFor(publicModel: string): string {
		return this.config.modelMap[publicModel] ?? publicModel;
	}

	usable(): boolean {
		return upstreamUsable(this.config);
	}

	private headers(): Record<string, string> {
		const h: Record<string, string> = { 'Content-Type': 'application/json' };
		const key = upstreamKey(this.config);
		if (key) h['Authorization'] = `Bearer ${key}`;
		return h;
	}

	async chat(req: ChatCompletionRequest): Promise<UpstreamChatResult> {
		const body: Record<string, unknown> = {
			...req,
			model: this.modelFor(req.model),
			stream: false,
		};
		try {
			const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
			});
			return { status: res.status, body: await readJson(res) };
		} catch (err) {
			return {
				status: 502,
				body: { error: { message: `Upstream ${this.config.id} unreachable: ${err instanceof Error ? err.message : String(err)}`, type: 'upstream_error' } },
			};
		}
	}

	async chatStream(req: ChatCompletionRequest): Promise<UpstreamChatStreamResult> {
		const body: Record<string, unknown> = {
			...req,
			model: this.modelFor(req.model),
			stream: true,
		};
		try {
			const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
			});
			if (!res.ok || !res.body) {
				return { status: res.status, stream: toStream(readJsonText(res)) };
			}
			return { status: 200, stream: res.body };
		} catch (err) {
			return {
				status: 502,
				stream: toStream(
					Promise.resolve(
						JSON.stringify({ error: { message: `Upstream ${this.config.id} unreachable: ${err instanceof Error ? err.message : String(err)}`, type: 'upstream_error' } }),
					),
				),
			};
		}
	}

	async embeddings(req: EmbeddingsRequest): Promise<UpstreamEmbedResult> {
		const body = { ...req, model: this.config.embeddingModel ?? this.modelFor(req.model) };
		try {
			const res = await fetch(`${this.config.baseUrl}/embeddings`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
			});
			return { status: res.status, body: await readJson(res) };
		} catch (err) {
			return {
				status: 502,
				body: { error: { message: `Upstream ${this.config.id} unreachable: ${err instanceof Error ? err.message : String(err)}`, type: 'upstream_error' } },
			};
		}
	}
}

function upstreamUsable(u: UpstreamConfig): boolean {
	const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u.baseUrl);
	return isLocal || Boolean(upstreamKey(u));
}

async function readJsonText(res: Response): Promise<string> {
	return res.text().catch(() => '');
}

/** Wrap a promise-of-text into a ReadableStream (for error bodies). */
function toStream(textPromise: Promise<string>): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const text = await textPromise;
			controller.enqueue(new TextEncoder().encode(text));
			controller.close();
		},
	});
}
