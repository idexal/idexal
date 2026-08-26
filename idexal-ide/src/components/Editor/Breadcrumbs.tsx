import React, { useMemo } from 'react'
import {
  FaChevronRight, FaFileAlt, FaFolder
} from '../Icon'

interface BreadcrumbsProps {
  filePath?: string
  symbols?: Array<{ name: string; kind: string; line: number }>
  currentLine?: number
  onNavigate?: (path: string, line?: number) => void
}

export default function Breadcrumbs({ filePath, symbols = [], currentLine = 1, onNavigate }: BreadcrumbsProps) {
  const pathParts = useMemo(() => {
    if (!filePath) return []
    // Normalize path separators
    const normalized = filePath.replace(/\\/g, '/')
    return normalized.split('/').filter(Boolean)
  }, [filePath])

  const currentSymbol = useMemo(() => {
    if (!symbols.length || !currentLine) return null
    // Find the symbol closest to (but not after) the current line
    let found = null
    for (const sym of symbols) {
      if (sym.line <= currentLine) {
        found = sym
      } else {
        break
      }
    }
    return found
  }, [symbols, currentLine])

  if (!filePath) return null

  return (
    <div className="flex items-center gap-0.5 px-3 py-1 bg-ide-surface border-b border-ide-border text-[11px] overflow-x-auto whitespace-nowrap">
      {pathParts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <FaChevronRight className="w-3 h-3 text-ide-text-muted/40 flex-shrink-0" />}
          <button
            onClick={() => {
              const partialPath = pathParts.slice(0, i + 1).join('/')
              onNavigate?.(partialPath)
            }}
            className={`flex items-center gap-1 px-1 py-0.5 rounded hover:bg-ide-border/30 transition-colors ${
              i === pathParts.length - 1 ? 'text-ide-text font-medium' : 'text-ide-text-muted'
            }`}
          >
            {i === pathParts.length - 1 ? (
              <FaFileAlt className="w-3 h-3 flex-shrink-0" />
            ) : (
              <FaFolder className="w-3 h-3 flex-shrink-0" />
            )}
            {part}
          </button>
        </React.Fragment>
      ))}

      {currentSymbol && (
        <>
          <FaChevronRight className="w-3 h-3 text-ide-text-muted/40 flex-shrink-0" />
          <span className="flex items-center gap-1 px-1 py-0.5 text-ide-accent">
            <span className="text-[9px] opacity-60">{getSymbolIcon(currentSymbol.kind)}</span>
            {currentSymbol.name}
          </span>
        </>
      )}
    </div>
  )
}

function getSymbolIcon(kind: string): string {
  const icons: Record<string, string> = {
    function: 'ƒ',
    class: '◆',
    interface: '◇',
    type: '𝑡',
    enum: '⊡',
    constant: '▪',
    variable: '◇',
    struct: '◆',
    trait: '◇',
    method: 'ƒ',
    property: '•',
  }
  return icons[kind] || '•'
}
