// Idexal AI Core — first-run setup
// `idexal-ai setup` (or `node src/setup.ts`) builds the user's FIRST
// ~/.idexal/config.json by probing what's actually available on this
// machine — Ollama running? Anthropic/OpenAI keys in the environment? the
// Idexal Cloud gateway reachable? — and suggesting a sensible provider
// priority order (local first, then keyed remotes, cloud as the free
// fallback). Everything is confirmed before anything is written, and
// `--yes` skips the prompts for scripted installs.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { pathToFileURL } from 'node:url';
import {
	type IdexalConfig,
	type ProviderConfig,
	DEFAULT_AGENT,
	DEFAULT_CLOUD,
	CLOUD_PROVIDER_ID,
	getGlobalConfigPath,
	expandHome,
} from './config.ts';
import { type SetupProbe, probeEnvironment, suggestProviders, formatPriority } from './setup/probe.ts';
import { writeConfigFile } from './setup/write.ts';

/** Thrown when stdin ends (EOF) mid-wizard — safe cancellation. */
export class SetupCancel extends Error {}

/**
 * `idexal-ai setup` — build the first global config from what this machine
 * actually has. Safe by default: never overwrites an existing config without
 * an explicit yes; `--yes` accepts everything for headless installs.
 */
export async function runSetup(opts: { yes?: boolean } = {}): Promise<void> {
	const yes = opts.yes ?? process.argv.includes('--yes');
	const configPath = expandHome(getGlobalConfigPath());
	const exists = fs.existsSync(configPath);

	// ONE readline interface for the whole wizard (TTY + piped stdin),
	// closed in the finally so a thrown write never leaves the process
	// hanging on an open stdin.
	const rl = readline.createInterface({ input, output });
	const iter = rl[Symbol.asyncIterator]();
	const nextLine = async (): Promise<string | null> => {
		const next = await iter.next();
		return next.done ? null : (next.value as string).trim();
	};

	try {
		console.log('\n  Idexal — first-run setup\n');
		if (exists) {
			console.log(`  Found existing config: ${configPath}`);
			if (!yes) {
				const keep = await askYesNo(nextLine, 'Keep it as-is (skip regenerating)?', true);
				if (keep) {
					console.log('  Keeping it as-is. Run `idexal-ai setup` again any time to regenerate.\n');
					return;
				}
			}
		}

		console.log('  Probing your environment…\n');
		const probe = await probeEnvironment();
		printProbe(probe);

		const { providers, primaryProvider } = suggestProviders(probe);
		console.log('  Suggested provider priority:');
		for (const p of providers) {
			const status =
				p.id === CLOUD_PROVIDER_ID
					? 'free built-in gateway'
					: isLocal(p) ? 'local — no key needed'
					: p.apiKeyEnv && process.env[p.apiKeyEnv] ? `key found (${p.apiKeyEnv})`
					: p.apiKey ? 'key in config'
					: 'no key detected';
			console.log(`    ${p.priority}. ${p.id} [${p.displayName}] — ${status}`);
		}
		console.log(`    primary: ${primaryProvider}\n`);

		if (!providers.length) {
			console.log('  ⚠ No provider is usable right now — nothing will be written.\n');
			console.log('  Next: install/start Ollama, set ANTHROPIC_API_KEY or OPENAI_API_KEY,');
			console.log('  or run `idexal-ai cloud` to check the free Idexal Cloud gateway.\n');
			return;
		}

		if (!yes) {
			const ok = await askYesNo(nextLine, `Write ${configPath}?`, true);
			if (!ok) {
				console.log('  Cancelled — nothing was written.\n');
				return;
			}
		}

		const cfg: IdexalConfig = { providers, primaryProvider, agent: DEFAULT_AGENT, cloud: DEFAULT_CLOUD };
		writeConfigFile(configPath, cfg);
		console.log(`  ✓ Wrote ${configPath}\n`);
		console.log('  Next steps:');
		console.log('    • `idexal-ai providers` — confirm each provider is ready');
		console.log('    • `idexal-ai run "say hello"` — first task');
		console.log('    • `idexal-ai agent` — interactive session\n');
	} finally {
		rl.close();
	}
}

async function askYesNo(nextLine: () => Promise<string | null>, question: string, dflt: boolean): Promise<boolean> {
	process.stdout.write(`  ${question} [${dflt ? 'Y/n' : 'y/N'}]: `);
	const answer = (await nextLine())?.toLowerCase() ?? '';
	if (!answer) return dflt;
	return answer === 'y' || answer === 'yes';
}

function isLocal(p: ProviderConfig): boolean {
	return /localhost|127\.0\.0\.1/.test(p.baseUrl ?? '');
}

/** Pretty-print what the probe found, so the user sees WHY the order. */
function printProbe(probe: SetupProbe): void {
	console.log(`    Ollama (local):    ${probe.ollama.running ? `✓ running${probe.ollama.models.length ? ` (${probe.ollama.models.slice(0, 4).join(', ')}…)` : ''}` : '— not running'}`);
	console.log(`    Anthropic key:     ${probe.keys.anthropic ? '✓ set' : '—'}`);
	console.log(`    OpenAI key:        ${probe.keys.openai ? '✓ set' : '—'}`);
	console.log(`    Idexal Cloud:      ${probe.cloud.reachable ? '✓ reachable (free tier)' : '— not reachable (offline?)'}`);
	console.log(`    Suggested order:   ${formatPriority(probe)}\n`);
}

// Run directly: `node src/setup.ts` (also wired as `npm run setup`).
// Guarded so importing this module from cli.ts doesn't trigger setup.
const argv1 = process.argv[1];
const isMain = argv1 !== undefined && pathToFileURL(path.resolve(argv1)).href === import.meta.url;
if (isMain) {
	runSetup().catch((err) => {
		if (err instanceof SetupCancel) {
			console.log('  Cancelled.\n');
		} else {
			console.error(`\n  ✗ Setup failed: ${err instanceof Error ? err.message : String(err)}\n`);
			process.exitCode = 1;
		}
	});
}
