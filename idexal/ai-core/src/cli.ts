#!/usr/bin/env node
// Idexal AI Core — CLI
// Usage:
//   idexal-ai run "<task>"          Run an agent task non-interactively
//   idexal-ai stream "<task>"       Run a task, emitting NDJSON events on stdout
//   idexal-ai stream --plan-only "<task>"  Emit the plan only — no step is executed
//   idexal-ai stream --read-only "<task>"  Run with inspection tools only (no writes/commands)
//   idexal-ai agent                 Start an interactive agent session
//   idexal-ai providers             List configured providers and status
//   idexal-ai list-providers --json List providers as machine-readable JSON
//   idexal-ai memory                Show memory stats
//   idexal-ai config                Show effective configuration
//   idexal-ai setup                 First-run setup: probe providers, write ~/.idexal/config.json
//   idexal-ai help                  Show this help

import * as fs from 'node:fs';
import * as path from 'node:path';
// Classic readline: the wizard reads lines via an async iterator so both
// interactive TTYs and piped input (`echo … | idexal-ai add-provider`)
// work — `readline/promises` `question()` drops lines on non-TTY stdin.
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import {
	loadConfig,
	registryFromConfig,
	CLOUD_PROVIDER_ID,
	getGlobalConfigPath,
	writeProviderToConfig,
	removeProviderFromConfig,
	expandHome,
	type ProviderConfig,
} from './config.ts';
import { createProvider } from './providers/factory.ts';
import { probeProviderModels } from './providers/connectionTest.ts';
import { expandEnv, extractEnvRefs, missingEnvRefs, missingEnvRefsDeep } from './providers/envRefs.ts';
import { MemoryStore } from './memory/sqliteStore.ts';
import { MemoryService } from './memory/memoryService.ts';
import { pickEmbedder } from './memory/embedder.ts';
import { supportsEmbeddings, type StreamDelta } from './providers/types.ts';
import { ALL_TOOLS } from './tools/tools.ts';
import { Orchestrator, type OrchestratorEvent } from './agents/orchestrator.ts';
import { TerminalManager } from './terminal/terminalManager.ts';
import { UsageStore } from './usage/usageStore.ts';
import { runSetup } from './setup.ts';
import { loadClaudeCompat, injectClaudeEnv, resolveClaudeModel, type ClaudeCompatState } from './compat/claudeCode.ts';
import { loadClaudeSubagents, type SubagentDefinition } from './compat/subagents.ts';
import { migrateClaudeMemory, hasClaudeMemory, claudeMemorySources } from './compat/migrate.ts';

const BANNER = String.raw`
  ___    ___    ___   ___   _    _
 |_ _|  |_ _|  / _ \ | __| | |  | |
  | |    | |  | |_| || _|  | |__| |__
  |_|    |___|  \___/ |___| |____|____|
`;

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0] ?? 'help';

	switch (command) {
		case 'run':
			return runTask(args.slice(1).join(' '));
		case 'stream':
			// Only the known flags are stripped from the task text — anything
			// else (including a task that itself starts with `--`) passes
			// through untouched.
			return streamTask(args.slice(1).filter((a) => a !== '--plan-only' && a !== '--read-only').join(' '), {
				planOnly: args.includes('--plan-only'),
				readOnly: args.includes('--read-only'),
			});
		case 'agent':
			return interactiveAgent();
		case 'providers':
		case 'list-providers':
			return listProviders(args.includes('--json'));
		case 'cloud':
			return showCloudStatus();
		case 'memory':
			return showMemory();
		case 'config':
			return showConfig();
		case 'usage':
			return showUsage();
		case 'add-provider':
			return addProviderWizard({ presetId: args.slice(1).join(' ') });
		case 'edit-provider':
			return editProviderCommand(args.slice(1).join(' '));
		case 'remove-provider':
			// <id> [--yes|-y]: flags are separated from the id so a literal
			// id is never polluted by trailing arguments.
			return removeProviderCommand(args.slice(1).filter((a) => !a.startsWith('-')).join(' '), args.includes('--yes') || args.includes('-y'));
		case 'setup':
			return runSetup({ yes: args.includes('--yes') });
		case 'compat':
			return showCompat(args.includes('migrate'), args.includes('--yes'));
		case 'help':
		case '--help':
		case '-h':
			return showHelp();
		default:
			console.log(BANNER);
			console.log(`Unknown command: ${command}\n`);
			return showHelp();
	}
}

function buildServices() {
	const rawConfig = loadConfig();

	// Claude Code compatibility: read .claude/settings.json (env keys +
	// model alias), CLAUDE.md instructions, and .claude/agents/*.md
	// subagents. Env injection happens BEFORE the registry is built so
	// keyed providers actually see the keys. Never overwrites real env.
	let claude: ClaudeCompatState | undefined;
	let subagents: SubagentDefinition[] | undefined;
	if (rawConfig.compat.claudeCode) {
		claude = loadClaudeCompat(process.cwd());
		injectClaudeEnv(claude.settings.env);
		subagents = loadClaudeSubagents(process.cwd());
	}

	// Model override from Claude settings: map alias → concrete id and
	// apply it to the anthropic provider config.
	let config = rawConfig;
	if (claude?.settings.model) {
		const resolved = resolveClaudeModel(claude.settings.model);
		if (resolved) {
			config = {
				...rawConfig,
				providers: rawConfig.providers.map((p) => (p.id === 'anthropic' ? { ...p, model: resolved } : p)),
			};
		}
	}

	const registry = registryFromConfig(config);

	let memory: MemoryService | undefined;
	if (config.agent.memoryEnabled) {
		const store = new MemoryStore(config.agent.memoryDbPath);
		// Semantic embedder: prefers a LOCAL embeddings provider (Ollama, LM
		// Studio) so memory retrieval works for free with no API key; falls
		// back to lexical recall when nothing supports embeddings.
		const embedder = pickEmbedder(
			registry,
			config.agent.embeddingProvider ?? config.primaryProvider,
			config.agent.embeddingModel,
		);
		memory = new MemoryService({
			store,
			embed: embedder?.embed,
			embeddingModel: embedder?.model,
		});
	}
	const usage = config.agent.usageEnabled ? new UsageStore(config.agent.usageDbPath) : undefined;
	// Agent Terminal: owns long-running interactive commands (dev servers,
	// watchers) the agents start with terminal_start and drive with
	// terminal_output / terminal_send / terminal_stop.
	const terminal = new TerminalManager();
	return { config, registry, memory, usage, terminal, claude, subagents };
}

/** Render a stream delta to the terminal with lightweight styling. */
function renderDelta(delta: StreamDelta): void {
	switch (delta.type) {
		case 'provider':
			process.stdout.write(`\n  ⇄ ${delta.displayName ?? delta.providerId}\n`);
			break;
		case 'text':
			process.stdout.write(delta.text);
			break;
		case 'toolCall':
			// Tool calls are surfaced as first-class OrchestratorEvent
			// `tool-call` events (rendered step-by-step with args + result);
			// the raw delta echo would just duplicate that line.
			break;
		case 'error':
			process.stdout.write(`\n  ✗ ${delta.error}\n`);
			break;
		case 'usage':
			process.stdout.write(`\n  · ${delta.usage.inputTokens} in / ${delta.usage.outputTokens} out\n`);
			break;
		case 'done':
			process.stdout.write('\n');
			break;
	}
}

