import React, { useState, useMemo, useCallback } from 'react'
import {
  Braces, X, Copy, Check, Minimize2, Maximize2,
  Search, ChevronDown, ChevronRight, TreePine
} from 'lucide-react'

interface JSONViewerProps {
  content?: string
  onClose?: () => void
}

interface TreeNodeProps {
  keyName: string | null
  value: any
  depth: number
  path: string
  searchQuery: string
  defaultExpanded?: boolean
}

function TreeNode({ keyName, value, depth, path, searchQuery, defaultExpanded }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2 || defaultExpanded || false)
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value)
  const isArray = Array.isArray(value)
  const isExpandable = isObject || isArray

  const entries = useMemo(() => {
    if (isArray) return value.map((v: any, i: number) => ({ key: String(i), value: v }))
    if (isObject) return Object.entries(value).map(([k, v]) => ({ key: k, value: v }))
    return []
  }, [value, isArray, isObject])

  const highlighted = useMemo(() => {
    if (!searchQuery || !keyName) return false
    return keyName.toLowerCase().includes(searchQuery.toLowerCase())
  }, [keyName, searchQuery])

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-gray-400">null</span>
    if (val === undefined) return <span className="text-gray-400">undefined</span>
    if (typeof val === 'string') return <span className="text-green-400">"{val}"</span>
    if (typeof val === 'number') return <span className="text-blue-400">{val}</span>
    if (typeof val === 'boolean') return <span className="text-purple-400">{val.toString()}</span>
    return <span className="text-ide-text-muted">{String(val)}</span>
  }

  return (
    <div className={`${highlighted ? 'bg-ide-accent/10 rounded' : ''}`}>
      <div
        className="flex items-center gap-1 py-0.5 px-1 hover:bg-ide-border/30 rounded cursor-pointer group"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        {isExpandable ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-ide-text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-ide-text-muted flex-shrink-0" />
          )
        ) : (
          <span className="w-3 h-3 flex-shrink-0" />
        )}

        {keyName !== null && (
          <>
            <span className="text-ide-accent font-mono text-xs">{keyName}</span>
            <span className="text-ide-text-muted text-xs">:</span>
          </>
        )}

        {isExpandable ? (
          <span className="text-ide-text-muted text-xs">
            {isArray ? `[${value.length}]` : `{${Object.keys(value).length}}`}
          </span>
        ) : (
          renderValue(value)
        )}
      </div>

      {isExpandable && expanded && (
        <div>
          {entries.map(({ key, value: val }) => (
            <TreeNode
              key={`${path}.${key}`}
              keyName={isArray ? null : key}
              value={val}
              depth={depth + 1}
              path={`${path}.${key}`}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function JSONViewerPanel({ content, onClose }: JSONViewerProps) {
  const [input, setInput] = useState(content || '')
  const [viewMode, setViewMode] = useState<'tree' | 'text' | 'table'>('tree')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(() => {
    if (!input.trim()) return null
    try {
      setError(null)
      return JSON.parse(input)
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [input])

  const formatted = useMemo(() => {
    if (!parsed) return ''
    return JSON.stringify(parsed, null, 2)
  }, [parsed])

  const minified = useMemo(() => {
    if (!parsed) return ''
    return JSON.stringify(parsed)
  }, [parsed])

  const stats = useMemo(() => {
    if (!parsed) return { keys: 0, depth: 0, size: 0 }
    const count = (obj: any, d = 0): { keys: number; depth: number } => {
      if (obj === null || typeof obj !== 'object') return { keys: 0, depth: d }
      const entries = Array.isArray(obj) ? obj.map((v, i) => [String(i), v]) : Object.entries(obj)
      let keys = entries.length
      let maxDepth = d
      for (const [, val] of entries) {
        const sub = count(val, d + 1)
        keys += sub.keys
        maxDepth = Math.max(maxDepth, sub.depth)
      }
      return { keys, depth: maxDepth }
    }
    const result = count(parsed)
    return { keys: result.keys, depth: result.depth, size: new Blob([JSON.stringify(parsed)]).size }
  }, [parsed])

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Braces className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">JSON Viewer</span>
          {parsed && (
            <span className="text-[10px] text-ide-text-muted">
              {stats.keys} keys · depth {stats.depth} · {formatSize(stats.size)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['tree', 'text', 'table'] as const).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                viewMode === v ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
              }`}
            >
              {v}
            </button>
          ))}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-b border-ide-border">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste JSON here..."
          className="w-full h-24 px-3 py-2 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent resize-none"
        />
        {error && (
          <div className="mt-2 text-xs text-ide-error">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {!input.trim() ? (
          <div className="flex items-center justify-center h-full text-ide-text-muted">
            <div className="text-center">
              <Braces className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div className="text-sm">Paste JSON to view</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-ide-text-muted">
            <div className="text-center">
              <div className="text-sm text-ide-error">Invalid JSON</div>
              <div className="text-xs mt-1">{error}</div>
            </div>
          </div>
        ) : viewMode === 'tree' ? (
          <div className="font-mono text-xs">
            <TreeNode keyName={null} value={parsed} depth={0} path="$" searchQuery={searchQuery} defaultExpanded />
          </div>
        ) : viewMode === 'text' ? (
          <div className="relative">
            <div className="absolute top-1 right-1 flex gap-1 z-10">
              <button
                onClick={() => handleCopy(formatted)}
                className="p-1 rounded bg-ide-surface border border-ide-border hover:bg-ide-border text-ide-text-muted"
                title="Copy formatted"
              >
                {copied ? <Check className="w-3 h-3 text-ide-success" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <pre className="text-xs font-mono text-ide-text whitespace-pre-wrap bg-ide-bg rounded p-3 border border-ide-border">
              {formatted}
            </pre>
          </div>
        ) : (
          // Table view for arrays of objects
          <div className="overflow-auto">
            {Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' ? (
              <table className="w-full text-xs border border-ide-border">
                <thead>
                  <tr className="bg-ide-surface">
                    {Object.keys(parsed[0]).map(key => (
                      <th key={key} className="px-2 py-1 border-b border-ide-border text-left text-ide-text-muted font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i} className="hover:bg-ide-border/30">
                      {Object.keys(parsed[0]).map(key => (
                        <td key={key} className="px-2 py-1 border-b border-ide-border font-mono text-ide-text truncate max-w-[200px]">
                          {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-ide-text-muted text-sm py-8">
                Table view requires an array of objects
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-ide-border flex items-center gap-2">
        <button
          onClick={() => setInput(formatted)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text"
        >
          <Maximize2 className="w-3 h-3" /> Format
        </button>
        <button
          onClick={() => setInput(minified)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text"
        >
          <Minimize2 className="w-3 h-3" /> Minify
        </button>
        <button
          onClick={() => handleCopy(formatted)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text"
        >
          {copied ? <Check className="w-3 h-3 text-ide-success" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ide-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys..."
            className="pl-6 pr-2 py-1 bg-ide-bg border border-ide-border rounded text-[10px] text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent w-32"
          />
        </div>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
