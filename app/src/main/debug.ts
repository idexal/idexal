// Idexal — debugger (main process)
//
// Debugging a Node/JS program by driving V8's own inspector over CDP.
//
// Why CDP and not the Debug Adapter Protocol: DAP is the right long-term
// answer for many languages, but every DAP adapter is a separate binary the
// user must install first (js-debug, debugpy, codelldb). V8's inspector
// ships inside the `node` already on the machine, so this works the moment
// the app opens with nothing to install. The IPC surface below is shaped
// like DAP's — start/continue/step/breakpoints/stack/variables — so a DAP
// backend can be added beside this one without changing the renderer.
//
// Scope, stated plainly: JavaScript and TypeScript-via-node only. Python,
// Rust and the rest need DAP adapters and are not covered here.

import { ipcMain, WebContents } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import WebSocket from 'ws';
import { getWorkspaceRoot } from './workspace';

interface Session {
	child: ChildProcess;
	ws: WebSocket;
	sender: WebContents;
	/** scriptId → file URL, filled from Debugger.scriptParsed. */
	scripts: Map<string, string>;
	nextId: number;
	pending: Map<number, (result: unknown, error?: string) => void>;
	/** Breakpoints the user set before the program started. */
	breakpoints: Array<{ file: string; line: number }>;
	/** breakpointId → where the user put it, so a later resolution can be
	 *  reported against the line they actually clicked. */
	pendingBreakpoints: Map<string, { file: string; line: number }>;
}

let session: Session | null = null;

/** V8 reports 0-based lines; every UI in the world shows 1-based. The
 *  conversion happens here so it can never be applied twice. */
const toV8Line = (line: number) => Math.max(0, line - 1);
const toUiLine = (line: number) => line + 1;

function send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
	return new Promise((resolve, reject) => {
		if (!session) {
			reject(new Error('no debug session'));
			return;
		}
		const id = session.nextId++;
		session.pending.set(id, (result, error) => (error ? reject(new Error(error)) : resolve(result)));
		session.ws.send(JSON.stringify({ id, method, params }));
	});
}

function emit(event: string, payload: unknown): void {
	if (session && !session.sender.isDestroyed()) session.sender.send(`debug:${event}`, payload);
}

/**
 * Read the variables of one call frame.
 *
 * Only the local and closure scopes are expanded: `global` holds hundreds of
 * entries and would bury the handful the user is actually looking at.
 */
async function frameVariables(frame: {
	scopeChain?: Array<{ type: string; object?: { objectId?: string } }>;
}): Promise<Array<{ scope: string; name: string; value: string }>> {
	const out: Array<{ scope: string; name: string; value: string }> = [];
	for (const scope of frame.scopeChain ?? []) {
		if (scope.type !== 'local' && scope.type !== 'closure') continue;
		const objectId = scope.object?.objectId;
		if (!objectId) continue;
		try {
			const res = (await send('Runtime.getProperties', {
				objectId,
				ownProperties: true,
				generatePreview: true,
			})) as { result?: Array<{ name: string; value?: { description?: string; value?: unknown; type: string } }> };
			for (const prop of res.result ?? []) {
				const v = prop.value;
				out.push({
					scope: scope.type,
					name: prop.name,
					value: v?.description ?? (v?.value === undefined ? v?.type ?? '' : String(v.value)),
				});
			}
		} catch {
			// A scope that cannot be read is not worth failing the pause over.
		}
	}
	return out;
}

async function onPaused(params: {
	callFrames?: Array<{
		callFrameId: string;
		functionName: string;
		location: { scriptId: string; lineNumber: number; columnNumber?: number };
		scopeChain?: Array<{ type: string; object?: { objectId?: string } }>;
	}>;
	reason?: string;
}): Promise<void> {
	const frames = params.callFrames ?? [];
	const stack = frames.map((f) => ({
		name: f.functionName || '(anonymous)',
		url: session?.scripts.get(f.location.scriptId) ?? '',
		line: toUiLine(f.location.lineNumber),
	}));
	const variables = frames[0] ? await frameVariables(frames[0]) : [];
	emit('paused', { reason: params.reason ?? 'other', stack, variables });
}

