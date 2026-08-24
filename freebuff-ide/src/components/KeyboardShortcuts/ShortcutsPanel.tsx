import React, { useState } from 'react'
import { keyboardService, KeyboardShortcut } from '../../services/keyboardService'
import { Search, X, Keyboard } from 'lucide-react'

interface ShortcutsPanelProps {
  onClose: () => void
}

export default function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const allShortcuts = keyboardService.getAll()
  const categories = [...new Set(allShortcuts.map(s => s.category))]

  const filteredShortcuts = allShortcuts.filter(s => {
    const matchesSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.shortcut.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = !selectedCategory || s.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group by category
  const grouped = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl max-h-[80vh] bg-ide-surface border border-ide-border rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-ide-accent" />
            <h2 className="font-semibold text-ide-text">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-ide-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ide-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2 bg-ide-bg border border-ide-border rounded-lg text-sm text-ide-text focus:outline-none focus:ring-2 focus:ring-ide-accent"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                !selectedCategory ? 'bg-ide-accent text-white' : 'bg-ide-bg text-ide-text-muted hover:text-ide-text'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat ? 'bg-ide-accent text-white' : 'bg-ide-bg text-ide-text-muted hover:text-ide-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 overflow-auto max-h-[50vh]">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold text-ide-text-muted uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {shortcuts.map(shortcut => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-ide-border/30 transition-colors"
                  >
                    <div>
                      <div className="text-sm text-ide-text">{shortcut.name}</div>
                      <div className="text-xs text-ide-text-muted">{shortcut.description}</div>
                    </div>
                    <kbd className="px-3 py-1 bg-ide-bg rounded border border-ide-border font-mono text-xs text-ide-accent whitespace-nowrap">
                      {shortcut.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-8 text-ide-text-muted">
              No shortcuts found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
