// Idexal — session IPC
//
// Lets the sidebar survive a restart: the core owns the conversation
// store, so the app reads sessions from it rather than keeping a second,
// divergent copy in renderer memory.

import { ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import { resolveCoreBinary } from './core';

interface CoreJsonResult {
	ok: boolean;
	data?: unknown;
	error?: string;
}

/** Run the core with args that print ONE JSON document and parse it. */
function runCoreJson(args: string[]): Promise<CoreJsonResult> {
	return new Promise((resolve) => {
		let core: string;
		try {
			core = resolveCoreBinary();
		} catch (err) {
			resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
			return;
		}
		const child = spawn(core, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		let out = '';
		let err = '';
		child.stdout.on('data', (c: Buffer) => (out += c.toString()));
		child.stderr.on('data', (c: Buffer) => (err += c.toString()));
		child.on('error', (e) => resolve({ ok: false, error: e.message }));
		child.on('close', (code) => {
			if (code !== 0) {
				resolve({ ok: false, error: err.trim() || `exit ${code}` });
				return;
			}
			try {
				resolve({ ok: true, data: JSON.parse(out.trim() || 'null') });
			} catch {
				resolve({ ok: false, error: 'core returned non-JSON' });
			}
		});
	});
}

export function registerSessionHandlers(): void {
	ipcMain.handle('sessions:list', () => runCoreJson(['sessions']));
	ipcMain.handle('sessions:show', (_e, id: string) => runCoreJson(['sessions', 'show', id]));
	ipcMain.handle('sessions:delete', (_e, id: string) => runCoreJson(['sessions', 'delete', id]));
}