/**
 * Set a breakpoint.
 *
 * The returned `locations` array is empty whenever the script has not been
 * compiled yet — which is the normal case here, because breakpoints are set
 * while the program is still paused at its first line. Empty therefore means
 * **pending**, not failed: V8 binds it on `Debugger.scriptParsed` and
 * announces it with `Debugger.breakpointResolved`. (Verified by running:
 * a breakpoint reported with zero locations still stopped execution on
 * exactly the right line.) Reporting that as "could not bind" would tell the
 * user their breakpoint was ignored while it was in fact about to fire.
 *
 * The URL is matched by regex on the file's own path rather than by exact
 * equality: on Windows the same file has several spellings V8 may report
 * (drive-letter case, and short 8.3 names like LAHBAB~1).
 */
async function applyBreakpoint(file: string, line: number): Promise<{ id: string | null; resolved: boolean }> {
	const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\\/g, '[\\\\/]');
	const res = (await send('Debugger.setBreakpointByUrl', {
		urlRegex: escaped,
		lineNumber: toV8Line(line),
	})) as { breakpointId?: string; locations?: unknown[] };
	return { id: res.breakpointId ?? null, resolved: (res.locations?.length ?? 0) > 0 };
}

async function attach(
	child: ChildProcess,
	wsUrl: string,
	sender: WebContents,
	breakpoints: Array<{ file: string; line: number }>,
): Promise<void> {
	const socket = new WebSocket(wsUrl);
	session = {
		child,
		ws: socket,
		sender,
		scripts: new Map(),
		nextId: 1,
		pending: new Map(),
		breakpoints,
		pendingBreakpoints: new Map(),
	};

	socket.on('message', (raw: Buffer) => {
		let msg: { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message: string } };
		try {
			msg = JSON.parse(raw.toString());
		} catch {
			return;
		}
		if (msg.id !== undefined) {
			const waiting = session?.pending.get(msg.id);
			if (waiting) {
				session?.pending.delete(msg.id);
				waiting(msg.result, msg.error?.message);
			}
			return;
		}
		switch (msg.method) {
			case 'Debugger.scriptParsed': {
				const p = msg.params as { scriptId: string; url: string };
				session?.scripts.set(p.scriptId, p.url);
				break;
			}
			case 'Debugger.paused':
				void onPaused(msg.params as Parameters<typeof onPaused>[0]);
				break;
			case 'Debugger.resumed':
				emit('resumed', {});
				break;
			case 'Debugger.breakpointResolved': {
				// A breakpoint set before its script was compiled binds here.
				const p = msg.params as { breakpointId: string };
				const where = session?.pendingBreakpoints.get(p.breakpointId);
				if (where) {
					session?.pendingBreakpoints.delete(p.breakpointId);
					emit('breakpoint', { ...where, bound: true });
				}
				break;
			}
			case 'Runtime.consoleAPICalled': {
				const p = msg.params as { type: string; args?: Array<{ value?: unknown; description?: string }> };
				const text = (p.args ?? []).map((a) => a.description ?? String(a.value ?? '')).join(' ');
				emit('output', { channel: p.type, text });
				break;
			}
		}
	});

	await new Promise<void>((resolve, reject) => {
		socket.once('open', () => resolve());
		socket.once('error', (e: Error) => reject(e));
	});

	await send('Runtime.enable');
	await send('Debugger.enable');
	// Breakpoints go in before the program is let go, or it runs past them.
	const root = getWorkspaceRoot() ?? '';
	for (const bp of breakpoints) {
		try {
			const { id, resolved } = await applyBreakpoint(path.resolve(root, bp.file), bp.line);
			// Pending is the normal state at this point — the program is
			// still on its first line and nothing has been compiled. It is
			// reported as pending, not as bound and not as failed.
			if (resolved) emit('breakpoint', { file: bp.file, line: bp.line, bound: true });
			else if (id) session?.pendingBreakpoints.set(id, { file: bp.file, line: bp.line });
		} catch (err) {
			emit('breakpoint', { file: bp.file, line: bp.line, bound: false, error: String(err) });
		}
	}
	await send('Runtime.runIfWaitingForDebugger');
	emit('started', { breakpoints: breakpoints.length });
}

