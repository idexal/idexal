import React, { useState, useMemo } from 'react'
import {
  FaTimes, FaCopy, FaCheck, FaChevronDown, FaChevronRight, FaCode, FaCompress, FaExpand, FaSearch
} from '../Icon'

interface JsonFormatterProps {
  onClose: () => void
}

export default function JsonFormatter({ onClose }: JsonFormatterProps) {
  const [input, setInput] = useState('{\n  "name": "Idexal IDE",\n  "version": "1.0.0",\n  "features": {\n    "editor": true,\n    "terminal": true,\n    "git": true,\n    "ai": {\n      "providers": ["openai", "anthropic", "ollama"],\n      "streaming": true\n    }\n  },\n  "stats": {\n    "files": 330,\n    "lines": 12450,\n    "tests": 169\n  },\n  "tags": ["ide", "ai", "rust", "typescript"]\n}')
  const [indent, setIndent] = useState(2)
  const [copied, setCopied] = useState(false)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']))
  const [view, setView] = useState<'formatted' | 'tree' | 'minified'>('formatted')
  const [search, setSearch] = useState('')

  const parsed = useMemo(() => {
    try {
      const obj = JSON.parse(input)
      return { data: obj, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  }, [input])

  const formatted = useMemo(() => {
    if (!parsed.data) return ''
    return JSON.stringify(parsed.data, null, indent)
  }, [parsed.data, indent])

  const minified = useMemo(() => {
    if (!parsed.data) return ''
    return JSON.stringify(parsed.data)
  }, [parsed.data])

  const copyOutput = () => {
    const text = view === 'minified' ? minified : formatted
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatInput = () => {
    if (parsed.data) {
      setInput(JSON.stringify(parsed.data, null, indent))
    }
  }

  const togglePath = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const expandAll = () => {
    const paths = new Set<string>([''])
    const collect = (obj: any, prefix: string) => {
      if (obj && typeof obj === 'object') {
        paths.add(prefix)
        Object.keys(obj).forEach(key => collect(obj[key], prefix ? `${prefix}.${key}` : key))
      }
    }
    collect(parsed.data, '')
    setExpandedPaths(paths)
  }

  const collapseAll = () => setExpandedPaths(new Set(['']))

  const jsonSize = new Blob([input]).size
  const jsonSizeDisplay = jsonSize > 1024 ? `${(jsonSize / 1024).toFixed(1)} KB` : `${jsonSize} B`

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">JSON Viewer</span>
          {parsed.data && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Valid</span>
          )}
          {parsed.error && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Invalid</span>
          )}
          <span className="text-[10px] text-ide-text-muted">{jsonSizeDisplay}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={formatInput} className="px-2 py-0.5 text-[10px] bg-ide-surface border border-ide-border rounded hover:border-ide-accent/50 text-ide-text-muted" title="Format">
            Format
          </button>
          <button onClick={copyOutput} className="p-1 rounded hover:bg-ide-border" title="Copy">
            {copied ? <FaCheck className="w-3.5 h-3.5 text-green-400" /> : <FaCopy className="w-3.5 h-3.5 text-ide-text-muted" />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* View tabs + indent */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-ide-border">
        <div className="flex gap-1">
          {(['formatted', 'tree', 'minified'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 text-[10px] rounded capitalize ${
                view === v ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {view === 'formatted' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-ide-text-muted">Indent:</span>
            {[2, 4, 8].map(n => (
              <button
                key={n}
                onClick={() => setIndent(n)}
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  indent === n ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input */}
        <div className="w-1/2 flex flex-col border-r border-ide-border">
          <div className="px-3 py-1 text-[10px] text-ide-text-muted bg-ide-surface/30 border-b border-ide-border">
            Input
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 p-3 bg-ide-bg text-xs font-mono text-ide-text resize-none outline-none"
            placeholder="Paste JSON here..."
            spellCheck={false}
          />
          {parsed.error && (
            <div className="px-3 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
              {parsed.error}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-1 text-[10px] text-ide-text-muted bg-ide-surface/30 border-b border-ide-border flex items-center justify-between">
            <span>{view === 'minified' ? 'Minified' : view === 'tree' ? 'Tree View' : 'Formatted'}</span>
            {view === 'tree' && (
              <div className="flex gap-1">
                <button onClick={expandAll} className="text-ide-accent hover:underline">Expand</button>
                <span className="text-ide-text-muted">|</span>
                <button onClick={collapseAll} className="text-ide-accent hover:underline">Collapse</button>
              </div>
            )}
          </div>

          {view === 'tree' ? (
            <div className="flex-1 overflow-auto p-3">
              {parsed.data ? (
                <TreeView data={parsed.data} path="" expandedPaths={expandedPaths} onToggle={togglePath} search={search} />
              ) : (
                <div className="text-xs text-ide-text-muted">Invalid JSON</div>
              )}
            </div>
          ) : (
            <pre className="flex-1 p-3 text-xs font-mono overflow-auto leading-relaxed">
              {view === 'minified' ? (
                <code className="text-ide-text">{minified}</code>
              ) : (
                <code dangerouslySetInnerHTML={{
                  __html: highlightJson(formatted)
                }} />
              )}
            </pre>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-t border-ide-border flex items-center gap-2">
        <FaSearch className="w-3.5 h-3.5 text-ide-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter keys..."
          className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-muted/50"
        />
      </div>
    </div>
  )
}

function TreeView({ data, path, expandedPaths, onToggle, search }: {
  data: any
  path: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  search: string
}) {
  if (data === null || data === undefined) {
    return <span className="text-gray-400">null</span>
  }

  if (typeof data !== 'object') {
    const color = typeof data === 'string' ? 'text-green-400' :
                  typeof data === 'number' ? 'text-blue-400' :
                  typeof data === 'boolean' ? 'text-purple-400' : 'text-ide-text'
    return <span className={color}>{JSON.stringify(data)}</span>
  }

  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [i.toString(), v]) : Object.entries(data)
  const isExpanded = expandedPaths.has(path)

  const filteredEntries = search
    ? entries.filter(([key, val]) =>
        key.toLowerCase().includes(search.toLowerCase()) ||
        (typeof val === 'string' && val.toLowerCase().includes(search.toLowerCase()))
      )
    : entries

  if (filteredEntries.length === 0 && search) {
    return <span className="text-ide-text-muted text-xs italic">No matches</span>
  }

  return (
    <div className="ml-2">
      <button
        onClick={() => onToggle(path)}
        className="flex items-center gap-1 text-xs hover:bg-ide-surface/50 rounded px-1"
      >
        {isExpanded ? <FaChevronDown className="w-3 h-3 text-ide-text-muted" /> : <FaChevronRight className="w-3 h-3 text-ide-text-muted" />}
        <span className="text-ide-text-muted">{isArray ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </button>
      {isExpanded && (
        <div className="ml-3 border-l border-ide-border/30 pl-2">
          {filteredEntries.map(([key, val]) => (
            <div key={key} className="py-0.5">
              <span className="text-xs">
                {!isArray && <span className="text-ide-accent font-mono">"{key}"</span>}
                {!isArray && <span className="text-ide-text-muted">: </span>}
                {typeof val === 'object' && val !== null ? (
                  <TreeView data={val} path={path ? `${path}.${key}` : key} expandedPaths={expandedPaths} onToggle={onToggle} search={search} />
                ) : (
                  <span className={typeof val === 'string' ? 'text-green-400' : typeof val === 'number' ? 'text-blue-400' : 'text-purple-400'}>
                    {val === null ? 'null' : typeof val === 'string' ? `"${val}"` : String(val)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function highlightJson(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="text-blue-400">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-purple-400">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-gray-400">$1</span>')
}
