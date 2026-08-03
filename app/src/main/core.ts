// Idexal — shared core-binary helpers (main process)
//
// resolveCoreBinary is used by both index.ts (agent streaming) and settings.ts
// (config load/save, provider testing). Kept in one place so the binary
// resolution rules never drift between callers.

import * as fs from 'node:fs';
import * as path from 'node:path';

export function resolveCoreBinary(): string {
	const exeName = process.platform === 'win32' ? 'idexal-core.exe' : 'idexal-core';
	// Release first: an installed build must never lose to a stale debug one.
	const candidates = [
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
