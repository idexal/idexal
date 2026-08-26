/**
 * ExtensionDeveloperPanel — Developer tools for creating Idexal IDE extensions.
 * Shows SDK documentation, scaffold generator, and API reference.
 */

import React, { useState } from 'react'
import {
  FaCode, FaBook, FaRocket, FaCopy, FaCheck, FaDownload,
  FaTerminal, FaPalette, FaRobot, FaPlug, FaCubes, FaFileCode,
  FaChevronRight, FaChevronDown,
} from '../Icon'
import { generateScaffold, getExtensionKinds, type ScaffoldOptions } from '../../services/extensionScaffold'

type Tab = 'overview' | 'sdk' | 'scaffold' | 'api'

const SDK_SECTIONS = [
  {
    title: 'Quick Start',
    icon: <FaRocket size={12} />,
    content: `import { defineExtension } from '@idexal/sdk'

export default defineExtension({
  manifest: {
    id: 'my-extension',
    name: 'My Extension',
    version: '1.0.0',
    description: 'My cool extension',
    author: 'Me',
  },
  activate(ctx) {
    ctx.registerCommand({
      id: 'my-ext.hello',
      label: 'Say Hello',
      callback: () => ctx.showInformationMessage('Hello!'),
    })
  },
})`,
  },
  {
    title: 'Register a Panel',
    icon: <FaCubes size={12} />,
    content: `import React from 'react'
import { defineExtension } from '@idexal/sdk'

function MyPanel() {
  return <div>Hello from my panel!</div>
}

export default defineExtension({
  manifest: { /* ... */ },
  activate(ctx) {
    ctx.registerPanel({
      id: 'my-panel',
      title: 'My Panel',
      icon: '📦',
      component: MyPanel,
      shortcut: 'Ctrl+Shift+M',
    })
  },
})`,
  },
  {
    title: 'Register Commands',
    icon: <FaTerminal size={12} />,
    content: `ctx.registerCommand({
  id: 'my-ext.run',
  label: 'Run My Extension',
  category: 'My Extension',
  callback: async () => {
    const root = ctx.getWorkspaceRoot()
    const files = await ctx.readDirectory(root + '/src')
    ctx.showInformationMessage(\`Found \${files.length} files\`)
  },
})`,
  },
  {
    title: 'File System Access',
    icon: <FaFileCode size={12} />,
    content: `// Read a file
const content = await ctx.readFile('src/main.ts')

// Write a file
await ctx.writeFile('output/result.txt', 'Hello!')

// List directory
const files = await ctx.readDirectory('src/')
// → [{ name: 'main.ts', type: 'file' }, ...]

// Open file in editor
ctx.openFile('src/main.ts')

// Get workspace root
const root = ctx.getWorkspaceRoot()
// → '/path/to/project'`,
  },
  {
    title: 'Status Bar Items',
    icon: <FaPlug size={12} />,
    content: `ctx.registerStatusBar({
  id: 'my-ext-status',
  text: '$(icon) My Extension',
  icon: '📦',
  position: 'right',   // or 'left'
  priority: 100,
  command: 'my-ext.open',  // click to run command
})`,
  },
  {
    title: 'Themes',
    icon: <FaPalette size={12} />,
    content: `ctx.registerTheme({
  id: 'my-theme',
  label: 'My Theme',
  type: 'dark',
  colors: {
    'editor.background': '#1a1b26',
    'editor.foreground': '#c0caf5',
    'sideBar.background': '#1a1b26',
  },
  tokenColors: [
    { scope: 'comment', settings: { foreground: '#565f89' } },
    { scope: 'keyword', settings: { foreground: '#bb9af7' } },
  ],
})`,
  },
  {
    title: 'AI Agents',
    icon: <FaRobot size={12} />,
    content: `ctx.registerAgent({
  id: 'my-agent',
  name: 'My Agent',
  icon: '🤖',
  description: 'A custom AI agent',
  systemPrompt: 'You are an expert in...',
  capabilities: ['code', 'review', 'test'],
})`,
  },
  {
    title: 'Notifications',
    icon: <FaCode size={12} />,
    content: `ctx.showInformationMessage('Operation completed!')
ctx.showWarningMessage('Disk space is low')
ctx.showErrorMessage('Failed to connect')`,
  },
]

