import React, { useState, useCallback, useMemo } from 'react'
import {
  Database, X, Play, Table, ChevronDown, ChevronRight,
  Download, Copy, Check, Search, Trash2, Plus, Edit3
} from 'lucide-react'

interface DatabaseViewerProps {
  onClose?: () => void
}

type DBType = 'sqlite' | 'postgresql' | 'mysql'

interface TableInfo {
  name: string
  columns: { name: string; type: string; nullable: boolean; pk: boolean }[]
  rowCount: number
}

interface QueryResult {
  columns: string[]
  rows: any[][]
  time: number
  rowCount: number
}

const MOCK_TABLES: TableInfo[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, pk: true },
      { name: 'username', type: 'VARCHAR(50)', nullable: false, pk: false },
      { name: 'email', type: 'VARCHAR(100)', nullable: false, pk: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: true, pk: false },
      { name: 'role', type: 'VARCHAR(20)', nullable: true, pk: false },
    ],
    rowCount: 1247,
  },
  {
    name: 'posts',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, pk: true },
      { name: 'title', type: 'VARCHAR(200)', nullable: false, pk: false },
      { name: 'body', type: 'TEXT', nullable: true, pk: false },
      { name: 'author_id', type: 'INTEGER', nullable: false, pk: false },
      { name: 'published', type: 'BOOLEAN', nullable: true, pk: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: true, pk: false },
    ],
    rowCount: 8432,
  },
  {
    name: 'comments',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, pk: true },
      { name: 'post_id', type: 'INTEGER', nullable: false, pk: false },
      { name: 'user_id', type: 'INTEGER', nullable: false, pk: false },
      { name: 'content', type: 'TEXT', nullable: false, pk: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: true, pk: false },
    ],
    rowCount: 24531,
  },
  {
    name: 'tags',
    columns: [
      { name: 'id', type: 'INTEGER', nullable: false, pk: true },
      { name: 'name', type: 'VARCHAR(50)', nullable: false, pk: false },
      { name: 'slug', type: 'VARCHAR(50)', nullable: false, pk: false },
    ],
    rowCount: 156,
  },
]

const MOCK_QUERY_RESULTS: Record<string, QueryResult> = {
  'SELECT * FROM users LIMIT 5': {
    columns: ['id', 'username', 'email', 'created_at', 'role'],
    rows: [
      [1, 'admin', 'admin@idexal.dev', '2024-01-15 10:30:00', 'admin'],
      [2, 'john_doe', 'john@example.com', '2024-02-20 14:45:00', 'user'],
      [3, 'jane_smith', 'jane@company.com', '2024-03-10 09:15:00', 'editor'],
      [4, 'bob_wilson', 'bob@test.com', '2024-04-05 16:20:00', 'user'],
      [5, 'alice_jones', 'alice@dev.io', '2024-05-12 11:00:00', 'moderator'],
    ],
    time: 2,
    rowCount: 5,
  },
}

const MOCK_QUERY_RESULT_DEFAULT: QueryResult = {
  columns: ['result'],
  rows: [['Query executed successfully']],
  time: 1,
  rowCount: 1,
}

