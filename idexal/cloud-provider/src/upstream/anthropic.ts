// Idexal Cloud Gateway — Anthropic upstream adapter
// Translates the public OpenAI protocol to Anthropic's Messages API and
// back. Handles: system → `system`, tools → `input_schema`, tool results →
// `tool_result` blocks, tool_use responses → OpenAI tool_calls, and the
// Anthropic SSE event stream (content_block_delta / input_json_delta /
// message_delta …) → OpenAI SSE chunks.

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

const ANTHROPIC_VERSION = '2023-06-01';

/** Max tokens Anthropic requires (derived from request or a sane default). */
const DEFAULT_MAX_TOKENS = 8192;

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown };

/** Convert OpenAI messages → Anthropic messages (system extracted). */
function toAnthropicMessages(messages: unknown[]): { messages: AnthropicMessage[]; system?: string } {
	const systemParts: string[] = [];
	const out: AnthropicMessage[] = [];
	for (const m of messages as Array<Record<string, unknown>>) {
		const role = m.role as string;
		const content = m.content as unknown;
		if (role === 'system') {
			systemParts.push(typeof content === 'string' ? content : String(content ?? ''));
			continue;
		}
		if (role === 'user' && typeof m.tool_call_id === 'string') {
			// Tool result → Anthropic tool_result block inside a user message.
			const prev = out[out.length - 1];
			const block = { type: 'tool_result', tool_use_id: m.tool_call_id, content: typeof content === 'string' ? content : JSON.stringify(content) };
			if (prev && prev.role === 'user' && Array.isArray(prev.content)) {
				(prev.content as unknown[]).push(block);
			} else {
				out.push({ role: 'user', content: [block] });
			}
			continue;
		}
		if (role === 'assistant' && Array.isArray(m.tool_calls)) {
			// Assistant tool calls → tool_use content blocks.
			const blocks: unknown[] = [];
			if (content) blocks.push({ type: 'text', text: typeof content === 'string' ? content : '' });
			for (const tc of m.tool_calls as Array<{ id?: string; function?: { name?: string; arguments?: string } }>) {
				blocks.push({
					type: 'tool_use',
					id: tc.id ?? `toolu_${Math.random().toString(36).slice(2, 10)}`,
					name: tc.function?.name ?? 'function',
					input: safeParse(tc.function?.arguments),
				});
			}
			out.push({ role: 'assistant', content: blocks });
			continue;
		}
		out.push({ role: role as 'user' | 'assistant', content: typeof content === 'string' ? content : String(content ?? '') });
	}
	return { messages: out, system: systemParts.length ? systemParts.join('\n\n') : undefined };
}

function safeParse(s: string | undefined): unknown {
	if (!s) return {};
	try {
		return JSON.parse(s);
	} catch {
		return {};
	}
}

/** OpenAI tools → Anthropic tools (input_schema). */
function toAnthropicTools(tools: unknown): unknown[] | undefined {
	if (!Array.isArray(tools)) return undefined;
	const out: unknown[] = [];
	for (const t of tools as Array<Record<string, unknown>>) {
		const fn = (t.function ?? t) as { name?: string; description?: string; parameters?: unknown };
		if (!fn?.name) continue;
		out.push({
			name: fn.name,
			description: fn.description ?? '',
			input_schema: fn.parameters ?? { type: 'object', properties: {} },
		});
	}
	return out.length ? out : undefined;
}

/** Anthropic content blocks → OpenAI message (text + tool_calls). */
function anthropicBlocksToOpenAi(blocks: Array<{ type?: string; text?: string; id?: string; name?: string; input?: unknown }>): {
	content: string;
	tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
} {
	const texts: string[] = [];
	const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
	for (const b of blocks) {
		if (b.type === 'text' && b.text) texts.push(b.text);
		if (b.type === 'tool_use' && b.id && b.name) {
			toolCalls.push({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } });
		}
	}
	return { content: texts.join(''), tool_calls: toolCalls.length ? toolCalls : undefined };
}

export class AnthropicAdapter implements UpstreamAdapter {
	readonly config: UpstreamConfig;

	constructor(config: UpstreamConfig) {
		this.config = config;
	}

	modelFor(publicModel: string): string {
		return this.config.modelMap[publicModel] ?? publicModel;
	}

	usable(): boolean {
		return Boolean(upstreamKey(this.config));
	}

