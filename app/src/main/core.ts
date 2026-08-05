// Idexal — shared core-binary helpers (main process)
//
// resolveCoreBinary is used by index.ts (agent streaming), settings.ts
// (config load/save, provider testing) and usage.ts. Kept in one place so
// the binary resolution rules never drift between callers.

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function resolveCoreBinary(): string {
	const exeName = process.platform === 'win32' ? 'idexal-core.exe' : 'idexal-core';
	const candidates = [
		// Installed app: electron-builder copies the engine here. It is first
		// so a packaged Idexal can never pick up a stale build tree that
		// happens to be on the same machine.
		path.join(process.resourcesPath ?? '', 'core', exeName),
		// Development: release before debug, so an installed build never
		// loses to a stale debug one.
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'release', exeName),
		path.join(__dirname, '..', '..', '..', 'core', 'target', 'debug', exeName),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error(
		`Could not find the idexal-core binary. Build it first: cd core && cargo build (looked in: ${candidates.join(', ')})`,
	);
}

export interface CoreJsonResult {
	ok: boolean;
	data?: unknown;
	error?: string;
}

/**
 * Run the core with args that produce ONE JSON document on stdout and parse
 * it. `config`, `test`, `usage` and `undo` print pretty JSON, not NDJSON —
 * this is the channel for those, as opposed to the NDJSON task stream.
 */
export function runCoreJson(args: string[], cwd?: string): Promise<CoreJsonResult> {
	return new Promise((resolve) => {
		let corePath: string;
		try {
			corePath = resolveCoreBinary();
		} catch (err) {
			resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
			return;
		}
		// `cwd` matters for anything workspace-relative: checkpoints live in
		// `.idexal/` inside the project, so running from the wrong directory
		// silently reports "nothing to undo".
		const child = spawn(corePath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
		let out = '';
		let err = '';
		child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()));
		child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()));
		child.on('close', (code) => {
			if (code !== 0) {
				resolve({ ok: false, error: err.trim() || `idexal-core exited with code ${code}` });
				return;
			}
			try {
				resolve({ ok: true, data: JSON.parse(out.trim()) });
			} catch {
				resolve({ ok: false, error: 'idexal-core returned non-JSON output' });
			}
		});
		child.on('error', (e) => resolve({ ok: false, error: `failed to start idexal-core: ${e.message}` }));
	});
}