function teardown(reason: string, code: number | null = null): void {
	if (!session) return;
	const sender = session.sender;
	try {
		session.ws.close();
	} catch {
		/* already closed */
	}
	try {
		session.child.kill();
	} catch {
		/* already gone */
	}
	session = null;
	if (!sender.isDestroyed()) sender.send('debug:terminated', { reason, code });
}

export function registerDebugHandlers(): void {
	ipcMain.handle(
		'debug:start',
		async (event, file: string, breakpoints: Array<{ file: string; line: number }> = []) => {
			if (session) return { ok: false, error: 'a debug session is already running' };
			const root = getWorkspaceRoot();
			if (!root) return { ok: false, error: 'no workspace is open' };
			const abs = path.resolve(root, file);
			if (abs !== root && !abs.startsWith(root + path.sep)) {
				return { ok: false, error: 'the script must live inside the workspace' };
			}

			// Port 0 lets the OS pick; the real one is printed on stderr.
			const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', abs], {
				cwd: root,
				// ELECTRON_RUN_AS_NODE makes Electron's bundled binary behave
				// as plain node, so debugging works without a separate Node
				// installation on the user's machine.
				env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			const sender = event.sender;
			// Output can arrive before the inspector handshake completes, so
			// it goes straight to the sender rather than through emit(),
			// which needs a fully built session.
			const say = (channel: string, text: string) => {
				if (!sender.isDestroyed()) sender.send('debug:output', { channel, text });
			};
			child.stdout?.on('data', (c: Buffer) => say('stdout', c.toString()));
			child.on('exit', (code) => {
				if (session) teardown('exited', code);
				else if (!sender.isDestroyed()) sender.send('debug:terminated', { reason: 'exited', code });
			});

			const wsUrl = await new Promise<string | null>((resolve) => {
				let buffer = '';
				const timer = setTimeout(() => resolve(null), 10_000);
				child.stderr?.on('data', (chunk: Buffer) => {
					const text = chunk.toString();
					buffer += text;
					// Anything that is not the handshake line is real program
					// output and must still reach the user.
					if (!/Debugger listening|Debugger attached|For help, see/.test(text)) {
						say('stderr', text);
					}
					const match = buffer.match(/ws:\/\/[^\s]+/);
					if (match) {
						clearTimeout(timer);
						resolve(match[0]);
					}
				});
			});

			if (!wsUrl) {
				try { child.kill(); } catch { /* already gone */ }
				return { ok: false, error: 'the program did not open an inspector port' };
			}

			try {
				await attach(child, wsUrl, sender, breakpoints);
			} catch (err) {
				teardown('attach-failed');
				try { child.kill(); } catch { /* already gone */ }
				return { ok: false, error: err instanceof Error ? err.message : String(err) };
			}
			return { ok: true, file: abs };
		},
	);

	const command = (channel: string, method: string) =>
		ipcMain.handle(channel, async () => {
			if (!session) return { ok: false, error: 'no debug session' };
			try {
				await send(method);
				return { ok: true };
			} catch (err) {
				return { ok: false, error: err instanceof Error ? err.message : String(err) };
			}
		});

	command('debug:continue', 'Debugger.resume');
	command('debug:step-over', 'Debugger.stepOver');
	command('debug:step-into', 'Debugger.stepInto');
	command('debug:step-out', 'Debugger.stepOut');

	ipcMain.handle('debug:set-breakpoint', async (_e, file: string, line: number) => {
		if (!session) return { ok: false, error: 'no debug session' };
		const root = getWorkspaceRoot();
		if (!root) return { ok: false, error: 'no workspace is open' };
		try {
			const { id, resolved } = await applyBreakpoint(path.resolve(root, file), line);
			if (!resolved && id) session?.pendingBreakpoints.set(id, { file, line });
			return { ok: true, bound: resolved };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('debug:stop', async () => {
		teardown('stopped');
		return { ok: true };
	});

	ipcMain.handle('debug:state', async () => ({ ok: true, running: session !== null }));
}

/** Kill any live debuggee on quit, like the terminal does. */
export function disposeDebug(): void {
	teardown('app-quit');
}
