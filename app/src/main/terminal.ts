// Idexal — integrated terminal & Git
//
// Shell sessions run as child processes with piped stdio. This is not a
// full PTY (no curses apps, no job control) — a real PTY needs a native
// module, which is a deliberate later step; piped stdio covers the
// overwhelmingly common case of running build/test/git commands and keeps
// the app free of native build dependencies for now.

import { ipcMain, WebContents } from 'electron';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { getWorkspaceRoot } from './workspace';

const execFileAsync = promisify(execFile);

interface Session {
	child: ChildProcess;
	sender: WebContents;
}

const sessions = new Map<string, Session>();

function shell(): { cmd: string; args: string[] } {
	return process.platform === 'win32'
		? { cmd: process.env.COMSPEC || 'cmd.exe', args: [] }
		: { cmd: process.env.SHELL || '/bin/bash', args: ['-i'] };
}

export function registerTerminalHandlers(): void {
	ipcMain.handle('terminal:start', (event, id: string) => {
		const cwd = getWorkspaceRoot() ?? process.cwd();
		const { cmd, args } = shell();
		const child = spawn(cmd, args, { cwd, env: process.env });
		const sender = event.sender;

		const send = (data: string) => {
			if (!sender.isDestroyed()) sender.send(`terminal:data:${id}`, data);
		};
		child.stdout?.on('data', (chunk: Buffer) => send(chunk.toString()));
		child.stderr?.on('data', (chunk: Buffer) => send(chunk.toString()));
		child.on('exit', (code) => {
			if (!sender.isDestroyed()) sender.send(`terminal:exit:${id}`, code);
			sessions.delete(id);
		});

		sessions.set(id, { child, sender });
		return { ok: true, cwd };
	});

	ipcMain.handle('terminal:write', (_e, id: string, data: string) => {
		const session = sessions.get(id);
		if (!session) return { ok: false, error: 'no such terminal session' };
		session.child.stdin?.write(data);
		return { ok: true };
	});

	ipcMain.handle('terminal:stop', (_e, id: string) => {
		const session = sessions.get(id);
		if (session) {
			session.child.kill();
			sessions.delete(id);
		}
		return { ok: true };
	});

	// --- Git ---------------------------------------------------------------
	// Read-only for now: status and diff. Mutating operations (commit,
	// push, checkout) are intentionally absent until there's UI to confirm
	// them — silently rewriting a user's repository is not acceptable.

	ipcMain.handle('git:status', async () => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		try {
			const { stdout: branch } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
			const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd });
			const files = status
				.split('\n')
				.filter((l) => l.trim())
				.map((line) => ({ state: line.slice(0, 2).trim(), path: line.slice(3) }));
			return { ok: true, branch: branch.trim(), files };
		} catch (err) {
			// Not a repo, or git isn't installed — both are normal states,
			// not errors worth a dialog.
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('git:diff', async (_e, file: string) => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		try {
			const { stdout } = await execFileAsync('git', ['diff', '--', file], { cwd, maxBuffer: 5 * 1024 * 1024 });
			return { ok: true, diff: stdout };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});
}

/** Kill every live shell on quit so no orphan processes survive the app. */
export function disposeTerminals(): void {
	for (const { child } of sessions.values()) child.kill();
	sessions.clear();
}
