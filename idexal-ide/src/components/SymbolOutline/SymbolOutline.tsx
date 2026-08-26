import React, { useState, useMemo } from 'react'
import {
  FaCode, FaTimes, FaChevronDown, FaChevronRight, FaSearch, FaFont, FaBox, FaCircle, FaGem, FaHashtag, FaTag, FaFileAlt, FaLayerGroup
} from '../Icon'
import { codeIntelligenceService, Symbol, SymbolKind } from '../../services/codeIntelligenceService'

interface SymbolOutlineProps {
  filePath?: string
  content?: string
  language?: string
  onNavigate?: (line: number, column: number) => void
  onClose?: () => void
}

const KIND_ICONS: Record<SymbolKind, React.ReactNode> = {
  file: <FaFileAlt className="w-3.5 h-3.5" />,
  module: <FaBox className="w-3.5 h-3.5" />,
  namespace: <FaLayerGroup className="w-3.5 h-3.5" />,
  package: <FaBox className="w-3.5 h-3.5" />,
  class: <FaBox className="w-3.5 h-3.5 text-ide-warning" />,
  method: <FaCode className="w-3.5 h-3.5 text-ide-accent" />,
  property: <FaTag className="w-3.5 h-3.5 text-ide-text-muted" />,
  field: <FaTag className="w-3.5 h-3.5 text-ide-text-muted" />,
  constructor: <FaGem className="w-3.5 h-3.5 text-ide-warning" />,
  enum: <FaCircle className="w-3.5 h-3.5 text-ide-success" />,
  interface: <FaFont className="w-3.5 h-3.5 text-purple-400" />,
  function: <FaCode className="w-3.5 h-3.5 text-blue-400" />,
  variable: <FaHashtag className="w-3.5 h-3.5 text-ide-text-muted" />,
  constant: <FaHashtag className="w-3.5 h-3.5 text-green-400" />,
  string: <FaHashtag className="w-3.5 h-3.5" />,
  number: <FaHashtag className="w-3.5 h-3.5" />,
  boolean: <FaHashtag className="w-3.5 h-3.5" />,
  array: <FaHashtag className="w-3.5 h-3.5" />,
  object: <FaHashtag className="w-3.5 h-3.5" />,
  typeParameter: <FaFont className="w-3.5 h-3.5 text-purple-400" />,
  type: <FaFont className="w-3.5 h-3.5 text-purple-400" />,
  parameter: <FaHashtag className="w-3.5 h-3.5 text-ide-text-muted" />,
  enumMember: <FaCircle className="w-3.5 h-3.5 text-ide-success" />,
  import: <FaBox className="w-3.5 h-3.5 text-ide-text-muted" />,
}

const KIND_LABELS: Record<SymbolKind, string> = {
  file: 'File',
  module: 'Module',
  namespace: 'Namespace',
  package: 'Package',
  class: 'Class',
  method: 'Method',
  property: 'Property',
  field: 'Field',
  constructor: 'Constructor',
  enum: 'Enum',
  interface: 'Interface',
  function: 'Function',
  variable: 'Variable',
  constant: 'Constant',
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  array: 'Array',
  object: 'Object',
  typeParameter: 'Type Parameter',
  type: 'Type',
  parameter: 'Parameter',
  enumMember: 'Enum Member',
  import: 'Import',
}

export type OutlineGroupBy = 'kind' | 'none'

export default function SymbolOutline({ filePath, content, language, onNavigate, onClose }: SymbolOutlineProps) {
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<OutlineGroupBy>('kind')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const symbols = useMemo(() => {
    if (!content || !language) return []
    return codeIntelligenceService.extractSymbols(content, language)
  }, [content, language])

  const filteredSymbols = useMemo(() => {
    if (!search) return symbols
    const q = search.toLowerCase()
    return symbols.filter(s => s.name.toLowerCase().includes(q))
  }, [symbols, search])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { 'All Symbols': filteredSymbols }
    const groups: Record<string, Symbol[]> = {}
    for (const sym of filteredSymbols) {
      const label = KIND_LABELS[sym.kind] || sym.kind
      if (!groups[label]) groups[label] = []
      groups[label].push(sym)
    }
    return groups
  }, [filteredSymbols, groupBy])

  const toggleGroup = (name: string) => {
    const next = new Set(expandedGroups)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setExpandedGroups(next)
  }

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(grouped)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const fileName = filePath?.split(/[\\/]/).pop() || 'No file open'

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Outline</span>
          <span className="text-xs text-ide-text-muted">{symbols.length} symbols</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <FaTimes className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* File Info */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2 text-xs text-ide-text-muted">
          <FaFileAlt className="w-3.5 h-3.5" />
          <span className="truncate">{fileName}</span>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="p-2 space-y-2 border-b border-ide-border">
        <div className="relative">
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full pl-8 pr-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as OutlineGroupBy)}
            className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-[11px] text-ide-text focus:outline-none"
          >
            <option value="kind">Group by Kind</option>
            <option value="none">No Grouping</option>
          </select>
          <button
            onClick={expandAll}
            className="px-2 py-1 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border rounded"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border rounded"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* Symbol Tree */}
      <div className="flex-1 overflow-auto">
        {symbols.length === 0 ? (
          <div className="p-4 text-center text-sm text-ide-text-muted">
            {content ? 'No symbols found in file' : 'Open a file to see symbols'}
          </div>
        ) : (
          <div className="py-1">
            {Object.entries(grouped).map(([groupName, groupSymbols]) => (
              <div key={groupName}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ide-border/30 text-left"
                >
                  {expandedGroups.has(groupName) || groupBy === 'none' ? (
                    <FaChevronDown className="w-3 h-3 text-ide-text-muted" />
                  ) : (
                    <FaChevronRight className="w-3 h-3 text-ide-text-muted" />
                  )}
                  <span className="text-[11px] font-medium text-ide-text-muted uppercase tracking-wide">
                    {groupName}
                  </span>
                  <span className="text-[10px] text-ide-text-muted ml-auto">{groupSymbols.length}</span>
                </button>

                {/* Symbols */}
                {(expandedGroups.has(groupName) || groupBy === 'none') && (
                  <div className="ml-2">
                    {groupSymbols.map((sym, i) => (
                      <button
                        key={`${sym.name}-${sym.line}-${i}`}
                        onClick={() => onNavigate?.(sym.line, sym.column)}
                        className="w-full flex items-center gap-2 px-3 py-1 ml-3 hover:bg-ide-accent/10 rounded text-left group"
                      >
                        <span className="flex-shrink-0">{KIND_ICONS[sym.kind]}</span>
                        <span className="text-xs text-ide-text truncate flex-1">{sym.name}</span>
                        <span className="text-[10px] text-ide-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                          L{sym.line}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-2 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-muted">
        <span>{filteredSymbols.length} of {symbols.length} symbols</span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-ide-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  )
}
