#!/usr/bin/env node
// Idexal CLI — run Idexal agents from any terminal.
//
// A thin, dependency-free launcher around the `idexal-core` Rust binary.
// It owns presentation only (colors, spinners, argument shapes); all agent
// behaviour lives in the core, so the CLI, the desktop app and any future
// editor plugin share one implementation and one NDJSON contract.
//
//   idexal "<task>"            run an agent on a task
//   idexal run "<task>"        same, explicit
//   idexal review "<target>"   read-only analysis (no writes, no commands)
//   idexal providers           list configured providers and their status
//   idexal --version | -v
//   idexal --help  | -h

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isTTY = process.stdout.isTTY;
const c = {
	dim: (s) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
	bold: (s) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
	blue: (s) => (isTTY ? `\x1b[34m${s}\x1b[0m` : s),
	green: (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
	red: (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
	yellow: (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
};

/**
 * Locate the core binary: $IDEXAL_CORE, then a sibling checkout (release
 * preferred over debug so an installed build never loses to a stale debug
 * one), then `idexal-core` on PATH.
 */
function resolveCore() {
	if (process.env.IDEXAL_CORE && existsSync(process.env.IDEXAL_CORE)) {
		return process.env.IDEXAL_CORE;
	}
	const exe = process.platform === 'win32' ? 'idexal-core.exe' : 'idexal-core';
	const candidates = [
		join(__dirname, '..', '..', 'core', 'target', 'release', exe),
		join(__dirname, '..', '..', 'core', 'target', 'debug', exe),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return exe; // fall back to PATH lookup
}

function printHelp() {
	console.log(`
${c.bold('idexal')} — agentic IDE, from your terminal

${c.bold('USAGE')}
  idexal "<task>"              run a single agent on a task
  idexal run "<task>"          same, explicit
  idexal agent "<task>"        multi-agent: plan → parallel executors → review
  idexal review "<target>"     read-only analysis (never writes or runs commands)
  idexal providers             list configured providers and their status
  idexal memory <sub>          stats | recall "<query>" | add <kind> "<content>"
  idexal --version             print the core version
  idexal --help                this message

${c.bold('CONFIGURATION')}
  Providers are read from ./idexal.config.json or ~/.idexal/config.json.
  With no config at all, Idexal uses ANTHROPIC_API_KEY / OPENAI_API_KEY if
  present, and otherwise falls back to a local Ollama server — no account,
  no key, works offline. See idexal.config.example.json.

${c.bold('EXAMPLES')}
  idexal "اشرح بنية هذا المشروع"
  idexal review src/main.rs
  idexal providers
`);
}

function runCore(args, { onEvent } = {}) {
	const core = resolveCore();
	const child = spawn(core, args, { stdio: ['ignore', 'pipe', 'pipe'] });

	let stderr = '';
	child.stderr.on('data', (chunk) => (stderr += chunk.toString()));

	child.on('error', (err) => {
		if (err.code === 'ENOENT') {
			console.error(
				c.red('idexal-core not found.') +
					'\nBuild it with:  cd core && cargo build --release' +
					'\nOr set $IDEXAL_CORE to the binary path.',
			);
		} else {
			console.error(c.red(`failed to start idexal-core: ${err.message}`));
		}
		process.exit(127);
	});

	if (onEvent) {
		const rl = createInterface({ input: child.stdout });
		rl.on('line', (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				onEvent(JSON.parse(trimmed));
			} catch {
				// Not an NDJSON event (a stray warning): pass it through
				// rather than swallowing output the user may need.
				process.stdout.write(line + '\n');
			}
		});
	} else {
		child.stdout.pipe(process.stdout);
	}

	child.on('close', (code) => {
		if (code !== 0 && stderr.trim()) console.error(c.red(stderr.trim()));
		process.exit(code ?? 0);
	});

	// Ctrl-C should stop the agent, not orphan it.
	process.on('SIGINT', () => {
		child.kill();
		process.exit(130);
	});
}

function renderTask(task, extraArgs = [], command = 'stream') {
	let sawText = false;
	// Tool lines and provider switches interrupt the answer text, so the
	// next text delta needs a newline to avoid gluing onto a status line.
	let needsNewline = false;

	runCore([command, ...extraArgs, task], {
		onEvent(event) {
			switch (event.type) {
				case 'start':
					console.log(c.dim(`providers: ${(event.providers ?? []).join(' → ')}`));
					break;
				case 'phase':
					if (sawText) process.stdout.write('\n');
					console.log(c.blue(c.bold(`\n▸ ${event.phase}`)));
					sawText = false;
					break;
				case 'plan':
					for (const step of event.steps ?? []) {
						const deps = step.depends_on?.length ? c.dim(` ⟵ ${step.depends_on.join(',')}`) : '';
						console.log(`  ${c.dim(`${step.id}.`)} ${step.description}${deps}`);
					}
					break;
				case 'step-start':
					console.log(c.blue(`  ▶ [${event.id}] ${event.description}`));
					sawText = false;
					break;
				case 'step-end':
					console.log(event.ok ? c.green(`  ✓ [${event.id}]`) : c.red(`  ✗ [${event.id}] ${event.summary}`));
					sawText = false;
					break;
				case 'review':
					// The reviewer's text already streamed as deltas; the
					// event only marks that the review phase produced it.
					break;
				case 'provider':
					console.log(c.dim(`⇄ ${event.name}`));
					needsNewline = false;
					break;
				case 'delta':
					if (needsNewline) {
						process.stdout.write('\n');
						needsNewline = false;
					}
					process.stdout.write(event.text ?? '');
					sawText = true;
					break;
				case 'tool-call': {
					if (sawText) process.stdout.write('\n');
					let detail = '';
					try {
						const args = JSON.parse(event.args ?? '{}');
						detail = args.path ?? args.command ?? '';
					} catch {
						// keep detail empty rather than printing raw JSON
					}
					// In multi-agent runs several executors interleave, so
					// the step id is what makes the output readable.
					const tag = event.step !== undefined ? c.dim(`[${event.step}] `) : '';
					console.log(tag + c.yellow(`⚙ ${event.name}${detail ? ' ' + detail : ''}`));
					sawText = false;
					needsNewline = false;
					break;
				}
				case 'tool-result': {
					const tag = event.step !== undefined ? c.dim(`[${event.step}] `) : '';
					console.log(tag + (event.ok ? c.green(`✓ ${event.name}`) : c.red(`✗ ${event.name}`)));
					break;
				}
				case 'done': {
					if (sawText) process.stdout.write('\n');
					const unit = command === 'agent' ? 'steps' : 'tool rounds';
					console.log(
						c.dim(`● ${event.provider ?? ''}${event.tool_rounds ? ` · ${event.tool_rounds} ${unit}` : ''}`),
					);
					break;
				}
				case 'error':
					if (sawText) process.stdout.write('\n');
					console.error(c.red(`⚠ ${event.error}`));
					break;
			}
		},
	});
}

const [, , ...argv] = process.argv;

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
	printHelp();
	process.exit(0);
}

switch (argv[0]) {
	case '--version':
	case '-v':
		runCore(['--version']);
		break;
	case 'providers':
		// `providers` emits one pretty-printed JSON document, not NDJSON,
		// so stream it straight through instead of line-parsing it.
		runCore(['providers']);
		break;
	case 'run': {
		const task = argv.slice(1).join(' ').trim();
		if (!task) {
			console.error(c.red('idexal run needs a task: idexal run "<task>"'));
			process.exit(2);
		}
		renderTask(task);
		break;
	}
	case 'agent': {
		const task = argv.slice(1).join(' ').trim();
		if (!task) {
			console.error(c.red('idexal agent needs a task: idexal agent "<task>"'));
			process.exit(2);
		}
		renderTask(task, [], 'agent');
		break;
	}
	case 'memory':
		// Memory subcommands print plain JSON, not NDJSON.
		runCore(['memory', ...argv.slice(1)]);
		break;
	case 'review': {
		const target = argv.slice(1).join(' ').trim();
		if (!target) {
			console.error(c.red('idexal review needs a target: idexal review "<target>"'));
			process.exit(2);
		}
		renderTask(
			`Review the following for issues. Do NOT modify anything — analysis only.\nTarget: ${target}\nReport what you reviewed, issues found with file:line, and concrete fixes.`,
			['--read-only'],
		);
		break;
	}
	default:
		// Bare form: `idexal "<task>"`
		renderTask(argv.join(' ').trim());
}
