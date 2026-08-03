// Idexal AI Core — Claude Code compatibility: settings & environment
// Reads Claude Code's settings files (global ~/.claude/settings.json and
// project .claude/settings.json), injects their `env` block (API keys etc.)
// into the process environment (never overwriting real env vars), maps
// Claude's model aliases (sonnet/opus/haiku) onto concrete Anthropic model
// ids, and loads CLAUDE.md instruction files the way Claude Code does.
// Everything here is offline-safe and never throws.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface ClaudeSettings {
	/** API keys / env vars Claude Code injects per session. */
	env: Record<string, string>;
	/** Model override: alias ("sonnet"/"opus"/"haiku") or full model id. */
	model?: string;
	/** Default agent for the main conversation. */
	agent?: string;
	/** Preferred response language. */
	language?: string;
	/** Permission rules (allow/deny/ask). */
	permissions?: { allow?: string[]; deny?: string[]; ask?: string[] };
}

export interface ClaudeCompatState {
	/** Settings merged from global + project (project wins). */
	settings: ClaudeSettings;
	/** Which settings files were found and read. */
	settingsFiles: string[];
	/** Which CLAUDE.md files were found (global, then project order). */
	instructionFiles: string[];
	/** Concatenated CLAUDE.md instructions (ordered by scope priority). */
	instructions: string;
	/** Whether any Claude Code data was found at all. */
	found: boolean;
}

const GLOBAL_SETTINGS = 'settings.json';
const GLOBAL_AGENTS = 'agents';
const GLOBAL_MEMORY = 'CLAUDE.md';

/** Claude Code model alias → concrete Anthropic model id. */
export const CLAUDE_MODEL_ALIASES: Record<string, string> = {
	sonnet: 'claude-sonnet-4-20250514',
	opus: 'claude-opus-4-20250514',
	haiku: 'claude-haiku-4-5-20251001',
	'sonnet-4-5': 'claude-sonnet-4-5-20250929',
	'opus-4-1': 'claude-opus-4-1-20250805',
	'haiku-4-5': 'claude-haiku-4-5-20251001',
};

/** Resolve a Claude Code model setting to a concrete model id (passthrough for unknown). */
export function resolveClaudeModel(model: string): string {
	const trimmed = model.trim();
	return CLAUDE_MODEL_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function exists(p: string): boolean {
	try {
		return fs.statSync(p).isFile();
	} catch {
		return false;
	}
}

function readJson(p: string): Record<string, unknown> | undefined {
	try {
		return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

function parseSettings(raw: Record<string, unknown>): ClaudeSettings {
	const envRaw = raw.env;
	const env: Record<string, string> = {};
	if (envRaw && typeof envRaw === 'object' && !Array.isArray(envRaw)) {
		for (const [k, v] of Object.entries(envRaw)) {
			if (typeof v === 'string') env[k] = v;
		}
	}
	const permissions = raw.permissions as { allow?: unknown; deny?: unknown; ask?: unknown } | undefined;
	const strList = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);
	return {
		env,
		...(typeof raw.model === 'string' && raw.model ? { model: raw.model } : {}),
		...(typeof raw.agent === 'string' && raw.agent ? { agent: raw.agent } : {}),
		...(typeof raw.language === 'string' && raw.language ? { language: raw.language } : {}),
		...(permissions ? { permissions: { allow: strList(permissions.allow), deny: strList(permissions.deny), ask: strList(permissions.ask) } } : {}),
	};
}

/** Base directory of Claude Code's per-user data (test-overridable). */
function claudeHome(): string {
	return process.env.IDEXAL_CLAUDE_HOME ?? path.join(os.homedir(), '.claude');
}

/**
 * Read Claude Code settings: global (~/.claude/settings.json) merged with
 * project (.claude/settings.json). Project values win per-key.
 */
export function readClaudeSettings(projectDir: string): ClaudeCompatState['settings'] & { files: string[] } {
	const global = path.join(claudeHome(), GLOBAL_SETTINGS);
	const project = path.join(projectDir, '.claude', GLOBAL_SETTINGS);

	const merged: ClaudeSettings = { env: {} };
	const files: string[] = [];

	const gRaw = readJson(global);
	if (gRaw) {
		files.push(global);
		const g = parseSettings(gRaw);
		Object.assign(merged.env, g.env);
		if (g.model) merged.model = g.model;
		if (g.agent) merged.agent = g.agent;
		if (g.language) merged.language = g.language;
		if (g.permissions) merged.permissions = g.permissions;
	}
	const pRaw = readJson(project);
	if (pRaw) {
		files.push(project);
		const p = parseSettings(pRaw);
		// Project env overrides global per-key; top-level fields replace.
		Object.assign(merged.env, p.env);
		if (p.model) merged.model = p.model;
		if (p.agent) merged.agent = p.agent;
		if (p.language) merged.language = p.language;
		if (p.permissions) merged.permissions = p.permissions;
	}
	return { settings: merged, files };
}

/**
 * Inject Claude Code's env block into process.env — only for variables that
 * are NOT already set, so the user's real shell environment always wins.
 */
export function injectClaudeEnv(env: Record<string, string>): string[] {
	const applied: string[] = [];
	for (const [k, v] of Object.entries(env)) {
		if (process.env[k] === undefined && v !== '') {
			process.env[k] = v;
			applied.push(k);
		}
	}
	return applied;
}

/**
 * CLAUDE.md instruction files, in Claude Code's scope order:
 *   ~/.claude/CLAUDE.md (global) → ./CLAUDE.md → ./.claude/CLAUDE.md → ./CLAUDE.local.md
 * Returns the concatenation (blank-line separated) plus the file list.
 */
export function loadClaudeInstructions(projectDir: string): { instructions: string; files: string[] } {
	const candidates = [
		path.join(claudeHome(), GLOBAL_MEMORY),
		path.join(projectDir, 'CLAUDE.md'),
		path.join(projectDir, '.claude', 'CLAUDE.md'),
		path.join(projectDir, 'CLAUDE.local.md'),
	];
	const files: string[] = [];
	const parts: string[] = [];
	for (const c of candidates) {
		if (!exists(c)) continue;
		const content = fs.readFileSync(c, 'utf8').trim();
		if (!content) continue;
		files.push(c);
		parts.push(content);
	}
	return { instructions: parts.join('\n\n'), files };
}

/** Full compatibility probe — everything this feature reads, once. */
export function loadClaudeCompat(projectDir: string): ClaudeCompatState {
	const { settings, files: settingsFiles } = readClaudeSettings(projectDir);
	const { instructions, files: instructionFiles } = loadClaudeInstructions(projectDir);
	const found = settingsFiles.length > 0 || instructionFiles.length > 0;
	return { settings, settingsFiles, instructionFiles, instructions, found };
}

export { claudeHome, exists as fileExists };
