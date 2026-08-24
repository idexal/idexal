import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search, FileText, Settings, Terminal, GitBranch, Edit3, Layout,
  Maximize2, Minimize2, Copy, Trash2, Eye, Code, Palette, Zap,
  Command, ArrowRight, Clock, Star, Hash, Type
} from 'lucide-react'

interface Command {
  id: string
  label: string
  category: string
  icon: typeof Search
  shortcut?: string
  action: () => void
  description?: string
}

const MOCK_COMMANDS: Command[] = [
  // File
  { id: 'file.new', label: 'New File', category: 'File', icon: FileText, shortcut: 'Ctrl+N', action: () => {}, description: 'Create a new file' },
  { id: 'file.open', label: 'Open File', category: 'File', icon: FileText, shortcut: 'Ctrl+O', action: () => {}, description: 'Open an existing file' },
  { id: 'file.save', label: 'Save', category: 'File', icon: FileText, shortcut: 'Ctrl+S', action: () => {}, description: 'Save current file' },
  { id: 'file.saveAll', label: 'Save All', category: 'File', icon: FileText, shortcut: 'Ctrl+Shift+S', action: () => {}, description: 'Save all open files' },
  { id: 'file.close', label: 'Close Editor', category: 'File', icon: FileText, shortcut: 'Ctrl+W', action: () => {}, description: 'Close current editor' },

  // Edit
  { id: 'edit.undo', label: 'Undo', category: 'Edit', icon: Edit3, shortcut: 'Ctrl+Z', action: () => {}, description: 'Undo last action' },
  { id: 'edit.redo', label: 'Redo', category: 'Edit', icon: Edit3, shortcut: 'Ctrl+Shift+Z', action: () => {}, description: 'Redo last action' },
  { id: 'edit.find', label: 'Find', category: 'Edit', icon: Search, shortcut: 'Ctrl+F', action: () => {}, description: 'Find in current file' },
  { id: 'edit.replace', label: 'Find and Replace', category: 'Edit', icon: Search, shortcut: 'Ctrl+H', action: () => {}, description: 'Find and replace in current file' },
  { id: 'edit.findInFiles', label: 'Find in Files', category: 'Edit', icon: Search, shortcut: 'Ctrl+Shift+F', action: () => {}, description: 'Search across all files' },
  { id: 'edit.selectAll', label: 'Select All', category: 'Edit', icon: Edit3, shortcut: 'Ctrl+A', action: () => {}, description: 'Select all content' },
  { id: 'edit.format', label: 'Format Document', category: 'Edit', icon: Code, shortcut: 'Shift+Alt+F', action: () => {}, description: 'Format the entire document' },

  // View
  { id: 'view.sidebar', label: 'Toggle Sidebar', category: 'View', icon: Layout, shortcut: 'Ctrl+B', action: () => {}, description: 'Toggle sidebar visibility' },
  { id: 'view.terminal', label: 'Toggle Terminal', category: 'View', icon: Terminal, shortcut: 'Ctrl+`', action: () => {}, description: 'Toggle terminal panel' },
  { id: 'view.zoomIn', label: 'Zoom In', category: 'View', icon: Maximize2, shortcut: 'Ctrl+=', action: () => {}, description: 'Increase zoom level' },
  { id: 'view.zoomOut', label: 'Zoom Out', category: 'View', icon: Minimize2, shortcut: 'Ctrl+-', action: () => {}, description: 'Decrease zoom level' },
  { id: 'view.wordWrap', label: 'Toggle Word Wrap', category: 'View', icon: Type, shortcut: 'Alt+Z', action: () => {}, description: 'Toggle word wrap in editor' },
  { id: 'view.lineNumbers', label: 'Toggle Line Numbers', category: 'View', icon: Hash, action: () => {}, description: 'Show/hide line numbers' },
  { id: 'view.minimap', label: 'Toggle Minimap', category: 'View', icon: Eye, action: () => {}, description: 'Show/hide minimap' },

  // Go
  { id: 'go.line', label: 'Go to Line', category: 'Go', icon: Hash, shortcut: 'Ctrl+G', action: () => {}, description: 'Go to specific line number' },
  { id: 'go.definition', label: 'Go to Definition', category: 'Go', icon: Code, shortcut: 'F12', action: () => {}, description: 'Navigate to definition' },
  { id: 'go.references', label: 'Find References', category: 'Go', icon: Code, shortcut: 'Shift+F12', action: () => {}, description: 'Find all references' },
  { id: 'go.symbol', label: 'Go to Symbol', category: 'Go', icon: Code, shortcut: 'Ctrl+Shift+O', action: () => {}, description: 'Navigate to symbol in file' },
  { id: 'go.file', label: 'Go to File', category: 'Go', icon: FileText, shortcut: 'Ctrl+P', action: () => {}, description: 'Quick file navigation' },

  // AI
  { id: 'ai.chat', label: 'Open AI Chat', category: 'AI', icon: Command, shortcut: 'Ctrl+Shift+A', action: () => {}, description: 'Open AI assistant' },
  { id: 'ai.review', label: 'AI Code Review', category: 'AI', icon: Eye, shortcut: 'Ctrl+Shift+R', action: () => {}, description: 'Review code with AI' },
  { id: 'ai.explain', label: 'AI Explain Code', category: 'AI', icon: Type, action: () => {}, description: 'Explain selected code' },
  { id: 'ai.fix', label: 'AI Fix Code', category: 'AI', icon: Zap, action: () => {}, description: 'Fix code issues with AI' },

  // Git
  { id: 'git.commit', label: 'Git Commit', category: 'Git', icon: GitBranch, action: () => {}, description: 'Commit changes' },
  { id: 'git.pull', label: 'Git Pull', category: 'Git', icon: GitBranch, action: () => {}, description: 'Pull remote changes' },
  { id: 'git.push', label: 'Git Push', category: 'Git', icon: GitBranch, action: () => {}, description: 'Push local changes' },
  { id: 'git.branch', label: 'Create Branch', category: 'Git', icon: GitBranch, action: () => {}, description: 'Create a new branch' },
  { id: 'git.blame', label: 'Git Blame', category: 'Git', icon: GitBranch, shortcut: 'Ctrl+\\', action: () => {}, description: 'Show blame annotations' },

  // Settings
  { id: 'settings.open', label: 'Open Settings', category: 'Settings', icon: Settings, shortcut: 'Ctrl+,', action: () => {}, description: 'Open settings panel' },
  { id: 'settings.theme', label: 'Change Theme', category: 'Settings', icon: Palette, action: () => {}, description: 'Change editor theme' },
  { id: 'settings.keyboard', label: 'Keyboard Shortcuts', category: 'Settings', icon: Command, shortcut: 'Ctrl+K Ctrl+S', action: () => {}, description: 'Customize keyboard shortcuts' },
  { id: 'settings.extensions', label: 'Manage Extensions', category: 'Settings', icon: Code, shortcut: 'Ctrl+Shift+X', action: () => {}, description: 'Install/manage extensions' },
]

