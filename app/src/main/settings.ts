// Idexal — settings & provider management (main process)
//
// The settings page contract. Three channels, all backed by the same Rust
// core so the UI can never drift from what the engine actually reads:
//
//   settings:load           → idexal-core config   (effective merged config,
//                              NO api keys — only hasKey booleans)
//   settings:save           → writes ~/.idexal/config.json then re-runs
//                              `config` to prove the core still parses it
//   settings:test-provider  → idexal-core test <id>  (live round-trip)
//
// Security rule: secrets never travel to the renderer. The page renders from
// `config` output (hasKey flags only); literal keys typed in the page are
// accepted on save but never echoed back.

import { ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveCoreBinary } from './core';

/** Path the settings page persists to — mirrors core/src/config.rs. */
export function settingsConfigPath(): string {
	return path.join(os.homedir(), '.idexal', 'config.json');
}

interface CoreJsonResult {
	ok: boolean;
	data?: unknown;
	error?: string;
}

/**
 * Run the core with args that produce ONE JSON document on stdout and parse
 * it. `config` and `test` print pretty JSON, not NDJSON, so this is the
 * right channel for settings (as opposed to the NDJSON stream for tasks).
 */
function runCoreJson(args: string[]): Promise<CoreJsonResult> {
	return new Promise((resolve) => {
		let corePath: string;
		try {
			corePath = resolveCoreBinary();
		} catch (err) {
			resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
			return;
		}
		const child = spawn(corePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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

/** Drop empty optional fields (empty apiKey etc.) before persisting. */
function cleanProvider(p: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(p)) {
		if (value === undefined || value === null) continue;
		if (typeof value === 'string' && value.trim() === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;
		if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) continue;
		out[key] = value;
	}
	return out;
}

export function registerSettingsHandlers(): void {
	ipcMain.handle('settings:load', async () => runCoreJson(['config']));

	ipcMain.handle('settings:save', async (_e, payload: unknown) => {
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			return { ok: false, error: 'settings payload must be an object' };
		}
		const body = payload as { providers?: unknown; agent?: unknown };
		if (!Array.isArray(body.providers)) {
			return { ok: false, error: 'settings payload must contain a providers array' };
		}

		const providers = (body.providers as Record<string, unknown>[]).map(cleanProvider);
		const file = settingsConfigPath();
		try {
			await fs.mkdir(path.dirname(file), { recursive: true });
			const config = { providers, agent: body.agent ?? {} };
			await fs.writeFile(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) };
		}

		// Verify the core can actually parse what we wrote — a typo in a
		// field name must surface here, not silently on the next agent run.
		const reload = await runCoreJson(['config']);
		if (!reload.ok) {
			return { ok: false, error: `saved but the core cannot parse it: ${reload.error}` };
		}
		return { ok: true, data: reload.data };
	});

	ipcMain.handle('settings:test-provider', async (_e, id: string) => {
		if (!id || typeof id !== 'string') return { ok: false, error: 'missing provider id' };
		return runCoreJson(['test', id]);
	});
}
