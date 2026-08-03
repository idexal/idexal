// Idexal AI Core — chat loop with tool calling
// A provider-agnostic agentic loop: sends messages, executes tool calls
// the model requests, feeds results back, and repeats until done.

import { type LLMProvider, type Message, type ToolDefinition, type ChatRequest, type StreamDelta } from './providers/types.ts';
import { streamChat } from './providers/stream.ts';
import { type AgentTool, type ToolContext, type ToolResult, executeTool, toolDefinitions } from './tools/tools.ts';
import { type MemoryService } from './memory/memoryService.ts';
import { type TerminalManager } from './terminal/terminalManager.ts';
import { type UsageStore, type UsageRole } from './usage/usageStore.ts';

export interface ChatLoopOptions {
	provider: LLMProvider;
	tools?: AgentTool[];
	systemPrompt?: string;
	messages?: Message[];
	temperature?: number;
	maxTokens?: number;
	maxToolCalls?: number;
	memory?: MemoryService;
	onMessage?: (msg: Message) => void;
	onToolCall?: (name: string, args: Record<string, unknown>) => void;
	/** Receive the outcome of each executed tool (ok + truncated output). */
	onToolResult?: (name: string, result: ToolResult) => void;
	/** Receive live streaming deltas (text tokens, tool calls, provider switches). */
	onDelta?: (delta: StreamDelta) => void;
	/** Agent Terminal manager — powers long-running interactive commands. */
	terminal?: TerminalManager;
	/** Per-call usage & cost tracking (tokens, latency, provider, role). */
	usageStore?: UsageStore;
	/** Task this loop belongs to, for usage aggregation across agents. */
	taskId?: string;
	/** Role of this loop inside the agent pipeline (planner/executor/reviewer/chat). */
	role?: UsageRole;
	signal?: AbortSignal;
}

export interface ChatLoopResult {
	messages: Message[];
	finalContent: string;
	toolCalls: number;
	usage: { inputTokens: number; outputTokens: number };
}

export class ChatLoop {
	private readonly opts: ChatLoopOptions;

	constructor(opts: ChatLoopOptions) {
		this.opts = opts;
	}

	async run(task: string): Promise<ChatLoopResult> {
		const { provider, tools = [], systemPrompt, memory, temperature, maxTokens, maxToolCalls = 15, usageStore, taskId, role = 'chat', terminal, signal } = this.opts;

		const messages: Message[] = [];
		let sys = systemPrompt ?? defaultSystemPrompt();

		// Inject long-term memory into the system prompt (semantic recall
		// when the memory service has an embedder configured)
		if (memory) {
			sys = await memory.augmentSystemPrompt(sys, task);
		}
		messages.push({ role: 'system', content: sys });
		messages.push({ role: 'user', content: task });

		const defs: ToolDefinition[] = toolDefinitions(tools);
		const ctx: ToolContext = { cwd: process.cwd(), terminal };
		let toolCalls = 0;
		let inputTokens = 0;
		let outputTokens = 0;

		for (let turn = 0; turn < maxToolCalls + 5; turn++) {
			this.opts.onMessage?.({ role: 'user', content: `[turn ${turn}]` });

			const request: ChatRequest = {
				messages,
				tools: defs,
				temperature,
				maxTokens,
				signal,
				onStream: this.opts.onDelta,
			};

			// Use streaming when the provider supports it (or when a delta
			// listener wants live progress); the response is accumulated
			// identically either way. The call is timed so per-provider
			// latency lands in the usage report.
			const callStart = performance.now();
			let response: Awaited<ReturnType<typeof streamChat>>['response'];
			try {
				const res = await streamChat(provider, request);
				response = res.response;
			} catch (err) {
				// Record the failed call too — usage reports should show every
				// attempt, including ones that errored (e.g. rate limits).
				const latencyMs = Math.round(performance.now() - callStart);
				usageStore?.record({
					timestamp: Date.now(),
					taskId,
					providerId: provider.id,
					model: request.model ?? provider.defaultModel,
					role,
					inputTokens: 0,
					outputTokens: 0,
					latencyMs,
					costUsd: 0,
					ok: false,
					error: err instanceof Error ? err.message : String(err),
				});
				throw err;
			}
			const latencyMs = Math.round(performance.now() - callStart);
			const inNow = response.usage?.inputTokens ?? 0;
			const outNow = response.usage?.outputTokens ?? 0;
			inputTokens += inNow;
			outputTokens += outNow;
			// Record EVERY successful call — providers that don't report token
			// usage (local servers, streams without include_usage) still count
			// toward calls and latency, with zero tokens/cost.
			if (usageStore) {
				const rate =
					provider.estimateCost?.(response.usage ?? { inputTokens: 0, outputTokens: 0 }) ?? { input: 0, output: 0 };
				usageStore.record({
					timestamp: Date.now(),
					taskId,
					providerId: provider.id,
					model: response.model,
					role,
					inputTokens: inNow,
					outputTokens: outNow,
					latencyMs,
					costUsd: (inNow / 1e6) * rate.input + (outNow / 1e6) * rate.output,
					ok: true,
				});
			}

			if (response.usage) {
				this.opts.onMessage?.({
					role: 'assistant',
					content: `[usage: +${response.usage.inputTokens} in / +${response.usage.outputTokens} out]`,
				});
			}

			const assistantMsg: Message = { role: 'assistant', content: response.content };
			messages.push(assistantMsg);

			if (response.toolCalls && response.toolCalls.length > 0) {
				for (const tc of response.toolCalls) {
					toolCalls++;
					let args: Record<string, unknown> = {};
					try {
						args = JSON.parse(tc.arguments || '{}');
					} catch {
						args = { raw: tc.arguments };
					}
					this.opts.onToolCall?.(tc.name, args);
					const result = await executeTool(tc.name, args, ctx, tools);
					this.opts.onToolResult?.(tc.name, result);
					messages.push({
						role: 'user',
						content: result.output,
						toolCallId: tc.id,
						toolName: tc.name,
					} as Message & { toolCallId: string; toolName: string });
				}
				continue;
			}

			// No tool calls → final answer
			return {
				messages,
				finalContent: response.content,
				toolCalls,
				usage: { inputTokens, outputTokens },
			};
		}

		// Tool-call budget exhausted
		const last = [...messages].reverse().find((m) => m.role === 'assistant');
		return {
			messages,
			finalContent: last?.content ?? '(no final content produced)',
			toolCalls,
			usage: { inputTokens, outputTokens },
		};
	}
}

function defaultSystemPrompt(): string {
	return [
		'You are Idexal, a powerful, autonomous agentic coding assistant.',
		'You can read and write files, list directories, run terminal commands, and search code.',
		'Work step by step. Prefer completing the task over asking questions.',
		'Always verify your work (e.g. run builds/tests when relevant) before finishing.',
		'Be concise in your explanations and precise in your edits.',
	].join('\n');
}