/** Compact one-line rendering of a tool's arguments for progress output. */
function summarizeArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args);
	if (entries.length === 0) return '';
	return entries
		.slice(0, 3)
		.map(([k, v]) => {
			const s = (typeof v === 'string' ? v : JSON.stringify(v)) ?? '';
			return `${k}=${s.length > 40 ? s.slice(0, 40) + '…' : s}`;
		})
		.join(', ');
}

/** First line of a tool result, truncated for progress display. */
function summarizeOutput(output: string): string {
	const firstLine = output.split('\n')[0] ?? '';
	return firstLine.length > 90 ? firstLine.slice(0, 90) + '…' : firstLine;
}

/** Print a per-task usage summary (calls, tokens, cost, latency by provider). */
function printTaskUsage(usage: UsageStore, taskId: string): void {
	const totals = usage.totals({ taskId });
	const perProvider = usage.summary({ taskId });
	if (totals.calls === 0) return;
	console.log(
		`  Usage: ${totals.calls} calls (${totals.failed} failed) · ${totals.inputTokens}/${totals.outputTokens} tokens · $${totals.costUsd.toFixed(4)} · avg ${totals.avgLatencyMs}ms`,
	);
	for (const p of perProvider) {
		console.log(
			`    • ${p.providerId}: ${p.calls} calls (${p.failed} failed), ${p.inputTokens}/${p.outputTokens} tokens, $${p.costUsd.toFixed(4)}, avg ${p.avgLatencyMs}ms`,
		);
	}
}

/**
 * `idexal-ai usage` — per-provider usage & cost report: totals plus a
 * provider breakdown and the most recent calls.
 */
async function showUsage(): Promise<void> {
	const { config, memory, usage } = buildServices();
	if (!usage) {
		console.log('\n  Usage tracking is disabled (agent.usageEnabled=false).\n');
		memory?.close();
		return;
	}
	const totals = usage.totals();
	console.log('\n  Usage report (all time):');
	if (totals.calls === 0) {
		console.log('    No calls recorded yet — run `idexal-ai run "…"` or the chat to track usage.\n');
		usage.close();
		return;
	}
	console.log(`    calls: ${totals.calls} (${totals.failed} failed)`);
	console.log(`    tokens: ${totals.inputTokens} in / ${totals.outputTokens} out`);
	console.log(`    estimated cost: $${totals.costUsd.toFixed(4)}`);
	console.log(`    avg latency: ${totals.avgLatencyMs}ms`);

	console.log('\n  Per provider:');
	for (const p of usage.summary()) {
		console.log(
			`    • ${p.providerId}: ${p.calls} calls (${p.failed} failed), ${p.inputTokens}/${p.outputTokens} tokens, $${p.costUsd.toFixed(4)}, avg ${p.avgLatencyMs}ms, last ${new Date(p.lastUsed).toLocaleString()}`,
		);
	}

	console.log('\n  Recent calls:');
	for (const r of usage.recent(6)) {
		console.log(
			`    ${new Date(r.timestamp).toLocaleString()} ${r.ok ? '✓' : '✗'} ${r.providerId}/${r.model} role=${r.role} in=${r.inputTokens} out=${r.outputTokens} ${r.latencyMs}ms $${r.costUsd.toFixed(6)}${r.error ? ` (${r.error})` : ''}`,
		);
	}
	console.log(`\n  DB: ${config.agent.usageDbPath}\n`);
	usage.close();
	memory?.close();
}

/**
 * Render live orchestrator progress events (plan, steps, agents, tools,
 * review) to the terminal — shared by `run` and the interactive session.
 * Tool calls are shown step by step: name(args) then ✓/✗ outcome.
 */
function renderRunEvent(event: OrchestratorEvent): void {
	switch (event.type) {
		case 'plan':
			console.log('  Plan:');
			for (const s of event.steps) {
				console.log(`    ${s.id}. ${s.description}`);
			}
			break;
		case 'step-status':
			if (event.step.status === 'failed') {
				console.log(`  ✗ Step ${event.step.id} failed: ${summarizeOutput(event.step.result ?? '')}`);
			} else if (event.step.status === 'done') {
				console.log(`  ✓ Step ${event.step.id} done`);
			} else if (event.step.status === 'running') {
				console.log(`  ▶ Step ${event.step.id}: ${event.step.description}`);
			}
			break;
		case 'agent-start':
			console.log(`    ${event.name} working…`);
			break;
		case 'agent-end':
			console.log(`    ${event.name} ✓`);
			break;
		case 'tool-call':
			console.log(`    ⚙ ${event.name}(${summarizeArgs(event.args)})`);
			break;
		case 'tool-result':
			console.log(`      ${event.ok ? '✓' : '✗'} ${summarizeOutput(event.output)}`);
			break;
		case 'review':
			if (event.verdict === 'fix') {
				console.log('  ↻ Reviewer requested fixes — reapplying…');
			}
			break;
		case 'terminal-start':
			console.log(`  🖥 Terminal ${event.id} started: ${event.command}`);
			break;
		case 'terminal-output': {
			// Live monitoring, but bounded: show the last few lines of each
			// chunk so a chatty dev server can't flood the console.
			const lines = event.output.trimEnd().split('\n').filter((l) => l.trim());
			const shown = lines.slice(-6);
			for (const line of shown) {
				console.log(`    │ ${line.length > 100 ? line.slice(0, 100) + '…' : line}`);
			}
			if (lines.length > shown.length) {
				console.log(`    │ … +${lines.length - shown.length} more lines`);
			}
			break;
		}
		case 'terminal-exit':
			console.log(`  🖥 Terminal ${event.id} exited (code ${event.exitCode ?? 'unknown'})`);
			break;
		case 'error':
			console.log(`  ⚠ ${event.error}`);
			break;
	}
}

