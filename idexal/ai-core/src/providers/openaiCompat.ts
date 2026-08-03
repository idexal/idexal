// Idexal AI Core — OpenAI-compatible provider
// Works with any OpenAI-compatible endpoint: OpenAI, OpenRouter, Groq,
// DeepSeek, Mistral, Together, Ollama, LM Studio, vLLM, and any custom base URL.

import { httpJson, bearerToken, truncate } from './http.ts';
import {
	type ChatRequest,
	type ChatResponse,
	type EmbeddingsRequest,
	type LLMProvider,
	type Message,
	type ModelCapabilities,
	type StreamDelta,
	type TokenUsage,
	type ToolCall,
	type ToolDefinition,
	ProviderError,
} from './types.ts';

export interface OpenAiCompatOptions {
	id: string;
	displayName: string;
	baseUrl: string; // e.g. https://api.openai.com/v1 or http://localhost:11434/v1
	apiKey?: string;
	defaultModel: string;
	/** Extra headers merged into every request (custom provider support). */
	headers?: Record<string, string>;
	/** Environment variable that holds the API key (for custom providers). */
	apiKeyEnv?: string;
	capabilities?: Partial<ModelCapabilities>;
	/** Custom OpenAI-format request body fields merged in. */
	extraBody?: Record<string, unknown>;
	/** Optional function to transform a request body before sending. */
	transformRequest?: (body: Record<string, unknown>) => Record<string, unknown>;
	/** Dedicated embeddings model (e.g. text-embedding-3-small). Defaults to defaultModel. */
	embeddingModel?: string;
	/** Request timeout in ms (default 120s). Gateways may be slower. */
	timeoutMs?: number;
	/** True when the endpoint works without an API key (anonymous tier). */
	anonymous?: boolean;
}

interface OpenAiMessage {
	role: string;
	content: string;
	tool_calls?: unknown;
	tool_call_id?: string;
}

interface OpenAiToolCall {
	id: string;
	type: 'function';
	function: { name: string; arguments: string };
}

interface OpenAiResponse {
	id?: string;
	choices: Array<{
		message?: {
			role?: string;
			content?: string | null;
			tool_calls?: OpenAiToolCall[];
		};
		delta?: {
			role?: string;
			content?: string | null;
			tool_calls?: Array<{
				index: number;
				id?: string;
				function?: { name?: string; arguments?: string };
			}>;
		};
		finish_reason?: string | null;
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
	};
}

function toOpenAiMessages(messages: Message[]): OpenAiMessage[] {
	const out: OpenAiMessage[] = [];
	for (const m of messages) {
		if (m.role === 'user' && 'toolCallId' in m && (m as { toolCallId?: string }).toolCallId) {
			const t = m as Message & { toolCallId: string; toolName: string };
			out.push({
				role: 'tool',
				tool_call_id: t.toolCallId,
				content: t.content,
			});
		} else {
			out.push({ role: m.role, content: m.content });
		}
	}
	return out;
}

export class OpenAiCompatibleProvider implements LLMProvider {
	readonly id: string;
	readonly displayName: string;
	readonly baseUrl: string;
	readonly defaultModel: string;
	readonly capabilities: ModelCapabilities;
	readonly anonymous: boolean;

	private readonly apiKey: string | undefined;
	private readonly headers: Record<string, string>;
	private readonly extraBody: Record<string, unknown>;
	private readonly embeddingModel: string | undefined;
	private readonly timeoutMs: number;
	private readonly transformRequest?: (body: Record<string, unknown>) => Record<string, unknown>;

	constructor(opts: OpenAiCompatOptions) {
		this.id = opts.id;
		this.displayName = opts.displayName;
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.defaultModel = opts.defaultModel;

		this.apiKey = opts.apiKey ?? (opts.apiKeyEnv ? process.env[opts.apiKeyEnv] : undefined);
		this.headers = { ...opts.headers };
		this.extraBody = { ...opts.extraBody };
		this.embeddingModel = opts.embeddingModel;
		this.timeoutMs = opts.timeoutMs ?? 120_000;
		this.transformRequest = opts.transformRequest;
		this.anonymous = opts.anonymous ?? false;

		this.capabilities = {
			toolCalling: true,
			contextWindow: 128_000,
			// Most OpenAI-compatible endpoints (OpenAI, OpenRouter, Groq,
			// Ollama, LM Studio, vLLM) expose /embeddings; Ollama serves it
			// from the same base URL as chat.
			embeddings: true,
			...opts.capabilities,
		};
	}

	/** Embed text inputs via the /embeddings endpoint (semantic memory). */
	async embed(request: EmbeddingsRequest): Promise<number[][]> {
		const model = request.model ?? this.embeddingModel ?? this.defaultModel;
		const url = `${this.baseUrl}/embeddings`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...this.headers,
		};
		if (this.apiKey) {
			headers['Authorization'] = bearerToken(this.apiKey);
		}

		const response = await httpJson<{
			data?: Array<{ index?: number; embedding?: number[] }>;
			error?: unknown;
		}>({
			url,
			method: 'POST',
			headers,
			body: { model, input: request.inputs },
			signal: request.signal,
			timeoutMs: this.timeoutMs,
		});

