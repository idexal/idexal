import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
}

export type ToolExecutor = (args: Record<string, any>) => Promise<string>;

const registeredTools = new Map<string, { definition: ToolDefinition; executor: ToolExecutor }>();

function registerTool(def: ToolDefinition, executor: ToolExecutor) {
  registeredTools.set(def.function.name, { definition: def, executor });
}

// ── Built-in Tools ─────────────────────────────────────────────

registerTool({
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read the contents of a file. Returns the full content with line numbers.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path' },
        start_line: { type: 'number', description: 'Optional: start line (1-indexed)' },
        end_line: { type: 'number', description: 'Optional: end line (1-indexed, inclusive)' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const content = fs.readFileSync(args.path, 'utf-8');
  const lines = content.split('\n');
  const start = Math.max(1, args.start_line || 1);
  const end = Math.min(lines.length, args.end_line || lines.length);
  const numbered = lines.slice(start - 1, end).map((l, i) => `${start + i}\t${l}`).join('\n');
  return `File: ${args.path} (${lines.length} lines)\n${numbered}`;
});

registerTool({
  type: 'function',
  function: {
    name: 'write_file',
    description: 'Write content to a file. Creates the file and any parent directories if needed.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write to' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
  },
}, async (args) => {
  const dir = path.dirname(args.path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(args.path, args.content, 'utf-8');
  return `Successfully wrote ${args.content.length} bytes to ${args.path}`;
});

registerTool({
  type: 'function',
  function: {
    name: 'edit_file',
    description: 'Edit a file by replacing exact text. Use this for targeted changes.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to edit' },
        old_text: { type: 'string', description: 'Exact text to find and replace' },
        new_text: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
}, async (args) => {
  const content = fs.readFileSync(args.path, 'utf-8');
  if (!content.includes(args.old_text)) {
    return `ERROR: old_text not found in ${args.path}`;
  }
  const updated = content.replace(args.old_text, args.new_text);
  fs.writeFileSync(args.path, updated, 'utf-8');
  return `Successfully edited ${args.path}`;
});

registerTool({
  type: 'function',
  function: {
    name: 'list_files',
    description: 'List files and directories at a given path. Returns tree structure.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        pattern: { type: 'string', description: 'Optional glob pattern filter (e.g. "*.ts")' },
        max_depth: { type: 'number', description: 'Max depth to traverse (default: 3)' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const maxDepth = args.max_depth || 3;
  const pattern = args.pattern;

  const walk = (dir: string, depth: number, prefix: string): string => {
    if (depth > maxDepth) return '';
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return `${prefix}[permission denied]\n`;
    }
    let result = '';
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'target' && e.name !== '.git');
    const files = entries.filter(e => e.isFile());

    for (const d of dirs) {
      result += `${prefix}📁 ${d.name}/\n`;
      result += walk(path.join(dir, d.name), depth + 1, prefix + '  ');
    }
    for (const f of files) {
      if (pattern && !minimatch(f.name, pattern)) continue;
      result += `${prefix}📄 ${f.name}\n`;
    }
    return result;
  };

  return walk(args.path, 0, '');
});

registerTool({
  type: 'function',
  function: {
    name: 'run_command',
    description: 'Execute a shell command and return its output. Use with caution.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
}, async (args) => {
  try {
    const output = execSync(args.command, {
      cwd: args.cwd || process.cwd(),
      encoding: 'utf-8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return output || '(command produced no output)';
  } catch (err: any) {
    return `ERROR (exit ${err.status}):\n${err.stderr || err.message}`;
  }
});

registerTool({
  type: 'function',
  function: {
    name: 'search_code',
    description: 'Search for a pattern across files in the project. Uses ripgrep for speed.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (regex supported)' },
        path: { type: 'string', description: 'Directory to search in (default: cwd)' },
        file_type: { type: 'string', description: 'File type filter (e.g. "ts", "py")' },
      },
      required: ['pattern'],
    },
  },
}, async (args) => {
  try {
    let cmd = `rg -n "${args.pattern}"`;
    if (args.path) cmd += ` ${args.path}`;
    if (args.file_type) cmd += ` -t ${args.file_type}`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000, maxBuffer: 512 * 1024 });
    return output || '(no matches found)';
  } catch (err: any) {
    return err.stdout || '(no matches found)';
  }
});

registerTool({
  type: 'function',
  function: {
    name: 'get_file_info',
    description: 'Get metadata about a file: size, type, modified date, language.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  try {
    const stats = fs.statSync(args.path);
    const ext = path.extname(args.path).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
      '.rs': 'Rust', '.py': 'Python', '.go': 'Go', '.java': 'Java',
      '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby', '.php': 'PHP',
      '.html': 'HTML', '.css': 'CSS', '.json': 'JSON', '.md': 'Markdown',
    };
    return JSON.stringify({
      path: args.path,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      language: langMap[ext] || ext,
    }, null, 2);
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
});

registerTool({
  type: 'function',
  function: {
    name: 'git_status',
    description: 'Get the current git status of the repository.',
    parameters: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Repository root (optional)' },
      },
      required: [],
    },
  },
}, async (args) => {
  try {
    const status = execSync('git status --short', { encoding: 'utf-8', cwd: args.cwd || process.cwd() });
    const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: args.cwd || process.cwd() });
    const log = execSync('git log --oneline -5', { encoding: 'utf-8', cwd: args.cwd || process.cwd() });
    return `Branch: ${branch.trim()}\n\nStatus:\n${status || '(clean)'}\n\nRecent commits:\n${log}`;
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  }
});

// ── Helper ─────────────────────────────────────────────────────

function minimatch(name: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(name);
}

// ── Public API ─────────────────────────────────────────────────

export function getAllToolDefinitions(): ToolDefinition[] {
  return Array.from(registeredTools.values()).map(t => t.definition);
}

export async function executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  const tool = registeredTools.get(name);
  if (!tool) {
    return { tool_call_id: '', name, content: `Unknown tool: ${name}`, success: false };
  }
  try {
    const content = await tool.executor(args);
    return { tool_call_id: '', name, content, success: true };
  } catch (err: any) {
    return { tool_call_id: '', name, content: `Tool error: ${err.message}`, success: false };
  }
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return registeredTools.get(name)?.definition;
}
