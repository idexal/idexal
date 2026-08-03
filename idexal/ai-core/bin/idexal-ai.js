#!/usr/bin/env node
// Idexal AI Core — global `idexal-ai` launcher.
//
// The real CLI is TypeScript (src/cli.ts). Node >= 22.6 can run .ts files
// with type stripping, but it is only enabled BY DEFAULT from Node 23.6 —
// on 22.6–23.5 it requires the --experimental-strip-types flag. This tiny
// launcher spawns node with the right flags and forwards stdio/exit code,
// so `idexal-ai` works when installed globally (npm link / npm i -g .).
//
// Exit behavior mirrors the child: its exit code is propagated, and SIGINT
// / SIGTERM are forwarded so Ctrl+C in an interactive `idexal-ai agent`
// session still works.
//
// NOTE: keep this file plain JavaScript — it is the one file Node runs
// WITHOUT type stripping, so no TypeScript syntax allowed.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'src', 'cli.ts');

const major = Number(process.versions.node.split('.')[0]);
// 22.6–23.5 need --experimental-strip-types; from 23.6 it is the default,
// but passing it explicitly is a harmless no-op — so use it for all < 24.
const args =
	major < 24 ? ['--experimental-strip-types', cli, ...process.argv.slice(2)] : [cli, ...process.argv.slice(2)];

const child = spawn(process.execPath, args, { stdio: 'inherit' });

for (const sig of ['SIGINT', 'SIGTERM']) {
	process.on(sig, () => child.kill(sig));
}

child.on('error', (err) => {
	console.error(`idexal-ai: failed to launch AI Core: ${err.message}`);
	process.exitCode = 1;
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
	} else {
		process.exitCode = code === null ? 1 : code;
	}
});