export default function DatabaseViewer({ onClose }: DatabaseViewerProps) {
  const [dbType, setDbType] = useState<DBType>('sqlite')
  const [connectionString, setConnectionString] = useState('./data.sqlite')
  const [connected, setConnected] = useState(true)
  const [tables, setTables] = useState<TableInfo[]>(MOCK_TABLES)
  const [selectedTable, setSelectedTable] = useState<string | null>('users')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['users']))
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 5')
  const [result, setResult] = useState<QueryResult | null>(MOCK_QUERY_RESULTS['SELECT * FROM users LIMIT 5'])
  const [loading, setLoading] = useState(false)
  const [resultTab, setResultTab] = useState<'result' | 'history'>('result')
  const [history, setHistory] = useState<{ query: string; time: number; rowCount: number }[]>([])
  const [copied, setCopied] = useState(false)

  const executeQuery = useCallback(async (sql?: string) => {
    const q = sql || query
    if (!q.trim()) return
    setLoading(true)

    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

    const mockResult = MOCK_QUERY_RESULTS[q] || {
      columns: ['affected_rows'],
      rows: [[Math.floor(Math.random() * 100)]],
      time: Math.floor(Math.random() * 50),
      rowCount: 1,
    }

    setResult(mockResult)
    setHistory(prev => [{ query: q, time: mockResult.time, rowCount: mockResult.rowCount }, ...prev].slice(0, 50))
    setLoading(false)
  }, [query])

  const toggleTable = (name: string) => {
    const next = new Set(expandedTables)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setExpandedTables(next)
    setSelectedTable(name)
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedTableInfo = tables.find(t => t.name === selectedTable)

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Database</span>
          {connected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              Connected
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tables */}
        <div className="w-52 border-r border-ide-border flex flex-col">
          {/* Connection */}
          <div className="p-2 border-b border-ide-border space-y-1">
            <select
              value={dbType}
              onChange={(e) => setDbType(e.target.value as DBType)}
              className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-[10px] text-ide-text focus:outline-none"
            >
              <option value="sqlite">SQLite</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
            </select>
            <input
              type="text"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="Connection string..."
              className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-[10px] text-ide-text font-mono focus:outline-none"
            />
            <button
              onClick={() => setConnected(!connected)}
              className={`w-full px-2 py-1 text-[10px] rounded transition-colors ${
                connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-ide-bg border border-ide-border text-ide-text-muted hover:text-ide-text'
              }`}
            >
              {connected ? '✓ Connected' : 'Connect'}
            </button>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-auto">
            <div className="px-2 py-1.5 text-[10px] text-ide-text-muted uppercase font-medium">
              Tables ({tables.length})
            </div>
            {tables.map(table => (
              <div key={table.name}>
                <button
                  onClick={() => toggleTable(table.name)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-ide-border/30 ${
                    selectedTable === table.name ? 'bg-ide-accent/10 text-ide-accent' : 'text-ide-text'
                  }`}
                >
                  {expandedTables.has(table.name) ? (
                    <ChevronDown className="w-3 h-3 text-ide-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-ide-text-muted flex-shrink-0" />
                  )}
                  <Table className="w-3 h-3 text-ide-warning flex-shrink-0" />
                  <span className="truncate">{table.name}</span>
                  <span className="text-[9px] text-ide-text-muted ml-auto">{table.rowCount.toLocaleString()}</span>
                </button>

                {expandedTables.has(table.name) && (
                  <div className="ml-6">
                    {table.columns.map(col => (
                      <div key={col.name} className="flex items-center gap-1 px-2 py-0.5 text-[10px]">
                        {col.pk && <span className="text-yellow-400 text-[8px]">🔑</span>}
                        <span className="text-ide-text font-mono">{col.name}</span>
                        <span className="text-ide-text-muted ml-auto">{col.type}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setQuery(`SELECT * FROM ${table.name} LIMIT 100`)
                        executeQuery(`SELECT * FROM ${table.name} LIMIT 100`)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-ide-accent hover:bg-ide-accent/10 rounded ml-2"
                    >
                      <Play className="w-2.5 h-2.5" /> Query
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Editor */}
          <div className="border-b border-ide-border">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] text-ide-text-muted uppercase font-medium">Query Editor</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(query)}
                  className="p-1 rounded hover:bg-ide-border text-ide-text-muted"
                  title="Copy query"
                >
                  {copied ? <Check className="w-3 h-3 text-ide-success" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => executeQuery()}
                  disabled={loading || !query.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] bg-ide-success text-white rounded hover:bg-ide-success/80 disabled:opacity-50"
                >
                  {loading ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3" />}
                  Run
                </button>
              </div>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  executeQuery()
                }
              }}
              placeholder="Enter SQL query..."
              className="w-full h-24 px-3 py-2 bg-ide-bg border-none text-xs text-ide-text font-mono focus:outline-none resize-none"
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Result Tabs */}
            <div className="flex border-b border-ide-border">
              <button
                onClick={() => setResultTab('result')}
                className={`px-3 py-1.5 text-[10px] transition-colors ${
                  resultTab === 'result' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
                }`}
              >
                Result {result && `(${result.rowCount} rows)`}
              </button>
              <button
                onClick={() => setResultTab('history')}
                className={`px-3 py-1.5 text-[10px] transition-colors ${
                  resultTab === 'history' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
                }`}
              >
                History ({history.length})
              </button>
            </div>

            {/* Result Content */}
            <div className="flex-1 overflow-auto">
              {resultTab === 'result' ? (
                result ? (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] text-ide-text-muted border-b border-ide-border">
                      {result.rowCount} rows · {result.time}ms
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-ide-surface border-b border-ide-border">
                            {result.columns.map((col, i) => (
                              <th key={i} className="px-3 py-2 text-left text-ide-text-muted font-medium whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, ri) => (
                            <tr key={ri} className="border-b border-ide-border/50 hover:bg-ide-border/20">
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-1.5 font-mono text-ide-text whitespace-nowrap">
                                  {cell === null ? <span className="text-ide-text-muted italic">NULL</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-ide-text-muted text-xs">
                    Run a query to see results
                  </div>
                )
              ) : (
                <div className="p-2 space-y-1">
                  {history.length === 0 ? (
                    <div className="text-center text-ide-text-muted text-xs py-8">No query history</div>
                  ) : (
                    history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(h.query); executeQuery(h.query) }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-ide-border/30 flex items-center gap-2 text-[10px]"
                      >
                        <Play className="w-2.5 h-2.5 text-ide-success flex-shrink-0" />
                        <span className="font-mono text-ide-text truncate flex-1">{h.query}</span>
                        <span className="text-ide-text-muted flex-shrink-0">{h.rowCount} rows · {h.time}ms</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
