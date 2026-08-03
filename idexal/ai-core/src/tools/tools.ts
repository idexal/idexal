// Idexal AI Core — agent tools
// The tools an agent can call: read/write/edit files, run terminal
// commands, list directories, search text. Each tool exposes a JSON
// Schema so any provider with tool calling can invoke it.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type ToolDefinition } from '../providers/types.ts';
import { type TerminalManager } from '../terminal/terminalManager.ts';

const execFileAsync = promisify(execFile);

export interface ToolResult {
	ok: boolean;
	output: string;
}

export interface ToolContext {
	cwd: string;
	/** Optional Agent Terminal manager for long-running interactive commands. */
	terminal?: TerminalManager;
}

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;

export interface AgentTool {
	definition: ToolDefinition;
	handler: ToolHandler;
}

const MAX_OUTPUT = 20_000;

function truncateOutput(s: string): string {
	return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + `\n… [truncated ${s.length - MAX_OUTPUT} chars]` : s;
}

/**
 * Resolve a workspace-relative path and verify it stays inside the root.
 * Uses a boundary-aware check (root + separator) so sibling-prefix paths
 * like `../proj-evil/x` cannot escape a root named `proj`.
 */
function resolveInsideRoot(cwd: string, rel: string): { abs: string; ok: boolean } {
	const root = path.resolve(cwd);
	const abs = path.resolve(root, rel);
	const ok = abs === root || abs.startsWith(root + path.sep);
	return { abs, ok };
}

const readFileTool: AgentTool = {
	definition: {
		name: 'read_file',
		description: 'Read a file from disk and return its contents.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Path relative to the workspace' },
				startLine: { type: 'number', description: 'Optional 1-based start line' },
				endLine: { type: 'number', description: 'Optional inclusive end line' },
			},
			required: ['path'],
		},
	},
	async handler(args, ctx) {
		try {
			const rel = String(args.path);
			const { abs, ok } = resolveInsideRoot(ctx.cwd, rel);
			if (!ok) {
				return { ok: false, output: `Path escapes workspace: ${rel}` };
			}
			const content = fs.readFileSync(abs, 'utf8');
			const lines = content.split('\n');
			const start = args.startLine ? Number(args.startLine) : 1;
			const end = args.endLine ? Number(args.endLine) : lines.length;
			const slice = lines.slice(Math.max(0, start - 1), Math.min(lines.length, end)).join('\n');
			return { ok: true, output: truncateOutput(slice) };
		} catch (err) {
			return { ok: false, output: `read_file failed: ${String(err)}` };
		}
	},
};

const writeFileTool: AgentTool = {
	definition: {
		name: 'write_file',
		description: 'Create or overwrite a file with the given content.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Path relative to the workspace' },
				content: { type: 'string', description: 'Full file content' },
			},
			required: ['path', 'content'],
		},
	},
	async handler(args, ctx) {
		try {
			const rel = String(args.path);
			const { abs, ok } = resolveInsideRoot(ctx.cwd, rel);
			if (!ok) {
				return { ok: false, output: `Path escapes workspace: ${rel}` };
			}
			fs.mkdirSync(path.dirname(abs), { recursive: true });
			fs.writeFileSync(abs, String(args.content));
			return { ok: true, output: `Wrote ${rel} (${String(args.content).length} chars)` };
		} catch (err) {
			return { ok: false, output: `write_file failed: ${String(err)}` };
		}
	},
};

const listDirTool: AgentTool = {
	definition: {
		name: 'list_dir',
		description: 'List files and directories in a folder.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Directory path relative to workspace (default ".")' },
			},
		},
	},
	async handler(args, ctx) {
		try {
			const rel = String(args.path ?? '.');
			const { abs, ok } = resolveInsideRoot(ctx.cwd, rel);
			if (!ok) {
				return { ok: false, output: `Path escapes workspace: ${rel}` };
			}
			const entries = fs.readdirSync(abs, { withFileTypes: true });
			const lines = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
			return { ok: true, output: lines.join('\n') };
		} catch (err) {
			return { ok: false, output: `list_dir failed: ${String(err)}` };
		}
	},
};

