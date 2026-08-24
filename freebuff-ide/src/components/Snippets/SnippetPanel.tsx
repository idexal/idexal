import React, { useState, useMemo } from 'react'
import { snippetService, Snippet } from '../../services/snippetService'
import { Code, Search, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface SnippetPanelProps {
  onInsert?: (code: string) => void
}

export default function SnippetPanel({ onInsert }: SnippetPanelProps) {
  const [search, setSearch] = useState('')
  const [expandedLangs, setExpandedLangs] = useState<Set<string>>(new Set(['typescript']))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const allSnippets = snippetService.getAll()

  const filteredSnippets = useMemo(() => {
    if (!search) return allSnippets
    return snippetService.search(search)
  }, [search, allSnippets])

  const grouped = useMemo(() => {
    return filteredSnippets.reduce((acc, snippet) => {
      if (!acc[snippet.language]) acc[snippet.language] = []
      acc[snippet.language].push(snippet)
      return acc
    }, {} as Record<string, Snippet[]>)
  }, [filteredSnippets])

  const toggleLang = (lang: string) => {
    const next = new Set(expandedLangs)
    if (next.has(lang)) next.delete(lang)
    else next.add(lang)
    setExpandedLangs(next)
  }

  const handleCopy = async (snippet: Snippet) => {
    await navigator.clipboard.writeText(snippet.body)
    setCopiedId(snippet.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleInsert = (snippet: Snippet) => {
    onInsert?.(snippet.body)
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ide-border">
        <div className="flex items-center gap-2 mb-2">
          <Code className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Snippets</span>
          <span className="text-xs text-ide-text-muted ml-auto">{filteredSnippets.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="w-full pl-8 pr-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
        </div>
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-auto">
        {Object.entries(grouped).map(([lang, snippets]) => (
          <div key={lang}>
            <button
              onClick={() => toggleLang(lang)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-ide-border/30 text-left"
            >
              {expandedLangs.has(lang) ? (
                <ChevronDown className="w-3 h-3 text-ide-text-muted" />
              ) : (
                <ChevronRight className="w-3 h-3 text-ide-text-muted" />
              )}
              <span className="text-xs font-medium text-ide-text-muted uppercase">{lang}</span>
              <span className="text-xs text-ide-text-muted ml-auto">{snippets.length}</span>
            </button>

            {expandedLangs.has(lang) && (
              <div className="pb-2">
                {snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="mx-2 mb-1 p-2 rounded bg-ide-bg border border-ide-border hover:border-ide-accent/30 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ide-text truncate">{snippet.name}</div>
                        <div className="text-[10px] text-ide-text-muted truncate">{snippet.description}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopy(snippet) }}
                          className="p-1 rounded hover:bg-ide-border"
                          title="Copy"
                        >
                          {copiedId === snippet.id ? (
                            <Check className="w-3 h-3 text-ide-success" />
                          ) : (
                            <Copy className="w-3 h-3 text-ide-text-muted" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 text-[9px] bg-ide-surface rounded border border-ide-border text-ide-accent font-mono">
                        {snippet.prefix}
                      </kbd>
                      <span className="text-[9px] text-ide-text-muted">prefix</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
