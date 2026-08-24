import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Terminal, Search, Filter, Pause, Play, Trash2, Copy, Check,
  Download, ChevronDown, AlertCircle, AlertTriangle, Info, Bug,
  ArrowDown, Settings, Clock
} from 'lucide-react'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  source: string
  message: string
  metadata?: Record<string, unknown>
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-400',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  fatal: 'text-red-500 font-bold',
}

const LEVEL_BG: Record<LogLevel, string> = {
  debug: 'bg-gray-400/10',
  info: 'bg-blue-400/10',
  warn: 'bg-yellow-400/10',
  error: 'bg-red-400/10',
  fatal: 'bg-red-500/10',
}

const LEVEL_ICONS: Record<LogLevel, React.ElementType> = {
  debug: Bug,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
  fatal: AlertCircle,
}

const SOURCES = ['App', 'Server', 'Database', 'Auth', 'WebSocket', 'Agent', 'Compiler', 'Test']

function generateLog(): LogEntry {
  const levels: LogLevel[] = ['debug', 'info', 'info', 'info', 'warn', 'error']
  const messages = {
    debug: [
      'Cache hit for key "user_session_abc"',
      'WebSocket ping sent (12ms latency)',
      'Garbage collection completed in 45ms',
      'Query plan cache size: 128 entries',
    ],
    info: [
      'Server started on port 3000',
      'User authenticated: alice@example.com',
      'Database connection pool: 5/20 active',
      'Build completed successfully (4.2s)',
      'Agent orchestrator initialized with 8 agents',
      'Live Share session started',
      'Git branch switched to feature/new-api',
    ],
    warn: [
      'Memory usage at 78% (1.2GB)',
      'Slow query detected: 1250ms',
      'Rate limit approaching: 95/100 requests',
      'Deprecated API usage: /api/v1/users',
    ],
    error: [
      'Failed to connect to Redis: ECONNREFUSED',
      'WebSocket connection dropped: timeout',
      'Unhandled promise rejection in Auth.validate',
      'Build failed: TypeScript error in ChatPanel.tsx',
    ],
    fatal: [
      'FATAL: Process crashed: out of memory',
      'FATAL: Database connection pool exhausted',
      'FATAL: Unrecoverable disk I/O error',
    ],
  }

  const level = levels[Math.floor(Math.random() * levels.length)]
  const msgs = messages[level]
  const source = SOURCES[Math.floor(Math.random() * SOURCES.length)]

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    level,
    source,
    message: msgs[Math.floor(Math.random() * msgs.length)],
  }
}

const MOCK_INITIAL: LogEntry[] = Array.from({ length: 30 }, () => {
  const log = generateLog()
  log.timestamp = new Date(Date.now() - Math.random() * 300000)
  return log
}).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

export default function LogViewerPanel({ onClose }: { onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_INITIAL)
  const [isStreaming, setIsStreaming] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(['debug', 'info', 'warn', 'error', 'fatal']))
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set(SOURCES))
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [copied, setCopied] = useState(false)
  const [maxLogs, setMaxLogs] = useState(500)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isStreaming && !isPaused) {
      intervalRef.current = setInterval(() => {
        setLogs(prev => [...prev.slice(-maxLogs + 1), generateLog()])
      }, 500 + Math.random() * 1500)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isStreaming, isPaused, maxLogs])

  useEffect(() => {
    if (autoScroll) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (!levelFilter.has(log.level)) return false
      if (!sourceFilter.has(log.source)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return log.message.toLowerCase().includes(q) || log.source.toLowerCase().includes(q)
      }
      return true
    })
  }, [logs, levelFilter, sourceFilter, searchQuery])

  const stats = useMemo(() => ({
    total: logs.length,
    debug: logs.filter(l => l.level === 'debug').length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  }), [logs])

  const toggleLevel = (level: LogLevel) => {
    setLevelFilter(prev => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const clearLogs = () => { setLogs([]); setSelectedLog(null) }

  const exportLogs = () => {
    const text = filtered.map(l => `${l.timestamp.toISOString()} [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">Log Viewer</span>
          {isStreaming && !isPaused && <span className="text-xs text-green-400 animate-pulse">● Streaming</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded ${isPaused ? 'bg-yellow-600/20 text-yellow-400' : 'hover:bg-ide-bg-secondary text-ide-text-secondary'}`}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button onClick={clearLogs} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Clear">
            <Trash2 size={14} />
          </button>
          <button onClick={exportLogs} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Export">
            <Download size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{filtered.length} logs</span>
        <span className="text-gray-400">{stats.debug} debug</span>
        <span className="text-blue-400">{stats.info} info</span>
        <span className="text-yellow-400">{stats.warn} warn</span>
        <span className="text-red-400">{stats.error} error</span>
      </div>

      {/* Search + Filters */}
      <div className="px-3 py-2 border-b border-ide-border space-y-2">
        <div className="flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['debug', 'info', 'warn', 'error'] as LogLevel[]).map(level => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`px-2 py-0.5 text-xs rounded ${
                levelFilter.has(level) ? `${LEVEL_COLORS[level]} bg-ide-bg-secondary border border-ide-border` : 'text-ide-text-secondary'
              }`}
            >
              {level}
            </button>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-1 text-xs text-ide-text-secondary">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="accent-emerald-500" />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-secondary">No logs match filters</div>
        ) : (
          filtered.slice(-200).map(log => {
            const Icon = LEVEL_ICONS[log.level]
            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                className={`flex items-start gap-2 px-3 py-1 border-b border-ide-border/20 hover:bg-ide-bg-secondary/30 cursor-pointer ${
                  selectedLog?.id === log.id ? 'bg-ide-bg-secondary/30' : ''
                } ${LEVEL_BG[log.level]}`}
              >
                <span className="text-ide-text-secondary/60 w-20 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}.{String(log.timestamp.getMilliseconds()).padStart(3, '0')}
                </span>
                <Icon size={10} className={`${LEVEL_COLORS[log.level]} mt-0.5 flex-shrink-0`} />
                <span className="w-16 flex-shrink-0 text-ide-text-secondary">{log.source}</span>
                <span className="flex-1 text-ide-text break-all">{log.message}</span>
              </div>
            )
          })
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Selected Log Detail */}
      {selectedLog && (
        <div className="border-t border-ide-border px-3 py-2 bg-ide-bg-secondary/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ide-text-secondary">Log Detail</span>
            <button onClick={() => {
              navigator.clipboard?.writeText(selectedLog.message)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }} className="text-xs text-ide-text-secondary hover:text-ide-text">
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            </button>
          </div>
          <div className="text-xs text-ide-text">
            <span className={`${LEVEL_COLORS[selectedLog.level]} uppercase`}>[{selectedLog.level}]</span>{' '}
            <span className="text-ide-text-secondary">[{selectedLog.source}]</span>{' '}
            {selectedLog.message}
          </div>
          <div className="text-xs text-ide-text-secondary mt-1">
            {selectedLog.timestamp.toISOString()}
          </div>
        </div>
      )}
    </div>
  )
}
