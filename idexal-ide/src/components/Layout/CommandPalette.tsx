import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaSearch, FaFileAlt, FaCog, FaTerminal, FaCodeBranch, FaPen, FaThLarge,
  FaExpand, FaCompress, FaCopy, FaTrash, FaEye, FaCode, FaPalette, FaBolt,
  FaArrowRight, FaClock, FaStar, FaHashtag, FaFont, FaChartBar, FaBook, FaPuzzlePiece
} from '../Icon'

interface Command {
  id: string
  label: string
  category: string
  icon: typeof FaSearch
  shortcut?: string
  action: () => void
  description?: string
}

// Commands are created inside the component to access props and onClose
function buildCommands(p: CommandPaletteProps & { onClose: () => void }): Command[] {
  const noop = () => {}
  const close = p.onClose
  return [
    // File
    { id: 'file.new', label: 'New File', category: 'File', icon: FaFileAlt, shortcut: 'Ctrl+N', action: () => document.dispatchEvent(new CustomEvent('menu-new-file')), description: 'Create a new file' },
    { id: 'file.open', label: 'Open File', category: 'File', icon: FaFileAlt, shortcut: 'Ctrl+O', action: () => document.dispatchEvent(new CustomEvent('menu-open-file')), description: 'Open an existing file' },
    { id: 'file.save', label: 'Save', category: 'File', icon: FaFileAlt, shortcut: 'Ctrl+S', action: () => document.dispatchEvent(new CustomEvent('menu-save')), description: 'Save current file' },

    // Edit
    { id: 'edit.find', label: 'Find', category: 'Edit', icon: FaSearch, shortcut: 'Ctrl+F', action: noop, description: 'Find in current file' },
    { id: 'edit.findInFiles', label: 'Find in Files', category: 'Edit', icon: FaSearch, shortcut: 'Ctrl+Shift+F', action: noop, description: 'Search across all files' },
    { id: 'edit.format', label: 'Format Document', category: 'Edit', icon: FaCode, shortcut: 'Shift+Alt+F', action: noop, description: 'Format the entire document' },

    // View
    { id: 'view.sidebar', label: 'Toggle Sidebar', category: 'View', icon: FaThLarge, shortcut: 'Ctrl+B', action: () => p.onToggleSidebar?.(), description: 'Toggle sidebar visibility' },
    { id: 'view.terminal', label: 'Toggle Terminal', category: 'View', icon: FaTerminal, shortcut: 'Ctrl+`', action: () => p.onToggleTerminal?.(), description: 'Toggle terminal panel' },
    { id: 'view.wordWrap', label: 'Toggle Word Wrap', category: 'View', icon: FaFont, shortcut: 'Alt+Z', action: noop, description: 'Toggle word wrap in editor' },
    { id: 'view.lineNumbers', label: 'Toggle Line Numbers', category: 'View', icon: FaHashtag, action: noop, description: 'Show/hide line numbers' },
    { id: 'view.minimap', label: 'Toggle Minimap', category: 'View', icon: FaEye, action: noop, description: 'Show/hide minimap' },

    // Go
    { id: 'go.line', label: 'Go to Line', category: 'Go', icon: FaHashtag, shortcut: 'Ctrl+G', action: noop, description: 'Go to specific line number' },
    { id: 'go.definition', label: 'Go to Definition', category: 'Go', icon: FaCode, shortcut: 'F12', action: noop, description: 'Navigate to definition' },
    { id: 'go.references', label: 'Find References', category: 'Go', icon: FaCode, shortcut: 'Shift+F12', action: noop, description: 'Find all references' },
    { id: 'go.symbol', label: 'Go to Symbol', category: 'Go', icon: FaCode, shortcut: 'Ctrl+Shift+O', action: noop, description: 'Navigate to symbol in file' },
    { id: 'go.file', label: 'Go to File', category: 'Go', icon: FaFileAlt, shortcut: 'Ctrl+P', action: noop, description: 'Quick file navigation' },

    // AI
    { id: 'ai.chat', label: 'Open AI Chat', category: 'AI', icon: FaCog, shortcut: 'Ctrl+Shift+A', action: () => p.onToggleChat?.(), description: 'Open AI assistant' },
    { id: 'ai.review', label: 'AI FaCode Review', category: 'AI', icon: FaEye, action: () => p.onToggleChat?.(), description: 'Review code with AI' },
    { id: 'ai.explain', label: 'AI Explain FaCode', category: 'AI', icon: FaFont, action: () => p.onToggleChat?.(), description: 'Explain selected code' },
    { id: 'ai.fix', label: 'AI Fix FaCode', category: 'AI', icon: FaBolt, action: () => p.onToggleChat?.(), description: 'Fix code issues with AI' },

    // Git
    { id: 'git.status', label: 'Git Status', category: 'Git', icon: FaCodeBranch, action: () => p.onOpenGit?.(), description: 'View git status' },
    { id: 'git.advanced', label: 'Git Advanced', category: 'Git', icon: FaCodeBranch, action: () => p.onOpenGitAdvanced?.(), description: 'Branch management, stash, cherry-pick' },

    // Navigation
    { id: 'nav.packages', label: 'Package Manager', category: 'Navigation', icon: FaCode, action: () => p.onOpenPackages?.(), description: 'Manage packages and dependencies' },
    { id: 'nav.agents', label: 'Agent Dashboard', category: 'Navigation', icon: FaBolt, action: () => p.onOpenAgents?.(), description: 'View and manage AI agents' },
    { id: 'nav.memory', label: 'Project Memory', category: 'Navigation', icon: FaClock, action: () => p.onOpenMemory?.(), description: 'View project memory and context' },
    { id: 'nav.ssh', label: 'SSH Connections', category: 'Navigation', icon: FaTerminal, shortcut: 'Ctrl+Shift+K', action: () => p.onOpenSSH?.(), description: 'Manage SSH remote connections' },
    { id: 'nav.database', label: 'Database Explorer', category: 'Navigation', icon: FaCog, shortcut: 'Ctrl+Shift+D', action: () => p.onOpenDatabase?.(), description: 'Query databases and explore schemas' },
    { id: 'nav.api-docs', label: 'API Documentation', category: 'Navigation', icon: FaCode, shortcut: 'Ctrl+8', action: () => p.onOpenAPIDoc?.(), description: 'Generate and view API documentation' },
    { id: 'nav.collab', label: 'Collaboration Session', category: 'Navigation', icon: FaBolt, shortcut: 'Ctrl+C', action: () => p.onOpenCollab?.(), description: 'Create or join a real-time collaboration session' },
    { id: 'nav.mcp', label: 'MCP Client', category: 'Navigation', icon: FaCog, shortcut: 'Ctrl+Shift+0', action: () => p.onOpenMCP?.(), description: 'Connect to external MCP servers and use their tools' },
    { id: 'edit.multiSearch', label: 'Search in Files', category: 'Edit', icon: FaSearch, shortcut: 'Ctrl+Shift+F', action: () => p.onOpenMultiSearch?.(), description: 'Project-wide search and replace' },
    { id: 'nav.ext-marketplace', label: 'Extension Marketplace', category: 'Navigation', icon: FaPuzzlePiece, shortcut: 'Ctrl+Shift+E', action: () => p.onOpenExtensions?.(), description: 'Browse, install, and manage IDE extensions' },
    { id: 'nav.ext-developer', label: 'Extension Developer', category: 'Navigation', icon: FaCode, shortcut: 'Ctrl+E', action: () => p.onOpenExtDeveloper?.(), description: 'Build extensions for Idexal IDE — SDK docs, scaffold generator, API reference' },
    { id: 'nav.benchmark', label: 'IDE Benchmark Comparison', category: 'Navigation', icon: FaChartBar, shortcut: 'Ctrl+N', action: () => p.onOpenBenchmark?.(), description: 'Compare Idexal vs VS Code vs Cursor vs Claude Code' },
    { id: 'nav.docs', label: 'Developer Documentation', category: 'Navigation', icon: FaBook, shortcut: 'Ctrl+M', action: () => p.onOpenDocs?.(), description: 'Getting started, API reference, CLI guide, and architecture docs' },
    { id: 'nav.feature-dashboard', label: 'Feature Dashboard', category: 'Navigation', icon: FaChartBar, action: () => p.onOpenFeatureDashboard?.(), description: 'View all IDE features, status, and statistics' },

    // Settings
    { id: 'settings.open', label: 'Open Settings', category: 'Settings', icon: FaCog, shortcut: 'Ctrl+,', action: () => p.onOpenSettings?.(), description: 'Open settings panel' },
    { id: 'settings.theme', label: 'Change Theme', category: 'Settings', icon: FaPalette, action: () => p.onOpenSettings?.(), description: 'Change editor theme' },
    { id: 'help.about', label: 'About Idexal IDE', category: 'Help', icon: FaBolt, action: () => p.onOpenAbout?.(), description: 'View project info, founder, and repositories' },
  ]
}

