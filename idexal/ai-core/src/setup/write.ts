// Idexal AI Core — setup config persistence
// Writes the first ~/.idexal/config.json from the setup wizard. Writes
// atomically (temp file + rename) so a crash mid-write never leaves a
// truncated config behind, and refuses to clobber an existing file.
//
// Note: `~` paths in the config (memoryDbPath / usageDbPath) are handled by
// the runtime — MemoryStore and UsageStore both call expandHome() in their
// constructors — so the written config stays portable and machine-agnostic.

import * as fs from 'node:fs';
import { type IdexalConfig } from '../config.ts';
import { ensureConfigDir } from './probe.ts';

/**
 * Write the config file atomically. Overwrites only when `overwrite` is
 * true (the caller has confirmed); otherwise throws if the file exists.
 */
export function writeConfigFile(configPath: string, cfg: IdexalConfig, overwrite = true): void {
	if (fs.existsSync(configPath) && !overwrite) {
		throw new Error(`Refusing to overwrite existing config: ${configPath}`);
	}
	ensureConfigDir(configPath);
	const tmp = `${configPath}.tmp-${process.pid}-${Date.now()}`;
	fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
	try {
		fs.renameSync(tmp, configPath);
	} catch (err) {
		fs.rmSync(tmp, { force: true });
		throw err;
	}
}
