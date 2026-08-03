// Idexal AI Core — Agent Terminal manager
// Owns real, long-running shell processes the agent can start, watch, and
// interact with:
//   • terminal_start  — spawn a command in the background (dev server, watcher,
//     build, …). The process keeps running while the agent does other work.
//   • terminal_output — drain the NEW output since the last read (optionally
//     waiting up to waitMs for more — e.g. "wait until the server prints ready").
//   • terminal_send   — write to the process stdin (answer prompts, send
//     Ctrl+C/interrupt keys) for genuinely interactive commands.
//   • terminal_stop   — kill the process tree (taskkill on Windows).
// Output is captured into a bounded ring buffer; every chunk is also pushed
// through `onEvent` as a `terminal-output` event so UIs (CLI, VS Code
// extension) can show live output while the agent works.

import * as cp from 'node:child_process';

export interface TerminalInfo {
	id: string;
	command: string;
	status: 'running' | 'exited';
	exitCode: number | null;
	startedAt: number;
	cwd: string;
}

export type TerminalEvent =
	| { type: 'terminal-start'; id: string; command: string }
	| { type: 'terminal-output'; id: string; output: string }
	| { type: 'terminal-exit'; id: string; exitCode: number | null };	/** Max chars of output kept per terminal (ring buffer; oldest is dropped). */
const MAX_BUFFER = 100_000;
/** Inserted at the top of the ring buffer when overflow drops content, so a
 * drain never silently returns "(no new output)" for output the agent missed. */
const TRUNCATION_MARKER = '\n… [output truncated] …\n';

interface ManagedTerminal extends TerminalInfo {
	child: cp.ChildProcess;
	buffer: string;
	/** Char offset into `buffer` consumed by the last terminal_output drain. */
	readOffset: number;
}

export class TerminalManager {
	private readonly terminals = new Map<string, ManagedTerminal>();
	private counter = 0;
	/** Every lifecycle event (start / output chunk / exit) goes to all
	 * listeners — the manager may be shared across runs (interactive session
	 * reuses one manager for every task), so a single-slot callback would
	 * silently drop events for earlier/later consumers. */
	private readonly listeners: Array<(event: TerminalEvent) => void> = [];

	/** Register a lifecycle-event listener (start / output / exit). */
	addListener(fn: (event: TerminalEvent) => void): void {
		this.listeners.push(fn);
	}

	private emit(event: TerminalEvent): void {
		for (const fn of this.listeners) fn(event);
	}

	/** Spawn a long-running command in the background. Returns its terminal id. */
	start(command: string, cwd: string): string {
		const id = `t${++this.counter}`;
		// `shell: true` (not manual ['/c', command] argv): on Windows Node
		// spawns `cmd.exe /d /s /c "command"` with correct quoting — manual
		// argv forms mangle commands that begin with a quoted path (e.g.
		// "C:\Program Files\node\node.exe" "script"), failing with "The
		// network path was not found". On Unix it runs `/bin/sh -c command`.
		const child = cp.spawn(command, {
			cwd,
			env: process.env,
			shell: true,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
		});
		const term: ManagedTerminal = {
			id,
			command,
			status: 'running',
			exitCode: null,
			startedAt: Date.now(),
			cwd,
			child,
			buffer: '',
			readOffset: 0,
		};
		this.terminals.set(id, term);
		this.emit({ type: 'terminal-start', id, command });
		child.stdout?.on('data', (d: Buffer) => this.onData(term, d.toString()));
		child.stderr?.on('data', (d: Buffer) => this.onData(term, d.toString()));
		child.on('error', () => this.onExit(term, null));
		child.on('exit', (code) => this.onExit(term, code));
		return id;
	}

	private onData(term: ManagedTerminal, chunk: string): void {
		term.buffer += chunk;
		if (term.buffer.length > MAX_BUFFER) {
			const keep = MAX_BUFFER - TRUNCATION_MARKER.length;
			const excess = term.buffer.length - keep;
			// If the agent had NOT yet read content that we're about to drop,
			// pin readOffset at the marker so the next drain surfaces the
			// truncation instead of silently returning "(no new output)".
			const droppedUnread = Math.max(0, excess - term.readOffset);
			term.buffer = TRUNCATION_MARKER + term.buffer.slice(excess);
			term.readOffset =
				droppedUnread > 0 ? TRUNCATION_MARKER.length : TRUNCATION_MARKER.length + (term.readOffset - excess);
		}
		this.emit({ type: 'terminal-output', id: term.id, output: chunk });
	}

	private onExit(term: ManagedTerminal, exitCode: number | null): void {
		if (term.status !== 'running') return;
		term.status = 'exited';
		term.exitCode = exitCode;
		this.emit({ type: 'terminal-exit', id: term.id, exitCode });
	}

	get(id: string): TerminalInfo | undefined {
		return this.terminals.get(id);
	}

	list(): TerminalInfo[] {
		return [...this.terminals.values()].map((t) => ({
			id: t.id,
			command: t.command,
			status: t.status,
			exitCode: t.exitCode,
			startedAt: t.startedAt,
			cwd: t.cwd,
		}));
	}

	/** Return the output produced since the last drain, plus running state. */
	drain(id: string): { output: string; running: boolean; exitCode: number | null } {
		const term = this.terminals.get(id);
		if (!term) throw new Error(`Unknown terminal: ${id}`);
		const output = term.buffer.slice(term.readOffset);
		term.readOffset = term.buffer.length;
		return { output, running: term.status === 'running', exitCode: term.exitCode };
	}

	/** Write input to a running terminal's stdin. False if it already exited. */
	send(id: string, input: string): boolean {
		const term = this.terminals.get(id);
		if (!term) throw new Error(`Unknown terminal: ${id}`);
		if (term.status !== 'running' || !term.child.stdin?.writable) return false;
		term.child.stdin.write(input);
		return true;
	}

	/** Stop a terminal, killing its process tree (taskkill /T /F on Windows). */
	stop(id: string): boolean {
		const term = this.terminals.get(id);
		if (!term) return false;
		if (term.status === 'running' && term.child.pid) {
			if (process.platform === 'win32') {
				try {
					cp.execSync(`taskkill /pid ${term.child.pid} /T /F`, { stdio: 'ignore' });
				} catch {
					term.child.kill();
				}
			} else {
				term.child.kill('SIGTERM');
			}
		}
		return true;
	}

	/** Stop every terminal (session cleanup — no orphaned processes). */
	closeAll(): void {
		for (const id of [...this.terminals.keys()]) {
			this.stop(id);
		}
		this.terminals.clear();
	}
}
