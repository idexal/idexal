import React, { useState, useMemo } from 'react'

// ── Feature Data ──────────────────────────────────────────────
interface Feature {
  name: string
  category: string
  status: 'stable' | 'beta' | 'new' | 'planned'
  description: string
  icon: string
}

const FEATURES: Feature[] = [
  // AI & Agents
  { name: 'Multi-Model AI Chat', category: 'AI & Agents', status: 'stable', description: 'Chat with OpenAI, Anthropic, Ollama, or custom providers', icon: '🤖' },
  { name: '8 Specialized Agents', category: 'AI & Agents', status: 'stable', description: 'FaCode, Review, Debug, Architect, Test, DevOps, Security, Perf', icon: '🧠' },
  { name: 'Agent Workbench', category: 'AI & Agents', status: 'stable', description: 'Multi-agent orchestration and task management', icon: '⚙️' },
  { name: 'Code Review Agent', category: 'AI & Agents', status: 'stable', description: 'AI-powered code review with severity ratings', icon: '🔍' },
  { name: 'Auto-Fix Errors', category: 'AI & Agents', status: 'stable', description: 'Detect and fix lint, type, and test errors automatically', icon: '🔧' },
  { name: 'AI Commit Messages', category: 'AI & Agents', status: 'new', description: 'Generate conventional commit messages from staged diff', icon: '💬' },
  { name: 'Project Memory / RAG', category: 'AI & Agents', status: 'new', description: 'Cross-session memory that remembers project analysis', icon: '🧩' },
  { name: 'Code Explanation', category: 'AI & Agents', status: 'stable', description: 'Explain code at beginner, intermediate, or expert level', icon: '📖' },
  { name: 'Inline Code Actions', category: 'AI & Agents', status: 'stable', description: 'Lightbulb suggestions for explain, fix, refactor, optimize', icon: '💡' },
  { name: 'AI History', category: 'AI & Agents', status: 'stable', description: 'Browse and search past AI conversations', icon: '📜' },

  // Editor & Code
  { name: 'Monaco Editor', category: 'Editor & Code', status: 'stable', description: 'VS Code-powered editor with syntax highlighting', icon: '📝' },
  { name: 'Multi-Cursor Editing', category: 'Editor & Code', status: 'stable', description: 'Column selection and multi-cursor support', icon: '🖊️' },
  { name: 'Code Intelligence', category: 'Editor & Code', status: 'stable', description: 'Tree-sitter parsing, go-to-definition, find references', icon: '🔬' },
  { name: 'Snippets Library', category: 'Editor & Code', status: 'stable', description: 'Pre-built snippets for 20+ languages', icon: '📋' },
  { name: 'Snippet Manager', category: 'Editor & Code', status: 'stable', description: 'Create, edit, and organize custom snippets', icon: '🗂️' },
  { name: 'Snippet Generator', category: 'Editor & Code', status: 'beta', description: 'AI-powered snippet generation from code', icon: '✨' },
  { name: 'Diff Viewer', category: 'Editor & Code', status: 'stable', description: 'Side-by-side and inline diff comparison', icon: '↔️' },
  { name: 'Breadcrumbs', category: 'Editor & Code', status: 'stable', description: 'File path navigation with symbol breadcrumbs', icon: '🔗' },
  { name: 'Symbol Outline', category: 'Editor & Code', status: 'stable', description: 'Document symbol tree for quick navigation', icon: '🌳' },
  { name: 'Call Hierarchy', category: 'Editor & Code', status: 'stable', description: 'Trace function call chains', icon: '📊' },
  { name: 'Go to Line', category: 'Editor & Code', status: 'stable', description: 'Quick line navigation', icon: '🎯' },
  { name: 'Formatter', category: 'Editor & Code', status: 'stable', description: 'Code formatting with Prettier integration', icon: '🎨' },
  { name: 'Regex Tester', category: 'Editor & Code', status: 'stable', description: 'Live regex testing with match highlighting', icon: '🔤' },
  { name: 'JSON Viewer', category: 'Editor & Code', status: 'stable', description: 'Formatted JSON display with collapsible tree', icon: '{ }' },
  { name: 'Markdown Preview', category: 'Editor & Code', status: 'stable', description: 'Live markdown rendering side-by-side', icon: '📄' },
  { name: 'Bookmarks', category: 'Editor & Code', status: 'stable', description: 'Mark and jump to important locations', icon: '🔖' },
  { name: 'Todo Finder', category: 'Editor & Code', status: 'stable', description: 'Find all TODO/FIXME/HACK comments across project', icon: '✅' },
  { name: 'Code Migration', category: 'Editor & Code', status: 'beta', description: 'AI-assisted code migration between frameworks', icon: '🔄' },

  // Git & Version Control
  { name: 'Git Panel', category: 'Git & VCS', status: 'stable', description: 'Status, diff, commit, branch management', icon: '🌿' },
  { name: 'Git Staging', category: 'Git & VCS', status: 'stable', description: 'Interactive stage/unstage with hunk support', icon: '📦' },
  { name: 'Git Advanced', category: 'Git & VCS', status: 'stable', description: 'Rebase, cherry-pick, stash, merge tools', icon: '🔀' },
  { name: 'Git Log', category: 'Git & VCS', status: 'stable', description: 'Visual commit history with graph', icon: '📈' },
  { name: 'Git Blame', category: 'Git & VCS', status: 'stable', description: 'Line-by-line author attribution', icon: '🕵️' },
  { name: 'Git History', category: 'Git & VCS', status: 'stable', description: 'File-level change history', icon: '📅' },

  // Terminal & DevOps
  { name: 'Integrated Terminal', category: 'Terminal & DevOps', status: 'stable', description: 'xterm.js powered terminal with multiple tabs', icon: '💻' },
  { name: 'Task Runner', category: 'Terminal & DevOps', status: 'stable', description: 'Run and manage build tasks', icon: '🏃' },
  { name: 'Docker Panel', category: 'Terminal & DevOps', status: 'stable', description: 'Container management and Docker Compose', icon: '🐳' },
  { name: 'Kubernetes Dashboard', category: 'Terminal & DevOps', status: 'beta', description: 'K8s cluster visualization and management', icon: '☸️' },
  { name: 'CI/CD Panel', category: 'Terminal & DevOps', status: 'beta', description: 'Pipeline visualization and management', icon: '🔄' },
  { name: 'Deploy Panel', category: 'Terminal & DevOps', status: 'beta', description: 'Cloud deployment to AWS, GCP, Azure', icon: '🚀' },
  { name: 'Cloud Functions', category: 'Terminal & DevOps', status: 'beta', description: 'Serverless function management', icon: '☁️' },
  { name: 'Container Registry', category: 'Terminal & DevOps', status: 'beta', description: 'Docker registry browser and push/pull', icon: '📦' },
  { name: 'Processes', category: 'Terminal & DevOps', status: 'stable', description: 'System process monitor', icon: '📊' },
  { name: 'Package Manager', category: 'Terminal & DevOps', status: 'stable', description: 'npm/yarn/pnpm dependency management', icon: '📚' },
  { name: 'SSH Manager', category: 'Terminal & DevOps', status: 'new', description: 'Remote server connections and file editing', icon: '🔐' },

  // Database & API
  { name: 'Database Explorer', category: 'Database & API', status: 'stable', description: 'Connect to PostgreSQL, MySQL, SQLite, MongoDB', icon: '🗄️' },
  { name: 'Query History', category: 'Database & API', status: 'stable', description: 'Save and replay database queries', icon: '🕐' },
  { name: 'Database Backup', category: 'Database & API', status: 'beta', description: 'Automated database backups', icon: '💾' },
  { name: 'API Client', category: 'Database & API', status: 'stable', description: 'REST/GraphQL request builder', icon: '🌐' },
  { name: 'API Doc Generator', category: 'Database & API', status: 'new', description: 'Auto-generate API documentation from code', icon: '📑' },
  { name: 'GraphQL Explorer', category: 'Database & API', status: 'stable', description: 'Schema browser and query builder', icon: '◈' },
  { name: 'Mock Server', category: 'Database & API', status: 'beta', description: 'Local mock API server for testing', icon: '🎭' },
  { name: 'WebSocket Tester', category: 'Database & API', status: 'beta', description: 'WebSocket connection testing', icon: '🔌' },
  { name: 'Webhook Manager', category: 'Database & API', status: 'beta', description: 'Configure and test webhook endpoints', icon: '🪝' },

  // Collaboration
  { name: 'Real-Time Collaboration', category: 'Collaboration', status: 'beta', description: 'CRDT-based shared editing with Yjs', icon: '👥' },
  { name: 'Live Share', category: 'Collaboration', status: 'beta', description: 'Share terminal and editor sessions', icon: '📡' },
  { name: 'Collab Hub', category: 'Collaboration', status: 'beta', description: 'Session management and participant tracking', icon: '🏠' },

  // Security & Quality
  { name: 'Security Scanner', category: 'Security & Quality', status: 'beta', description: 'Vulnerability detection and OWASP checks', icon: '🛡️' },
  { name: 'AB Testing', category: 'Security & Quality', status: 'beta', description: 'Feature flag management and experiments', icon: '🧪' },
  { name: 'Feature Flags', category: 'Security & Quality', status: 'beta', description: 'Runtime feature toggles', icon: '🚩' },
  { name: 'Rate Limiter', category: 'Security & Quality', status: 'beta', description: 'API rate limit configuration', icon: '🚦' },
  { name: 'SSL Certificates', category: 'Security & Quality', status: 'beta', description: 'Local SSL certificate management', icon: '🔒' },
  { name: 'Incidents', category: 'Security & Quality', status: 'beta', description: 'Incident tracking and response', icon: '🚨' },

  // Productivity
  { name: 'Command Palette', category: 'Productivity', status: 'stable', description: 'Quick access to all commands', icon: '⌨️' },
  { name: 'Quick Actions', category: 'Productivity', status: 'stable', description: 'Context-aware action suggestions', icon: '⚡' },
  { name: 'Workspace Stats', category: 'Productivity', status: 'stable', description: 'Project metrics and analytics', icon: '📊' },
  { name: 'Command History', category: 'Productivity', status: 'stable', description: 'Recently executed commands', icon: '🕐' },
  { name: 'Notifications', category: 'Productivity', status: 'stable', description: 'Centralized notification center', icon: '🔔' },
  { name: 'Environment Manager', category: 'Productivity', status: 'stable', description: 'Manage .env files and variables', icon: '🔧' },
  { name: 'Theme Editor', category: 'Productivity', status: 'stable', description: 'Custom theme creation and editing', icon: '🎨' },
  { name: 'Theme Builder', category: 'Productivity', status: 'beta', description: 'Visual theme builder with live preview', icon: '🖌️' },
  { name: 'Multi-File Search', category: 'Productivity', status: 'stable', description: 'Full-text search across project files', icon: '🔎' },
  { name: 'Performance Profiler', category: 'Productivity', status: 'beta', description: 'CPU and memory profiling', icon: '📈' },
  { name: 'Analytics', category: 'Productivity', status: 'beta', description: 'Usage analytics and insights', icon: '📉' },

  // Extension System
  { name: 'Extension Marketplace', category: 'Extensions', status: 'stable', description: 'Browse, install, and manage extensions', icon: '🧩' },
  { name: 'Extension Developer', category: 'Extensions', status: 'stable', description: 'Scaffold and develop new extensions', icon: '🛠️' },
  { name: 'MCP Client', category: 'Extensions', status: 'new', description: 'Model Context Protocol server connections', icon: '🔌' },
  { name: 'Documentation Portal', category: 'Extensions', status: 'new', description: 'Built-in developer docs with 4 tabs', icon: '📚' },
  { name: 'About', category: 'Extensions', status: 'stable', description: 'Project info, founder, repositories', icon: 'ℹ️' },

  // Platform
  { name: 'Cross-Platform', category: 'Platform', status: 'stable', description: 'Windows, macOS, Linux installers', icon: '🖥️' },
  { name: 'Auto-Updater', category: 'Platform', status: 'stable', description: 'Automatic updates from GitHub Releases', icon: '🔄' },
  { name: 'Deep Linking', category: 'Platform', status: 'new', description: 'idexal:// protocol for external links', icon: '🔗' },
  { name: 'NSIS Installer', category: 'Platform', status: 'stable', description: 'Professional Windows installer wizard', icon: '📦' },
]