	private headers(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'x-api-key': upstreamKey(this.config) ?? '',
			'anthropic-version': ANTHROPIC_VERSION,
		};
	}

	private buildBody(req: ChatCompletionRequest, stream: boolean): Record<string, unknown> {
		const { messages, system } = toAnthropicMessages(req.messages ?? []);
		const body: Record<string, unknown> = {
			model: this.modelFor(req.model),
			max_tokens: req.max_tokens ?? req.maxTokens ?? DEFAULT_MAX_TOKENS,
			messages,
			stream,
		};
		if (system) body['system'] = system;
		if (req.temperature !== undefined) body['temperature'] = req.temperature;
		if (req.stop !== undefined) body['stop_sequences'] = Array.isArray(req.stop) ? req.stop : [req.stop];
		const tools = toAnthropicTools(req.tools);
		if (tools) body['tools'] = tools;
		return body;
	}

	async chat(req: ChatCompletionRequest): Promise<UpstreamChatResult> {
		const body = this.buildBody(req, false);
		try {
			const res = await fetch(`${this.config.baseUrl}/v1/messages`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
			});
			const parsed = (await readJson(res)) as {
				content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: unknown }>;
				usage?: { input_tokens?: number; output_tokens?: number };
				stop_reason?: string;
				error?: unknown;
			};
			if (res.status !== 200) {
				return { status: res.status, body: parsed };
			}
			const { content, tool_calls } = anthropicBlocksToOpenAi(parsed.content ?? []);
			return {
				status: 200,
				body: {
					id: `chatcmpl-${Math.random().toString(36).slice(2, 12)}`,
					object: 'chat.completion',
					model: req.model,
					choices: [
						{
							index: 0,
							message: { role: 'assistant', content, tool_calls },
							finish_reason: mapFinish(parsed.stop_reason),
						},
					],
					usage: {
						prompt_tokens: parsed.usage?.input_tokens ?? 0,
						completion_tokens: parsed.usage?.output_tokens ?? 0,
						total_tokens: (parsed.usage?.input_tokens ?? 0) + (parsed.usage?.output_tokens ?? 0),
					},
				},
			};
		} catch (err) {
			return {
				status: 502,
				body: { error: { message: `Upstream ${this.config.id} unreachable: ${err instanceof Error ? err.message : String(err)}`, type: 'upstream_error' } },
			};
		}
	}

	async chatStream(req: ChatCompletionRequest): Promise<UpstreamChatStreamResult> {
		const body = this.buildBody(req, true);
		try {
			const res = await fetch(`${this.config.baseUrl}/v1/messages`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 120_000),
			});
			if (!res.ok || !res.body) {
				const text = await res.text().catch(() => '');
				return { status: res.status, stream: textToStream(text) };
			}
			return { status: 200, stream: new TranslateAnthropicSse(res.body) };
		} catch (err) {
			const text = JSON.stringify({ error: { message: `Upstream ${this.config.id} unreachable: ${err instanceof Error ? err.message : String(err)}`, type: 'upstream_error' } });
			return { status: 502, stream: textToStream(text) };
		}
	}

	async embeddings(_req: EmbeddingsRequest): Promise<UpstreamEmbedResult> {
		// Anthropic has no public embeddings endpoint — the router skips this
		// upstream for embedding requests (falls back to another upstream).
		return {
			status: 404,
			body: { error: { message: `Upstream ${this.config.id} does not provide embeddings`, type: 'unsupported' } },
		};
	}
}

function mapFinish(stop: string | undefined): string | null {
	switch (stop) {
		case 'end_turn':
		case 'stop_sequence':
			return 'stop';
		case 'max_tokens':
			return 'length';
		case 'tool_use':
			return 'tool_calls';
		default:
			return null;
	}
}

/** Shape of one Anthropic SSE `data:` payload. */
interface AnthropicSseEvent {
	type?: string;
	index?: number;
	content_block?: { type?: string; id?: string; name?: string };
	delta?: { type?: string; text?: string; partial_json?: string };
	message?: { usage?: { input_tokens?: number; output_tokens?: number }; stop_reason?: string };
	usage?: { output_tokens?: number };
	model?: string;
	error?: { message?: string; type?: string };
}