export default function ExtensionDeveloperPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [expandedSection, setExpandedSection] = useState<number | null>(0)
  const [copied, setCopied] = useState<number | null>(null)

  // Scaffold state
  const [scaffoldName, setScaffoldName] = useState('')
  const [scaffoldDesc, setScaffoldDesc] = useState('')
  const [scaffoldAuthor, setScaffoldAuthor] = useState('')
  const [scaffoldKind, setScaffoldKind] = useState<ScaffoldOptions['kind']>('panel')
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null)

  const kinds = getExtensionKinds()

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard?.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleGenerate = () => {
    if (!scaffoldName.trim()) return
    const result = generateScaffold({
      name: scaffoldName.trim(),
      description: scaffoldDesc.trim() || 'An Idexal IDE extension',
      author: scaffoldAuthor.trim() || 'Developer',
      kind: scaffoldKind,
    })
    const manifest = result.files.find(f => f.path === 'manifest.json')
    setScaffoldResult(manifest?.content || JSON.stringify(result.files, null, 2))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">Extension Developer</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {([
          { key: 'overview' as const, label: 'Overview' },
          { key: 'sdk' as const, label: 'SDK Docs' },
          { key: 'scaffold' as const, label: 'Scaffold' },
          { key: 'api' as const, label: 'API Ref' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center transition-colors ${
              tab === t.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-ide-text-dim hover:text-ide-text'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FaRocket size={16} className="text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Build Extensions for Idexal IDE</span>
              </div>
              <p className="text-xs text-ide-text-dim leading-relaxed">
                Create custom panels, commands, themes, language support, and AI agents.
                Extensions use TypeScript + React and run in the IDE's sandboxed environment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <FaCubes size={14} />, label: 'Custom Panels', desc: 'Build any UI' },
                { icon: <FaTerminal size={14} />, label: 'Commands', desc: 'Add keybindings' },
                { icon: <FaPalette size={14} />, label: 'Themes', desc: 'Custom colors' },
                { icon: <FaRobot size={14} />, label: 'AI Agents', desc: 'Custom AI bots' },
                { icon: <FaFileCode size={14} />, label: 'Languages', desc: 'Syntax support' },
                { icon: <FaPlug size={14} />, label: 'MCP Servers', desc: 'External tools' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-ide-surface border border-ide-border hover:border-emerald-500/20 transition-colors">
                  <div className="text-emerald-400 mb-1">{item.icon}</div>
                  <div className="text-xs font-semibold text-ide-text">{item.label}</div>
                  <div className="text-[10px] text-ide-text-dim">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SDK Docs Tab ── */}
        {tab === 'sdk' && (
          <div className="space-y-2">
            {SDK_SECTIONS.map((section, i) => (
              <div key={i} className="rounded-lg bg-ide-surface border border-ide-border overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-alt/30 transition-colors text-left">
                  {expandedSection === i ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                  <span className="text-emerald-400">{section.icon}</span>
                  <span className="text-xs font-semibold text-ide-text flex-1">{section.title}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleCopy(section.content, i) }}
                    className="p-1 hover:bg-ide-surface rounded text-ide-text-dim">
                    {copied === i ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
                  </button>
                </button>
                {expandedSection === i && (
                  <pre className="px-3 pb-3 text-[10px] font-mono text-ide-text-dim overflow-x-auto bg-ide-bg/50 border-t border-ide-border/50 whitespace-pre-wrap">
                    {section.content}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Scaffold Tab ── */}
        {tab === 'scaffold' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-ide-surface border border-ide-border space-y-2.5">
              <div className="text-xs font-semibold text-emerald-400 mb-1">New Extension</div>

              <input value={scaffoldName} onChange={e => setScaffoldName(e.target.value)}
                placeholder="Extension name"
                className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />

              <input value={scaffoldDesc} onChange={e => setScaffoldDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />

              <input value={scaffoldAuthor} onChange={e => setScaffoldAuthor(e.target.value)}
                placeholder="Author name"
                className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />

              <div className="grid grid-cols-3 gap-1.5">
                {kinds.map(k => (
                  <button key={k.id} onClick={() => setScaffoldKind(k.id)}
                    className={`p-2 rounded-lg text-center transition-colors border ${
                      scaffoldKind === k.id
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'border-ide-border text-ide-text-dim hover:text-ide-text'
                    }`}>
                    <div className="text-[10px] font-semibold">{k.label}</div>
                  </button>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={!scaffoldName.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg text-xs font-semibold transition-colors">
                Generate Scaffold
              </button>
            </div>

            {scaffoldResult && (
              <div className="rounded-lg bg-ide-surface border border-ide-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
                  <span className="text-xs font-semibold text-emerald-400">Generated manifest.json</span>
                  <button onClick={() => handleCopy(scaffoldResult, 99)}
                    className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-dim">
                    {copied === 99 ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
                  </button>
                </div>
                <pre className="p-3 text-[10px] font-mono text-ide-text-dim overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {scaffoldResult}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── API Reference Tab ── */}
        {tab === 'api' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-ide-surface border border-ide-border">
              <div className="text-xs font-semibold text-emerald-400 mb-2">ExtensionContext Methods</div>
              <div className="space-y-1.5">
                {[
                  { method: 'registerCommand(cmd)', desc: 'Register a new command', return: 'Disposable' },
                  { method: 'registerPanel(panel)', desc: 'Register a custom panel', return: 'Disposable' },
                  { method: 'registerTheme(theme)', desc: 'Register a color theme', return: 'Disposable' },
                  { method: 'registerLanguage(lang)', desc: 'Register language support', return: 'Disposable' },
                  { method: 'registerAgent(agent)', desc: 'Register an AI agent', return: 'Disposable' },
                  { method: 'registerStatusBar(item)', desc: 'Add a status bar item', return: 'Disposable' },
                  { method: 'getSetting<T>(key)', desc: 'Get extension setting', return: 'T | undefined' },
                  { method: 'setSetting(key, value)', desc: 'Set extension setting', return: 'void' },
                  { method: 'getWorkspaceRoot()', desc: 'Get workspace root path', return: 'string | null' },
                  { method: 'readFile(path)', desc: 'Read a file', return: 'Promise<string>' },
                  { method: 'writeFile(path, content)', desc: 'Write a file', return: 'Promise<void>' },
                  { method: 'readDirectory(path)', desc: 'List directory contents', return: 'Promise<FileEntry[]>' },
                  { method: 'openFile(path)', desc: 'Open file in editor', return: 'void' },
                  { method: 'openExternal(url)', desc: 'Open URL in browser', return: 'void' },
                  { method: 'executeCommand(id, ...args)', desc: 'Execute a command', return: 'Promise<any>' },
                  { method: 'showInformationMessage(msg)', desc: 'Show info notification', return: 'void' },
                  { method: 'showWarningMessage(msg)', desc: 'Show warning notification', return: 'void' },
                  { method: 'showErrorMessage(msg)', desc: 'Show error notification', return: 'void' },
                  { method: 'createWebviewPanel(opts)', desc: 'Create a webview panel', return: 'WebviewPanel' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-ide-border/30 last:border-0">
                    <code className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">{item.method}</code>
                    <span className="text-[10px] text-ide-text-dim flex-1">{item.desc}</span>
                    <code className="text-[9px] font-mono text-ide-text-dim">{item.return}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-ide-surface border border-ide-border">
              <div className="text-xs font-semibold text-emerald-400 mb-2">Manifest Fields</div>
              <div className="space-y-1.5">
                {[
                  { field: 'id', type: 'string', desc: 'Unique extension identifier' },
                  { field: 'name', type: 'string', desc: 'Display name' },
                  { field: 'version', type: 'string', desc: 'Semver version' },
                  { field: 'description', type: 'string', desc: 'Short description' },
                  { field: 'author', type: 'string', desc: 'Author name' },
                  { field: 'icon', type: 'string', desc: 'Icon (emoji or URL)' },
                  { field: 'tags', type: 'string[]', desc: 'Search tags' },
                  { field: 'engines.idexal', type: 'string', desc: 'Min IDE version' },
                  { field: 'contributes', type: 'object', desc: 'What the extension provides' },
                  { field: 'activationEvents', type: 'array', desc: 'When to activate' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-ide-border/30 last:border-0">
                    <code className="text-[10px] font-mono text-blue-400">{item.field}</code>
                    <code className="text-[9px] font-mono text-ide-text-dim">{item.type}</code>
                    <span className="text-[10px] text-ide-text-dim flex-1">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
