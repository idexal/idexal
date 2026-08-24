import React, { useState, useMemo } from 'react'
import { X, Copy, Check, TestTube, AlertTriangle } from 'lucide-react'

interface RegexTesterProps {
  onClose?: () => void
}

interface MatchResult {
  index: number
  match: string
  groups?: string[]
}

export default function RegexTesterPanel({ onClose }: RegexTesterProps) {
  const [pattern, setPattern] = useState('([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)\\.([a-zA-Z]{2,})')
  const [flags, setFlags] = useState('g')
  const [testString, setTestString] = useState(`Contact us at:
  - john.doe@example.com
  - jane+test@company.co.uk
  - invalid-email@
  - support@idexal.dev
  - admin@192.168.1.1`)
  const [copied, setCopied] = useState(false)

  const regexResult = useMemo(() => {
    if (!pattern) return { matches: [], error: null, executionTime: 0 }

    const start = performance.now()
    try {
      const regex = new RegExp(pattern, flags)
      const matches: MatchResult[] = []
      let match: RegExpExecArray | null

      if (flags.includes('g')) {
        while ((match = regex.exec(testString)) !== null) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
          })
          // Prevent infinite loop
          if (match[0].length === 0) regex.lastIndex++
        }
      } else {
        match = regex.exec(testString)
        if (match) {
          matches.push({
            index: match.index,
            match: match[0],
            groups: match.slice(1),
          })
        }
      }

      const executionTime = performance.now() - start
      return { matches, error: null, executionTime }
    } catch (e: any) {
      return { matches: [], error: e.message, executionTime: 0 }
    }
  }, [pattern, flags, testString])

  const highlightedText = useMemo(() => {
    if (regexResult.error || !pattern) return testString

    try {
      const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')
      const parts: { text: string; isMatch: boolean }[] = []
      let lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = regex.exec(testString)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ text: testString.slice(lastIndex, match.index), isMatch: false })
        }
        parts.push({ text: match[0], isMatch: true })
        lastIndex = match.index + match[0].length
        if (match[0].length === 0) regex.lastIndex++
      }

      if (lastIndex < testString.length) {
        parts.push({ text: testString.slice(lastIndex), isMatch: false })
      }

      return parts
    } catch {
      return testString
    }
  }, [testString, pattern, flags, regexResult.error])

  const flagOptions = [
    { flag: 'g', label: 'Global', desc: 'Find all matches' },
    { flag: 'i', label: 'Case Insensitive', desc: 'Case-insensitive matching' },
    { flag: 'm', label: 'Multiline', desc: '^ and $ match line boundaries' },
    { flag: 's', label: 'DotAll', desc: '. matches newlines' },
    { flag: 'u', label: 'Unicode', desc: 'Enable Unicode features' },
  ]

  const commonPatterns = [
    { label: 'Email', pattern: '[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z]{2,}' },
    { label: 'URL', pattern: 'https?://[\\w\\-]+(\\.[\\w\\-]+)+[/\\w\\-.~:/?#[\\]@!$&\'()*+,;=%]*' },
    { label: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}' },
    { label: 'IP Address', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' },
    { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])' },
    { label: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b' },
    { label: 'HTML Tag', pattern: '<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>(.*?)</\\1>' },
    { label: 'Username', pattern: '^[a-zA-Z0-9_-]{3,16}$' },
  ]

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Regex Tester</span>
          <span className="text-[10px] text-ide-text-muted">
            {regexResult.matches.length} match{regexResult.matches.length !== 1 ? 'es' : ''}
            {' · '}
            {regexResult.executionTime.toFixed(2)}ms
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Pattern Input */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-medium text-ide-text-muted">Pattern</label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ide-accent font-mono text-sm">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
            <span className="text-ide-accent font-mono text-sm">/</span>
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-16 px-2 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-accent font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
            />
          </div>
          {regexResult.error && (
            <div className="mt-2 flex items-center gap-1 text-xs text-ide-error">
              <AlertTriangle className="w-3 h-3" />
              {regexResult.error}
            </div>
          )}
        </div>

        {/* Flags */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            {flagOptions.map(f => (
              <button
                key={f.flag}
                onClick={() => setFlags(prev => prev.includes(f.flag) ? prev.replace(f.flag, '') : prev + f.flag)}
                className={`px-2 py-1 text-[10px] rounded font-mono transition-colors ${
                  flags.includes(f.flag)
                    ? 'bg-ide-accent/20 text-ide-accent border border-ide-accent/30'
                    : 'text-ide-text-muted border border-ide-border hover:text-ide-text'
                }`}
                title={f.desc}
              >
                {f.flag}
              </button>
            ))}
          </div>
        </div>

        {/* Common Patterns */}
        <div>
          <div className="text-[10px] text-ide-text-muted uppercase mb-1">Quick Patterns</div>
          <div className="flex flex-wrap gap-1">
            {commonPatterns.map(p => (
              <button
                key={p.label}
                onClick={() => setPattern(p.pattern)}
                className="px-2 py-1 text-[10px] bg-ide-bg border border-ide-border rounded hover:border-ide-accent/50 text-ide-text-muted hover:text-ide-text"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test String */}
        <div>
          <label className="text-xs font-medium text-ide-text-muted mb-2 block">Test String</label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent resize-none"
          />
        </div>

        {/* Highlighted Results */}
        <div>
          <label className="text-xs font-medium text-ide-text-muted mb-2 block">Highlighted Matches</label>
          <div className="px-3 py-2 bg-ide-bg border border-ide-border rounded text-xs font-mono whitespace-pre-wrap min-h-[60px]">
            {typeof highlightedText === 'string' ? (
              <span className="text-ide-text">{highlightedText}</span>
            ) : (
              highlightedText.map((part, i) =>
                part.isMatch ? (
                  <span key={i} className="bg-yellow-400/30 text-yellow-200 underline decoration-yellow-400/50">{part.text}</span>
                ) : (
                  <span key={i} className="text-ide-text">{part.text}</span>
                )
              )
            )}
          </div>
        </div>

        {/* Match Details */}
        <div>
          <label className="text-xs font-medium text-ide-text-muted mb-2 block">
            Match Details ({regexResult.matches.length})
          </label>
          {regexResult.matches.length === 0 ? (
            <div className="text-xs text-ide-text-muted py-4 text-center">No matches found</div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-auto">
              {regexResult.matches.map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs">
                  <span className="text-ide-text-muted w-6 text-right">#{i + 1}</span>
                  <span className="text-ide-warning font-mono">"{m.match}"</span>
                  <span className="text-ide-text-muted">at index {m.index}</span>
                  {m.groups && m.groups.length > 0 && (
                    <span className="text-ide-accent ml-auto">
                      Groups: {m.groups.map((g, gi) => (
                        <span key={gi} className="ml-1 px-1 bg-ide-accent/10 rounded">({gi + 1}: {g})</span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