/** Translate the Anthropic SSE event stream into OpenAI SSE chunks. */
class TranslateAnthropicSse extends ReadableStream<Uint8Array> {
	constructor(source: ReadableStream<Uint8Array>) {
		super({
			async start(controller) {
				const reader = source.getReader();
				const decoder = new TextDecoder();
				const encoder = new TextEncoder();
				let buffer = '';
				// Anthropic's SSE pairs `event: <name>` lines with `data: <json>`
				// lines — the event name lives in the `event:` line, NOT inside
				// the JSON (which only carries `type:`). Track it across lines.
				let currentEvent = '';
				// Accumulate tool-call arguments per block index.
				const toolBlocks = new Map<number, { id: string; name: string; arguments: string }>();
				let inputTokens = 0;
				let outputTokens = 0;
				let finish: string | null = null;
				const emit = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
				const finishAndClose = () => {
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
					// Release the upstream body reader so the fetch connection is
					// not left dangling after the stream ends.
					void reader.cancel().catch(() => undefined);
				};

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() ?? '';
						for (const raw of lines) {
							const line = raw.trim();
							if (line.startsWith('event:')) {
								currentEvent = line.slice(6).trim();
								continue;
							}
							if (!line.startsWith('data:')) continue;
							const data = line.slice(5).trim();
							if (!data || data === '[DONE]') continue;
							let payload: AnthropicSseEvent;
							try {
								payload = JSON.parse(data) as AnthropicSseEvent;
							} catch {
								continue;
							}
							const eventName = currentEvent || payload.type || '';
							const e = payload;
							switch (eventName) {
								case 'message_start':
									inputTokens = e.message?.usage?.input_tokens ?? 0;
									emit({ id: `chatcmpl-${Math.random().toString(36).slice(2, 12)}`, object: 'chat.completion.chunk', model: e.model ?? 'idexal', choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
									break;
								case 'content_block_start': {
										const idx = e.index ?? 0;
										const block = e.content_block;
										if (block?.type === 'tool_use') {
											toolBlocks.set(idx, { id: block.id ?? `toolu_${idx}`, name: block.name ?? 'function', arguments: '' });
											emit({ choices: [{ index: 0, delta: { tool_calls: [{ index: idx, id: block.id ?? `toolu_${idx}`, type: 'function', function: { name: block.name ?? 'function', arguments: '' } }] }, finish_reason: null }] });
										} else {
											emit({ choices: [{ index: 0, delta: { content: '' }, finish_reason: null }] });
										}
										break;
									}
									case 'content_block_delta': {
										const idx = e.index ?? 0;
										const delta = e.delta;
										if (delta?.type === 'text_delta' && delta.text) {
											emit({ choices: [{ index: 0, delta: { content: delta.text }, finish_reason: null }] });
										} else if (delta?.type === 'input_json_delta' && delta.partial_json) {
											const idx = e.index ?? 0;
											const acc = toolBlocks.get(idx) ?? { id: `toolu_${idx}`, name: 'function', arguments: '' };
											acc.arguments += delta.partial_json;
											toolBlocks.set(idx, acc);
											// OpenAI streams arguments as INCREMENTAL deltas (clients accumulate
											// across chunks, e.g. the core does `acc.arguments += …`), so emit
											// only this chunk's delta — never the full accumulated string, or
											// the client's JSON doubles up and corrupts.
											emit({ choices: [{ index: 0, delta: { tool_calls: [{ index: idx, id: acc.id, function: { name: acc.name, arguments: delta.partial_json } }] }, finish_reason: null }] });
										}
										break;
									}
									case 'message_delta':
										outputTokens = e.usage?.output_tokens ?? outputTokens;
										finish = mapFinish(e.message?.stop_reason);
										break;
									case 'message_stop':
										emit({
											choices: [{ index: 0, delta: {}, finish_reason: finish ?? 'stop' }],
											usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
										});
										finishAndClose();
										return;
									case 'error':
										// Anthropic nests the real reason under `error.message`.
										emit({ error: { message: (e.error as { message?: string } | undefined)?.message ?? (typeof e.message === 'string' ? e.message : 'upstream error'), type: 'upstream_error' } });
										break;
									default:
										break;
									}
								}
						}
					// Upstream closed without message_stop — flush and end.
					finishAndClose();
				} catch (err) {
					emit({ error: { message: err instanceof Error ? err.message : String(err), type: 'upstream_error' } });
					controller.close();
					void reader.cancel().catch(() => undefined);
				}
			},
		});
	}
}

function textToStream(text: string): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(text));
			controller.close();
		},
	});
}