async function runTask(task: string): Promise<void> {
	if (!task) {
		console.error('Usage: idexal-ai run "<task>"');
		process.exitCode = 1;
		return;
	}
	console.log(BANNER);
	const { config, registry, memory, usage, terminal, claude, subagents } = buildServices();
	const providers = registry.list();
	if (providers.length === 0) {
		console.error('No providers configured. Run `idexal-ai providers` for details.');
		process.exitCode = 1;
		return;
	}

	console.log(`\n  Providers: ${providers.map((p) => p.id).join(', ')}`);
	// `found` covers settings + CLAUDE.md; subagents are a third source, so a
	// subagents-only project still counts as a Claude Code workspace.
	if ((claude?.found || (subagents?.length ?? 0) > 0) && config.compat.claudeCode) {
		console.log(`  Claude Code compat: ✓ ${claude?.settingsFiles.length ?? 0} settings file(s), ${subagents?.length ?? 0} subagent(s)`);
	}
	console.log(`  Task: ${task}\n`);

	const orchestrator = new Orchestrator({
		registry,
		config: config.agent,
		tools: ALL_TOOLS,
		memory,
		terminal,
		usageStore: usage,
		onEvent: renderRunEvent,
		onDelta: renderDelta,
		subagents: subagents,
		instructions: claude?.instructions,
	});

	const started = Date.now();
	try {
		const result = await orchestrator.run(task);
		const elapsed = ((Date.now() - started) / 1000).toFixed(1);
		console.log(`\n  ${result.summary}`);
		console.log(`  Completed in ${elapsed}s`);
		if (usage) {
			printTaskUsage(usage, orchestrator.taskId);
		}
		if (memory) {
			const stats = memory.stats();
			const embedded = memory.embeddedStats();
			console.log(`  Memory: ${stats.total} entries (${Object.entries(stats.byType).map(([k, v]) => `${k}:${v}`).join(', ')})`);
			if (memory.semanticAvailable) {
				console.log(`  Semantic: ${embedded.cached} embeddings cached`);
			}
			memory.close();
		}
	} finally {
		// Kill any long-running terminals the agents left behind.
		terminal.closeAll();
		usage?.close();
	}
}

/** Emit a single NDJSON event on stdout. */
function emitJson(obj: unknown): void {
	process.stdout.write(JSON.stringify(obj) + '\n');
}

/**
 * `idexal-ai stream "<task>"` — machine-readable task runner for the VS
 * Code extension (and any UI). Runs the multi-agent orchestrator and emits
 * one JSON object per line on stdout:
 *   {"type":"start","providers":[...]}
 *   {"type":"plan","steps":[{id,description,status}]}
 *   {"type":"step-status","step":{...}}
 *   {"type":"agent-start"|"agent-end","name":"..."}
 *   {"type":"tool-call","step":N,"name":"...","args":{...}}
 *   {"type":"tool-result","step":N,"name":"...","ok":bool,"output":"..."}
 *   {"type":"review","verdict":"ok"|"fix"}
 *   {"type":"delta","delta":{...}}        (StreamDelta passthrough)
 *   {"type":"done","summary":"...","steps":[...]}
 *   {"type":"error","error":"..."}
 * All human-readable output is suppressed so stdout stays parseable.
 *
 * `stream --plan-only "<task>"` emits the plan and stops: no steps are
 * executed, so UIs (the VS Code extension's /idexal:plan) can show a plan
 * for approval before any agent runs.
 *
 * `stream --read-only "<task>"` runs the task but only hands the executors
 * inspection tools (read_file / list_dir / search_files / git_status) — no
 * writes, no commands, no terminals (the extension's /idexal:review).
 */
async function streamTask(task: string, opts: { planOnly?: boolean; readOnly?: boolean } = {}): Promise<void> {
	if (!task) {
		emitJson({ type: 'error', error: 'Usage: idexal-ai stream [--plan-only] [--read-only] "<task>"' });
		process.exitCode = 1;
		return;
	}
	const { config, registry, memory, usage, terminal, claude, subagents } = buildServices();
	const providers = registry.list();
	if (providers.length === 0) {
		emitJson({ type: 'error', error: 'No providers configured. Run `idexal-ai providers` for details.' });
		process.exitCode = 1;
		return;
	}

	emitJson({ type: 'start', providers: providers.map((p) => p.id) });
	// Subagents count as Claude Code presence even without settings/CLAUDE.md.
	if (claude?.found || (subagents?.length ?? 0) > 0) {
		emitJson({
			type: 'claude',
			found: true,
			settingsFiles: claude?.settingsFiles ?? [],
			subagents: (subagents ?? []).map((s) => s.name),
			instructions: claude?.instructions ? true : false,
		});
	}

	const orchestrator = new Orchestrator({
		registry,
		config: config.agent,
		tools: ALL_TOOLS,
		memory,
		terminal,
		usageStore: usage,
		planOnly: opts.planOnly,
		readOnly: opts.readOnly,
		onEvent: (event) => {
			switch (event.type) {
				case 'plan':
					emitJson({ type: 'plan', steps: event.steps });
					break;
				case 'step-status':
					emitJson({ type: 'step-status', step: event.step });
					break;
				case 'agent-start':
					emitJson({ type: 'agent-start', name: event.name });
					break;
				case 'agent-end':
					emitJson({ type: 'agent-end', name: event.name, summary: event.summary });
					break;
				case 'tool-call':
					emitJson({ type: 'tool-call', step: event.step, name: event.name, args: event.args });
					break;
				case 'tool-result':
					emitJson({ type: 'tool-result', step: event.step, name: event.name, ok: event.ok, output: event.output });
					break;
				case 'review':
					emitJson({ type: 'review', verdict: event.verdict });
					break;
				case 'terminal-start':
					emitJson({ type: 'terminal-start', id: event.id, command: event.command });
					break;
				case 'terminal-output':
					emitJson({ type: 'terminal-output', id: event.id, output: event.output });
					break;
				case 'terminal-exit':
					emitJson({ type: 'terminal-exit', id: event.id, exitCode: event.exitCode });
					break;
				case 'error':
					emitJson({ type: 'error', error: event.error });
					break;
			}
		},
		onDelta: (delta) => emitJson({ type: 'delta', delta }),
		subagents,
		instructions: claude?.instructions,
	});

	const started = Date.now();
	try {
		const result = await orchestrator.run(task);
		const elapsed = ((Date.now() - started) / 1000).toFixed(1);
		// Per-task usage & cost summary (tokens, latency, cost per provider).
		if (usage) {
			emitJson({
				type: 'usage',
				taskId: orchestrator.taskId,
				totals: usage.totals({ taskId: orchestrator.taskId }),
				perProvider: usage.summary({ taskId: orchestrator.taskId }),
			});
		}
		emitJson({
			type: 'done',
			summary: result.summary,
			steps: result.steps,
			elapsedSeconds: Number(elapsed),
		});
	} catch (err) {
		// Emit a parseable error event so clients (the VS Code extension)
		// surface it in the chat instead of a raw stack trace on stderr.
		emitJson({ type: 'error', error: err instanceof Error ? err.message : String(err) });
		process.exitCode = 1;
	} finally {
		terminal.closeAll();
		memory?.close();
		usage?.close();
	}
}

