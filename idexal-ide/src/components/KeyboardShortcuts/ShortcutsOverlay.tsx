import React, { useState, useMemo } from 'react'
import { FaTimes, FaSearch, FaKeyboard } from '../Icon'

interface Shortcut {
  keys: string[]
  label: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // General
  { keys: ['Ctrl', 'K'], label: 'Command Palette', category: 'General' },
  { keys: ['Ctrl', 'P'], label: 'Quick Open File', category: 'General' },
  { keys: ['Ctrl', ','], label: 'Open Settings', category: 'General' },
  { keys: ['Ctrl', 'B'], label: 'Toggle Sidebar', category: 'General' },
  { keys: ['Ctrl', '`'], label: 'Toggle Terminal', category: 'General' },
  { keys: ['Ctrl', 'Shift', 'A'], label: 'Open AI Chat', category: 'General' },
  { keys: ['/'], label: 'Show Shortcuts', category: 'General' },
  { keys: ['Esc'], label: 'Close Panel / Dialog', category: 'General' },

  // File Operations
  { keys: ['Ctrl', 'N'], label: 'New File', category: 'File' },
  { keys: ['Ctrl', 'O'], label: 'Open File', category: 'File' },
  { keys: ['Ctrl', 'S'], label: 'Save', category: 'File' },
  { keys: ['Ctrl', 'Shift', 'S'], label: 'Save As', category: 'File' },
  { keys: ['Ctrl', 'W'], label: 'Close Tab', category: 'File' },
  { keys: ['Ctrl', 'Tab'], label: 'Next Tab', category: 'File' },
  { keys: ['Ctrl', 'Shift', 'Tab'], label: 'Previous Tab', category: 'File' },

  // Editing
  { keys: ['Ctrl', 'Z'], label: 'Undo', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo', category: 'Editing' },
  { keys: ['Ctrl', 'F'], label: 'Find', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'F'], label: 'Find in Files', category: 'Editing' },
  { keys: ['Ctrl', 'H'], label: 'Find & Replace', category: 'Editing' },
  { keys: ['Ctrl', 'D'], label: 'Select Next Occurrence', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'L'], label: 'Select All Occurrences', category: 'Editing' },
  { keys: ['Alt', '↑'], label: 'Move Line Up', category: 'Editing' },
  { keys: ['Alt', '↓'], label: 'Move Line Down', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'K'], label: 'Delete Line', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'D'], label: 'Duplicate Line', category: 'Editing' },
  { keys: ['Shift', 'Alt', 'F'], label: 'Format Document', category: 'Editing' },
  { keys: ['Ctrl', '/'], label: 'Toggle Line Comment', category: 'Editing' },
  { keys: ['Shift', 'Alt', 'A'], label: 'Toggle Block Comment', category: 'Editing' },
  { keys: ['Ctrl', 'Enter'], label: 'Insert Line Below', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'Enter'], label: 'Insert Line Above', category: 'Editing' },

  // Multi-Cursor
  { keys: ['Ctrl', 'Click'], label: 'Add Cursor', category: 'Multi-Cursor' },
  { keys: ['Ctrl', 'Alt', '↑'], label: 'Add Cursor Above', category: 'Multi-Cursor' },
  { keys: ['Ctrl', 'Alt', '↓'], label: 'Add Cursor Below', category: 'Multi-Cursor' },
  { keys: ['Ctrl', 'Shift', 'L'], label: 'Select All Occurrences', category: 'Multi-Cursor' },
  { keys: ['Alt', 'Shift', 'I'], label: 'Select All Occurrences of Find Match', category: 'Multi-Cursor' },

  // Navigation
  { keys: ['Ctrl', 'G'], label: 'Go to Line', category: 'Navigation' },
  { keys: ['F12'], label: 'Go to Definition', category: 'Navigation' },
  { keys: ['Shift', 'F12'], label: 'Find References', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'O'], label: 'Go to Symbol', category: 'Navigation' },
  { keys: ['Ctrl', '→'], label: 'Move Word Right', category: 'Navigation' },
  { keys: ['Ctrl', '←'], label: 'Move Word Left', category: 'Navigation' },
  { keys: ['Home'], label: 'Go to Line Start', category: 'Navigation' },
  { keys: ['End'], label: 'Go to Line End', category: 'Navigation' },
  { keys: ['Ctrl', 'Home'], label: 'Go to File Start', category: 'Navigation' },
  { keys: ['Ctrl', 'End'], label: 'Go to File End', category: 'Navigation' },

  // View
  { keys: ['Ctrl', '+'], label: 'Zoom In', category: 'View' },
  { keys: ['Ctrl', '-'], label: 'Zoom Out', category: 'View' },
  { keys: ['Ctrl', '0'], label: 'Reset Zoom', category: 'View' },
  { keys: ['F11'], label: 'Toggle Fullscreen', category: 'View' },
  { keys: ['Ctrl', '='], label: 'Toggle Word Wrap', category: 'View' },

  // Terminal
  { keys: ['Ctrl', '`'], label: 'Toggle Terminal', category: 'Terminal' },
  { keys: ['Ctrl', 'Shift', '`'], label: 'New Terminal', category: 'Terminal' },
  { keys: ['Ctrl', 'Shift', 'C'], label: 'Copy Selection', category: 'Terminal' },
  { keys: ['Ctrl', 'Shift', 'V'], label: 'Paste into Terminal', category: 'Terminal' },
  { keys: ['Ctrl', 'L'], label: 'Clear Terminal', category: 'Terminal' },

  // Git
  { keys: ['Ctrl', 'Shift', 'G'], label: 'Open Git Panel', category: 'Git' },
  { keys: ['Ctrl', 'Enter'], label: 'Commit (in Git input)', category: 'Git' },

  // AI
  { keys: ['Ctrl', 'Shift', 'A'], label: 'Open AI Chat', category: 'AI' },
  { keys: ['Ctrl', 'I'], label: 'AI Inline Completion', category: 'AI' },
  { keys: ['Ctrl', '.'], label: 'AI Quick Fix', category: 'AI' },
]

const CATEGORIES = [...new Set(SHORTCUTS.map(s => s.category))]

export default function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = SHORTCUTS
    if (activeCategory) result = result.filter(s => s.category === activeCategory)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.label.toLowerCase().includes(q) ||
        s.keys.join(' ').toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [search, activeCategory])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Shortcut[]>()
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, [])
      map.get(s.category)!.push(s)
    }
    return map
  }, [filtered])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-[700px] max-h-[80vh] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FaKeyboard className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-hover)]">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Categories */}
        <div className="p-3 border-b border-[var(--color-border)] space-y-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              autoFocus
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                !activeCategory ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]'
              }`}
            >All</button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]'
                }`}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-auto p-4">
          {grouped.size === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              <FaSearch className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <span className="text-sm">No shortcuts match &quot;{search}&quot;</span>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([category, shortcuts]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">{category}</h3>
                  <div className="space-y-1">
                    {shortcuts.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--color-hover)] transition-colors">
                        <span className="text-sm">{s.label}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((key, ki) => (
                            <React.Fragment key={ki}>
                              {ki > 0 && <span className="text-[var(--color-text-secondary)] text-[10px]">+</span>}
                              <kbd className="px-2 py-0.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-[11px] font-mono min-w-[24px] text-center">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-secondary)]">
          <span>{filtered.length} shortcuts</span>
          <span>Press <kbd className="px-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
