// Idexal AI Core — `use_subagent` tool
// Lets an executor agent delegate work to a Claude Code subagent (loaded
// from .claude/agents/*.md). The subagent runs as a nested ChatLoop with
// its own system prompt and its allowed tool set, so the delegation is real
// (its tool calls stream through the parent's onToolCall/onToolResult and
// its provider calls are recorded in usage). Falls back to the parent's
// provider when the subagent doesn't pin a model.

import { ChatLoop } from '../chat.ts';
import { type MemoryService } from '../memory/memoryService.ts';
import { type LLMProvider, type StreamDelta } from '../providers/types.ts';
import { type TerminalManager } from '../terminal/terminalManager.ts';
import { type UsageStore } from '../usage/usageStore.ts';
import { type AgentTool, type ToolResult, ALL_TOOLS, readOnlyTools } from '../tools/tools.ts';
import { type SubagentDefinition } from '../compat/subagents.ts';
import { resolveClaudeModel } from '../compat/claudeCode.ts';

export interface SubagentToolContext {
	subagents: SubagentDefinition[];
	/** Picks a provider for a subagent that doesn't pin a model. */
	pickProvider: (role: 'executor') => LLMProvider;
	/** Read-only mode: the subagent only gets inspection tools too. */
	readOnly?: boolean;
	/** Providers available (for model-pinned subagents). */
	providers: LLMProvider[];
	memory?: MemoryService;
	terminal?: TerminalManager;
	usageStore?: UsageStore;
	taskId: string;
	signal?: AbortSignal;
	onDelta?: (delta: StreamDelta) => void;
	onToolCall?: (name: string, args: Record<string, unknown>) => void;
	onToolResult?: (name: string, result: ToolResult) => void;
}

/**
 * Build the `use_subagent` tool bound to the given runtime context.
 * The tool definition is static (safe for the model), but the handler is
 * created per-run so it captures the live provider/memory/terminal.
 */
export function buildSubagentTool(ctx: SubagentToolContext): AgentTool {
	return {
		definition: {
			name: 'use_subagent',
			description:
				'Delegate a focused sub-task to a specialized subagent and return its final answer. Available subagents: ' +
				(ctx.subagents.length
					? ctx.subagents.map((s) => `${s.name} (${s.description || 'no description'})`).join('; ')
					: '(none configured — add .claude/agents/*.md)') +
				'. Use when the task matches a subagent\u2019s specialty.',
			inputSchema: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'Subagent name, e.g. "code-reviewer"' },
					task: { type: 'string', description: 'The sub-task to delegate' },
				},
				required: ['name', 'task'],
			},
		},
		async handler(args) {
			const name = String(args.name);
			const task = String(args.task ?? '');
			const sub = ctx.subagents.find((s) => s.name === name);
			if (!sub) {
				return {
					ok: false,
					output: `Unknown subagent "${name}". Available: ${ctx.subagents.map((s) => s.name).join(', ') || '(none)'}`,
				};
			}
			// Model pinned by the subagent (resolved aliases like sonnet) →
			// find a provider that serves it; otherwise the parent's pick.
			let provider: LLMProvider | undefined;
			if (sub.model) {
				const resolved = resolveClaudeModel(sub.model);
				// Only an actually-serving provider counts; anything else falls
				// through to pickProvider, which filters for usability (a
				// keyless remote would 401 on the first call).
				provider = ctx.providers.find((p) => p.defaultModel === resolved);
			}
			provider ??= ctx.pickProvider('executor');

			// The subagent's allowed tools (mapped from Claude names) filtered
			// to what's registered. Empty = inherit ALL_TOOLS (Claude default).
			// In read-only mode the subagent is restricted to inspection tools.
			const fullSet = sub.tools.length ? ALL_TOOLS.filter((t) => sub.tools.includes(t.definition.name)) : ALL_TOOLS;
			const toolSet = ctx.readOnly ? readOnlyTools(fullSet) : fullSet;
			const loop = new ChatLoop({
				provider,
				systemPrompt: `You are the "${sub.name}" subagent.\n\n${sub.systemPrompt}`,
				tools: toolSet,
				memory: ctx.memory,
				terminal: ctx.terminal,
				usageStore: ctx.usageStore,
				taskId: ctx.taskId,
				role: 'executor',
				signal: ctx.signal,
				maxToolCalls: sub.maxTurns,
				onDelta: ctx.onDelta,
				onToolCall: ctx.onToolCall,
				onToolResult: ctx.onToolResult,
			});
			try {
				const result = await loop.run(task);
				return { ok: true, output: result.finalContent || '(subagent produced no text)' };
			} catch (err) {
				return { ok: false, output: `subagent ${name} failed: ${err instanceof Error ? err.message : String(err)}` };
			}
		},
	};
}