async function interactiveAgent(): Promise<void> {
	console.log(BANNER);
	console.log('\n  Idexal interactive agent — type a task, Ctrl+C or "exit" to quit.\n');
	const { config, registry, memory, usage, terminal, claude, subagents } = buildServices();
	const providers = registry.list();
	if (providers.length === 0) {
		console.error('No providers configured. Run `idexal-ai providers` for details.');
		memory?.close();
		terminal.closeAll();
		usage?.close();
		return;
	}
	console.log(`  Providers: ${providers.map((p) => p.id).join(', ')}`);
	if ((claude?.found || (subagents?.length ?? 0) > 0) && config.compat.claudeCode) {
		console.log(`  Claude Code compat: ✓ ${claude?.settingsFiles.length ?? 0} settings file(s), ${subagents?.length ?? 0} subagent(s)`);
	}
	console.log('  Live progress: plan → steps → agent tools → review\n');

	// Classic readline + async iterator (not readline/promises): the
	// iterator handles BOTH interactive TTYs and piped input (`echo … |
	// idexal-ai agent`) — question() drops lines on non-TTY stdin.
	const rl = readline.createInterface({ input, output });
	const nextLine = makeLineReader(rl);
	try {
		while (true) {
			process.stdout.write('  > ');
			const line = await nextLine();
			if (line === null) break; // EOF (piped stdin closed)
			const task = line;
			if (!task || task === 'exit' || task === 'quit') break;
			// Full multi-agent orchestrator with live progress events: the
			// plan, step transitions, each agent's tool calls and their
			// outcomes, review verdicts, and token-level streaming all show
			// inline as the task runs.
			const orchestrator = new Orchestrator({
				registry,
				config: config.agent,
				tools: ALL_TOOLS,
				memory,
				terminal,
				usageStore: usage,
				onEvent: renderRunEvent,
				onDelta: renderDelta,
				subagents,
				instructions: claude?.instructions,
			});
			console.log('\n  ── agent working ──');
			const result = await orchestrator.run(task);
			if (usage) {
				printTaskUsage(usage, orchestrator.taskId);
			}
			// Show the actual agent output (the per-step reports carry the real
			// answer; the summary alone is generic).
			if (result.agentReports.length > 0) {
				console.log(`\n  ${result.agentReports.join('\n\n')}\n`);
			} else {
				console.log(`\n  ${result.summary}\n`);
			}
		}
	} finally {
		rl.close();
		terminal.closeAll();
		memory?.close();
		usage?.close();
	}
}

async function showCompat(migrate: boolean, yes: boolean): Promise<void> {
	const { config, memory, claude, subagents } = buildServices();
	const projectDir = process.cwd();
	console.log('\n  Claude Code compatibility');
	console.log(`    enabled: ${config.compat.claudeCode} (agent.compat.claudeCode)`);
	if (!config.compat.claudeCode) {
		console.log('  Disabled — enable compat.claudeCode=true in ~/.idexal/config.json to read Claude Code data.\n');
		memory?.close();
		return;
	}

	// Settings
	console.log(`  Settings:`);
	if (claude?.settingsFiles.length) {
		for (const f of claude.settingsFiles) console.log(`    ✓ ${f}`);
		const envKeys = Object.keys(claude.settings.env);
		console.log(`    env keys read: ${envKeys.length ? envKeys.join(', ') : '(none)'}`);
		console.log(`    model override: ${claude.settings.model ? `${claude.settings.model} → ${resolveClaudeModel(claude.settings.model)}` : '(none)'}`);
	} else {
		console.log('    — none found (looked at ~/.claude/settings.json and .claude/settings.json)');
	}

	// Subagents
	console.log(`  Subagents:`);
	if (subagents?.length) {
		for (const s of subagents) {
			console.log(`    • ${s.name} [${s.origin}] ${s.model ? `model=${s.model}` : ''} tools=${s.tools.length ? s.tools.join(',') : 'all'}`);
		}
	} else {
		console.log('    — none found (look for .claude/agents/*.md)');
	}

	// CLAUDE.md instructions
	console.log(`  CLAUDE.md instructions:`);
	const instr = claude?.instructionFiles ?? [];
	if (instr.length) {
		for (const f of instr) console.log(`    ✓ ${f}`);
		console.log(`    total: ${claude?.instructions.length ?? 0} chars`);
	} else {
		console.log('    — none found');
	}

	// Memory migration
	console.log('  Memory migration:');
	if (!memory) {
		console.log('    memory disabled — nothing to migrate into\n');
	} else if (hasClaudeMemory(projectDir)) {
		console.log('    CLAUDE.md sources:');
		for (const f of claudeMemorySources(projectDir)) console.log(`      ✓ ${f}`);
		console.log('    Run `idexal-ai compat migrate` to import them into the Idexal memory DB.');
		if (!migrate) {
			console.log();
			memory.close();
			return;
		}
	} else {
		console.log('    — no CLAUDE.md found to migrate\n');
		memory.close();
		return;
	}

	// ---- migrate ----
	// The migration only WRITES to the Idexal memory DB — ~/.claude is
	// never touched, and it is idempotent (dedupe against existing facts),
	// so an explicit `compat migrate` proceeds without further prompting.
	console.log('\n  Migrating Claude Code memory → Idexal memory DB…');
	const result = migrateClaudeMemory(memory, projectDir);
	console.log(`    sources: ${result.sources.length}`);
	console.log(`    imported: ${result.imported} facts`);
	console.log(`    skipped (already present): ${result.skipped}`);
	console.log(`    DB: ${config.agent.memoryDbPath}\n`);
	memory.close();
}