const runCommandTool: AgentTool = {
	definition: {
		name: 'run_command',
		description:
			'Run a terminal command in the workspace and return its stdout/stderr. Use for build, test, git, and shell tasks.',
		inputSchema: {
			type: 'object',
			properties: {
				command: { type: 'string', description: 'The shell command to run' },
				timeoutMs: { type: 'number', description: 'Timeout in ms (default 60000)' },
			},
			required: ['command'],
		},
	},
	async handler(args, ctx) {
		const cmd = String(args.command);
		const timeoutMs = args.timeoutMs ? Number(args.timeoutMs) : 60_000;
		try {
			const { stdout, stderr } = await execFileAsync(
				process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
				process.platform === 'win32' ? ['/c', cmd] : ['-c', cmd],
				{ cwd: ctx.cwd, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
			);
			const out = [stdout, stderr].filter(Boolean).join('\n');
			return { ok: true, output: truncateOutput(out || '(no output)') };
		} catch (err) {
			const e = err as { stdout?: string; stderr?: string; message?: string };
			const out = [e.stdout, e.stderr].filter(Boolean).join('\n');
			return { ok: false, output: truncateOutput(out || String(e.message)) };
		}
	},
};

const searchFilesTool: AgentTool = {
	definition: {
		name: 'search_files',
		description: 'Search for a text pattern across workspace files (ripgrep-style regex).',
		inputSchema: {
			type: 'object',
			properties: {
				pattern: { type: 'string', description: 'Regex pattern to search for' },
				path: { type: 'string', description: 'Subdirectory to limit the search (default ".")' },
				glob: { type: 'string', description: 'Optional file glob filter, e.g. "*.ts"' },
			},
			required: ['pattern'],
		},
	},
	async handler(args, ctx) {
		try {
			const rel = String(args.path ?? '.');
			const { abs, ok } = resolveInsideRoot(ctx.cwd, rel);
			if (!ok) {
				return { ok: false, output: `Path escapes workspace: ${rel}` };
			}
			const pattern = String(args.pattern);
			const lines: string[] = [];
			const walk = (dir: string, depth: number) => {
				if (depth > 8 || lines.length > 500) return;
				let entries: fs.Dirent[];
				try {
					entries = fs.readdirSync(dir, { withFileTypes: true });
				} catch {
					return;
				}
				for (const e of entries) {
					if (e.name === 'node_modules' || e.name === '.git' || e.name === '.idexal' || e.name.startsWith('.')) continue;
					const full = path.join(dir, e.name);
					if (e.isDirectory()) {
						walk(full, depth + 1);
					} else if (e.isFile()) {
						try {
							const content = fs.readFileSync(full, 'utf8');
							if (content.includes(pattern) || new RegExp(pattern).test(content)) {
								const relPath = path.relative(ctx.cwd, full);
								lines.push(relPath);
							}
						} catch {
							// binary or unreadable
						}
					}
				}
			};
			walk(abs, 0);
			return { ok: true, output: lines.length ? lines.join('\n') : '(no matches)' };
		} catch (err) {
			return { ok: false, output: `search_files failed: ${String(err)}` };
		}
	},
};

const getGitStatusTool: AgentTool = {
	definition: {
		name: 'git_status',
		description: 'Show the current git status and diff summary.',
		inputSchema: { type: 'object', properties: {} },
	},
	async handler(_args, ctx) {
		try {
			const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: ctx.cwd });
			return { ok: true, output: truncateOutput(stdout || '(clean)') };
		} catch (err) {
			return { ok: false, output: `git_status failed: ${String(err)}` };
		}
	},
};

const terminalStartTool: AgentTool = {
	definition: {
		name: 'terminal_start',
		description:
			'Start a long-running command in a background terminal (dev server, watcher, build, …) and return its terminal id. The process keeps running while you do other work. Read its new output with terminal_output (optionally waiting for more), send it input with terminal_send (e.g. answer prompts or Ctrl+C), and stop it with terminal_stop.',
		inputSchema: {
			type: 'object',
			properties: {
				command: { type: 'string', description: 'The shell command to run (e.g. "npm run dev")' },
				cwd: { type: 'string', description: 'Optional working directory relative to the workspace (default ".")' },
			},
			required: ['command'],
		},
	},
	async handler(args, ctx) {
		const terminal = ctx.terminal;
		if (!terminal) {
			return { ok: false, output: 'terminal_start unavailable: no terminal manager in this context.' };
		}
		const cmd = String(args.command);
		const relCwd = args.cwd ? String(args.cwd) : '.';
		const { abs, ok } = resolveInsideRoot(ctx.cwd, relCwd);
		if (!ok) {
			return { ok: false, output: `Path escapes workspace: ${relCwd}` };
		}
		try {
			const id = terminal.start(cmd, abs);
			return { ok: true, output: `Started terminal ${id}: ${cmd}` };
		} catch (err) {
			return { ok: false, output: `terminal_start failed: ${String(err)}` };
		}
	},
};

const terminalOutputTool: AgentTool = {
	definition: {
		name: 'terminal_output',
		description:
			'Read the NEW output of a running terminal since the last read. Pass waitMs to block up to that many ms for more output (e.g. wait for a dev server to print "ready"). Returns the drained output or "(no new output)".',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Terminal id from terminal_start' },
				waitMs: { type: 'number', description: 'Optional ms to wait for new output (default 0)' },
			},
			required: ['id'],
		},
	},
	async handler(args, ctx) {
		const terminal = ctx.terminal;
		if (!terminal) {
			return { ok: false, output: 'terminal_output unavailable: no terminal manager in this context.' };
		}
		const id = String(args.id);
		const waitMs = Math.min(Math.max(Number(args.waitMs) || 0, 0), 120_000);
		const started = Date.now();
		try {
			let state = terminal.drain(id);
			// Wait (up to waitMs) for output to appear if the caller asked for it.
			while (!state.output && state.running && Date.now() - started < waitMs) {
				await new Promise((r) => setTimeout(r, 100));
				state = terminal.drain(id);
			}
			const head = state.output.trim() ? state.output.trim() : '(no new output)';
			const status = state.running ? 'running' : `exited (code ${state.exitCode ?? 'unknown'})`;
			return { ok: true, output: `[${id} ${status}]\n${head}` };
		} catch (err) {
			return { ok: false, output: `terminal_output failed: ${String(err)}` };
		}
	},
};

