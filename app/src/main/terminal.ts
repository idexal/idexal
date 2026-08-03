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
	// Read plus a deliberately narrow set of mutations: stage, unstage and
	// commit. No push, checkout or reset — those destroy or publish work,
	// and a confirm dialog is not enough of a guard for them. Every mutation
	// here is reversible with ordinary git commands.
	//
	// All paths come from our own `git status --porcelain` parse and are
	// passed through execFile's argument array (never a shell string), so a
	// filename can't inject flags or commands.

	ipcMain.handle('git:status', async () => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		try {
			const { stdout: branch } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
			const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd });
			const files = status
				.split('\n')
				.filter((l) => l.trim())
				.map((line) => {
					// Porcelain v1: column 0 is the index (staged) state,
					// column 1 the worktree state. Collapsing them with
					// trim() loses exactly the distinction the UI needs to
					// know whether a file is already staged.
					const index = line[0] ?? ' ';
					const worktree = line[1] ?? ' ';
					// Renames read as "R  old -> new"; the new path is what
					// later commands must operate on.
					const raw = line.slice(3);
					const path = raw.includes(' -> ') ? raw.split(' -> ')[1] : raw;
					return {
						state: `${index}${worktree}`.trim(),
						path: path.replace(/^"|"$/g, ''),
						staged: index !== ' ' && index !== '?',
						untracked: index === '?',
					};
				});
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
			// `--` separates paths from revisions, so a file named like a
			// branch can't be reinterpreted as one.
			const { stdout } = await execFileAsync('git', ['diff', 'HEAD', '--', file], {
				cwd,
				maxBuffer: 5 * 1024 * 1024,
			});
			return { ok: true, diff: stdout };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('git:stage', async (_e, file: string) => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		if (!file) return { ok: false, error: 'no file given' };
		try {
			await execFileAsync('git', ['add', '--', file], { cwd });
			return { ok: true };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('git:unstage', async (_e, file: string) => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		if (!file) return { ok: false, error: 'no file given' };
		try {
			// `restore --staged` only touches the index, never the working
			// tree, so unstaging can't discard the user's edits.
			await execFileAsync('git', ['restore', '--staged', '--', file], { cwd });
			return { ok: true };
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}
	});

	ipcMain.handle('git:commit', async (_e, message: string) => {
		const cwd = getWorkspaceRoot();
		if (!cwd) return { ok: false, error: 'no workspace open' };
		if (!message || !message.trim()) return { ok: false, error: 'commit message is empty' };
		try {
			const { stdout } = await execFileAsync('git', ['commit', '-m', message.trim()], { cwd });
			return { ok: true, output: stdout.trim() };
		} catch (err) {
			// "nothing to commit" arrives as a non-zero exit; surface git's
			// own wording rather than inventing one.
			const e = err as { stdout?: string; stderr?: string; message?: string };
			return { ok: false, error: (e.stdout || e.stderr || e.message || 'commit failed').trim() };
		}
	});
}

/** Kill every live shell on quit so no orphan processes survive the app. */
export function disposeTerminals(): void {
	for (const { child } of sessions.values()) child.kill();
	sessions.clear();
}
