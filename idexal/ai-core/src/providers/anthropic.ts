// Idexal AI Core — Anthropic provider (Claude)
// Native Anthropic Messages API support, including tool use blocks.

import { httpJson, bearerToken, truncate } from './http.ts';
import {
	type ChatRequest,
	type ChatResponse,
	type LLMProvider,
	type Message,
	type ModelCapabilities,
	type StreamDelta,
	type TokenUsage,
	type ToolCall,
	type ToolDefinition,
	ProviderError,
} from './types.ts';

export interface AnthropicOptions {
	id?: string;
	displayName?: string;
	apiKey?: string;
	apiKeyEnv?: string;
	baseUrl?: string;
	defaultModel: string;
	headers?: Record<string, string>;
}

interface AnthropicContentBlock {
	type: string;
	text?: string;
	id?: string;
	name?: string;
	input?: unknown;
}

interface AnthropicResponse {
	content: AnthropicContentBlock[];
	model: string;
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
	};
	stop_reason?: string;
}

const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements LLMProvider {
	readonly id: string;
	readonly displayName: string;
	readonly baseUrl: string;
	readonly defaultModel: string;
	readonly capabilities: ModelCapabilities = {
		toolCalling: true,
		contextWindow: 200_000,
		// Anthropic has no public embeddings endpoint, so semantic memory
		// uses an OpenAI-compatible provider (e.g. Ollama) instead.
		embeddings: false,
	};

	private readonly apiKey: string | undefined;
	private readonly headers: Record<string, string>;

	constructor(opts: AnthropicOptions) {
		this.id = opts.id ?? 'anthropic';
		this.displayName = opts.displayName ?? 'Anthropic';
		this.baseUrl = (opts.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '');
		this.defaultModel = opts.defaultModel;
		this.apiKey = opts.apiKey ?? (opts.apiKeyEnv ? process.env[opts.apiKeyEnv] : process.env.ANTHROPIC_API_KEY);
		this.headers = { ...opts.headers };
	}

	estimateCost(usage: TokenUsage): { input: number; output: number } {
		// Rough default; per-model pricing is set in provider config.
		return { input: 3.0, output: 15.0 };
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		if (!this.apiKey) {
			return this.chatWithoutAuth(request);
		}

		const body = this.buildBody(request);
		const response = await httpJson<AnthropicResponse>({
			url: `${this.baseUrl}/v1/messages`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.apiKey,
				'anthropic-version': ANTHROPIC_VERSION,
				...this.headers,
			},
			body,
			signal: request.signal,
		});

		return this.parseResponse(response, request);
	}

	private async chatWithoutAuth(request: ChatRequest): Promise<ChatResponse> {
		// Fallback for local/dev usage via OLLAMA-style OpenAI endpoint.
		const body = {
			model: request.model ?? this.defaultModel,
			messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
			stream: false,
		};
		try {
			const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...this.headers },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const raw = await res.text().catch(() => '');
				throw new ProviderError(`HTTP ${res.status}: ${raw}`, res.status, this.id, raw);
			}
			const json = (await res.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
				usage?: { prompt_tokens?: number; completion_tokens?: number };
			};
			return {
				content: json.choices?.[0]?.message?.content ?? '',
				model: request.model ?? this.defaultModel,
				usage: json.usage
					? {
						inputTokens: json.usage.prompt_tokens ?? 0,
						outputTokens: json.usage.completion_tokens ?? 0,
					}
					: undefined,
			};
		} catch (err) {
			if (err instanceof ProviderError) throw err;
			throw new ProviderError(
				`Anthropic provider ${this.id} not configured and local fallback failed: ${String(err)}`,
				0,
				this.id,
			);
		}
	}

	private buildBody(request: ChatRequest): Record<string, unknown> {
		const system = request.messages
			.filter((m) => m.role === 'system')
			.map((m) => m.content)
			.join('\n\n');

		const body: Record<string, unknown> = {
			model: request.model ?? this.defaultModel,
			max_tokens: request.maxTokens ?? 8192,
			messages: this.toAnthropicMessages(request.messages),
		};
		if (system) body['system'] = system;
		if (request.temperature !== undefined) body['temperature'] = request.temperature;
		if (request.stop !== undefined) body['stop_sequences'] = request.stop;
		if (request.tools && request.tools.length > 0) {
			body['tools'] = request.tools.map((t: ToolDefinition) => ({
				name: t.name,
				description: t.description,
				input_schema: t.inputSchema,
			}));
		}
		return body;
	}

	private toAnthropicMessages(messages: Message[]): unknown[] {
		const out: unknown[] = [];
		for (const m of messages) {
			if (m.role === 'system') continue;
			if (m.role === 'user' && 'toolCallId' in m && (m as { toolCallId?: string }).toolCallId) {
				const t = m as Message & { toolCallId: string; toolName: string };
				out.push({
					role: 'user',
					content: [
						{
							type: 'tool_result',
							tool_use_id: t.toolCallId,
							content: t.content,
						},
					],
				});
			} else if (m.role === 'assistant' && 'toolCalls' in m && (m as { toolCalls?: ToolCall[] }).toolCalls) {
				const a = m as Message & { toolCalls?: ToolCall[] };
				const content: unknown[] = [{ type: 'text', text: a.content || '' }];
				for (const tc of a.toolCalls ?? []) {
					content.push({
						type: 'tool_use',
						id: tc.id,
						name: tc.name,
						input: safeJsonParse(tc.arguments),
					});
				}
				out.push({ role: 'assistant', content });
			} else {
				out.push({ role: m.role, content: m.content });
			}
		}
		return out;
	}

	private parseResponse(response: AnthropicResponse, request: ChatRequest): ChatResponse {
		const content: string[] = [];
		const toolCalls: ToolCall[] = [];
		for (const block of response.content ?? []) {
			if (block.type === 'text' && block.text) content.push(block.text);
			if (block.type === 'tool_use' && block.id && block.name) {
				toolCalls.push({
					id: block.id,
					name: block.name,
					arguments: JSON.stringify(block.input ?? {}),
				});
			}
		}
		return {
			content: content.join(''),
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			usage: response.usage
				? {
					inputTokens: response.usage.input_tokens ?? 0,
					outputTokens: response.usage.output_tokens ?? 0,
				}
				: undefined,
			model: response.model ?? request.model ?? this.defaultModel,
		};
	}

	/**
	 * Streaming chat via the Anthropic Messages SSE API. Yields `text`
	 * deltas, `toolCall` deltas (id/name on block start, arguments
	 * accumulated from `input_json_delta` chunks), and a final `usage`
	 * delta when `message_delta` reports token counts.
	 */
	async *stream(request: ChatRequest): AsyncGenerator<StreamDelta> {
		if (!this.apiKey) {
			// No auth → fall back to the OpenAI-style local endpoint which
			// supports streaming the same way as any OpenAI-compatible server.
			const body: Record<string, unknown> = {
				model: request.model ?? this.defaultModel,
				messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
				stream: true,
			};
			const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...this.headers },
				body: JSON.stringify(body),
			});
			if (!res.ok || !res.body) {
				const raw = await res.text().catch(() => '');
				throw new ProviderError(`HTTP ${res.status}: ${truncate(raw, 500)}`, res.status, this.id, raw);
			}
			yield* streamSseText(res.body);
			return;
		}

		const body = this.buildBody(request);
		body['stream'] = true;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 120_000);
		const onAbort = () => controller.abort();
		request.signal?.addEventListener('abort', onAbort);

		// Track tool_use blocks: id/name arrive on block start, arguments
		// are streamed as input_json_delta chunks.
		const toolBlocks = new Map<number, { id: string; name: string; arguments: string }>();
		let inputTokens = 0;
		let outputTokens = 0;

		try {
			const res = await fetch(`${this.baseUrl}/v1/messages`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': this.apiKey,
					'anthropic-version': ANTHROPIC_VERSION,
					...this.headers,
				},
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			if (!res.ok || !res.body) {
				const raw = await res.text().catch(() => '');
				throw new ProviderError(
					`HTTP ${res.status} from ${this.baseUrl}: ${truncate(raw, 500)}`,
					res.status,
					this.id,
					raw,
				);
			}

			for await (const event of parseSse(res.body)) {
				if (event.event === 'message_start') {
					const msg = event.data?.message;
					if (msg?.usage?.input_tokens) inputTokens = msg.usage.input_tokens;
				}
				if (event.event === 'content_block_start') {
					const idx = event.data?.index as number | undefined;
					const block = event.data?.content_block as { type?: string; id?: string; name?: string } | undefined;
					if (idx !== undefined && block?.type === 'tool_use') {
						toolBlocks.set(idx, { id: block.id ?? `tool-${idx}`, name: block.name ?? 'function', arguments: '' });
					}
				}
				if (event.event === 'content_block_delta') {
					const idx = event.data?.index as number | undefined;
					const delta = event.data?.delta as { type?: string; text?: string; partial_json?: string } | undefined;
					if (delta?.type === 'text_delta' && delta.text) {
						yield { type: 'text', text: delta.text };
					}
					if (delta?.type === 'input_json_delta' && delta.partial_json && idx !== undefined) {
						const acc = toolBlocks.get(idx);
						if (acc) {
							acc.arguments += delta.partial_json;
							yield {
								type: 'toolCall',
								toolCall: { id: acc.id, name: acc.name, arguments: acc.arguments },
							};
						}
					}
				}
				if (event.event === 'message_delta') {
					if (event.data?.usage?.output_tokens) outputTokens = event.data.usage.output_tokens;
				}
			}

			if (inputTokens > 0 || outputTokens > 0) {
				yield { type: 'usage', usage: { inputTokens, outputTokens } };
			}
		} finally {
			clearTimeout(timeout);
			request.signal?.removeEventListener('abort', onAbort);
		}
	}
}