async function listProviders(json = false): Promise<void> {
	const { config, registry } = buildServices();
	const providers = registry.list();

	if (json) {
		// Machine-readable output for tooling: one JSON object on stdout.
		// Fields are stable — id, displayName, model, baseUrl, priority,
		// apiKeyEnv, hasKey, anonymous, local, status, embeddings.
		const out = providers.map((p) => {
			const cfg = config.providers.find((c) => c.id === p.id);
			const keyEnv = (cfg?.apiKeyEnv ?? '').toUpperCase();
			const hasKey = Boolean(process.env[keyEnv] || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
			const local = /localhost|127\.0\.0\.1/.test(p.baseUrl ?? '');
			const isCloud = p.id === CLOUD_PROVIDER_ID;
			const status = local || hasKey || isCloud ? 'ready' : 'no-key';
			return {
				id: p.id,
				displayName: p.displayName,
				model: p.defaultModel,
				baseUrl: p.baseUrl ?? null,
				priority: cfg?.priority ?? null,
				apiKeyEnv: cfg?.apiKeyEnv ?? null,
				hasKey,
				anonymous: p.anonymous ?? false,
				local,
				isCloud,
				status,
				embeddings: supportsEmbeddings(p),
			};
		});
		console.log(JSON.stringify({ providers: out }, null, 2));
		return;
	}

	console.log('\n  Configured providers:');
	for (const p of providers) {
		const keyEnv = (config.providers.find((c) => c.id === p.id)?.apiKeyEnv ?? '').toUpperCase();
		const hasKey = Boolean(process.env[keyEnv] || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
		const local = /localhost|127\.0\.0\.1/.test(p.baseUrl ?? '');
		const isCloud = p.id === CLOUD_PROVIDER_ID;
		// The cloud gateway is anonymous-friendly: no key needed to try.
		const status = local || hasKey || isCloud ? 'ready' : 'no-key';
		const embed = supportsEmbeddings(p) ? ' · embeddings ✓' : '';
		console.log(`    • ${p.id} [${p.displayName}] model=${p.defaultModel} base=${p.baseUrl ?? 'default'} → ${status}${embed}`);
	}
	console.log();
	console.log('  Tips:');
	console.log('    • Set API keys via env vars (ANTHROPIC_API_KEY, OPENAI_API_KEY, …) or in ~/.idexal/config.json');
	console.log('    • Run a local model: start Ollama and it is picked up automatically as fallback');
	console.log('    • The built-in Idexal Cloud works with zero setup — run `idexal-ai cloud` to check its status');
	console.log('    • Custom providers: add them to ~/.idexal/config.json with type "custom" and a baseUrl');
	console.log('    • Semantic memory: any provider with · embeddings ✓ powers real vector recall (Ollama serves it locally)');
	console.log('    • Semantic memory prefers LOCAL embeddings providers (Ollama/LM Studio) — free, no API key needed');
	console.log('    • Dedicated embedding model: set agent.embeddingModel (e.g. "nomic-embed-text") in config\n');
}

/**
 * `idexal-ai cloud` — checks the Idexal Cloud Provider gateway: lists its
 * models via GET /v1/models and reports the effective config. Safe to run
 * offline (reports unreachable instead of throwing).
 */
async function showCloudStatus(): Promise<void> {
	const { config, registry } = buildServices();
	const cloud = config.cloud;
	console.log(`\n  Idexal Cloud Provider`);
	console.log(`    enabled: ${cloud.enabled}`);
	console.log(`    baseUrl: ${cloud.baseUrl}`);
	console.log(`    model: ${cloud.model}`);
	console.log(`    priority: ${cloud.priority}`);
	const keyEnv = cloud.apiKeyEnv;
	const hasKey = Boolean(process.env[keyEnv]);
	console.log(`    key: ${hasKey ? `set (${keyEnv})` : `not set (${keyEnv}) — anonymous free tier`}`);

	if (!cloud.enabled) {
		console.log('\n  Gateway disabled (cloud.enabled=false). Re-enable it or configure another provider.\n');
		return;
	}

	const cloudProvider = registry.get(CLOUD_PROVIDER_ID);
	if (!cloudProvider) {
		console.log('\n  Gateway not registered in this configuration.\n');
		return;
	}

	// Probe /v1/models to verify reachability and show what's available.
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);
		try {
			const res = await fetch(`${cloud.baseUrl}/models`, {
				headers: hasKey ? { Authorization: `Bearer ${process.env[keyEnv]}` } : {},
				signal: controller.signal,
			});
			if (res.ok) {
				const body = (await res.json().catch(() => ({}))) as { data?: Array<{ id: string }> };
				const models = (body.data ?? []).map((m) => m.id);
				console.log(`    status: ✓ reachable`);
				console.log(`    models: ${models.length ? models.slice(0, 8).join(', ') : '(none advertised)'}`);
			} else {
				console.log(`    status: ✗ HTTP ${res.status} (${res.statusText})`);
			}
		} finally {
			clearTimeout(timeout);
		}
	} catch (err) {
		console.log(`    status: ✗ unreachable (${err instanceof Error ? err.message : String(err)})`);
	}
	console.log();
}

async function showMemory(): Promise<void> {
	const { config, memory } = buildServices();
	const store = new MemoryStore(config.agent.memoryDbPath);
	const stats = store.stats();
	console.log(`\n  Memory DB: ${config.agent.memoryDbPath}`);
	console.log(`  Total entries: ${stats.total}`);
	for (const [k, v] of Object.entries(stats.byType)) {
		console.log(`    ${k}: ${v}`);
	}
	console.log(`  Semantic vectors cached: ${store.embeddedCount()}`);
	console.log(`  Semantic recall: ${memory?.semanticAvailable ? 'enabled (provider embeddings)' : 'off (no embeddings provider — lexical fallback)'}`);
	store.close();
	memory?.close();
	console.log();
}

async function showConfig(): Promise<void> {
	const { config } = buildServices();
	console.log('\n  Effective configuration:');
	console.log(`    primaryProvider: ${config.primaryProvider ?? '(first available)'}`);
	console.log(`    agent.maxIterations: ${config.agent.maxIterations}`);
	console.log(`    agent.maxParallelAgents: ${config.agent.maxParallelAgents}`);
	console.log(`    agent.useReviewer: ${config.agent.useReviewer}`);
	console.log(`    agent.memoryEnabled: ${config.agent.memoryEnabled}`);
	console.log(`    agent.memoryDbPath: ${config.agent.memoryDbPath}`);
	console.log(`    agent.semanticMemory: ${config.agent.semanticMemory}`);
	console.log(`    agent.embeddingProvider: ${config.agent.embeddingProvider ?? '(auto)'}`);
	console.log(`    agent.usageEnabled: ${config.agent.usageEnabled}`);
	console.log(`    agent.usageDbPath: ${config.agent.usageDbPath}`);
	console.log(`    temperature: ${config.agent.temperature}`);
	console.log(`    cloud.enabled: ${config.cloud.enabled}`);
	console.log(`    cloud.baseUrl: ${config.cloud.baseUrl}`);
	console.log(`    cloud.model: ${config.cloud.model}`);
	console.log(`    cloud.priority: ${config.cloud.priority}`);
	console.log(`    compat.claudeCode: ${config.compat.claudeCode}`);
	console.log(`    providers: ${config.providers.length}`);
	for (const p of config.providers) {
		console.log(`      - ${p.id} (${p.type}) model=${p.model}${p.baseUrl ? ` base=${p.baseUrl}` : ''}`);
	}
	console.log();
}

/** Thrown when stdin ends (EOF) mid-wizard — e.g. `add-provider < /dev/null`. */
class WizardCancel extends Error {}

/**
 * Reads one trimmed line from the readline interface's async iterator.
 * Returns `null` at EOF so callers can abort cleanly instead of looping.
 */
type LineReader = () => Promise<string | null>;

function makeLineReader(rl: readline.Interface): LineReader {
	const iter = rl[Symbol.asyncIterator]();
	return async () => {
		const next = await iter.next();
		return next.done ? null : (next.value as string).trim();
	};
}

/**
 * Ask a question via the line reader, returning the answer (or the default
 * when empty — so a pre-filled edit wizard keeps existing values). A single
 * `.` answer clears a pre-filled field to '' (e.g. remove an apiKeyEnv).
 * Secrets: pass `hideDefault` so the stored value is shown as `(set)`
 * instead of being echoed in the prompt.
 */