		if (!response?.data) {
			throw new ProviderError(
				`Embeddings request failed for ${this.id}: ${JSON.stringify(response?.error ?? 'no data')}`,
				0,
				this.id,
			);
		}
		// Preserve input order; some servers return embeddings out of order.
		const byIndex = new Map<number, number[]>();
		for (const item of response.data) {
			if (item.embedding) byIndex.set(item.index ?? byIndex.size, item.embedding);
		}
		return request.inputs.map((_, i) => byIndex.get(i) ?? []);
	}

	estimateCost(usage: TokenUsage): { input: number; output: number } {
		// Default rough pricing (USD per 1M tokens). Custom providers can
		// override via transformRequest or a subclass.
		return { input: 1.0, output: 3.0 };
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		const body = this.buildBody(request);
		const url = `${this.baseUrl}/chat/completions`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...this.headers,
		};
		if (this.apiKey) {
			headers['Authorization'] = bearerToken(this.apiKey);
		}

		const response = await httpJson<OpenAiResponse>({
			url,
			method: 'POST',
			headers,
			body,
			signal: request.signal,
			timeoutMs: this.timeoutMs,
		});

		return this.parseResponse(response, request);
	}

	private buildBody(request: ChatRequest): Record<string, unknown> {
		const body: Record<string, unknown> = {
			model: request.model ?? this.defaultModel,
			messages: toOpenAiMessages(request.messages),
			stream: false,
		};
		if (request.temperature !== undefined) body['temperature'] = request.temperature;
		if (request.maxTokens !== undefined) body['max_tokens'] = request.maxTokens;
		if (request.stop !== undefined) body['stop'] = request.stop;
		if (request.tools && request.tools.length > 0) {
			body['tools'] = request.tools.map((t) => ({
				type: 'function',
				function: {
					name: t.name,
					description: t.description,
					parameters: t.inputSchema,
				},
			}));
			body['tool_choice'] = 'auto';
		}
		Object.assign(body, this.extraBody);
		return this.transformRequest ? this.transformRequest(body) : body;
	}

	private parseResponse(response: OpenAiResponse, request: ChatRequest): ChatResponse {
		const choice = response.choices?.[0];
		const content = choice?.message?.content ?? '';
		const toolCalls: ToolCall[] | undefined = choice?.message?.tool_calls?.map((tc) => ({
			id: tc.id,
			name: tc.function.name,
			arguments: tc.function.arguments,
		}));

		return {
			content,
			toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
			usage: response.usage
				? {
					inputTokens: response.usage.prompt_tokens ?? 0,
					outputTokens: response.usage.completion_tokens ?? 0,
				}
				: undefined,
			model: request.model ?? this.defaultModel,
		};
	}

	/**
	 * Streaming chat via Server-Sent Events. Yields `text` deltas as tokens
	 * arrive and `toolCall` deltas when tool-call argument chunks are
	 * received (arguments are accumulated across chunks per tool index).
	 * Emits a final `usage` delta when the server reports usage in the last
	 * chunk (request `stream_options.include_usage` to opt in).
	 */
	async *stream(request: ChatRequest): AsyncGenerator<StreamDelta> {
		// Ask the server to include usage in the final chunk when supported.
		// Some OpenAI-compatible servers (older Ollama / LM Studio / custom
		// endpoints) reject unknown `stream_options` with a 400 — retry once
		// without it so streaming still works there.
		const buildBody = (includeUsage: boolean): Record<string, unknown> => {
			const body = this.buildBody(request);
			body['stream'] = true;
			if (includeUsage) body['stream_options'] = { include_usage: true };
			return body;
		};

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...this.headers,
		};
		if (this.apiKey) {
			headers['Authorization'] = bearerToken(this.apiKey);
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
		const onAbort = () => controller.abort();
		request.signal?.addEventListener('abort', onAbort);

		// Accumulate tool-call argument chunks per tool index.
		const toolAcc = new Map<number, { id: string; name: string; arguments: string }>();

		try {
			let res = await this.streamFetch(buildBody(true), headers, controller.signal);
			// Strict servers reject stream_options: retry without it.
			if (res.status === 400) {
				res = await this.streamFetch(buildBody(false), headers, controller.signal);
			}
			if (!res.ok || !res.body) {
				const raw = await res.text().catch(() => '');
				throw new ProviderError(
					`HTTP ${res.status} from ${this.baseUrl}: ${truncate(raw, 500)}`,
					res.status,
					this.id,
					raw,
				);
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed.startsWith('data:')) continue;
					const data = trimmed.slice(5).trim();
					if (data === '[DONE]') return;
					try {
						const json = JSON.parse(data) as OpenAiResponse;
						if (json.usage) {
							yield {
								type: 'usage',
								usage: {
									inputTokens: json.usage.prompt_tokens ?? 0,
									outputTokens: json.usage.completion_tokens ?? 0,
								},
							};
						}
						const delta = json.choices?.[0]?.delta;
						if (delta?.content) {
							yield { type: 'text', text: delta.content };
						}
						if (delta?.tool_calls) {
							for (const tc of delta.tool_calls) {
								const acc = toolAcc.get(tc.index) ?? { id: '', name: '', arguments: '' };
								if (tc.id) acc.id = tc.id;
								if (tc.function?.name) acc.name += tc.function.name;
								if (tc.function?.arguments) acc.arguments += tc.function.arguments;
								toolAcc.set(tc.index, acc);
								yield {
									type: 'toolCall',
									toolCall: {
										id: acc.id || `call-${tc.index}`,
										name: acc.name || 'function',
										arguments: acc.arguments,
									},
								};
							}
						}
					} catch {
						// ignore partial lines
					}
				}
			}
		} finally {
			clearTimeout(timeout);
			request.signal?.removeEventListener('abort', onAbort);
		}
	}

	private async streamFetch(
		body: Record<string, unknown>,
		headers: Record<string, string>,
		signal: AbortSignal,
	): Promise<Response> {
		return fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal,
		});
	}
}
