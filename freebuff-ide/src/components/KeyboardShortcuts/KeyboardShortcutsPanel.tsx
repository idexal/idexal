import React, { useState, useMemo } from 'react'
import {
  Keyboard, Search, Command, Copy, Check, X,
  Edit, Terminal, GitBranch, Layout, Eye, Settings,
  Zap, FileText, Maximize2, Minimize2, ChevronDown, ChevronRight
} from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
  when?: string
}

const SHORTCUTS: Shortcut[] = [
  // General
  { keys: ['Ctrl', 'K'], description: 'Command Palette', category: 'General' },
  { keys: ['Ctrl', 'P'], description: 'Quick Open File', category: 'General' },
  { keys: ['Ctrl', ','], description: 'Open Settings', category: 'General' },
  { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar', category: 'General' },
  { keys: ['Ctrl', '\\'], description: 'Split Editor', category: 'General' },
  { keys: ['Ctrl', '1'], description: 'Focus First Editor Group', category: 'General' },
  { keys: ['Ctrl', '2'], description: 'Focus Second Editor Group', category: 'General' },
  { keys: ['Escape'], description: 'Close Overlay / Cancel', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Search in Files', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'H'], description: 'Replace in Files', category: 'General' },

  // Editor
  { keys: ['Ctrl', 'D'], description: 'Select Next Occurrence', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Shift', 'L'], description: 'Select All Occurrences', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', '/'], description: 'Toggle Line Comment', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Shift', '/'], description: 'Toggle Block Comment', category: 'Editor', when: 'Editor focused' },
  { keys: ['Alt', 'Up'], description: 'Move Line Up', category: 'Editor', when: 'Editor focused' },
  { keys: ['Alt', 'Down'], description: 'Move Line Down', category: 'Editor', when: 'Editor focused' },
  { keys: ['Shift', 'Alt', 'Up'], description: 'Copy Line Up', category: 'Editor', when: 'Editor focused' },
  { keys: ['Shift', 'Alt', 'Down'], description: 'Copy Line Down', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Shift', 'K'], description: 'Delete Line', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Enter'], description: 'Insert Line Below', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Shift', 'Enter'], description: 'Insert Line Above', category: 'Editor', when: 'Editor focused' },
  { keys: ['Tab'], description: 'Indent Line', category: 'Editor', when: 'Editor focused' },
  { keys: ['Shift', 'Tab'], description: 'Outdent Line', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', '['], description: 'Outdent', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', ']'], description: 'Indent', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'Home'], description: 'Go to Top', category: 'Editor', when: 'Editor focused' },
  { keys: ['Ctrl', 'End'], description: 'Go to Bottom', category: 'Editor', when: 'Editor focused' },

  // Navigation
  { keys: ['Ctrl', 'G'], description: 'Go to Line', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'O'], description: 'Go to Symbol', category: 'Navigation' },
  { keys: ['Ctrl', 'T'], description: 'Go to Type Definition', category: 'Navigation' },
  { keys: ['F12'], description: 'Go to Definition', category: 'Navigation' },
  { keys: ['Alt', 'F12'], description: 'Peek Definition', category: 'Navigation' },
  { keys: ['Ctrl', 'F12'], description: 'Go to Implementation', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'O'], description: 'Go to Symbol in Editor', category: 'Navigation' },
  { keys: ['Alt', 'Left'], description: 'Navigate Back', category: 'Navigation' },
  { keys: ['Alt', 'Right'], description: 'Navigate Forward', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'Tab'], description: 'Cycle Previous Editor', category: 'Navigation' },
  { keys: ['Ctrl', 'Tab'], description: 'Cycle Next Editor', category: 'Navigation' },

  // Panels
  { keys: ['Ctrl', '`'], description: 'Toggle Terminal', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Toggle AI Chat', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'G'], description: 'Toggle Git Panel', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Debug Panel', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Toggle Agent Dashboard', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'R'], description: 'Toggle Task Runner', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'U'], description: 'Toggle API Client', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'J'], description: 'Toggle JSON Viewer', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'B'], description: 'Toggle Bookmarks', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle Package Manager', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'Toggle Notifications', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'H'], description: 'Toggle Git Advanced', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Toggle Extensions', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle Live Share', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'T'], description: 'Toggle Theme Editor', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'V'], description: 'Toggle Env Variables', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'W'], description: 'Toggle WebSocket Client', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'I'], description: 'Toggle Code Metrics', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'L'], description: 'Toggle Component Library', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Toggle CI/CD Pipeline', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'Y'], description: 'Toggle Log Viewer', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'X'], description: 'Toggle Dependency Graph', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Toggle System Monitor', category: 'Panels' },
  { keys: ['Ctrl', "'"], description: 'Toggle Code Review', category: 'Panels' },
  { keys: ['Ctrl', ';'], description: 'Toggle Query History', category: 'Panels' },
  { keys: ['Ctrl', 'Shift', '='], description: 'Toggle Snippet Generator', category: 'Panels' },
  { keys: ['Ctrl', '.'], description: 'Toggle Rate Limiter', category: 'Panels' },

  // Editing
  { keys: ['Ctrl', 'Shift', 'I'], description: 'Format Document', category: 'Editing' },
  { keys: ['Ctrl', 'K', 'F'], description: 'Format Selection', category: 'Editing' },
  { keys: ['Ctrl', 'K', 'C'], description: 'Toggle Block Comment', category: 'Editing' },
  { keys: ['Ctrl', 'K', 'U'], description: 'Uppercase Selection', category: 'Editing' },
  { keys: ['Ctrl', 'K', 'L'], description: 'Lowercase Selection', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Trim Trailing Whitespace', category: 'Editing' },
  { keys: ['Ctrl', 'I'], description: 'Trigger Suggest', category: 'Editing' },
  { keys: ['Ctrl', 'Space'], description: 'Trigger IntelliSense', category: 'Editing' },
  { keys: ['F5'], description: 'Start Debugging', category: 'Editing' },
  { keys: ['F9'], description: 'Toggle Breakpoint', category: 'Editing' },
  { keys: ['F10'], description: 'Step Over', category: 'Editing' },
  { keys: ['F11'], description: 'Step Into', category: 'Editing' },

  // AI
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Open AI Chat', category: 'AI' },
  { keys: ['Ctrl', 'Enter'], description: 'Send Message to AI', category: 'AI', when: 'Chat focused' },
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Open Agent Dashboard', category: 'AI' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'AI Code Review', category: 'AI' },
]