/** Parse an SSE byte stream into { event, data } records. */
async function* parseSse(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: Record<string, unknown> | undefined }> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		// Split on blank lines (event boundaries) but keep the last partial.
		const blocks = buffer.split(/\n\n/);
		buffer = blocks.pop() ?? '';
		for (const block of blocks) {
			let event = 'message';
			let data: string | undefined;
			for (const line of block.split('\n')) {
				const trimmed = line.trim();
				if (trimmed.startsWith('event:')) event = trimmed.slice(6).trim();
				else if (trimmed.startsWith('data:')) data = (data ?? '') + trimmed.slice(5).trim();
			}
			if (data) {
				try {
					yield { event, data: JSON.parse(data) as Record<string, unknown> };
				} catch {
					yield { event, data: undefined };
				}
			}
		}
	}
}

/** Stream text deltas from an OpenAI-style SSE stream (no-auth fallback). */
async function* streamSseText(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamDelta> {
	const reader = body.getReader();
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
				const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
				const content = json.choices?.[0]?.delta?.content;
				if (content) yield { type: 'text', text: content };
			} catch {
				// ignore partial lines
			}
		}
	}
}

function safeJsonParse(s: string): unknown {
	try {
		return JSON.parse(s);
	} catch {
		return { raw: s };
	}
}