const CLI_COMMANDS = [
  { name: 'chat', description: 'Interactive AI chat with agentic tool loop', category: 'AI' },
  { name: 'review', description: 'AI code review with severity ratings', category: 'AI' },
  { name: 'explain', description: 'Explain code or concepts at any level', category: 'AI' },
  { name: 'fix', description: 'Auto-fix lint, type, and test errors', category: 'AI' },
  { name: 'commit', description: 'Generate conventional commit messages', category: 'AI' },
  { name: 'memory', description: 'Manage cross-session project memory', category: 'AI' },
  { name: 'generate', description: 'AI-powered code generation', category: 'AI' },
  { name: 'agent', description: 'Create and manage custom AI agents', category: 'AI' },
  { name: 'analyze', description: 'Codebase analysis and insights', category: 'Analysis' },
  { name: 'context', description: 'Manage AI context window', category: 'Analysis' },
  { name: 'init', description: 'Initialize project configuration', category: 'Project' },
  { name: 'config', description: 'Get/set configuration values', category: 'Project' },
  { name: 'test', description: 'Run tests with AI assistance', category: 'Project' },
  { name: 'deploy', description: 'Deploy application from CLI', category: 'Project' },
  { name: 'session', description: 'Save/resume chat conversations', category: 'Session' },
  { name: 'history', description: 'Browse command history', category: 'Session' },
  { name: 'doctor', description: 'Diagnose system issues', category: 'System' },
  { name: 'mcp', description: 'Manage MCP server connections', category: 'System' },
  { name: 'about', description: 'Show project information', category: 'System' },
  { name: 'login', description: 'Authenticate with services', category: 'Auth' },
  { name: 'whoami', description: 'Show current user info', category: 'Auth' },
  { name: 'update', description: 'Update the CLI', category: 'System' },
]