const CATEGORY_COLORS: Record<string, string> = {
  File: 'text-blue-400',
  Edit: 'text-green-400',
  View: 'text-purple-400',
  Go: 'text-cyan-400',
  AI: 'text-pink-400',
  Git: 'text-orange-400',
  Settings: 'text-yellow-400',
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

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [recentIds] = useState<Set<string>>(new Set(['ai.chat', 'view.terminal', 'git.commit', 'settings.open']))
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredCommands = useMemo(() => {
    let commands = [...MOCK_COMMANDS]

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
    return MOCK_COMMANDS.filter(c => recentIds.has(c.id))
  }, [recentIds])

  const categories = useMemo(() => {
    return [...new Set(MOCK_COMMANDS.map(c => c.category))]
  }, [])

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
        <span className="text-ide-accent font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div
        className="w-[560px] bg-ide-bg border border-ide-border rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ide-border">
          <Command size={16} className="text-ide-text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
          <kbd className="px-1.5 py-0.5 bg-ide-bg-secondary border border-ide-border/50 rounded text-[10px] font-mono text-ide-text-secondary">
            Esc
          </kbd>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border bg-ide-bg-secondary/20 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${
              !activeCategory ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${
                activeCategory === cat ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary hover:text-ide-text'
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
              <div className="px-3 py-1.5 text-[10px] text-ide-text-secondary flex items-center gap-1 bg-ide-bg-secondary/20">
                <Clock size={10} /> Recently Used
              </div>
              {recentCommands.map((cmd, i) => {
                const Icon = cmd.icon
                return (
                  <div
                    key={`recent-${cmd.id}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-ide-bg-secondary/30 cursor-pointer"
                    onClick={() => { cmd.action(); onClose() }}
                  >
                    <Icon size={14} className={CATEGORY_COLORS[cmd.category] || 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ide-text">{cmd.label}</div>
                      {cmd.description && <div className="text-[10px] text-ide-text-secondary truncate">{cmd.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] ${CATEGORY_COLORS[cmd.category]}`}>{cmd.category}</span>
                      {cmd.shortcut && (
                        <kbd className="px-1.5 py-0.5 bg-ide-bg-secondary border border-ide-border/50 rounded text-[10px] font-mono text-ide-text-secondary">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="border-b border-ide-border" />
            </>
          )}

          {/* Command List */}
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => {
              const Icon = cmd.icon
              return (
                <div
                  key={cmd.id}
                  ref={i === 0 ? undefined : undefined}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                    i === selectedIndex ? 'bg-ide-accent/10' : 'hover:bg-ide-bg-secondary/20'
                  }`}
                  onClick={() => { cmd.action(); onClose() }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon size={14} className={CATEGORY_COLORS[cmd.category] || 'text-gray-400'} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ide-text">{highlightMatch(cmd.label, query)}</div>
                    {cmd.description && (
                      <div className="text-[10px] text-ide-text-secondary truncate">{highlightMatch(cmd.description, query)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] ${CATEGORY_COLORS[cmd.category]}`}>{cmd.category}</span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 bg-ide-bg-secondary border border-ide-border/50 rounded text-[10px] font-mono text-ide-text-secondary">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-ide-text-secondary">
              <Search size={32} className="mb-2 opacity-30" />
              <span className="text-xs">No commands match "{query}"</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-secondary bg-ide-bg-secondary/10">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg-secondary rounded border border-ide-border/50">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg-secondary rounded border border-ide-border/50">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-ide-bg-secondary rounded border border-ide-border/50">esc</kbd> close</span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  )
}