async function ask(
	nextLine: LineReader,
	question: string,
	opts: { default?: string; required?: boolean; hint?: string; hideDefault?: boolean } = {},
): Promise<string> {
	const parts: string[] = [];
	if (opts.hint) parts.push(opts.hint);
	if (opts.default && !opts.hideDefault) parts.push(`default: ${opts.default}`);
	if (opts.default && opts.hideDefault) parts.push('default: (set)');
	const suffix = parts.length ? ` (${parts.join(', ')})` : '';
	while (true) {
		process.stdout.write(`  ${question}${suffix}: `);
		const answer = await nextLine();
		if (answer === null) throw new WizardCancel('stdin closed');
		// Clearing a required field makes no sense: re-prompt instead of
		// letting an empty id/baseUrl/model fail later as "invalid config".
		if (answer === '.') {
			if (opts.required) {
				console.log('  ⚠ This field is required.');
				continue;
			}
			return '';
		}
		if (answer) return answer;
		if (opts.default !== undefined) return opts.default;
		if (!opts.required) return '';
		console.log('  ⚠ This field is required.');
	}
}

/** Ask a yes/no question; empty answer yields `defaultAnswer` (default 'n'). */
async function askYesNo(nextLine: LineReader, question: string, defaultAnswer = false): Promise<boolean> {
	const hint = defaultAnswer ? 'Y/n' : 'y/N';
	process.stdout.write(`  ${question} [${hint}]: `);
	const answer = (await nextLine())?.toLowerCase() ?? '';
	if (answer === '') return defaultAnswer;
	return answer === 'y' || answer === 'yes';
}

/** Ask for a JSON object (e.g. extraBody); keeps `initial` when skipped. */
async function askJsonObject(
	nextLine: LineReader,
	question: string,
	initial: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
	const hasInitial = Object.keys(initial).length > 0;
	const prompt = hasInitial
		? `${question} (JSON, empty = keep current ${JSON.stringify(initial)})`
		: `${question} (JSON, empty = skip)`;
	process.stdout.write(`  ${prompt}: `);
	const answer = await nextLine();
	if (answer === null) throw new WizardCancel('stdin closed');
	if (!answer) return initial;
	try {
		const parsed = JSON.parse(answer);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		console.log('  ⚠ Expected a JSON object like {"foo": "bar"}.');
		return askJsonObject(nextLine, question, initial);
	} catch {
		console.log('  ⚠ Invalid JSON — try again.');
		return askJsonObject(nextLine, question, initial);
	}
}

/** Ask for headers as `Name: value` lines (empty line finishes). When
 * editing, shows current header NAMES (values masked — they are often
 * secrets); typing `Name: ` (empty value) removes it. */
async function askHeaders(
	nextLine: LineReader,
	initial: Record<string, string> = {},
): Promise<Record<string, string>> {
	const headers = { ...initial };
	if (Object.keys(initial).length > 0) {
		const current = Object.keys(initial).map((k) => `${k}: ****`).join(', ');
		console.log(`  Headers (current: ${current})`);
		console.log('  Enter `Name: value` to set/overwrite, `Name: ` to remove — empty line to finish:');
	} else {
		console.log('  Headers (one per line, `Name: value` — empty line to finish):');
	}
	while (true) {
		process.stdout.write('    > ');
		const line = await nextLine();
		if (line === null || !line) break;
		const idx = line.indexOf(':');
		if (idx <= 0) {
			console.log('  ⚠ Expected `Name: value` (e.g. `X-API-Key: secret`).');
			continue;
		}
		const name = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		if (value === '') {
			delete headers[name];
		} else {
			headers[name] = value;
		}
	}
	return headers;
}

/**
 * Env var references (${VAR} / $VAR) referenced by a provider's
 * baseUrl/headers/extraBody that are NOT currently set in the environment.
 * The wizard warns about these before saving so a provider is never
 * persisted in a state that cannot connect.
 */
function missingProviderEnvRefs(provider: ProviderConfig): string[] {
	const refs = new Set<string>();
	for (const r of missingEnvRefs(provider.baseUrl ?? '')) refs.add(r);
	for (const v of Object.values(provider.headers ?? {})) {
		for (const r of missingEnvRefs(v)) refs.add(r);
	}
	for (const r of missingEnvRefsDeep(provider.extraBody)) refs.add(r);
	return [...refs];
}

/**
 * `idexal-ai add-provider` — interactive wizard that builds a custom
 * provider config (id, baseUrl, headers, extraBody, …) step by step and
 * saves it to ~/.idexal/config.json. The resulting entry is an
 * OpenAI-compatible `custom` provider that the fallback engine picks up
 * immediately (verify with `idexal-ai providers`).
 *
 * `idexal-ai edit-provider <id>` runs the same wizard pre-filled from the
 * existing config entry (see `editProviderCommand`); empty answers keep
 * current values, `.` clears a field.
 */
