// Idexal AI Core — multi-agent orchestration
// A planner → executors → reviewer loop that decomposes a task into
// steps, delegates to (possibly parallel) sub-agents, and reviews results.
// Each sub-agent gets its own provider (with fallback) and memory access.

import { ChatLoop } from '../chat.ts';
import { type AgentConfig } from '../config.ts';
import { type MemoryService } from '../memory/memoryService.ts';
import { type LLMProvider, type StreamDelta } from '../providers/types.ts';
import { ProviderRegistry } from '../providers/registry.ts';
import { type AgentTool, readOnlyTools } from '../tools/tools.ts';
import { type TerminalManager } from '../terminal/terminalManager.ts';
import { type UsageStore } from '../usage/usageStore.ts';
import { type SubagentDefinition } from '../compat/subagents.ts';
import { buildSubagentTool } from './subagentTool.ts';

export interface TaskStep {
	id: number;
	description: string;
	status: 'pending' | 'running' | 'done' | 'failed';
	result?: string;
	assignee?: string;
}

export interface OrchestratorResult {
	summary: string;
	steps: TaskStep[];
	agentReports: string[];
}

export interface OrchestratorOptions {
	registry: ProviderRegistry;
	config: AgentConfig;
	tools?: AgentTool[];
	memory?: MemoryService;
	project?: string;
	/** Agent Terminal manager — long-running interactive commands. */
	terminal?: TerminalManager;
	/** Claude Code subagents (from .claude/agents/*.md) available to executors. */
	subagents?: SubagentDefinition[];
	/** CLAUDE.md instructions injected into every agent's system prompt. */
	instructions?: string;
	/** Per-call usage & cost tracking; every sub-agent call is recorded. */
	usageStore?: UsageStore;
	/** Task id for usage aggregation (defaults to a generated run id). */
	taskId?: string;
	/** Plan-only mode: emit the plan and stop — no step execution, no agents. */
	planOnly?: boolean;
	/** Read-only mode: executors only get inspection tools (no writes, no
	 * commands, no terminals) — used by the extension's /idexal:review. */
	readOnly?: boolean;
	onEvent?: (event: OrchestratorEvent) => void;
	/** Receive live streaming deltas from the executing sub-agents. */
	onDelta?: (delta: StreamDelta) => void;
	signal?: AbortSignal;
}