const CATEGORIES = [...new Set(FEATURES.map(f => f.category))]
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stable: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  beta: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  new: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  planned: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
}

// ── Component ─────────────────────────────────────────────────
export default function FeatureDashboard() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const byStatus = { stable: 0, beta: 0, new: 0, planned: 0 }
    FEATURES.forEach(f => { byStatus[f.status as keyof typeof byStatus]++ })
    return byStatus
  }, [])

  const byCategory = useMemo(() => {
    const map: Record<string, Feature[]> = {}
    FEATURES.forEach(f => {
      if (!map[f.category]) map[f.category] = []
      map[f.category].push(f)
    })
    return map
  }, [])

  const filtered = useMemo(() => {
    let list = FEATURES
    if (filter !== 'all') list = list.filter(f => f.category === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
    }
    return list
  }, [filter, search])

  const totalFeatures = FEATURES.length
  const totalPanels = 83
  const totalCli = CLI_COMMANDS.length
  const totalLines = '240K+'
  const totalFiles = '343+'

  return (
    <div className="h-full overflow-y-auto bg-ide-bg p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ide-text flex items-center gap-2">
            <span className="text-3xl">📊</span> Feature Dashboard
          </h1>
          <p className="text-ide-text-dim text-sm mt-1">
            Complete overview of {totalFeatures} features across {CATEGORIES.length} categories
          </p>
        </div>
        <div className="text-right text-xs text-ide-text-dim">
          <div>v1.0.0 • {totalFiles} files • {totalLines} lines</div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon="🧩" label="Features" value={totalFeatures} color="from-blue-500 to-cyan-500" />
        <StatCard icon="📋" label="Panels" value={totalPanels} color="from-purple-500 to-pink-500" />
        <StatCard icon="⌨️" label="CLI Commands" value={totalCli} color="from-emerald-500 to-teal-500" />
        <StatCard icon="📁" label="Source Files" value={343} color="from-amber-500 to-orange-500" />
        <StatCard icon="📏" label="Lines of Code" value={240000} color="from-red-500 to-rose-500" displayValue={totalLines} />
        <StatCard icon="🤖" label="AI Models" value={1883} color="from-indigo-500 to-violet-500" />
      </div>

      {/* ── Status Bar ── */}
      <div className="bg-ide-surface rounded-xl border border-ide-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ide-text">Feature Status Distribution</h3>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{stats.stable} Stable</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{stats.beta} Beta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />{stats.new} New</span>
          </div>
        </div>
        <div className="w-full h-3 bg-ide-surface-alt rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(stats.stable / totalFeatures) * 100}%` }} />
          <div className="bg-amber-500 h-full transition-all" style={{ width: `${(stats.beta / totalFeatures) * 100}%` }} />
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${(stats.new / totalFeatures) * 100}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-ide-text-dim">
          <span>Stable: {((stats.stable / totalFeatures) * 100).toFixed(0)}%</span>
          <span>Beta: {((stats.beta / totalFeatures) * 100).toFixed(0)}%</span>
          <span>New: {((stats.new / totalFeatures) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => {
          const features = byCategory[cat]
          const stable = features.filter(f => f.status === 'stable').length
          const total = features.length
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? 'all' : cat)}
              className={`text-left p-3 rounded-xl border transition-all ${
                filter === cat
                  ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20'
                  : 'bg-ide-surface border-ide-border hover:bg-ide-surface-alt'
              }`}
            >
              <div className="text-xs font-medium text-ide-text truncate">{cat}</div>
              <div className="text-lg font-bold text-ide-text mt-1">{total}</div>
              <div className="text-[10px] text-ide-text-dim">{stable} stable</div>
              <div className="w-full h-1 bg-ide-surface-alt rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(stable / total) * 100}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search features..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-ide-surface border border-ide-border rounded-lg px-4 py-2 text-sm text-ide-text placeholder-ide-text-dim focus:outline-none focus:border-blue-500/50"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-ide-surface border border-ide-border rounded-lg px-3 py-2 text-sm text-ide-text focus:outline-none"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Feature Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((f, i) => {
          const sc = STATUS_COLORS[f.status]
          return (
            <div
              key={`${f.name}-${i}`}
              className="bg-ide-surface border border-ide-border rounded-xl p-4 hover:bg-ide-surface-alt transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm font-medium text-ide-text group-hover:text-blue-400 transition-colors">{f.name}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                  {f.status}
                </span>
              </div>
              <p className="text-xs text-ide-text-dim mt-2 line-clamp-2">{f.description}</p>
              <div className="text-[10px] text-ide-text-dim mt-2 opacity-60">{f.category}</div>
            </div>
          )
        })}
      </div>

      {/* ── CLI Commands ── */}
      <div className="bg-ide-surface rounded-xl border border-ide-border p-5">
        <h3 className="text-sm font-semibold text-ide-text mb-4 flex items-center gap-2">
          <span>⌨️</span> CLI Commands ({CLI_COMMANDS.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {CLI_COMMANDS.map(cmd => (
            <div key={cmd.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ide-surface-alt/50 border border-ide-border/50">
              <code className="text-xs font-mono text-blue-400">idexa {cmd.name}</code>
              <span className="text-[10px] text-ide-text-dim truncate">{cmd.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Comparison Table ── */}
      <div className="bg-ide-surface rounded-xl border border-ide-border p-5">
        <h3 className="text-sm font-semibold text-ide-text mb-4">Competitive Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ide-border">
                <th className="text-left py-2 px-3 text-ide-text-dim font-medium">Feature</th>
                <th className="text-center py-2 px-3 text-blue-400 font-medium">Idexal IDE</th>
                <th className="text-center py-2 px-3 text-ide-text-dim font-medium">VS Code</th>
                <th className="text-center py-2 px-3 text-ide-text-dim font-medium">Cursor</th>
                <th className="text-center py-2 px-3 text-ide-text-dim font-medium">Claude Code</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Desktop IDE', '✅', '✅', '✅', '❌'],
                ['Multi-Model AI', '✅ 1883+', '❌', '✅ 3', '❌ 1'],
                ['Built-in Agents', '✅ 8', '❌', '✅ 2', '✅ 1'],
                ['CLI Tool', '✅ 22 cmds', '❌', '❌', '✅'],
                ['CRDT Collaboration', '✅', '❌', '❌', '❌'],
                ['Database Explorer', '✅', '❌', '❌', '❌'],
                ['Docker/K8s', '✅', 'Extension', '❌', '❌'],
                ['Extension System', '✅', '✅', '✅', '❌'],
                ['MCP Server', '✅', 'Extension', '❌', '❌'],
                ['Cross-Platform', '✅ Win/Mac/Linux', '✅', '✅', '✅'],
                ['Free Tier', '✅', '✅', '✅ 50 msgs', '✅ 50 msgs'],
                ['Price (Pro)', '$29/mo', 'Free', '$20/mo', '$100/mo'],
              ].map(([feat, idexal, vscode, cursor, claude], i) => (
                <tr key={i} className="border-b border-ide-border/50 hover:bg-ide-surface-alt/30">
                  <td className="py-2 px-3 text-ide-text font-medium">{feat}</td>
                  <td className="py-2 px-3 text-center text-blue-400">{idexal}</td>
                  <td className="py-2 px-3 text-center text-ide-text-dim">{vscode}</td>
                  <td className="py-2 px-3 text-center text-ide-text-dim">{cursor}</td>
                  <td className="py-2 px-3 text-center text-ide-text-dim">{claude}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-xs text-ide-text-dim py-4 border-t border-ide-border">
        Built with ❤️ by Zakariae Lahbabi & Idexal • {totalFeatures} Features • {totalPanels} Panels • {totalCli} CLI Commands • MIT License
      </div>
    </div>
  )
}

// ── Stat Card ──
function StatCard({ icon, label, value, color, displayValue }: {
  icon: string; label: string; value: number; color: string; displayValue?: string
}) {
  const display = displayValue || (value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value))
  return (
    <div className="bg-ide-surface rounded-xl border border-ide-border p-4 hover:bg-ide-surface-alt transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-ide-text-dim uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {display}
      </div>
    </div>
  )
}
