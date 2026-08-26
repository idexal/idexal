import React, { useState, useMemo } from 'react'
import {
  FaBookmark, FaTimes, FaPlus, FaTrash, FaCode, FaChevronDown, FaChevronRight, FaSearch
} from '../Icon'

interface BookmarksPanelProps {
  onClose?: () => void
}

interface BookmarkItem {
  id: string
  file: string
  line: number
  column: number
  label: string
  color: string
  note: string
  createdAt: number
  language: string
}

const COLORS = [
  { name: 'Red', value: '#ff7b72', class: 'bg-red-500' },
  { name: 'Orange', value: '#ffa657', class: 'bg-orange-500' },
  { name: 'Yellow', value: '#e3b341', class: 'bg-yellow-500' },
  { name: 'Green', value: '#7ee787', class: 'bg-green-500' },
  { name: 'Blue', value: '#58a6ff', class: 'bg-blue-500' },
  { name: 'Purple', value: '#bc8cff', class: 'bg-purple-500' },
  { name: 'Pink', value: '#f778ba', class: 'bg-pink-500' },
]

const MOCK_BOOKMARKS: BookmarkItem[] = [
  { id: '1', file: 'src/services/agentOrchestrator.ts', line: 45, column: 0, label: 'Main orchestrator entry point', color: '#58a6ff', note: 'This is where all workflows start', createdAt: Date.now() - 86400000, language: 'typescript' },
  { id: '2', file: 'src/hooks/useAgent.ts', line: 12, column: 0, label: 'Agent hook - needs refactoring', color: '#ffa657', note: 'Split into smaller hooks', createdAt: Date.now() - 3600000, language: 'typescript' },
  { id: '3', file: 'src/components/AI/ChatPanel.tsx', line: 89, column: 0, label: 'TODO: Add message persistence', color: '#7ee787', note: 'Store messages in IndexedDB', createdAt: Date.now() - 7200000, language: 'tsx' },
  { id: '4', file: 'src/stores/editorStore.ts', line: 34, column: 0, label: 'BUG: Tab close race condition', color: '#ff7b72', note: 'Need mutex or queue', createdAt: Date.now() - 1800000, language: 'typescript' },
]

export default function BookmarksPanel({ onClose }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(MOCK_BOOKMARKS)
  const [searchQuery, setSearchQuery] = useState('')
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'file' | 'color'>('date')
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBookmark, setNewBookmark] = useState({ file: '', line: 1, label: '', note: '', color: '#58a6ff' })

  const filtered = useMemo(() => {
    let result = bookmarks
    if (colorFilter) {
      result = result.filter(b => b.color === colorFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.label.toLowerCase().includes(q) ||
        b.file.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'date') result.sort((a, b) => b.createdAt - a.createdAt)
    else if (sortBy === 'file') result.sort((a, b) => a.file.localeCompare(b.file))
    else result.sort((a, b) => a.color.localeCompare(b.color))
    return result
  }, [bookmarks, colorFilter, searchQuery, sortBy])

  const grouped = useMemo(() => {
    if (sortBy !== 'file') return null
    const groups: Record<string, BookmarkItem[]> = {}
    for (const b of filtered) {
      if (!groups[b.file]) groups[b.file] = []
      groups[b.file].push(b)
    }
    return groups
  }, [filtered, sortBy])

  const addBookmark = () => {
    if (newBookmark.file.trim() && newBookmark.label.trim()) {
      setBookmarks(prev => [...prev, {
        id: `bm-${Date.now()}`,
        ...newBookmark,
        column: 0,
        createdAt: Date.now(),
        language: 'typescript',
      }])
      setNewBookmark({ file: '', line: 1, label: '', note: '', color: '#58a6ff' })
      setShowAddForm(false)
    }
  }

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const toggleFile = (file: string) => {
    const next = new Set(expandedFiles)
    if (next.has(file)) next.delete(file)
    else next.add(file)
    setExpandedFiles(next)
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBookmark className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Bookmarks</span>
          <span className="text-[10px] text-ide-text-muted">{bookmarks.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Add Bookmark"
          >
            <FaPlus className="w-4 h-4" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
              <FaTimes className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-3 border-b border-ide-border space-y-2">
          <input type="text" value={newBookmark.file} onChange={(e) => setNewBookmark(p => ({ ...p, file: e.target.value }))} placeholder="File path" className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent" />
          <div className="flex gap-2">
            <input type="number" value={newBookmark.line} onChange={(e) => setNewBookmark(p => ({ ...p, line: parseInt(e.target.value) || 1 }))} className="w-20 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none" />
            <input type="text" value={newBookmark.label} onChange={(e) => setNewBookmark(p => ({ ...p, label: e.target.value }))} placeholder="Label" className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent" />
          </div>
          <input type="text" value={newBookmark.note} onChange={(e) => setNewBookmark(p => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent" />
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setNewBookmark(p => ({ ...p, color: c.value }))} className={`w-5 h-5 rounded-full ${c.class} ${newBookmark.color === c.value ? 'ring-2 ring-white' : ''}`} title={c.name} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addBookmark} className="px-3 py-1 text-xs bg-ide-accent text-white rounded hover:bg-ide-accent/80">Add</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 text-xs bg-ide-bg border border-ide-border rounded text-ide-text-muted hover:text-ide-text">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-2 border-b border-ide-border space-y-2">
        <div className="relative">
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-muted" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bookmarks..." className="w-full pl-8 pr-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent" />
        </div>
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button key={c.value} onClick={() => setColorFilter(colorFilter === c.value ? null : c.value)} className={`w-4 h-4 rounded-full ${c.class} ${colorFilter === c.value ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'}`} title={c.name} />
          ))}
          <div className="flex-1" />
          {(['date', 'file', 'color'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-0.5 text-[10px] rounded ${sortBy === s ? 'bg-ide-surface text-ide-text border border-ide-border' : 'text-ide-text-muted hover:text-ide-text'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-muted text-xs">No bookmarks</div>
        ) : sortBy === 'file' && grouped ? (
          <div className="py-1">
            {Object.entries(grouped).map(([file, items]) => (
              <div key={file}>
                <button onClick={() => toggleFile(file)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ide-border/30 text-left">
                  {expandedFiles.has(file) ? <FaChevronDown className="w-3 h-3 text-ide-text-muted" /> : <FaChevronRight className="w-3 h-3 text-ide-text-muted" />}
                  <span className="text-xs text-ide-text truncate flex-1 font-mono">{file}</span>
                  <span className="text-[10px] text-ide-text-muted">{items.length}</span>
                </button>
                {expandedFiles.has(file) && items.map(b => (
                  <BookmarkItem key={b.id} bookmark={b} onRemove={removeBookmark} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {filtered.map(b => <BookmarkItem key={b.id} bookmark={b} onRemove={removeBookmark} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function BookmarkItem({ bookmark: b, onRemove }: { bookmark: BookmarkItem; onRemove: (id: string) => void }) {
  return (
    <div className="px-3 py-2 hover:bg-ide-border/20 flex items-start gap-2 group">
      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: b.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ide-text font-medium">{b.label}</div>
        <div className="text-[10px] text-ide-text-muted font-mono mt-0.5">{b.file}:{b.line}</div>
        {b.note && <div className="text-[10px] text-ide-text-muted mt-0.5 italic">{b.note}</div>}
      </div>
      <button onClick={() => onRemove(b.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-ide-border text-ide-text-muted">
        <FaTrash className="w-3 h-3" />
      </button>
    </div>
  )
}
