// Idexal AI Core — provider types
// Defines the unified interface that every LLM provider implements.

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
	role: Role;
	content: string;
}

export interface ToolCall {
	id: string;
	name: string;
	arguments: string; // JSON-encoded
}

export interface AssistantMessage extends Message {
	role: 'assistant';
	toolCalls?: ToolCall[];
}

export interface ToolResultMessage extends Message {
	role: 'user';
	toolCallId: string;
	toolName: string;
}

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>; // JSON Schema
}

export interface ChatRequest {
	messages: Message[];
	tools?: ToolDefinition[];
	model?: string;
	temperature?: number;
	maxTokens?: number;
	stop?: string[];
	/** Optional hook to receive streaming deltas (text and tool calls). */
	onStream?: (delta: StreamDelta) => void;
	signal?: AbortSignal;
}

/**
 * A single streaming event. Providers emit `text` and `toolCall` deltas as
 * tokens arrive; the registry layers `provider` (fallback switches) and
 * `error` events on top so UIs can show live progress.
 */
export type StreamDelta =
	| { type: 'text'; text: string }
	| { type: 'toolCall'; toolCall: ToolCall }
	| { type: 'usage'; usage: TokenUsage }
	| { type: 'provider'; providerId: string; displayName?: string }
	| { type: 'error'; error: string }
	| { type: 'done'; usage?: TokenUsage };

export interface ChatResponse {
	content: string;
	toolCalls?: ToolCall[];
	usage?: TokenUsage;
	model: string;
}

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface ModelCapabilities {
	/** Supports native tool calling (function calling). */
	toolCalling: boolean;
	/** Maximum context window in tokens (approximate). */
	contextWindow: number;
	/** Provider exposes an embeddings endpoint usable for semantic memory. */
	embeddings?: boolean;
}

export interface EmbeddingsRequest {
	/** Text strings to embed. */
	inputs: string[];
	/** Optional model override (e.g. a dedicated embedding model). */
	model?: string;
	signal?: AbortSignal;
}

export interface LLMProvider {
	readonly id: string;
	readonly displayName: string;
	readonly defaultModel: string;
	readonly baseUrl?: string;
	readonly capabilities: ModelCapabilities;
	/** True when the provider works without an API key (local servers, the
	 * anonymous Idexal Cloud tier). Used by the registry to skip keyless
	 * providers when selecting fallbacks. */
	readonly anonymous?: boolean;
	chat(request: ChatRequest): Promise<ChatResponse>;
	/**
	 * Stream a chat request as deltas. Providers may implement this to give
	 * token-level progress; if absent, `chat()` is used (non-streaming).
	 */
	stream?(request: ChatRequest): AsyncGenerator<StreamDelta>;
	/** Embed text inputs (semantic memory). Providers without an embeddings
	 * endpoint omit this. */
	embed?(request: EmbeddingsRequest): Promise<number[][]>;
	/** Estimate model pricing in USD per 1M tokens. */
	estimateCost?(usage: TokenUsage): { input: number; output: number };
}

export function isToolCallingSupported(provider: LLMProvider): boolean {
	return provider.capabilities.toolCalling;
}

/** True for loopback / localhost base URLs (local servers need no key). */
export function isLocalUrl(baseUrl?: string): boolean {
	return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(baseUrl ?? '');
}

export function supportsEmbeddings(provider: LLMProvider): boolean {
	return provider.capabilities.embeddings === true && typeof provider.embed === 'function';
}

export function isRateLimitError(err: unknown): boolean {
	if (err instanceof ProviderError) {
		return err.status === 429;
	}
	return false;
}

export function isRetryableError(err: unknown): boolean {
	if (err instanceof ProviderError) {
		return (
			err.status === 429 ||
			err.status === 500 ||
			err.status === 502 ||
			err.status === 503 ||
			err.status === 504 ||
			err.status >= 500
		);
	}
	// Network errors / timeouts are retryable
	return true;
}

export class ProviderError extends Error {
	readonly status: number;
	readonly providerId: string;
	readonly body: string | undefined;

	constructor(message: string, status: number, providerId: string, body?: string) {
		super(message);
		this.name = 'ProviderError';
		this.status = status;
		this.providerId = providerId;
		this.body = body;
	}
}

export class ProviderNotConfiguredError extends Error {
	constructor(providerId: string) {
		super(`Provider '${providerId}' is not configured (missing API key?)`);
		this.name = 'ProviderNotConfiguredError';
	}
}
