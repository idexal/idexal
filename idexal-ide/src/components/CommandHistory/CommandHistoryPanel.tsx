import React, { useState, useEffect, useMemo } from 'react'
import {
  FaClock, FaSearch, FaStar, FaTerminal, FaCodeBranch, FaBrain, FaBolt, FaTrash, FaCopy, FaFilter
} from '../Icon'
import { commandHistoryService, CommandEntry } from '../../services/commandHistoryService'

type SourceFilter = 'all' | 'terminal' | 'git' | 'ai' | 'task-runner'

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  terminal: <FaTerminal size={10} className="text-green-400" />,
  git: <FaCodeBranch size={10} className="text-orange-400" />,
  ai: <FaBrain size={10} className="text-purple-400" />,
  'task-runner': <FaBolt size={10} className="text-yellow-400" />,
  user: <FaTerminal size={10} className="text-blue-400" />,
}

const SOURCE_COLORS: Record<string, string> = {
  terminal: 'bg-green-500/20 text-green-400',
  git: 'bg-orange-500/20 text-orange-400',
  ai: 'bg-purple-500/20 text-purple-400',
  'task-runner': 'bg-yellow-500/20 text-yellow-400',
  user: 'bg-blue-500/20 text-blue-400',
}

export default function CommandHistoryPanel({ onClose }: { onClose?: () => void }) {
  const [history, setHistory] = useState<CommandEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<CommandEntry | null>(null)
  const [stats, setStats] = useState(commandHistoryService.getStats())

  useEffect(() => {
    const update = () => {
      setHistory(commandHistoryService.getAll())
      setStats(commandHistoryService.getStats())
    }
    update()
    const unsub = commandHistoryService.subscribe(update)
    return unsub
  }, [])

  const filtered = useMemo(() => {
    let result = history
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.command.toLowerCase().includes(q) ||
        e.args?.some(a => a.toLowerCase().includes(q))
      )
    }
    if (sourceFilter !== 'all') {
      result = result.filter(e => e.source === sourceFilter)
    }
    if (showFavoritesOnly) {
      result = result.filter(e => e.favorite)
    }
    return result
  }, [history, searchQuery, sourceFilter, showFavoritesOnly])

  const handleCopy = (entry: CommandEntry) => {
    const full = entry.args ? `${entry.command} ${entry.args.join(' ')}` : entry.command
    navigator.clipboard.writeText(full)
  }

  const handleCopyMostUsed = () => {
    const text = stats.mostUsed.map(m => `${m.count}x  ${m.command}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaClock size={14} className="text-cyan-400" />
          <span className="text-xs font-semibold">Command History</span>
          <span className="text-[9px] bg-ide-bg-secondary text-ide-text-secondary px-1.5 rounded">
            {stats.totalCommands} commands
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-ide-border text-ide-text-muted">
          <FaTrash size={12} />
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border/50 text-[9px]">
        {Object.entries(stats.bySource).map(([source, count]) => (
          <span key={source} className={`px-1.5 py-0.5 rounded ${SOURCE_COLORS[source] || 'bg-ide-bg-secondary text-ide-text-secondary'}`}>
            {count} {source}
          </span>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ide-border">
        <div className="flex-1 relative">
          <FaSearch size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-ide-text-muted" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full bg-ide-bg-secondary border border-ide-border rounded pl-6 pr-2 py-1 text-[10px] text-ide-text"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as SourceFilter)}
          className="bg-ide-bg-secondary border border-ide-border rounded px-1 py-1 text-[10px] text-ide-text"
        >
          <option value="all">All</option>
          <option value="terminal">Terminal</option>
          <option value="git">Git</option>
          <option value="ai">AI</option>
          <option value="task-runner">Tasks</option>
        </select>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`p-1 rounded ${showFavoritesOnly ? 'bg-yellow-500/20 text-yellow-400' : 'text-ide-text-muted hover:text-ide-text'}`}
        >
          <FaStar size={10} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Most Used */}
      {stats.mostUsed.length > 0 && !searchQuery && (
        <div className="px-3 py-2 border-b border-ide-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-ide-text-secondary font-medium">Most Used</span>
            <button onClick={handleCopyMostUsed} className="text-[9px] text-ide-text-muted hover:text-ide-text">
              Copy
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {stats.mostUsed.slice(0, 5).map((m, i) => (
              <span key={i} className="text-[9px] bg-ide-bg-secondary px-1.5 py-0.5 rounded font-mono">
                {m.count}× {m.command}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Command List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ide-text-muted text-[10px]">
            <FaClock size={24} className="mb-2 opacity-50" />
            <p>No commands found</p>
          </div>
        ) : (
          <div className="divide-y divide-ide-border/30">
            {filtered.map(entry => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                className={`px-3 py-2 cursor-pointer hover:bg-ide-bg-secondary/30 ${
                  selectedEntry?.id === entry.id ? 'bg-ide-bg-secondary/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1 py-0.5 rounded text-[8px] ${SOURCE_COLORS[entry.source]}`}>
                    {entry.source}
                  </span>
                  <span className="flex-1 text-[10px] font-mono text-ide-text truncate">
                    {entry.command} {entry.args?.join(' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {entry.exitCode !== undefined && (
                      <span className={`text-[8px] px-1 rounded ${
                        entry.exitCode === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.exitCode === 0 ? '✓' : `✗ ${entry.exitCode}`}
                      </span>
                    )}
                    {entry.duration && (
                      <span className="text-[8px] text-ide-text-secondary">
                        {formatDuration(entry.duration)}
                      </span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); commandHistoryService.toggleFavorite(entry.id) }}
                      className={`p-0.5 ${entry.favorite ? 'text-yellow-400' : 'text-ide-text-muted hover:text-yellow-400'}`}
                    >
                      <FaStar size={8} fill={entry.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleCopy(entry) }}
                      className="p-0.5 text-ide-text-muted hover:text-ide-text"
                    >
                      <FaCopy size={8} />
                    </button>
                  </div>
                </div>

                {selectedEntry?.id === entry.id && (
                  <div className="mt-2 text-[9px] text-ide-text-secondary space-y-1">
                    <div>Source: {entry.source}</div>
                    <div>Time: {new Date(entry.timestamp).toLocaleString()}</div>
                    {entry.cwd && <div>Directory: {entry.cwd}</div>}
                    {entry.output && (
                      <div className="mt-1 p-2 bg-ide-bg-secondary rounded font-mono text-ide-text max-h-20 overflow-y-auto">
                        {entry.output.slice(0, 200)}{entry.output.length > 200 ? '...' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
