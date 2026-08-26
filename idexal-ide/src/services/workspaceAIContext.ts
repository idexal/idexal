/**
 * Workspace AI Context Service
 * Provides multi-file awareness for AI agents — understands the full project,
 * not just the current file.
 */

export interface WorkspaceContext {
  projectName: string;
  rootPath: string;
  openFiles: FileInfo[];
  recentFiles: FileInfo[];
  projectStructure: FileNode[];
  languages: Record<string, number>;
  gitInfo: GitInfo;
  dependencies: string[];
  configFiles: string[];
  totalFiles: number;
  totalLines: number;
}

export interface FileInfo {
  path: string;
  name: string;
  language: string;
  size: number;
  lastModified: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
}

export interface GitInfo {
  branch: string;
  isDirty: boolean;
  recentCommits: { hash: string; message: string; author: string; date: string }[];
}

export interface ContextWindow {
  system: string;
  project: string;
  files: string;
  recent: string;
  git: string;
  totalTokens: number;
}

// ── Token estimation (4 chars ≈ 1 token) ─────────
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Build system prompt with workspace awareness ──
function buildSystemPrompt(ctx: WorkspaceContext): string {
  const lines: string[] = [];

  lines.push(`You are an AI assistant for the project "${ctx.projectName}".`);
  lines.push(`The project is at: ${ctx.rootPath}`);
  lines.push('');

  // Project structure overview
  lines.push('## Project Structure');
  if (ctx.projectStructure.length > 0) {
    const topDirs = ctx.projectStructure
      .filter(n => n.type === 'directory')
      .slice(0, 10);
    for (const dir of topDirs) {
      lines.push(`- ${dir.name}/`);
    }
  }
  lines.push('');

  // Languages
  if (Object.keys(ctx.languages).length > 0) {
    lines.push('## Languages');
    const sorted = Object.entries(ctx.languages).sort((a, b) => b[1] - a[1]);
    for (const [lang, count] of sorted.slice(0, 8)) {
      lines.push(`- ${lang}: ${count} files`);
    }
    lines.push('');
  }

  // Dependencies
  if (ctx.dependencies.length > 0) {
    lines.push('## Key Dependencies');
    lines.push(ctx.dependencies.slice(0, 20).join(', '));
    lines.push('');
  }

  // Git info
  if (ctx.gitInfo.branch) {
    lines.push('## Git Status');
    lines.push(`Branch: ${ctx.gitInfo.branch}`);
    lines.push(`Dirty: ${ctx.gitInfo.isDirty}`);
    if (ctx.gitInfo.recentCommits.length > 0) {
      lines.push('Recent commits:');
      for (const c of ctx.gitInfo.recentCommits.slice(0, 5)) {
        lines.push(`- ${c.hash.slice(0, 7)} ${c.message}`);
      }
    }
    lines.push('');
  }

  // Config files
  if (ctx.configFiles.length > 0) {
    lines.push('## Config Files');
    lines.push(ctx.configFiles.join(', '));
    lines.push('');
  }

  return lines.join('\n');
}

// ── Build file context for selected files ─────────
function buildFileContext(files: FileInfo[], maxTokens: number = 4000): string {
  const lines: string[] = [];
  let tokens = 0;

  for (const file of files) {
    const header = `### ${file.name} (${file.language})\nPath: ${file.path}\n`;
    const headerTokens = estimateTokens(header);
    if (tokens + headerTokens > maxTokens) break;

    lines.push(header);
    tokens += headerTokens;
  }

  return lines.join('\n');
}

// ── Build recent activity context ─────────────────
function buildRecentContext(ctx: WorkspaceContext, maxTokens: number = 2000): string {
  const lines: string[] = [];
  let tokens = 0;

  lines.push('## Recently Modified Files');
  for (const file of ctx.recentFiles.slice(0, 10)) {
    const line = `- ${file.path} (${file.language})`;
    const lineTokens = estimateTokens(line);
    if (tokens + lineTokens > maxTokens) break;
    lines.push(line);
    tokens += lineTokens;
  }

  return lines.join('\n');
}

// ── Main context builder ─────────────────────────
export function buildWorkspaceContext(
  ctx: WorkspaceContext,
  currentFile?: string,
  selectedFiles?: string[],
  maxTokens: number = 8000
): ContextWindow {
  const system = buildSystemPrompt(ctx);

  // Add current file info
  let files = '';
  if (currentFile) {
    const file = ctx.openFiles.find(f => f.path === currentFile);
    if (file) {
      files = `## Current File\n${file.name} (${file.language})\nPath: ${file.path}\n`;
    }
  }

  // Add selected files
  if (selectedFiles && selectedFiles.length > 0) {
    const selected = selectedFiles
      .map(p => ctx.openFiles.find(f => f.path === p))
      .filter(Boolean) as FileInfo[];
    files += buildFileContext(selected, maxTokens / 2);
  }

  const recent = buildRecentContext(ctx, maxTokens / 4);
  const git = ctx.gitInfo.branch ? `Branch: ${ctx.gitInfo.branch}${ctx.gitInfo.isDirty ? ' (dirty)' : ''}` : '';

  const totalTokens = estimateTokens(system) + estimateTokens(files) + estimateTokens(recent) + estimateTokens(git);

  return { system, project: system, files, recent, git, totalTokens };
}

// ── Auto-detect project info from files ───────────
export function detectProjectInfo(files: string[]): Partial<WorkspaceContext> {
  const languages: Record<string, number> = {};
  const configFiles: string[] = [];
  const deps: string[] = [];

  for (const file of files) {
    const ext = file.split('.').pop()?.toLowerCase() || '';
    const lang = EXTENSION_MAP[ext] || 'unknown';
    languages[lang] = (languages[lang] || 0) + 1;

    if (CONFIG_PATTERNS.some(p => file.includes(p))) {
      configFiles.push(file);
    }
  }

  // Detect dependencies from package.json or Cargo.toml
  if (files.includes('package.json')) deps.push('node');
  if (files.includes('Cargo.toml')) deps.push('rust');
  if (files.includes('go.mod')) deps.push('go');
  if (files.includes('requirements.txt') || files.includes('pyproject.toml')) deps.push('python');

  return { languages, configFiles, dependencies: deps, totalFiles: files.length };
}

// ── Extension to language map ─────────────────────
const EXTENSION_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  rs: 'rust', py: 'python', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
  h: 'c', hpp: 'cpp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  html: 'html', css: 'css', scss: 'scss', json: 'json', yaml: 'yaml',
  yml: 'yaml', toml: 'toml', md: 'markdown', sh: 'shell', bash: 'shell',
};

const CONFIG_PATTERNS = [
  'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
  'tsconfig.json', 'vite.config', '.eslintrc', 'Dockerfile',
  '.github/workflows', 'Makefile', 'CMakeLists.txt',
];

// ── Export for use in chat panel ─────────────────
export function getContextForChat(
  ctx: WorkspaceContext,
  currentFile?: string,
  chatHistory?: { role: string; content: string }[]
): string {
  const workspace = buildWorkspaceContext(ctx, currentFile);

  let context = workspace.system + '\n\n';
  if (workspace.files) context += workspace.files + '\n\n';
  if (workspace.recent) context += workspace.recent + '\n\n';
  if (workspace.git) context += workspace.git + '\n\n';

  // Add recent chat history for continuity
  if (chatHistory && chatHistory.length > 0) {
    context += '## Recent Conversation\n';
    for (const msg of chatHistory.slice(-6)) {
      context += `${msg.role}: ${msg.content.slice(0, 200)}\n`;
    }
  }

  return context;
}
