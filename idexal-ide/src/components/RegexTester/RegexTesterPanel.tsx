import React, { useState, useMemo, useCallback } from 'react'
import {
  FaTimes, FaCopy, FaCheck, FaExclamationTriangle, FaUndo, FaCode
} from '../Icon'

interface RegexTesterProps {
  onClose: () => void
}

const COMMON_PATTERNS = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g' },
  { name: 'URL', pattern: 'https?://[^\\s]+', flags: 'g' },
  { name: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', flags: 'g' },
  { name: 'IP Address', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', flags: 'g' },
  { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}', flags: 'g' },
  { name: 'Hex Color', pattern: '#[0-9a-fA-F]{6}\\b', flags: 'g' },
  { name: 'HTML Tag', pattern: '<([a-z]+)([^<]*)>(.*?)</\\1>', flags: 'gi' },
  { name: 'Word Boundary', pattern: '\\b\\w+\\b', flags: 'g' },
  { name: 'Digits Only', pattern: '^\\d+$', flags: 'gm' },
  { name: 'Whitespace', pattern: '\\s+', flags: 'g' },
  { name: 'JSON Key', pattern: '"([^"]+)"\\s*:', flags: 'g' },
  { name: 'Import Statement', pattern: 'import\\s+(?:\\{[^}]+\\}|\\w+)\\s+from\\s+[\'"][^\'"]+[\'"]', flags: 'g' },
]

export default function RegexTesterPanel({ onClose }: RegexTesterProps) {
  const [pattern, setPattern] = useState('\\b[A-Z]\\w*\\b')
  const [flags, setFlags] = useState('g')
  const [testString, setTestString] = useState(
    'The Quick Brown Fox Jumps Over The Lazy Dog.\nHello World! This is a Test String.\nTypeScript is a Typed Superset of JavaScript.'
  )
  const [copied, setCopied] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const result = useMemo(() => {
    try {
      const regex = new RegExp(pattern, flags)
      const matches: Array<{ match: string; index: number; groups: string[]; length: number }> = []
      let match: RegExpExecArray | null

      if (flags.includes('g')) {
        while ((match = regex.exec(testString)) !== null) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
            length: match[0].length,
          })
          if (match[0].length === 0) break // Prevent infinite loop
        }
      } else {
        match = regex.exec(testString)
        if (match) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
            length: match[0].length,
          })
        }
      }

      return { matches, error: null, matchCount: matches.length }
    } catch (e) {
      return { matches: [], error: (e as Error).message, matchCount: 0 }
    }
  }, [pattern, flags, testString])

  const highlightedText = useMemo(() => {
    if (result.error || result.matches.length === 0) return testString

    let html = ''
    let lastIndex = 0

    for (const m of result.matches) {
      // Add text before match
      html += escapeHtml(testString.slice(lastIndex, m.index))
      // Add highlighted match
      html += `<mark class="bg-yellow-500/30 text-yellow-200 px-0.5 rounded border border-yellow-500/40">${escapeHtml(m.match)}</mark>`
      lastIndex = m.index + m.length
    }
    html += escapeHtml(testString.slice(lastIndex))
    return html
  }, [testString, result])

  const copyPattern = useCallback(() => {
    navigator.clipboard.writeText(`/${pattern}/${flags}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [pattern, flags])

  const toggleFlag = (flag: string) => {
    setFlags(prev => prev.includes(flag) ? prev.replace(flag, '') : prev + flag)
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ide-text">Regex Tester</span>
          {result.error && <FaExclamationTriangle className="w-4 h-4 text-yellow-400" />}
          {result.matchCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
              {result.matchCount} match{result.matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyPattern} className="p-1 rounded hover:bg-ide-border" title="Copy regex">
            {copied ? <FaCheck className="w-3.5 h-3.5 text-green-400" /> : <FaCopy className="w-3.5 h-3.5 text-ide-text-muted" />}
          </button>
          <button onClick={() => setShowHelp(p => !p)} className="p-1 rounded hover:bg-ide-border" title="Reference">
            <FaCode className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Pattern Input */}
        <div className="px-4 py-3 border-b border-ide-border space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-ide-accent font-mono">/</span>
            <input
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              className={`flex-1 bg-ide-surface px-3 py-1.5 rounded text-sm font-mono text-ide-text border outline-none ${
                result.error ? 'border-red-500/50 focus:border-red-500' : 'border-ide-border focus:border-ide-accent'
              }`}
              placeholder="Regular expression..."
              spellCheck={false}
            />
            <span className="text-ide-accent font-mono">/</span>
            <span className="text-sm font-mono text-ide-accent">{flags}</span>
          </div>

          {/* Error */}
          {result.error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20">
              {result.error}
            </div>
          )}

          {/* Flags */}
          <div className="flex items-center gap-2">
            {['g', 'i', 'm', 's', 'u'].map(f => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className={`px-2 py-0.5 text-xs rounded font-mono border transition-colors ${
                  flags.includes(f)
                    ? 'bg-ide-accent/20 border-ide-accent/40 text-ide-accent'
                    : 'border-ide-border text-ide-text-muted hover:text-ide-text'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-[10px] text-ide-text-muted ml-2">
              {flags.includes('g') ? 'global' : ''} {flags.includes('i') ? 'insensitive' : ''} {flags.includes('m') ? 'multiline' : ''}
            </span>
          </div>
        </div>

        {/* Highlighted Output */}
        <div className="px-4 py-3 border-b border-ide-border">
          <div className="text-[10px] text-ide-text-muted mb-1">Highlighted Matches</div>
          <pre
            className="p-3 bg-ide-surface rounded text-xs font-mono text-ide-text whitespace-pre-wrap break-words leading-relaxed max-h-32 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: highlightedText }}
          />
        </div>

        {/* Test String */}
        <div className="px-4 py-3 flex-1 flex flex-col">
          <div className="text-[10px] text-ide-text-muted mb-1">Test String</div>
          <textarea
            value={testString}
            onChange={e => setTestString(e.target.value)}
            className="flex-1 p-3 bg-ide-surface rounded text-xs font-mono text-ide-text resize-none outline-none border border-ide-border focus:border-ide-accent"
            placeholder="Enter test string..."
            spellCheck={false}
          />
        </div>

        {/* Match Groups */}
        {result.matches.length > 0 && (
          <div className="px-4 py-3 border-t border-ide-border max-h-40 overflow-y-auto">
            <div className="text-[10px] text-ide-text-muted mb-2">Match Groups</div>
            <div className="space-y-1">
              {result.matches.map((m, i) => (
                <div key={i} className="flex items-start gap-3 text-xs font-mono">
                  <span className="text-ide-text-muted w-6">#{i + 1}</span>
                  <span className="text-yellow-400">"{m.match}"</span>
                  <span className="text-ide-text-muted">at {m.index}</span>
                  {m.groups.length > 0 && (
                    <span className="text-ide-text-muted">
                      groups: [{m.groups.map(g => `"${g}"`).join(', ')}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Patterns */}
        <div className="px-4 py-2 border-t border-ide-border">
          <div className="text-[10px] text-ide-text-muted mb-1.5">Quick Patterns</div>
          <div className="flex flex-wrap gap-1">
            {COMMON_PATTERNS.map(p => (
              <button
                key={p.name}
                onClick={() => { setPattern(p.pattern); setFlags(p.flags) }}
                className="px-2 py-0.5 text-[10px] bg-ide-surface border border-ide-border rounded hover:border-ide-accent/50 text-ide-text-muted hover:text-ide-text transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
