// Idexal Agent extension — AI Core client
// Spawns the Idexal AI Core CLI (`node <ai-core>/src/cli.ts stream "<task>"`)
// as a child process and parses the NDJSON events it emits on stdout.
// The AI Core is discovered from $IDEXAL_AI_CORE, the `idexal.aiCorePath`
// setting, or a `idexal/ai-core` checkout next to this extension.

import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as vscode from 'vscode';
import type { StreamEvent, TaskStepStatus } from './types';

export interface ResolvedRuntime {
	nodePath: string;
	cliPath: string;
}

/**
 * Locate the Node executable used to run the AI Core:
 * `idexal.nodePath` setting → $IDEXAL_NODE → `node` on PATH.
 */
export function resolveNodePath(): string {
	const fromSetting = vscode.workspace.getConfiguration('idexal').get<string>('nodePath');
	if (fromSetting) return fromSetting;
	if (process.env.IDEXAL_NODE) return process.env.IDEXAL_NODE;
	// On Windows `node` resolves to node.exe via PATH.
	return process.platform === 'win32' ? 'node.exe' : 'node';
}

/**
 * Locate the AI Core CLI entry (`src/cli.ts`). Priority:
 * `idexal.aiCorePath` setting → $IDEXAL_AI_CORE → a `idexal/ai-core` folder
 * next to this extension (dev checkout layout: extensions/idexal-agent ←
 * extensions/ ← repo root ← idexal/ai-core).
 */
export function resolveCliPath(extensionUri: vscode.Uri): string {
	const fromSetting = vscode.workspace.getConfiguration('idexal').get<string>('aiCorePath');
	const candidates: string[] = [];
	if (fromSetting) candidates.push(fromSetting);
	if (process.env.IDEXAL_AI_CORE) candidates.push(process.env.IDEXAL_AI_CORE);

	// Dev layout: walk up from the extension directory.
	let dir = path.dirname(extensionUri.fsPath);
	for (let i = 0; i < 6; i++) {
		candidates.push(path.join(dir, 'idexal', 'ai-core'));
		dir = path.dirname(dir);
	}

	for (const candidate of candidates) {
		const cli = normalizeCliCandidate(candidate);
		if (cli) return cli;
	}
	throw new Error(
		'Could not find the Idexal AI Core (src/cli.ts). Set the `idexal.aiCorePath` setting or the $IDEXAL_AI_CORE environment variable.',
	);
}

function normalizeCliCandidate(candidate: string): string | undefined {
	if (!candidate) return undefined;
	if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
		return candidate;
	}
	if (fs.existsSync(candidate)) {
		const asDirCli = path.join(candidate, 'src', 'cli.ts');
		if (fs.existsSync(asDirCli)) return asDirCli;
		const asDirCliDirect = path.join(candidate, 'cli.ts');
		if (fs.existsSync(asDirCliDirect)) return asDirCliDirect;
	}
	return undefined;
}

export interface RunTaskOptions {
	task: string;
	cwd: string;
	onEvent: (event: StreamEvent) => void;
	onError: (message: string) => void;
	onExit: (code: number | null) => void;
	token?: vscode.CancellationToken;
	/** AbortSignal that kills the child when fired — used by the Cancel button
	 * / `idexal.cancelTask` so cancellation terminates the AI Core process
	 * (not just the chat token, which is the only other kill source). */
	signal?: AbortSignal;
	/** Emit the plan only (`stream --plan-only`) — no step is executed. */
	planOnly?: boolean;
	/** Inspection tools only (`stream --read-only`) — no writes/commands. */
	readOnly?: boolean;
}

/**
 * Runs one task through the AI Core streaming CLI. Resolves when the child
 * process exits. Events (plan / step-status / delta / done …) are delivered
 * via `onEvent` as they arrive.
 */
export function runTask(runtime: ResolvedRuntime, opts: RunTaskOptions): Promise<void> {
	return new Promise<void>((resolve) => {
		// `stream --plan-only "<task>"` for /idexal:plan: the core emits the
		// plan event and stops without executing a step. `--read-only` for
		// /idexal:review: executors get inspection tools only.
		const coreArgs = [
			runtime.cliPath,
			'stream',
			...(opts.planOnly ? ['--plan-only'] : []),
			...(opts.readOnly ? ['--read-only'] : []),
			opts.task,
		];
		const child = child_process.spawn(runtime.nodePath, coreArgs, {
				cwd: opts.cwd,
				windowsHide: true,
				env: process.env,
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);

		// Cancellation: kill the child (the core aborts the orchestrator).
		// Both the chat cancellation token AND the controller's signal (used
		// by the Cancel button / `idexal.cancelTask`) terminate the process.
		const kill = () => child.kill();

		let settled = false;
		// Declared before `finish` so the closure always sees it (disposed on
		// settle so it never outlives the run).
		let cancellationListener: vscode.Disposable | undefined;
		const finish = (code: number | null) => {
			if (settled) return;
			settled = true;
			cancellationListener?.dispose();
			opts.signal?.removeEventListener('abort', kill);
			opts.onExit(code);
			resolve();
		};

		// Parse NDJSON lines from stdout.
		if (child.stdout) {
			const rl = readline.createInterface({ input: child.stdout });
			rl.on('line', (line) => {
				const trimmed = line.trim();
				if (!trimmed) return;
				try {
					const event = JSON.parse(trimmed) as StreamEvent;
					opts.onEvent(event);
				} catch {
					// Non-JSON line (e.g. stray warning) — ignore.
				}
			});
		}

		let stderr = '';
		if (child.stderr) {
			child.stderr.on('data', (chunk: Buffer) => {
				stderr += chunk.toString();
			});
		}

		child.on('error', (err) => {
			opts.onError(`Failed to start the Idexal AI Core: ${err.message}`);
			finish(null);
		});
		child.on('exit', (code) => {
			if (code !== 0 && !stderr.trim()) {
				// Exit with an error but no diagnostics: surface the code.
				opts.onError(`Idexal AI Core exited with code ${code ?? 'unknown'}.`);
			} else if (code !== 0 && stderr.trim()) {
				opts.onError(stderr.trim().split('\n').pop() ?? `Idexal AI Core exited with code ${code}`);
			}
			finish(code);
		});

		cancellationListener = opts.token?.onCancellationRequested(kill);
		opts.signal?.addEventListener('abort', kill, { once: true });
		// A signal that already fired before we subscribed must kill too.
		if (opts.signal?.aborted) kill();
	});
}

export const STEP_ICONS: Record<TaskStepStatus, vscode.ThemeIcon> = {
	pending: new vscode.ThemeIcon('circle-outline'),
	running: new vscode.ThemeIcon('sync~spin'),
	done: new vscode.ThemeIcon('check'),
	failed: new vscode.ThemeIcon('error'),
};