export type OrchestratorEvent =
	| { type: 'plan'; steps: TaskStep[] }
	| { type: 'agent-start'; name: string; task: string }
	| { type: 'agent-end'; name: string; summary: string }
	| { type: 'step-status'; step: TaskStep }
	| { type: 'tool-call'; step: number; name: string; args: Record<string, unknown> }
	| { type: 'tool-result'; step: number; name: string; ok: boolean; output: string }
	| { type: 'review'; verdict: string }
	| { type: 'terminal-start'; id: string; command: string }
	| { type: 'terminal-output'; id: string; output: string }
	| { type: 'terminal-exit'; id: string; exitCode: number | null }
	| { type: 'error'; error: string };	export class Orchestrator {
	private readonly registry: ProviderRegistry;
	private readonly config: AgentConfig;
	private readonly tools: AgentTool[];
	private readonly memory?: MemoryService;
	private readonly terminal?: TerminalManager;
	private readonly subagents?: SubagentDefinition[];
	private readonly instructions?: string;
	private readonly usageStore?: UsageStore;
	readonly taskId: string;
	private readonly onEvent?: (event: OrchestratorEvent) => void;
	private readonly onDelta?: (delta: StreamDelta) => void;
	private readonly signal?: AbortSignal;
	private readonly planOnly: boolean;
	private readonly readOnly: boolean;

	constructor(opts: OrchestratorOptions) {
		this.registry = opts.registry;
		this.config = opts.config;
		this.tools = opts.tools ?? [];
		this.memory = opts.memory;
		this.terminal = opts.terminal;
		this.subagents = opts.subagents;
		this.instructions = opts.instructions;
		this.usageStore = opts.usageStore;
		// Forward terminal lifecycle events (start/output/exit) so UIs can
		// show live long-running command progress alongside agent events.
		// addListener (not a single-slot assignment): the same manager may
		// serve multiple sequential runs (interactive session reuses it), so
		// each orchestrator gets its own listener instead of overwriting.
		if (opts.terminal) {
			opts.terminal.addListener((e) => this.onEvent?.(e));
		}
		this.taskId = opts.taskId ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		this.onEvent = opts.onEvent;
		this.onDelta = opts.onDelta;
		this.signal = opts.signal;
		this.planOnly = opts.planOnly ?? false;
		this.readOnly = opts.readOnly ?? false;
	}

	async run(task: string): Promise<OrchestratorResult> {
		const steps = await this.plan(task);
		this.onEvent?.({ type: 'plan', steps });

		// Plan-only mode (e.g. the extension's /idexal:plan command): the plan
		// itself is the deliverable — stop here, never execute a step.
		if (this.planOnly) {
			const summary = `Plan only — ${steps.length} step${steps.length === 1 ? '' : 's'} proposed, nothing executed.`;
			return { summary, steps, agentReports: [] };
		}

		const reports: string[] = [];

		// A single step for simple tasks avoids overhead
		const simpleSteps = steps.length === 1;

		for (const step of steps) {
			if (this.signal?.aborted) break;
			step.status = 'running';
			this.onEvent?.({ type: 'step-status', step });

			// Multi-agent: delegate each step to a sub-agent
			const agentTask = simpleSteps
				? task
				: `Step ${step.id}: ${step.description}\n\nContext from the overall task: ${task}`;

			this.onEvent?.({ type: 'agent-start', name: `agent-${step.id}`, task: agentTask });
			try {
				const result = await this.runAgent(agentTask, step.id);
				step.status = 'done';
				step.result = result.summary;
				step.assignee = result.providerId;
				reports.push(`## Step ${step.id}: ${step.description}\n\n${result.summary}`);
				this.onEvent?.({ type: 'agent-end', name: `agent-${step.id}`, summary: result.summary });
			} catch (err) {
				step.status = 'failed';
				step.result = String(err);
				reports.push(`## Step ${step.id}: ${step.description}\n\nFAILED: ${String(err)}`);
				this.onEvent?.({ type: 'error', error: String(err) });
			}
			this.onEvent?.({ type: 'step-status', step });
		}

		const failed = steps.filter((s) => s.status === 'failed').length;
		let summary = failed === 0 ? 'All steps completed successfully.' : `${failed} of ${steps.length} steps failed.`;
		// Read-only runs (e.g. /idexal:review) are analysis-only: they never
		// write to the workspace AND never pollute long-term memory.
		if (this.memory && !this.readOnly) {
			this.memory.rememberSessionSummary(`Task: ${task}\nResult: ${summary}\n${reports.join('\n')}`);
		}

		return { summary, steps, agentReports: reports };
	}

	private async plan(task: string): Promise<TaskStep[]> {
		// Use a fast provider for planning
		const provider = this.pickProvider('planner');
		const loop = new ChatLoop({
			provider,
			systemPrompt: [
				'You are the planning agent. Decompose the user task into a concise ordered list of steps.',
				'Respond with ONLY a JSON array of step descriptions, e.g. ["Step A", "Step B"].',
				'Keep each step concrete and actionable. Use 1-5 steps.',
			].join('\n'),
			tools: [],
			maxTokens: 1500,
			usageStore: this.usageStore,
			taskId: this.taskId,
			role: 'planner',
			signal: this.signal,
		});
		const result = await loop.run(`Plan this task into steps:\n${task}`);
		const parsed = tryParseJsonArray(result.finalContent);
		const steps: TaskStep[] = (parsed.length ? parsed : [task]).map((d, i) => ({
			id: i + 1,
			description: d,
			status: 'pending' as const,
		}));
		if (steps.length > this.config.maxIterations) {
			return steps.slice(0, this.config.maxIterations);
		}
		return steps;
	}

	private async runAgent(task: string, step: number): Promise<{ summary: string; providerId: string }> {
		const provider = this.pickProvider('executor');
		const agentLoop = (opts: { onToolCall?: (name: string, args: Record<string, unknown>) => void; onToolResult?: (name: string, result: { ok: boolean; output: string }) => void }) =>
			new ChatLoop({
				provider,
				systemPrompt: this.agentSystemPrompt(),
				// Forward the step-scoped event hooks into the executor tools so
				// subagent tool calls (nested ChatLoop) also stream as
				// tool-call/tool-result events to the UI.
				tools: this.executorTools(provider, opts),
				memory: this.memory,
				terminal: this.terminal,
				maxToolCalls: this.config.maxToolCallsPerTurn,
				usageStore: this.usageStore,
				taskId: this.taskId,
				role: 'executor',
				signal: this.signal,
				onDelta: this.onDelta,
				...opts,
			});
		// Live progress: surface each tool call and its outcome as a first-class
		// event (step-scoped) so UIs can show agents working step by step.
		const onToolCall = (name: string, args: Record<string, unknown>) =>
			this.onEvent?.({ type: 'tool-call', step, name, args });
		const onToolResult = (name: string, result: { ok: boolean; output: string }) =>
			this.onEvent?.({ type: 'tool-result', step, name, ok: result.ok, output: result.output });

		const loop = agentLoop({ onToolCall, onToolResult });
		const result = await loop.run(task);

		if (this.config.useReviewer && result.finalContent) {
			const review = await this.review(task, result.finalContent);
			if (review.verdict === 'fix' && review.suggestion) {
				this.onEvent?.({ type: 'review', verdict: 'fix' });
				const fixLoop = agentLoop({ onToolCall, onToolResult });
				const fixResult = await fixLoop.run(
					`Your previous work on this task needs fixes.\n\nTask: ${task}\n\nPrevious output:\n${result.finalContent}\n\nReviewer feedback:\n${review.suggestion}\n\nApply the fixes and confirm.`,
				);
				return { summary: fixResult.finalContent, providerId: provider.id };
			}
			this.onEvent?.({ type: 'review', verdict: 'ok' });
		}

		return { summary: result.finalContent, providerId: provider.id };
	}

	private async review(task: string, output: string): Promise<{ verdict: 'ok' | 'fix'; suggestion?: string }> {
		const provider = this.pickProvider('reviewer');
		const loop = new ChatLoop({
			provider,
			systemPrompt: [
				'You are the reviewer agent. Assess whether the work correctly and completely addresses the task.',
				'Reply with a JSON object: {"verdict": "ok" | "fix", "suggestion": "..."}.',
			].join('\n'),
			tools: [],
			maxTokens: 1500,
			usageStore: this.usageStore,
			taskId: this.taskId,
			role: 'reviewer',
			signal: this.signal,
		});
		const result = await loop.run(
			`Task: ${task}\n\nWork produced:\n${output}\n\nAssess and reply with JSON.`,
		);
		try {
			const parsed = JSON.parse(result.finalContent) as { verdict?: 'ok' | 'fix'; suggestion?: string };
			return { verdict: parsed.verdict === 'fix' ? 'fix' : 'ok', suggestion: parsed.suggestion };
		} catch {
			return { verdict: 'ok' };
		}
	}

	private pickProvider(role: 'planner' | 'executor' | 'reviewer'): LLMProvider {
		// Only pick providers that can actually be used right now — keyless
		// remote providers (no key, not anonymous, not local) are skipped so
		// a role never lands on a provider that would 401 on the first call.
		const available = this.registry.available().filter((p) => this.registry.isUsable(p));
		if (available.length === 0) {
			throw new Error('No usable providers available (all failed, cooling down, or missing API keys).');
		}
		// Light rotation across usable providers so planner/executor/reviewer
		// don't always hammer the same endpoint: index by role.
		const roleIdx = role === 'planner' ? 0 : role === 'reviewer' ? 1 : 2;
		return available[roleIdx % available.length];
	}

	/** Executor system prompt: base + CLAUDE.md instructions + subagent list. */
	private agentSystemPrompt(): string {
		const parts = [agentSystemPrompt()];
		if (this.instructions?.trim()) {
			parts.push(`## Project instructions (CLAUDE.md)\n${this.instructions.trim()}`);
		}
		if (this.subagents?.length) {
			parts.push(
				'## Available subagents (delegate with the use_subagent tool)\n' +
					this.subagents.map((s) => `- ${s.name}: ${s.description || 'no description'}`).join('\n'),
			);
		}
		return parts.join('\n\n');
	}

	/** Executor tool set: base tools (read-only subset in readOnly mode) + a
	 * bound use_subagent tool when subagents exist. */
	private executorTools(
		provider: LLMProvider,
		hooks?: {
			onToolCall?: (name: string, args: Record<string, unknown>) => void;
			onToolResult?: (name: string, result: { ok: boolean; output: string }) => void;
		},
	): AgentTool[] {
		const base = this.readOnly ? readOnlyTools(this.tools) : this.tools;
		if (!this.subagents?.length) return base;
		return [
			...base,
			buildSubagentTool({
				subagents: this.subagents,
				pickProvider: () => this.pickProvider('executor'),
				providers: this.registry.available(),
				memory: this.memory,
				terminal: this.terminal,
				usageStore: this.usageStore,
				taskId: this.taskId,
				signal: this.signal,
				readOnly: this.readOnly,
				onDelta: this.onDelta,
				onToolCall: hooks?.onToolCall,
				onToolResult: hooks?.onToolResult,
			}),
		];
	}
}

function agentSystemPrompt(): string {
	return [
		'You are an Idexal autonomous coding agent working inside a project.',
		'You have tools to read/write files, list directories, run commands, and search.',
		'Complete the assigned task fully. Use tools liberally to explore before editing.',
		'Verify your work by running builds or tests when appropriate.',
		'Report what you did and the result concisely.',
	].join('\n');
}

function tryParseJsonArray(text: string): string[] {
	const start = text.indexOf('[');
	const end = text.lastIndexOf(']');
	if (start >= 0 && end > start) {
		try {
			const parsed = JSON.parse(text.slice(start, end + 1));
			if (Array.isArray(parsed)) {
				return parsed.map((x) => String(x));
			}
		} catch {
			// fall through
		}
	}
	// Fallback: split on lines
	return text
		.split('\n')
		.map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
		.filter((l) => l.length > 0);
}