async function addProviderWizard(opts: { presetId?: string; existing?: ProviderConfig } = {}): Promise<void> {
	const { presetId, existing } = opts;
	const editing = existing !== undefined;
	console.log(BANNER);
	if (editing) {
		console.log(`\n  Edit provider "${existing!.id}" — saved to ~/.idexal/config.json\n`);
		console.log('  Leave a field empty to keep its current value (type `.` to clear it).\n');
	} else {
		console.log('\n  Add a custom provider — saved to ~/.idexal/config.json\n');
		console.log('  Press Ctrl+C anytime to cancel. Leave a field empty for its default.\n');
	}

	const rl = readline.createInterface({ input, output });
	const nextLine = makeLineReader(rl);
	try {
		const configured = loadConfig().providers;
		const configuredIds = configured.map((p) => p.id);

		const id = (await ask(nextLine, 'Provider id (unique, e.g. my-groq)', {
			required: true,
			default: existing?.id ?? (presetId || undefined),
			hint: 'used in fallback order and logs',
		})).toLowerCase().replace(/[^a-z0-9-]/g, '-');
		// The cloud gateway id is reserved (injected at load time) — a
		// custom entry under that name would be silently clobbered.
		if (id === CLOUD_PROVIDER_ID) {
			console.log(`  ⚠ "${CLOUD_PROVIDER_ID}" is reserved for the built-in cloud gateway — pick another id.`);
			return;
		}
		// Overwrite guard: when editing, the same id is the update target
		// (not a conflict); renaming to an id that already exists still asks.
		if (configuredIds.includes(id) && !(editing && id === existing?.id)) {
			const overwrite = await askYesNo(nextLine, `A provider named "${id}" already exists — overwrite it?`);
			if (!overwrite) {
				console.log('  Cancelled.');
				return;
			}
		}

		const displayName = (await ask(nextLine, 'Display name', {
			default: existing?.displayName ?? id,
			hint: 'shown in UIs',
		})) || id;
		const baseUrl = await ask(nextLine, 'Base URL', {
			required: true,
			default: existing?.baseUrl,
			hint: 'OpenAI-compatible, e.g. https://api.example.com/v1; ${VAR} / $VAR env refs supported',
		});
		const model = await ask(nextLine, 'Default model', {
			required: true,
			default: existing?.model,
		});

		// Key handling: prefer an env var name (safe); a literal key is
		// stored in config.json in plaintext, so warn about it.
		const apiKeyEnv = await ask(nextLine, 'API key env var name', {
			default: existing?.apiKeyEnv ?? '',
			hint: 'e.g. MY_GROQ_API_KEY — leave empty for none',
		});
		let apiKey = existing?.apiKey ?? '';
		if (!apiKeyEnv) {
			// hideDefault: never echo the stored key back into the prompt.
			apiKey = await ask(nextLine, 'API key (literal)', {
				default: existing?.apiKey ?? '',
				hint: 'leave empty for none; stored plaintext in config.json',
				hideDefault: Boolean(existing?.apiKey),
			});
		}

		const anonymous = await askYesNo(nextLine, 'Works without an API key (anonymous tier)?', existing?.anonymous ?? false);
		const headers = await askHeaders(nextLine, existing?.headers);
		const extraBody = await askJsonObject(nextLine, 'Extra body fields merged into every request', existing?.extraBody);

		// Default = one above the highest explicit priority so the new
		// provider never jumps ahead of entries the user ranked manually;
		// when editing, keep the provider's existing priority.
		const maxPriority = Math.max(0, ...configured.map((p) => (typeof p.priority === 'number' ? p.priority : 0)));
		const defaultPriority = editing && existing?.priority !== undefined
			? String(existing.priority)
			: String(maxPriority + 1);
		let priorityRaw: string;
		while (true) {
			priorityRaw = await ask(nextLine, 'Fallback priority', {
				default: defaultPriority,
				hint: 'lower = tried first; default = appended after existing providers',
			});
			if (Number.isFinite(Number(priorityRaw))) break;
			console.log('  ⚠ Priority must be a number.');
		}
		const priority = Number(priorityRaw);

		console.log('\n  Provider summary:');
		console.log(`    id:          ${id}`);
		console.log(`    displayName: ${displayName}`);
		// When the baseUrl contains env refs, also show what it resolves to
		// right now so the user sees the effective endpoint before saving.
		const baseRefs = extractEnvRefs(baseUrl);
		const baseLine = baseRefs.length > 0 ? `${baseUrl} → ${expandEnv(baseUrl)}` : baseUrl;
		console.log(`    baseUrl:     ${baseLine}`);
		console.log(`    model:       ${model}`);
		console.log(`    apiKeyEnv:   ${apiKeyEnv || '(none)'}${apiKey ? ' (literal key set)' : ''}`);
		console.log(`    anonymous:   ${anonymous}`);
		// Header VALUES are masked in the summary (they are often secrets);
		// only the names are shown so the user can verify what is set.
		console.log(`    headers:     ${Object.keys(headers).length ? Object.keys(headers).map((k) => `${k}: ****`).join(', ') : '(none)'}`);
		console.log(`    extraBody:   ${Object.keys(extraBody).length ? JSON.stringify(extraBody) : '(none)'}`);
		console.log(`    priority:    ${priority}`);

		const provider: ProviderConfig = {
			id,
			displayName,
			type: 'custom',
			baseUrl,
			model,
			anonymous,
			priority,
			...(apiKeyEnv ? { apiKeyEnv } : {}),
			...(apiKey ? { apiKey } : {}),
			...(Object.keys(headers).length ? { headers } : {}),
			...(Object.keys(extraBody).length ? { extraBody } : {}),
		};

		// Validate the entry actually constructs before persisting it.
		try {
			createProvider(provider);
		} catch (err) {
			console.error(`\n  ✗ Invalid provider config: ${err instanceof Error ? err.message : String(err)}`);
			return;
		}

		// Show the effective key state WITHOUT echoing the literal value.
		if (apiKey) {
			console.log('  ⚠ Storing a literal API key in config.json (plaintext). Prefer an env var: `idexal-ai edit-provider ' + id + '` and set apiKeyEnv.');
		}

		// Env refs in baseUrl/headers/extraBody are expanded at runtime; warn
		// about any that are not set right now so the provider is never saved
		// in a state that cannot connect. The warning REPLACES the normal
		// save confirmation (one prompt either way) so the decision is
		// explicit without a double question.
		const missingRefs = missingProviderEnvRefs(provider);
		const confirm = await askYesNo(
			nextLine,
			missingRefs.length > 0
				? `Save anyway with unset env vars (${missingRefs.join(', ')})?`
				: editing
					? 'Save changes to ~/.idexal/config.json?'
					: 'Save this provider to ~/.idexal/config.json?',
		);
		if (!confirm) {
			console.log('  Cancelled — nothing was written.');
			return;
		}
		if (missingRefs.length > 0) {
			console.log(`  ⚠ Env var reference(s) not set: ${missingRefs.join(', ')}`);
			console.log('    They are stored as-is and expanded at runtime — the provider will fail to connect until they are set.');
		}

		const configPath = expandHome(getGlobalConfigPath());
		writeProviderToConfig(configPath, provider);
		// Rename? Drop the old id so the config keeps exactly one entry.
		if (editing && id !== existing!.id) {
			removeProviderFromConfig(configPath, existing!.id);
		}
		console.log(`\n  ✓ ${editing ? 'Updated' : 'Saved'} "${id}" in ${configPath}`);

		// Optional connection test: probe GET {baseUrl}/models and show what
		// the endpoint advertises (or a clear error when unreachable). The
		// provider is already saved, so a failed probe never blocks setup.
		const testNow = await askYesNo(nextLine, 'Test the connection now?');
		if (testNow) {
			const probe = await probeProviderModels(provider);
			if (probe.ok) {
				console.log(`  ✓ Connected to ${probe.url} (HTTP ${probe.status})`);
				if (probe.models.length > 0) {
					const shown = probe.models.slice(0, 8);
					console.log(`    Available models (${probe.models.length}): ${shown.join(', ')}${probe.models.length > shown.length ? ', …' : ''}`);
				} else {
					console.log('    Connected, but the endpoint advertised no models in /models.');
				}
			} else {
				console.log(`  ✗ Connection failed: ${probe.error}`);
				console.log('    The provider is saved — fix the base URL / API key, then run `idexal-ai providers` to re-check.');
			}
		}

		console.log('  Next: run `idexal-ai providers` to confirm it is picked up, or `idexal-ai run "…"` to use it.\n');
	} catch (err) {
		if (err instanceof WizardCancel) {
			console.log('\n  Cancelled.');
			return;
		}
		throw err;
	} finally {
		rl.close();
	}
}

/**
 * `idexal-ai edit-provider <id>` — opens the same add-provider wizard with
 * the existing provider's values pre-filled. Empty answers keep the current
 * value; `.` clears a field; changing the id renames the entry.
 */
async function editProviderCommand(idArg: string): Promise<void> {
	const id = idArg.trim();
	if (!id) {
		console.error('Usage: idexal-ai edit-provider <id>');
		process.exitCode = 1;
		return;
	}
	const { config } = buildServices();
	const existing = config.providers.find((p) => p.id === id);
	if (!existing) {
		console.error(`\n  ✗ No provider named "${id}" is configured.`);
		console.error('    Run `idexal-ai providers` to see what is available.\n');
		process.exitCode = 1;
		return;
	}
	if (id === CLOUD_PROVIDER_ID) {
		console.log('\n  The Idexal Cloud gateway is built in — edit it via the `cloud` section of config.json (see `idexal-ai cloud`).\n');
		return;
	}
	await addProviderWizard({ existing });
}

