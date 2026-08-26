import React, { useState, useMemo } from 'react'

interface SnippetPattern {
  id: string
  name: string
  shortcut: string
  description: string
  category: 'cursor' | 'selection' | 'transform' | 'multi-edit'
  example: string
}

const SNIPPETS: SnippetPattern[] = [
  // Cursor operations
  { id: 'mc-above', name: 'Add Cursor Above', shortcut: 'Ctrl+Alt+↑', description: 'Add a new cursor on the line above', category: 'cursor', example: '│ line 1\n│ line 2' },
  { id: 'mc-below', name: 'Add Cursor Below', shortcut: 'Ctrl+Alt+↓', description: 'Add a new cursor on the line below', category: 'cursor', example: '│ line 1\n│ line 2' },
  { id: 'mc-occurrence', name: 'Select All Occurrences', shortcut: 'Ctrl+Shift+L', description: 'Select all occurrences of current word', category: 'cursor', example: 'foo → all foos selected' },
  { id: 'mc-column', name: 'Column Selection', shortcut: 'Shift+Alt+Drag', description: 'Select a rectangular column of text', category: 'cursor', example: 'a|bc\nd|ef\ng|hi' },

  // Selection operations
  { id: 'sel-expand', name: 'Expand Selection', shortcut: 'Shift+Alt+→', description: 'Expand selection by semantic scope', category: 'selection', example: 'word → expression → statement → block → function' },
  { id: 'sel-contract', name: 'Shrink Selection', shortcut: 'Shift+Alt+←', description: 'Shrink selection by semantic scope', category: 'selection', example: 'function → block → statement → word' },
  { id: 'sel-all-same', name: 'Select All Same', shortcut: 'Ctrl+Shift+L', description: 'Select all identical strings in file', category: 'selection', example: 'Select every "const" in file' },

  // Transform operations
  { id: 'tr-upper', name: 'To Uppercase', shortcut: 'Ctrl+Shift+U', description: 'Transform selected text to UPPER_CASE', category: 'transform', example: 'helloWorld → HELLOWORLD' },
  { id: 'tr-lower', name: 'To Lowercase', shortcut: 'Ctrl+Shift+L', description: 'Transform selected text to lower_case', category: 'transform', example: 'HELLO_WORLD → hello_world' },
  { id: 'tr-title', name: 'To Title Case', shortcut: 'Ctrl+Shift+T', description: 'Transform to Title Case', category: 'transform', example: 'hello world → Hello World' },
  { id: 'tr-reverse', name: 'Reverse Lines', shortcut: '—', description: 'Reverse the order of selected lines', category: 'transform', example: '1,2,3 → 3,2,1' },
  { id: 'tr-sort', name: 'Sort Lines', shortcut: '—', description: 'Sort selected lines alphabetically', category: 'transform', example: 'c,b,a → a,b,c' },
  { id: 'tr-unique', name: 'Remove Duplicates', shortcut: '—', description: 'Remove duplicate lines from selection', category: 'transform', example: 'a,a,b → a,b' },
  { id: 'tr-indent', name: 'Indent/Outdent', shortcut: 'Tab / Shift+Tab', description: 'Indent or outdent all selected lines', category: 'transform', example: '  line1\n  line2' },

  // Multi-edit operations
  { id: 'me-camel', name: 'Split to Multi-Edit', shortcut: 'Ctrl+D', description: 'Add next occurrence to multi-cursor', category: 'multi-edit', example: 'foo\nfoo\nfoo → 3 cursors' },
  { id: 'me-skip', name: 'Skip Current Occurrence', shortcut: 'Ctrl+K Ctrl+D', description: 'Skip current and select next', category: 'multi-edit', example: 'Select every other occurrence' },
  { id: 'me-column-edit', name: 'Column Multi-Edit', shortcut: 'Shift+Alt+Click', description: 'Place cursor at exact positions', category: 'multi-edit', example: '| col1 | col2 |\n| col3 | col4 |' },
]

const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  cursor: { label: 'Cursor', icon: '⊕', color: '#58a6ff' },
  selection: { label: 'Selection', icon: '⬜', color: '#7ee787' },
  transform: { label: 'Transform', icon: '🔄', color: '#ffa657' },
  'multi-edit': { label: 'Multi-Edit', icon: '✦', color: '#d2a8ff' },
}

export default function MultiCursorSnippets() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  const categories = useMemo(() => {
    const cats = new Set(SNIPPETS.map(s => s.category))
    return Array.from(cats)
  }, [])

  const filtered = useMemo(() => {
    return SNIPPETS.filter(s => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [activeCategory, search])

  return (
    <div className="h-full flex flex-col bg-ide-editor text-ide-text">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">✦ Multi-Cursor & Snippets</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ide-accent/20 text-ide-accent rounded">{SNIPPETS.length} patterns</span>
        </div>
        <input
          type="text"
          placeholder="Search patterns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-ide-bg border border-ide-border rounded text-ide-text placeholder:text-ide-text-muted focus:border-ide-accent outline-none"
        />
      </div>

      {/* Category tabs */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-ide-border flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors ${
            activeCategory === 'all' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
          }`}
        >All</button>
        {categories.map(cat => {
          const info = CATEGORY_INFO[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
              }`}
            >
              <span className="mr-1">{info.icon}</span>{info.label}
            </button>
          )
        })}
      </div>

      {/* Patterns list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {filtered.length === 0 ? (
          <div className="text-center text-ide-text-muted text-sm py-8">No patterns found</div>
        ) : (
          <div className="space-y-1">
            {filtered.map(snippet => {
              const info = CATEGORY_INFO[snippet.category]
              return (
                <div
                  key={snippet.id}
                  className="group px-3 py-2 rounded bg-ide-surface/50 hover:bg-ide-surface border border-transparent hover:border-ide-border transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: info.color }}>{info.icon}</span>
                      <span className="text-xs font-medium text-ide-text">{snippet.name}</span>
                    </div>
                    <kbd className="text-[9px] px-1.5 py-0.5 bg-ide-bg border border-ide-border rounded text-ide-text-muted font-mono">
                      {snippet.shortcut}
                    </kbd>
                  </div>
                  <p className="text-[10px] text-ide-text-muted ml-5">{snippet.description}</p>
                  <div className="mt-1.5 ml-5 text-[10px] text-ide-accent/70 font-mono bg-ide-bg rounded px-2 py-1">
                    {snippet.example}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tips footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-ide-border text-[10px] text-ide-text-muted">
        <span className="font-medium text-ide-text">Tip:</span> Hold <kbd className="px-1 py-0.5 bg-ide-bg border border-ide-border rounded">Alt</kbd> + Click to place cursors manually
      </div>
    </div>
  )
}
