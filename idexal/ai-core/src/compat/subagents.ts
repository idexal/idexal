// Idexal AI Core — Claude Code compatibility: custom subagents
// Reads Claude Code's custom subagents — markdown files with YAML
// frontmatter in `.claude/agents/*.md` (project) and `~/.claude/agents/*.md`
// (global). The frontmatter carries `name`, `description`, `tools`,
// `disallowedTools`, `model`, `maxTurns`; the body is the subagent's system
// prompt. Idexal exposes these to its agents so the same team definitions
// keep working. Zero-dependency frontmatter parsing (no YAML lib).

import * as fs from 'node:fs';
import * as path from 'node:path';
import { claudeHome, fileExists } from './claudeCode.ts';

export interface SubagentDefinition {
	name: string;
	description: string;
	/** Idexal tool names the subagent may use (empty = all tools). */
	tools: string[];
	/** Optional concrete model id (resolved from Claude aliases). */
	model?: string;
	/** Max agentic turns before stopping (default 25). */
	maxTurns: number;
	/** The markdown body — the subagent's system prompt. */
	systemPrompt: string;
	/** Where it came from: 'project' | 'global'. */
	origin: 'project' | 'global';
}

interface Frontmatter {
	data: Record<string, unknown>;
	body: string;
}

/**
 * Minimal YAML-ish frontmatter parser for Claude Code agent files.
 * Handles `key: value`, `key: "quoted"`, comma lists, and indented
 * `- item` arrays. Falls back to treating the whole file as a body when no
 * frontmatter is present.
 */
export function parseFrontmatter(text: string): Frontmatter {
	if (!text.startsWith('---')) {
		return { data: {}, body: text.trim() };
	}
	const end = text.indexOf('\n---', 3);
	if (end < 0) {
		return { data: {}, body: text.trim() };
	}
	const block = text.slice(3, end);
	const body = text.slice(end + 4).trim();

	const data: Record<string, unknown> = {};
	let currentKey: string | undefined;
	let currentList: string[] | undefined;

	for (const rawLine of block.split('\n')) {
		const line = rawLine.trim();
		if (!line) continue;
		// Indented array item continues the current key.
		if (currentKey && currentList && /^-\s+/.test(line)) {
			currentList.push(line.replace(/^-\s+/, '').trim().replace(/^["']|["']$/g, ''));
			continue;
		}
		const idx = line.indexOf(':');
		if (idx < 0) continue;
		const key = line.slice(0, idx).trim();
		let value = line.slice(idx + 1).trim();
		if (!key) continue;
		// Empty value (`tools:` with items on following indented lines):
		// start a list that the `- item` lines below keep filling.
		if (value === '') {
			data[key] = [];
			currentKey = key;
			currentList = data[key] as string[];
			continue;
		}
		if (value.startsWith('-')) {
			// `tools: - Read` style on one line
			const items = value
				.split(',')
				.map((s) => s.trim().replace(/^-\s+/, '').replace(/^["']|["']$/g, ''))
				.filter(Boolean);
			data[key] = items;
			currentKey = key;
			currentList = items;
			continue;
		}
		const wasQuoted = /^["']/.test(value);
		value = value.replace(/^["']|["']$/g, '');
		// Quoted strings stay strings — never comma-split or number-coerced
		// (e.g. `description: "Reviews code, checks style"` stays one string).
		if (!wasQuoted) {
			// Coerce numeric scalars (`maxTurns: 8`) so downstream logic sees
			// a real number, not the string "8".
			if (/^-?\d+$/.test(value)) {
				data[key] = Number(value);
				currentKey = undefined;
				currentList = undefined;
				continue;
			}
			if (value === 'true' || value === 'false') {
				data[key] = value === 'true';
				currentKey = undefined;
				currentList = undefined;
				continue;
			}
			if (value.includes(',')) {
				data[key] = value.split(',').map((s) => s.trim()).filter(Boolean);
				currentKey = key;
				currentList = data[key] as string[];
				continue;
			}
		}
		data[key] = value;
		currentKey = undefined;
		currentList = undefined;
	}
	return { data, body };
}

/** Claude Code tool names → Idexal tool names (best-effort). */
const CLAUDE_TOOL_MAP: Record<string, string> = {
	Read: 'read_file',
	View: 'read_file',
	Write: 'write_file',
	Edit: 'write_file',
	Bash: 'run_command',
	'Terminal': 'run_command',
	Grep: 'search_files',
	Glob: 'list_dir',
	'List Directory': 'list_dir',
	'MultiEdit': 'write_file',
	WebFetch: 'search_files',
	WebSearch: 'search_files',
};

/**
 * Map a Claude Code `tools:` list to Idexal tool names. Accepts an array
 * or a comma-separated string (`tools: Read, Bash`). Unknown names are
 * dropped; an empty result means "all tools" (Claude's default).
 */
export function mapClaudeTools(tools: unknown): string[] {
	const list = Array.isArray(tools)
		? tools
		: typeof tools === 'string' && tools.trim()
			? tools.split(',')
			: [];
	const mapped = list
		.map((t) => (typeof t === 'string' ? t.trim() : ''))
		.filter(Boolean)
		.map((t) => CLAUDE_TOOL_MAP[t] ?? t)
		.filter((t) => t.length > 0);
	return [...new Set(mapped)];
}

/**
 * Reduce a disallowed pattern like `Bash(rm -rf *)` to its base tool name
 * (`Bash` → Idexal `run_command`) so glob-style restrictions actually
 * filter the mapped tool out.
 */
function normalizeToolPattern(d: string): string {
	const base = d.split('(')[0].trim();
	return CLAUDE_TOOL_MAP[base] ?? base;
}

function parseAgentFile(filePath: string, origin: 'project' | 'global'): SubagentDefinition | undefined {
	if (!fileExists(filePath)) return undefined;
	const text = fs.readFileSync(filePath, 'utf8');
	const { data, body } = parseFrontmatter(text);
	const name = typeof data.name === 'string' ? data.name.trim() : '';
	if (!name || !body) return undefined;
	const tools = mapClaudeTools(data.tools);
	const disallowed = mapClaudeTools(data.disallowedTools).map(normalizeToolPattern);
	const allowed = tools.length ? tools.filter((t) => !disallowed.includes(t)) : [];
	const maxTurns = typeof data.maxTurns === 'number' ? Math.max(1, Math.floor(data.maxTurns)) : 25;
	return {
		name,
		description: typeof data.description === 'string' ? data.description : '',
		tools: allowed,
		model: typeof data.model === 'string' && data.model ? data.model : undefined,
		maxTurns,
		systemPrompt: body,
		origin,
	};
}

/** Load subagents from project `.claude/agents/` and global `~/.claude/agents/`. */
export function loadClaudeSubagents(projectDir: string): SubagentDefinition[] {
	const dirs = [
		{ dir: path.join(projectDir, '.claude', 'agents'), origin: 'project' as const },
		{ dir: path.join(claudeHome(), 'agents'), origin: 'global' as const },
	];
	const out: SubagentDefinition[] = [];
	for (const { dir, origin } of dirs) {
		let entries: string[] = [];
		try {
			entries = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
		} catch {
			continue;
		}
		for (const f of entries) {
			const def = parseAgentFile(path.join(dir, f), origin);
			if (def) out.push(def);
		}
	}
	return out;
}
