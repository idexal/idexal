// Idexal Agent extension — shared protocol types
// Mirrors the NDJSON events emitted by `idexal-ai stream "<task>"` (see
// idexal/ai-core/src/cli.ts) plus the AI Core TaskStep / StreamDelta shapes.

export type TaskStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskStep {
	id: number;
	description: string;
	status: TaskStepStatus;
	result?: string;
	assignee?: string;
}

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
}

/** One delta from the AI Core streaming engine. */
export type StreamDelta =
	| { type: 'text'; text: string }
	| { type: 'toolCall'; toolCall: { id: string; name: string; arguments: string } }
	| { type: 'usage'; usage: TokenUsage }
	| { type: 'provider'; providerId: string; displayName?: string }
	| { type: 'error'; error: string }
	| { type: 'done'; usage?: TokenUsage };

/** A single NDJSON event line produced by `idexal-ai stream`. */
export type StreamEvent =
	| { type: 'start'; providers: string[] }
	| { type: 'plan'; steps: TaskStep[] }
	| { type: 'step-status'; step: TaskStep }
	| { type: 'agent-start'; name: string }
	| { type: 'agent-end'; name: string; summary: string }
	| { type: 'tool-call'; step: number; name: string; args: Record<string, unknown> }
	| { type: 'tool-result'; step: number; name: string; ok: boolean; output: string }
	| { type: 'review'; verdict: string }
	| { type: 'terminal-start'; id: string; command: string }
	| { type: 'terminal-output'; id: string; output: string }
	| { type: 'terminal-exit'; id: string; exitCode: number | null }
	| { type: 'delta'; delta: StreamDelta }
	| {
			type: 'usage';
			taskId: string;
			totals: { calls: number; failed: number; inputTokens: number; outputTokens: number; costUsd: number; avgLatencyMs: number };
			perProvider: Array<{
				providerId: string;
				calls: number;
				failed: number;
				inputTokens: number;
				outputTokens: number;
				costUsd: number;
				avgLatencyMs: number;
				lastUsed: number;
			}>;
	  }
	| { type: 'done'; summary: string; steps: TaskStep[]; elapsedSeconds: number }
	| { type: 'error'; error: string };
