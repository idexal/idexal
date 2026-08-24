import React, { useState, useMemo } from 'react'
import {
  Clock, Star, Copy, Check, Play, Trash2, Search, Download,
  Filter, Bookmark, BookmarkCheck, ArrowUpDown, Calendar, Zap
} from 'lucide-react'

interface QueryHistoryItem {
  id: string
  query: string
  database: string
  duration: number
  rowsAffected: number
  timestamp: Date
  status: 'success' | 'error' | 'running'
  isFavorite: boolean
  tags: string[]
  errorMessage?: string
}

const MOCK_HISTORY: QueryHistoryItem[] = [
  { id: '1', query: "SELECT * FROM users WHERE active = true ORDER BY created_at DESC LIMIT 10", database: 'production', duration: 45, rowsAffected: 10, timestamp: new Date(Date.now() - 300000), status: 'success', isFavorite: true, tags: ['users', 'select'] },
  { id: '2', query: "INSERT INTO posts (title, content, author_id) VALUES ('New Post', 'Content...', 1)", database: 'production', duration: 12, rowsAffected: 1, timestamp: new Date(Date.now() - 600000), status: 'success', isFavorite: false, tags: ['posts', 'insert'] },
  { id: '3', query: "UPDATE users SET last_login = NOW() WHERE id = 1", database: 'production', duration: 8, rowsAffected: 1, timestamp: new Date(Date.now() - 900000), status: 'success', isFavorite: false, tags: ['users', 'update'] },
  { id: '4', query: "SELECT u.name, COUNT(p.id) as post_count FROM users u LEFT JOIN posts p ON u.id = p.author_id GROUP BY u.id HAVING COUNT(p.id) > 5", database: 'production', duration: 120, rowsAffected: 5, timestamp: new Date(Date.now() - 1200000), status: 'success', isFavorite: true, tags: ['analytics', 'join'] },
  { id: '5', query: "DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days'", database: 'production', duration: 85, rowsAffected: 1234, timestamp: new Date(Date.now() - 1800000), status: 'success', isFavorite: false, tags: ['cleanup', 'delete'] },
  { id: '6', query: "SELECT * FROM users WHERE email = 'alice@example.com'", database: 'test', duration: 5, rowsAffected: 1, timestamp: new Date(Date.now() - 2400000), status: 'success', isFavorite: false, tags: ['users', 'select'] },
  { id: '7', query: "CREATE INDEX idx_users_email ON users (email)", database: 'production', duration: 450, rowsAffected: 0, timestamp: new Date(Date.now() - 3600000), status: 'success', isFavorite: false, tags: ['index', 'ddl'] },
  { id: '8', query: "SELECT * FROM nonexistent_table", database: 'test', duration: 2, rowsAffected: 0, timestamp: new Date(Date.now() - 4800000), status: 'error', isFavorite: false, tags: ['error'], errorMessage: 'relation "nonexistent_table" does not exist' },
  { id: '9', query: "SELECT u.*, p.title FROM users u INNER JOIN posts p ON u.id = p.author_id WHERE p.status = 'published'", database: 'production', duration: 65, rowsAffected: 25, timestamp: new Date(Date.now() - 5400000), status: 'success', isFavorite: true, tags: ['join', 'select'] },
  { id: '10', query: "BEGIN TRANSACTION; UPDATE accounts SET balance = balance - 100 WHERE id = 1; UPDATE accounts SET balance = balance + 100 WHERE id = 2; COMMIT;", database: 'production', duration: 35, rowsAffected: 2, timestamp: new Date(Date.now() - 7200000), status: 'success', isFavorite: true, tags: ['transaction', 'update'] },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export default function QueryHistoryPanel({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState(MOCK_HISTORY)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'rows'>('recent')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<QueryHistoryItem | null>(null)

  const filtered = useMemo(() => {
    return history
      .filter(q => {
        if (filterStatus !== 'all' && q.status !== filterStatus) return false
        if (showFavoritesOnly && !q.isFavorite) return false
        if (searchQuery) {
          const s = searchQuery.toLowerCase()
          return q.query.toLowerCase().includes(s) || q.database.includes(s) || q.tags.some(t => t.includes(s))
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.timestamp.getTime() - a.timestamp.getTime()
        if (sortBy === 'duration') return b.duration - a.duration
        return b.rowsAffected - a.rowsAffected
      })
  }, [history, filterStatus, showFavoritesOnly, searchQuery, sortBy])

  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(q => q.id === id ? { ...q, isFavorite: !q.isFavorite } : q))
  }

  const copyQuery = (id: string, query: string) => {
    navigator.clipboard?.writeText(query)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const deleteQuery = (id: string) => {
    setHistory(prev => prev.filter(q => q.id !== id))
    if (selectedQuery?.id === id) setSelectedQuery(null)
  }

  const stats = useMemo(() => ({
    total: history.length,
    favorites: history.filter(q => q.isFavorite).length,
    avgDuration: Math.round(history.reduce((s, q) => s + q.duration, 0) / history.length),
    totalRows: history.reduce((s, q) => s + q.rowsAffected, 0),
  }), [history])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          <span className="text-sm font-semibold">Query History</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{stats.total} queries</span>
        <span className="text-amber-400">{stats.favorites} favorites</span>
        <span className="text-green-400">avg {stats.avgDuration}ms</span>
        <span className="text-blue-400">{stats.totalRows.toLocaleString()} rows</span>
      </div>

      {/* Search + Filters */}
      <div className="px-3 py-2 border-b border-ide-border space-y-2">
        <div className="flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search queries, tags, databases..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'success', 'error'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2 py-0.5 text-xs rounded ${filterStatus === s ? 'bg-amber-600 text-white' : 'text-ide-text-secondary hover:text-ide-text'}`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-2 py-0.5 text-xs rounded flex items-center gap-0.5 ${showFavoritesOnly ? 'bg-amber-600 text-white' : 'text-ide-text-secondary hover:text-ide-text'}`}
          >
            <Star size={10} className={showFavoritesOnly ? 'fill-white' : ''} />
            Favorites
          </button>
          <div className="flex-1" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-ide-bg-secondary border border-ide-border rounded px-1.5 py-0.5 text-xs"
          >
            <option value="recent">Recent</option>
            <option value="duration">Duration</option>
            <option value="rows">Rows</option>
          </select>
        </div>
      </div>

      {/* Query List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-secondary text-xs">No queries found</div>
        ) : (
          filtered.map(q => (
            <div
              key={q.id}
              onClick={() => setSelectedQuery(selectedQuery?.id === q.id ? null : q)}
              className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${
                selectedQuery?.id === q.id ? 'bg-ide-bg-secondary/20' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${q.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {q.status === 'success' ? '✓' : '✗'}
                </span>
                <span className="text-xs font-mono flex-1 truncate">{q.query.slice(0, 60)}...</span>
                <button
                  onClick={e => { e.stopPropagation(); toggleFavorite(q.id) }}
                  className="text-ide-text-secondary hover:text-amber-400"
                >
                  <Star size={10} className={q.isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-ide-text-secondary">
                <span>{q.database}</span>
                <span>{q.duration}ms</span>
                <span>{q.rowsAffected} rows</span>
                <span>{timeAgo(q.timestamp)}</span>
              </div>
              {selectedQuery?.id === q.id && (
                <div className="mt-2 space-y-1">
                  <pre className="bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {q.query}
                  </pre>
                  {q.errorMessage && (
                    <div className="text-xs text-red-400">{q.errorMessage}</div>
                  )}
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); copyQuery(q.id, q.query) }} className="px-2 py-0.5 bg-ide-bg-secondary rounded text-xs flex items-center gap-0.5">
                      {copiedId === q.id ? <Check size={8} className="text-green-400" /> : <Copy size={8} />}
                      Copy
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteQuery(q.id) }} className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-xs flex items-center gap-0.5">
                      <Trash2 size={8} /> Delete
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {q.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
