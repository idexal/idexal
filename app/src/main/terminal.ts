// Idexal — integrated terminal & Git
//
// Shell sessions run on a real PTY: job control, curses apps, colour from
// programs that check isatty, and a window size that can change. The
// renderer draws them with xterm.js, so raw escape sequences go through
// untouched in both directions.
//
// @lydell/node-pty ships N-API prebuilds per platform, so there is nothing
// to compile and no electron-rebuild step — one binary loads under both
// Node and Electron's ABI. If that binary is missing (unsupported platform,
// or `npm install --omit=optional`) we fall back to piped stdio, which
// still runs build/test/git commands. Degraded, but never broken.

import { ipcMain, WebContents } from 'electron';
import { spawn, execFile, execFileSync, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { getWorkspaceRoot } from './workspace';

const execFileAsync = promisify(execFile);

type PtyModule = typeof import('@lydell/node-pty');

let ptyLib: PtyModule | null = null;
try {
	ptyLib = require('@lydell/node-pty') as PtyModule;
} catch (err) {
	console.warn('[terminal] no PTY binary for this platform; using piped stdio:', err);
}

type Session =
	| { kind: 'pty'; id: string; proc: import('@lydell/node-pty').IPty; sender: WebContents }
	// The id is carried on the session because the piped path has to send
	// its own echo back on `terminal:data:<id>`.
	| { kind: 'pipe'; id: string; child: ChildProcess; sender: WebContents };

const sessions = new Map<string, Session>();

function shell(): { cmd: string; args: string[] } {
	if (process.platform === 'win32') return { cmd: process.env.COMSPEC || 'cmd.exe', args: [] };
	// `-i` only exists to force interactivity when stdio is a pipe; on a PTY
	// the shell works that out itself and the flag re-reads rc files.
	return { cmd: process.env.SHELL || '/bin/bash', args: ptyLib ? [] : ['-i'] };
}

function killSession(session: Session): void {
	if (session.kind === 'pipe') {
		session.child.kill();
		return;
	}
	// node-pty's Windows kill() is asynchronous — it forks a helper to
	// enumerate the console's process list before killing anything — so on
	// quit the app exits first and the shell is left behind. Verified: with
	// kill() alone, cmd.exe outlived the closed window. taskkill returns
	// only once the tree is gone, and /T takes with it whatever the shell
	// was running.
	if (process.platform === 'win32') {
		try {
			execFileSync('taskkill', ['/pid', String(session.proc.pid), '/T', '/F'], { stdio: 'ignore' });
		} catch {
			// Non-zero exit just means the tree was already gone.
		}
		return;
	}
	try {
		session.proc.kill();
	} catch {
		// Already gone.
	}
}

/**
 * Send a keystroke to a piped shell, doing by hand the two things a real
 * terminal would have done for us.
 *
 * A pipe has no line discipline and no echo, and neither absence is
 * cosmetic. Verified by running with the native binary moved aside: the
 * user typed a whole command and saw nothing, and pressing Enter did
 * nothing at all — xterm sends a lone CR, which a piped shell does not
 * treat as the end of a line, so the command was never submitted. The
 * fallback existed but had never been exercised.
 */
function writeToPipe(session: Extract<Session, { kind: 'pipe' }>, data: string): boolean {
	const stdin = session.child.stdin;
	// Returning false rather than swallowing it: the write handler used to
	// answer `ok: true` whether or not anything had been written, which is
	// the same class of lie as a background command reporting success it
	// never had.
	if (!stdin || stdin.destroyed) return false;
	const echo = (text: string) => {
		if (!session.sender.isDestroyed()) session.sender.send(`terminal:data:${session.id}`, text);
	};

	for (const ch of data) {
		if (ch === '\r' || ch === '\n') {
			// CRLF for the shell, CRLF for the display: xterm needs the CR to
			// return the cursor to column one.
			stdin.write('\r\n');
			echo('\r\n');
		} else if (ch === '\x7f' || ch === '\b') {
			// Nothing has reached the shell yet — the line is still buffered
			// here on its way — so a backspace only has to undo the echo.
			echo('\b \b');
		} else if (ch === '\x03') {
			// Ctrl-C cannot interrupt a piped child the way a terminal would;
			// say so instead of silently doing nothing.
			echo('^C\r\n[لا يمكن مقاطعة الأمر بدون PTY]\r\n');
		} else {
			stdin.write(ch);
			echo(ch);
		}
	}
	return true;
}

export function registerTerminalHandlers(): void {
	ipcMain.handle('terminal:start', (event, id: string, cols?: number, rows?: number) => {
		const cwd = getWorkspaceRoot() ?? process.cwd();
		const { cmd, args } = shell();
		const sender = event.sender;

		const send = (data: string) => {
			if (!sender.isDestroyed()) sender.send(`terminal:data:${id}`, data);
		};
		const finish = (code: number | null) => {
			if (!sender.isDestroyed()) sender.send(`terminal:exit:${id}`, code);
			sessions.delete(id);
		};

		// Starting an already-live session would orphan the old shell.
		const existing = sessions.get(id);
		if (existing) {
			killSession(existing);
			sessions.delete(id);
		}

		if (ptyLib) {
			const proc = ptyLib.spawn(cmd, args, {
				name: 'xterm-256color',
				cols: cols && cols > 0 ? cols : 80,
				rows: rows && rows > 0 ? rows : 24,
				cwd,
				// TERM is how POSIX programs decide which escapes they may
				// emit; ConPTY ignores it but passing it costs nothing.
				env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
			});
			proc.onData(send);
			proc.onExit(({ exitCode }) => finish(exitCode));
			sessions.set(id, { kind: 'pty', id, proc, sender });
			return { ok: true, cwd, pty: true };
		}

		const child = spawn(cmd, args, { cwd, env: process.env });
		child.stdout?.on('data', (chunk: Buffer) => send(chunk.toString()));
		child.stderr?.on('data', (chunk: Buffer) => send(chunk.toString()));
		child.on('exit', finish);
		// Reading from a pipe, cmd.exe echoes every command it is given, and
		// the fallback must echo keystrokes itself because a pipe has no
		// terminal echo — so each line appeared twice. Turning cmd's echo off
		// leaves ours as the only one, while `/Q` would also have taken the
		// banner and the prompt and left a blank screen that reads as broken.
		if (process.platform === 'win32') child.stdin?.write('@echo off' + String.fromCharCode(13, 10));
		sessions.set(id, { kind: 'pipe', id, child, sender });
		return { ok: true, cwd, pty: false };
	});

	ipcMain.handle('terminal:write', (_e, id: string, data: string) => {
		const session = sessions.get(id);
		if (!session) return { ok: false, error: 'no such terminal session' };
		if (session.kind === 'pty') {
			// A PTY does its own echo and line discipline; anything we added
			// here would be doubled.
			session.proc.write(data);
			return { ok: true };
		}
		writeToPipe(session, data);
		return { ok: true };
	});

	ipcMain.handle('terminal:resize', (_e, id: string, cols: number, rows: number) => {
		const session = sessions.get(id);
		// The renderer resizes on every layout change, including before the
		// shell exists — that is not worth an error.
		if (!session || session.kind !== 'pty') return { ok: true };
		if (!(cols > 0 && rows > 0)) return { ok: false, error: 'invalid size' };
		session.proc.resize(cols, rows);
		return { ok: true };
	});

	ipcMain.handle('terminal:stop', (_e, id: string) => {
		const session = sessions.get(id);
		if (session) {
			killSession(session);
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
	for (const session of sessions.values()) killSession(session);
	sessions.clear();
}