const CATEGORY_COLORS: Record<string, string> = {
  File: 'text-blue-400',
  Edit: 'text-green-400',
  View: 'text-purple-400',
  Go: 'text-cyan-400',
  AI: 'text-pink-400',
  Git: 'text-orange-400',
  Navigation: 'text-emerald-400',
  Settings: 'text-yellow-400',
  Help: 'text-pink-400',
}

function fuzzyMatch(text: string, query: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let score = 0
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10
      if (ti === 0) score += 5 // Start of word bonus
      if (ti > 0 && t[ti - 1] === ' ') score += 3 // After space bonus
      qi++
    }
  }
  return score
}

interface CommandPaletteProps {
  onClose: () => void
  onToggleSidebar?: () => void
  onToggleTerminal?: () => void
  onToggleChat?: () => void
  onOpenSettings?: () => void
  onOpenGit?: () => void
  onOpenTerminal?: () => void
  onOpenPackages?: () => void
  onOpenGitAdvanced?: () => void
  onOpenAgents?: () => void
  onOpenMemory?: () => void
  onOpenAbout?: () => void
  onOpenSSH?: () => void
  onOpenDatabase?: () => void
  onOpenAPIDoc?: () => void
  onOpenCollab?: () => void
  onOpenMCP?: () => void
  onOpenMultiSearch?: () => void
  onOpenExtensions?: () => void
  onOpenExtDeveloper?: () => void
  onOpenBenchmark?: () => void
  onOpenDocs?: () => void
  onOpenFeatureDashboard?: () => void
}