const terminalSendTool: AgentTool = {
	definition: {
		name: 'terminal_send',
		description:
			'Send input to a running terminal\'s stdin — answer interactive prompts, send a newline, or send Ctrl+C ("\\u0003") to interrupt a process.',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Terminal id from terminal_start' },
				input: { type: 'string', description: 'Text to write to stdin (e.g. "y\n", "q\n", or Ctrl+C)' },
			},
			required: ['id', 'input'],
		},
	},
	async handler(args, ctx) {
		const terminal = ctx.terminal;
		if (!terminal) {
			return { ok: false, output: 'terminal_send unavailable: no terminal manager in this context.' };
		}
		const id = String(args.id);
		const input = String(args.input ?? '');
		try {
			const sent = terminal.send(id, input);
			return sent
				? { ok: true, output: `Sent ${JSON.stringify(input)} to terminal ${id}` }
				: { ok: false, output: `Terminal ${id} is not running — cannot send input` };
		} catch (err) {
			return { ok: false, output: `terminal_send failed: ${String(err)}` };
		}
	},
};

const terminalStopTool: AgentTool = {
	definition: {
		name: 'terminal_stop',
		description: 'Stop a running terminal and kill its process tree (e.g. shut down a dev server).',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Terminal id from terminal_start' },
			},
			required: ['id'],
		},
	},
	async handler(args, ctx) {
		const terminal = ctx.terminal;
		if (!terminal) {
			return { ok: false, output: 'terminal_stop unavailable: no terminal manager in this context.' };
		}
		const id = String(args.id);
		try {
			const info = terminal.get(id);
			if (!info) {
				return { ok: false, output: `Unknown terminal: ${id}` };
			}
			if (info.status !== 'running') {
				return { ok: true, output: `Terminal ${id} already exited (code ${info.exitCode ?? 'unknown'})` };
			}
			terminal.stop(id);
			return { ok: true, output: `Stopped terminal ${id}` };
		} catch (err) {
			return { ok: false, output: `terminal_stop failed: ${String(err)}` };
		}
	},
};

const terminalListTool: AgentTool = {
	definition: {
		name: 'terminal_list',
		description: 'List all background terminals started in this session with their status (running/exited), command, and start time.',
		inputSchema: { type: 'object', properties: {} },
	},
	async handler(_args, ctx) {
		const terminal = ctx.terminal;
		if (!terminal) {
			return { ok: false, output: 'terminal_list unavailable: no terminal manager in this context.' };
		}
		const list = terminal.list();
		if (list.length === 0) {
			return { ok: true, output: '(no terminals)' };
		}
		const lines = list.map((t) => {
			const age = Math.round((Date.now() - t.startedAt) / 1000);
			const status = t.status === 'running' ? `running (${age}s)` : `exited (code ${t.exitCode ?? 'unknown'})`;
			return `${t.id}: ${t.command} — ${status}`;
		});
		return { ok: true, output: lines.join('\n') };
	},
};

export const ALL_TOOLS: AgentTool[] = [
	readFileTool,
	writeFileTool,
	listDirTool,
	runCommandTool,
	searchFilesTool,
	getGitStatusTool,
	terminalStartTool,
	terminalOutputTool,
	terminalSendTool,
	terminalStopTool,
	terminalListTool,
];

/**
 * The read-only tool subset (analysis-only runs). Used by `stream
 * --read-only` and the extension's /idexal:review: agents can inspect the
 * workspace but can never write files, run commands, or start terminals.
 */
export const READ_ONLY_TOOLS: AgentTool[] = [
	readFileTool,
	listDirTool,
	searchFilesTool,
	getGitStatusTool,
];

const READ_ONLY_NAMES = new Set(READ_ONLY_TOOLS.map((t) => t.definition.name));

/** Filter any tool set down to the read-only subset (by name). */
export function readOnlyTools(tools: AgentTool[] = ALL_TOOLS): AgentTool[] {
	return tools.filter((t) => READ_ONLY_NAMES.has(t.definition.name));
}

export function toolDefinitions(tools: AgentTool[] = ALL_TOOLS): ToolDefinition[] {
	return tools.map((t) => t.definition);
}

export function findTool(name: string, tools: AgentTool[] = ALL_TOOLS): AgentTool | undefined {
	return tools.find((t) => t.definition.name === name);
}

export async function executeTool(
	name: string,
	args: Record<string, unknown>,
	ctx: ToolContext,
	tools: AgentTool[] = ALL_TOOLS,
): Promise<ToolResult> {
	const tool = findTool(name, tools);
	if (!tool) {
		return { ok: false, output: `Unknown tool: ${name}` };
	}
	try {
		return await tool.handler(args, ctx);
	} catch (err) {
		return { ok: false, output: `Tool ${name} threw: ${String(err)}` };
	}
}