const CATEGORY_ICONS: Record<string, typeof Keyboard> = {
  'General': Command,
  'Editor': Edit,
  'Navigation': Eye,
  'Panels': Layout,
  'Editing': FileText,
  'AI': Zap,
}

const CATEGORY_COLORS: Record<string, string> = {
  'General': 'text-blue-400',
  'Editor': 'text-green-400',
  'Navigation': 'text-purple-400',
  'Panels': 'text-yellow-400',
  'Editing': 'text-cyan-400',
  'AI': 'text-pink-400',
}

export default function KeyboardShortcutsPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('General')
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null)

  const categories = useMemo(() => {
    const cats = new Map<string, Shortcut[]>()
    SHORTCUTS.forEach(s => {
      if (!cats.has(s.category)) cats.set(s.category, [])
      cats.get(s.category)!.push(s)
    })
    return Array.from(cats.entries())
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    const q = searchQuery.toLowerCase()
    return categories
      .map(([cat, shortcuts]) => [cat, shortcuts.filter(s =>
        s.description.toLowerCase().includes(q) ||
        s.keys.join('+').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.when && s.when.toLowerCase().includes(q))
      )] as [string, Shortcut[]])
      .filter(([, shortcuts]) => shortcuts.length > 0)
  }, [categories, searchQuery])

  const copyShortcut = (shortcut: Shortcut) => {
    const text = shortcut.keys.join(' + ')
    navigator.clipboard?.writeText(text)
    setCopiedShortcut(text)
    setTimeout(() => setCopiedShortcut(null), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Keyboard size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">Keyboard Shortcuts</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ide-text-secondary">{SHORTCUTS.length} shortcuts</span>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1.5">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-ide-text-secondary hover:text-ide-text">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Shortcut List */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map(([category, shortcuts]) => {
          const Icon = CATEGORY_ICONS[category] || Keyboard
          const color = CATEGORY_COLORS[category] || 'text-gray-400'
          const isExpanded = expandedCategory === category || !!searchQuery
          return (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 text-left"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold flex-1">{category}</span>
                <span className="text-[10px] text-ide-text-secondary">{shortcuts.length}</span>
              </button>
              {isExpanded && (
                <div className="border-b border-ide-border/30">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-1.5 hover:bg-ide-bg-secondary/10 border-b border-ide-border/10 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-ide-text truncate">{shortcut.description}</div>
                        {shortcut.when && (
                          <div className="text-[10px] text-ide-text-secondary/60">{shortcut.when}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {shortcut.keys.map((key, ki) => (
                          <React.Fragment key={ki}>
                            <kbd className="px-1.5 py-0.5 bg-ide-bg-secondary border border-ide-border/50 rounded text-[10px] font-mono text-ide-text-secondary min-w-[24px] text-center">
                              {key}
                            </kbd>
                            {ki < shortcut.keys.length - 1 && (
                              <span className="text-[10px] text-ide-text-secondary/40">+</span>
                            )}
                          </React.Fragment>
                        ))}
                        <button
                          onClick={() => copyShortcut(shortcut)}
                          className="ml-1 p-0.5 rounded hover:bg-ide-bg-secondary text-ide-text-secondary/50 hover:text-ide-text-secondary"
                          title="Copy shortcut"
                        >
                          {copiedShortcut === shortcut.keys.join('+') ? (
                            <Check size={10} className="text-green-400" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filteredCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-ide-text-secondary">
            <Keyboard size={32} className="mb-2 opacity-30" />
            <span className="text-xs">No shortcuts match "{searchQuery}"</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-secondary">
        <span>Press <kbd className="px-1 py-0.5 bg-ide-bg-secondary border border-ide-border/50 rounded font-mono text-[9px]">Ctrl+K</kbd> to open Command Palette</span>
        <span>{filteredCategories.reduce((sum, [, s]) => sum + s.length, 0)} shown</span>
      </div>
    </div>
  )
}
