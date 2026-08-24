import React, { useState, useCallback } from 'react'
import {
  Search, X, ChevronDown, ChevronRight, FileText, Replace,
  Regex, CaseSensitive, WholeWord, Folder
} from 'lucide-react'

interface SearchResult {
  file: string
  matches: MatchResult[]
}

interface MatchResult {
  line: number
  column: number
  content: string
  preview: string
}

interface SearchPanelProps {
  onClose: () => void
}

export default function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [includePattern, setIncludePattern] = useState('')
  const [excludePattern, setExcludePattern] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    // Simulated search results
    const simulatedResults: SearchResult[] = [
      {
        file: 'src/App.tsx',
        matches: [
          { line: 5, column: 10, content: `import { ${query} } from '...'`, preview: `...import { ${query} } from './stores/...'` },
          { line: 42, column: 5, content: `const ${query} = useStore()`, preview: `...const ${query} = useStore()...` },
        ],
      },
      {
        file: 'src/hooks/useAgent.ts',
        matches: [
          { line: 12, column: 8, content: `function ${query}()`, preview: `...function ${query}() {` },
        ],
      },
      {
        file: 'src/stores/agentStore.ts',
        matches: [
          { line: 28, column: 3, content: `${query}: string`, preview: `...${query}: string...` },
          { line: 45, column: 6, content: `this.${query} = value`, preview: `...this.${query} = value...` },
        ],
      },
    ]

    setResults(simulatedResults)
    setExpandedFiles(new Set(simulatedResults.map(r => r.file)))
  }, [query])

  const toggleFile = (file: string) => {
    const next = new Set(expandedFiles)
    if (next.has(file)) next.delete(file)
    else next.add(file)
    setExpandedFiles(next)
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Search</span>
          {totalMatches > 0 && (
            <span className="text-xs text-ide-text-muted">{totalMatches} results</span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 space-y-2 border-b border-ide-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ide-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search..."
              className="w-full pl-8 pr-20 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setUseRegex(!useRegex)}
                className={`p-1 rounded ${useRegex ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:text-ide-text'}`}
                title="Regex"
              >
                <Regex className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`p-1 rounded ${caseSensitive ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:text-ide-text'}`}
                title="Case Sensitive"
              >
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setWholeWord(!wholeWord)}
                className={`p-1 rounded ${wholeWord ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:text-ide-text'}`}
                title="Whole Word"
              >
                <WholeWord className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-2 rounded ${showReplace ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:bg-ide-border'}`}
            title="Replace"
          >
            <Replace className="w-4 h-4" />
          </button>
        </div>

        {showReplace && (
          <div className="flex gap-2">
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace..."
              className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
            <button className="px-3 py-1.5 text-xs bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text">
              Replace
            </button>
            <button className="px-3 py-1.5 text-xs bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text">
              All
            </button>
          </div>
        )}

        {/* Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-ide-text-muted hover:text-ide-text"
        >
          {showFilters ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Filters
        </button>

        {showFilters && (
          <div className="space-y-2">
            <input
              type="text"
              value={includePattern}
              onChange={(e) => setIncludePattern(e.target.value)}
              placeholder="Include files: *.ts, *.tsx"
              className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
            <input
              type="text"
              value={excludePattern}
              onChange={(e) => setExcludePattern(e.target.value)}
              placeholder="Exclude files: node_modules, dist"
              className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="p-4 text-center text-sm text-ide-text-muted">
            {query ? 'No results found' : 'Type to search'}
          </div>
        ) : (
          <div className="py-1">
            {results.map((result) => (
              <div key={result.file}>
                {/* File Header */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-ide-border/30 cursor-pointer"
                  onClick={() => toggleFile(result.file)}
                >
                  {expandedFiles.has(result.file) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-ide-text-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-ide-text-muted" />
                  )}
                  <FileText className="w-3.5 h-3.5 text-ide-text-muted" />
                  <span className="text-sm text-ide-text flex-1 truncate">{result.file}</span>
                  <span className="text-xs text-ide-text-muted">{result.matches.length}</span>
                </div>

                {/* Matches */}
                {expandedFiles.has(result.file) && (
                  <div className="ml-6">
                    {result.matches.map((match, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1 hover:bg-ide-border/30 cursor-pointer text-xs"
                        onClick={() => setSelectedMatch(`${result.file}:${match.line}`)}
                      >
                        <span className="text-ide-text-muted w-8 text-right">{match.line}</span>
                        <span className="text-ide-text-muted w-6 text-right">{match.column}</span>
                        <span className="flex-1 text-ide-text font-mono truncate">{match.preview}</span>
                      </div>
                    ))}
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