/**
 * `idexal-ai remove-provider <id>` — deletes a provider from
 * ~/.idexal/config.json after a confirmation prompt (or `--yes` to skip
 * it). Preserves every other config section; warns when the removed
 * provider was the primaryProvider. The built-in cloud gateway cannot be
 * removed (disable it via cloud.enabled=false instead).
 */
async function removeProviderCommand(idArg: string, force: boolean): Promise<void> {
	const id = idArg.trim();
	if (!id) {
		console.error('Usage: idexal-ai remove-provider <id> [--yes]');
		process.exitCode = 1;
		return;
	}
	const { config } = buildServices();
	const existing = config.providers.find((p) => p.id === id);
	if (!existing) {
		console.error(`\n  ✗ No provider named "${id}" is configured.`);
		console.error('    Run `idexal-ai providers` to see what is available.\n');
		process.exitCode = 1;
		return;
	}
	if (id === CLOUD_PROVIDER_ID) {
		console.log('\n  The Idexal Cloud gateway is built in — disable it with cloud.enabled=false in config.json instead.\n');
		return;
	}

	const configPath = expandHome(getGlobalConfigPath());
	if (!force) {
		const rl = readline.createInterface({ input, output });
		const nextLine = makeLineReader(rl);
		try {
			const yes = await askYesNo(nextLine, `Remove provider "${id}" [${existing.displayName}] from ${configPath}?`);
			if (!yes) {
				console.log('  Cancelled — nothing was removed.\n');
				return;
			}
		} finally {
			rl.close();
		}
	}

	const removed = removeProviderFromConfig(configPath, id);
	if (removed) {
		console.log(`\n  ✓ Removed "${id}" from ${configPath}`);
		if (config.primaryProvider === id) {
			console.log('  ⚠ This was your primaryProvider — update primaryProvider in config.json if needed.');
		}
		console.log();
		return;
	}

	// The id exists in the merged config but not in the file: it comes from
	// the default provider set (or a workspace config). Give a precise hint
	// instead of a confusing "not found" — the default can be overridden by
	// writing your own entry under the same id (e.g. via edit-provider).
	console.error(`\n  ✗ "${id}" is not stored in ${configPath} — it comes from the built-in defaults`);
	console.error('    (or a workspace idexal.config.json). To replace it, run `idexal-ai edit-provider ' + id + '`');
	console.error('    to write your own entry under that id, or remove the defaults entirely by declaring your providers.\n');
	process.exitCode = 1;
}

function showHelp(): void {
	console.log(BANNER);
	console.log(`
  Idexal AI Core — free, multi-provider, multi-agent AI engine

  Usage:
    idexal-ai run "<task>"       Run a task with the multi-agent orchestrator
    idexal-ai stream "<task>"    Run a task, emitting NDJSON events (for the VS Code extension)
    idexal-ai stream --plan-only "<task>"  Emit the plan only — no step is executed
    idexal-ai stream --read-only "<task>"  Run with inspection tools only (no writes/commands)
    idexal-ai agent              Start an interactive agent session
    idexal-ai providers          List providers and their readiness
    idexal-ai list-providers --json  Machine-readable provider list (JSON)
    idexal-ai cloud              Check the built-in Idexal Cloud gateway
    idexal-ai memory             Show long-term memory stats
    idexal-ai config             Show effective configuration
    idexal-ai setup              First-run setup: probe providers and write ~/.idexal/config.json
    idexal-ai compat             Claude Code compatibility: settings, subagents, CLAUDE.md
    idexal-ai compat migrate     Import ~/.claude memory into the Idexal memory DB
    idexal-ai usage              Per-provider usage & cost report (tokens, latency, cost)
    idexal-ai add-provider       Interactive wizard: add a custom provider to ~/.idexal/config.json
    idexal-ai edit-provider <id> Edit a custom provider (wizard pre-filled from config)
    idexal-ai remove-provider <id>  Remove a provider from ~/.idexal/config.json (confirms first)
    idexal-ai help               Show this help

  Provider management:
    add-provider / edit-provider share one wizard; edit pre-fills current
    values — empty answers keep them, "." clears a field, renaming the id
    renames the entry. remove-provider asks for confirmation (--yes skips)
    and never touches the built-in cloud gateway or other config sections.

  Configuration:
    ~/.idexal/config.json        Global config (providers, agent, memory, cloud)
    idexal.config.json           Workspace config (overrides)

  Idexal Cloud (free):
    The core connects to api.idexal.com by default with zero setup.
    Disable with cloud.enabled=false; attach a free key via IDEXAL_CLOUD_KEY.
    See idexal/cloud-provider/DESIGN.md for the full spec.

  Providers:
    Anthropic, OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together,
    Ollama (local), LM Studio (local), or any custom OpenAI-compatible
    endpoint with a baseUrl.
    Add your own endpoint interactively: idexal-ai add-provider

  Semantic memory (long-term):
    Real vector recall via embeddings from any provider with · embeddings ✓.
    Local providers (Ollama, LM Studio) are preferred automatically — free
    and keyless.
    Set agent.embeddingModel for a dedicated embedding model
    (e.g. nomic-embed-text). Vectors are cached in SQLite; switching models
    re-embeds automatically. Falls back to keyword recall when no provider
    supports embeddings.
  Agent Terminal (long-running commands):
    Agents can start real background processes (dev servers, watchers) with
    terminal_start, read their live output with terminal_output (optionally
    waiting for more), send input with terminal_send (prompts, Ctrl+C), and
    stop them with terminal_stop. Output streams live in 'run'/'agent' and
    as NDJSON events in 'stream'. All terminals are killed when a task ends.

  Usage & cost tracking:
    Every provider call (tokens, provider, model, role, latency, estimated
    cost) is recorded in ~/.idexal/usage.db. 'idexal-ai usage' shows the
    all-time report; 'run'/'agent' print a per-task summary after each task.
    Disable with agent.usageEnabled=false; change the DB with agent.usageDbPath.

  Claude Code compatibility:
    Reads ~/.claude/settings.json + .claude/settings.json (env keys and model
    alias), CLAUDE.md instruction files, and .claude/agents/*.md subagents
    (exposed to agents via the use_subagent tool). Nothing is ever written
    to ~/.claude. 'idexal-ai compat migrate' imports CLAUDE.md into the
    Idexal memory DB. Disable with compat.claudeCode=false.

  Environment variables:
    ANTHROPIC_API_KEY, OPENAI_API_KEY, IDEXAL_CLOUD_KEY, or per-provider apiKeyEnv.
`);
}

main().catch((err) => {
	console.error(`\n  ✗ Fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
	process.exitCode = 1;
});
