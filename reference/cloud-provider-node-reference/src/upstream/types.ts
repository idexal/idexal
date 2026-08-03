// Idexal Cloud Gateway — upstream adapter types
// Adapters speak the OpenAI wire protocol on the client side (the gateway's
// public surface) and translate to their upstream's native protocol.

import type { UpstreamConfig } from '../config.ts';

/** A completed non-streaming upstream chat response (OpenAI shape). */
export interface UpstreamChatResult {
	status: number;
	/** Raw JSON body to relay (OpenAI-compatible shape). */
	body: unknown;
}

export interface UpstreamChatStreamResult {
	status: number;
	/** The upstream SSE/raw stream; adapter translates chunks on the fly. */
	stream: ReadableStream<Uint8Array>;
}

export interface UpstreamEmbedResult {
	status: number;
	body: unknown;
}

/** Upstream request failure (maps to 502/503 downstream). */
export class UpstreamError extends Error {
	readonly upstreamId: string;
	readonly status: number;

	constructor(message: string, upstreamId: string, status: number) {
		super(message);
		this.upstreamId = upstreamId;
		this.status = status;
	}
}

/** Thrown when an upstream is unusable (no key, not local). */
export class UpstreamUnavailableError extends Error {}

/**
 * An upstream adapter translates the public OpenAI protocol to the
 * upstream's native protocol. All methods must never throw for HTTP
 * error responses — they return status+body so the router can fall back.
 */
export interface UpstreamAdapter {
	readonly config: UpstreamConfig;
	/** Resolve the upstream model name for a public model id. */
	modelFor(publicModel: string): string;
	/** Whether this upstream can currently be used (key present / local). */
	usable(): boolean;
	chat(req: ChatCompletionRequest): Promise<UpstreamChatResult>;
	chatStream(req: ChatCompletionRequest): Promise<UpstreamChatStreamResult>;
	embeddings(req: EmbeddingsRequest): Promise<UpstreamEmbedResult>;
}

/** OpenAI chat request body (as received by the gateway). */
export interface ChatCompletionRequest {
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
	[extra: string]: unknown;
}

export interface EmbeddingsRequest {
	model: string;
	input: string | string[];
	[extra: string]: unknown;
}

/** Parse a JSON body from a Response with a safe fallback. */
export async function readJson(res: Response): Promise<unknown> {
	const text = await res.text().catch(() => '');
	try {
		return JSON.parse(text);
	} catch {
		return { raw: text.slice(0, 500) };
	}
}