export default function CommandPalette({
  onClose,
  onToggleSidebar,
  onToggleTerminal,
  onToggleChat,
  onOpenSettings,
  onOpenGit,
  onOpenTerminal,
  onOpenPackages,
  onOpenGitAdvanced,
  onOpenAgents,
  onOpenMemory,
  onOpenAbout,
  onOpenSSH,
  onOpenDatabase,
  onOpenAPIDoc,
  onOpenCollab,
  onOpenMCP,
  onOpenMultiSearch,
  onOpenExtensions,
  onOpenExtDeveloper,
  onOpenBenchmark,
  onOpenDocs,
  onOpenFeatureDashboard,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [recentIds] = useState<Set<string>>(new Set(['ai.chat', 'view.terminal', 'git.commit', 'settings.open']))
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allCommands = useMemo(() => buildCommands({ onClose, onToggleSidebar, onToggleTerminal, onToggleChat, onOpenSettings, onOpenGit, onOpenTerminal, onOpenPackages, onOpenGitAdvanced, onOpenAgents, onOpenMemory, onOpenAbout, onOpenSSH, onOpenDatabase, onOpenAPIDoc, onOpenCollab, onOpenMCP, onOpenMultiSearch, onOpenExtensions, onOpenExtDeveloper, onOpenBenchmark, onOpenDocs, onOpenFeatureDashboard }), [onClose, onToggleSidebar, onToggleTerminal, onToggleChat, onOpenSettings, onOpenGit, onOpenTerminal, onOpenPackages, onOpenGitAdvanced, onOpenAgents, onOpenMemory, onOpenAbout, onOpenSSH, onOpenDatabase, onOpenAPIDoc, onOpenCollab, onOpenMCP, onOpenMultiSearch, onOpenExtensions, onOpenExtDeveloper, onOpenBenchmark, onOpenDocs])

  const filteredCommands = useMemo(() => {
    let commands = [...allCommands]

    if (activeCategory) {
      commands = commands.filter(c => c.category === activeCategory)
    }

    if (query) {
      commands = commands
        .map(c => ({ ...c, score: fuzzyScore(c.label, query) + fuzzyScore(c.description || '', query) }))
        .filter(c => c.score > 0 || fuzzyMatch(c.label, query) || fuzzyMatch(c.description || '', query))
        .sort((a, b) => b.score - a.score)
    }

    return commands
  }, [query, activeCategory])

  const recentCommands = useMemo(() => {
    return allCommands.filter(c => recentIds.has(c.id))
  }, [recentIds, allCommands])

  const categories = useMemo(() => {
    return [...new Set(allCommands.map(c => c.category))]
  }, [allCommands])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeCategory])

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Tab':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
        break
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const q = query.toLowerCase()
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-ide-brand-light font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="w-[560px] bg-ide-surface border border-ide-border rounded-xl shadow-2xl overflow-hidden ide-panel-brand"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ide-border">
          <FaSearch size={16} className="text-ide-brand-light flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none text-ide-text placeholder:text-ide-text-dim/50"
          />
          <kbd className="px-1.5 py-0.5 bg-ide-bg border border-ide-border rounded text-[10px] font-mono text-ide-text-dim">
            Esc
          </kbd>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 transition-colors ${
              !activeCategory ? 'bg-ide-brand/15 text-ide-brand-light' : 'text-ide-text-dim hover:text-ide-text'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 transition-colors ${
                activeCategory === cat ? 'bg-ide-brand/15 text-ide-brand-light' : 'text-ide-text-dim hover:text-ide-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto">
          {/* Recent Items (when no query) */}
          {!query && !activeCategory && recentCommands.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-ide-text-dim flex items-center gap-1">
                <FaClock size={10} /> Recently Used
              </div>
              {recentCommands.map((cmd, i) => {
                const Icon = cmd.icon
                return (
                  <div
                    key={`recent-${cmd.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-ide-surface-alt/30 cursor-pointer transition-colors"
                    onClick={() => { cmd.action(); onClose() }}
                  >
                    <Icon size={14} className={CATEGORY_COLORS[cmd.category] || 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ide-text">{cmd.label}</div>
                      {cmd.description && <div className="text-[10px] text-ide-text-dim truncate">{cmd.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] ${CATEGORY_COLORS[cmd.category]}`}>{cmd.category}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 bg-ide-bg border border-ide-border rounded text-[10px] font-mono text-ide-text-dim">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="brand-divider mx-3" />
            </>
          )}

          {/* Command List */}
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => {
              const Icon = cmd.icon
              return (
                <div
                  key={cmd.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all ${
                    i === selectedIndex ? 'bg-ide-brand/8 border-l-2 border-l-ide-brand' : 'hover:bg-ide-surface-alt/20 border-l-2 border-l-transparent'
                  }`}
                  onClick={() => { cmd.action(); onClose() }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon size={14} className={CATEGORY_COLORS[cmd.category] || 'text-gray-400'} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ide-text">{highlightMatch(cmd.label, query)}</div>
                    {cmd.description && (
                      <div className="text-[10px] text-ide-text-dim truncate">{highlightMatch(cmd.description, query)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] ${CATEGORY_COLORS[cmd.category]}`}>{cmd.category}</span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 bg-ide-bg border border-ide-border rounded text-[10px] font-mono text-ide-text-dim">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-ide-text-dim">
              <FaSearch size={32} className="mb-2 opacity-20 text-ide-brand-light" />
              <span className="text-xs">No commands match &quot;{query}&quot;</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-dim status-bar-gradient">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg rounded border border-ide-border">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg rounded border border-ide-border">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg rounded border border-ide-border">esc</kbd> close</span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  )
}