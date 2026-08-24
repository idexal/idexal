import React, { useMemo, useCallback } from 'react'

interface MinimapLine {
  text: string
  width: number
  tokens: { type: string; length: number }[]
}

interface MinimapProps {
  content: string
  totalLines: number
  viewportHeight: number
  scrollTop: number
  lineHeight?: number
  onNavigate?: (lineNumber: number) => void
  syntaxColors?: Record<string, string>
}

const DEFAULT_SYNTAX_COLORS: Record<string, string> = {
  keyword: '#c678dd',
  string: '#98c379',
  comment: '#5c6370',
  number: '#d19a66',
  function: '#61afef',
  type: '#e5c07b',
  variable: '#e06c75',
  operator: '#56b6c2',
  punctuation: '#abb2bf',
  default: '#abb2bf',
}

function tokenizeLine(text: string): { type: string; length: number }[] {
  const tokens: { type: string; length: number }[] = []
  let remaining = text
  
  while (remaining.length > 0) {
    // Comment
    if (remaining.startsWith('//') || remaining.startsWith('#') || remaining.startsWith('--')) {
      tokens.push({ type: 'comment', length: remaining.length })
      break
    }
    // String
    const stringMatch = remaining.match(/^(['"`])(.*?)(\1)/)
    if (stringMatch) {
      tokens.push({ type: 'string', length: stringMatch[0].length })
      remaining = remaining.slice(stringMatch[0].length)
      continue
    }
    // Keyword
    const kwMatch = remaining.match(/^(import|export|const|let|var|function|return|if|else|for|while|class|interface|type|enum|struct|fn|pub|use|mod|impl|async|await|try|catch|throw|new|this|self)\b/)
    if (kwMatch) {
      tokens.push({ type: 'keyword', length: kwMatch[0].length })
      remaining = remaining.slice(kwMatch[0].length)
      continue
    }
    // Number
    const numMatch = remaining.match(/^\b\d+\.?\d*\b/)
    if (numMatch) {
      tokens.push({ type: 'number', length: numMatch[0].length })
      remaining = remaining.slice(numMatch[0].length)
      continue
    }
    // Function call
    const fnMatch = remaining.match(/^\b([a-zA-Z_]\w*)\s*\(/)
    if (fnMatch) {
      tokens.push({ type: 'function', length: fnMatch[1].length })
      remaining = remaining.slice(fnMatch[1].length)
      continue
    }
    // Type (capitalized word)
    const typeMatch = remaining.match(/^\b([A-Z]\w*)\b/)
    if (typeMatch) {
      tokens.push({ type: 'type', length: typeMatch[0].length })
      remaining = remaining.slice(typeMatch[0].length)
      continue
    }
    // Default
    tokens.push({ type: 'default', length: 1 })
    remaining = remaining.slice(1)
  }
  
  return tokens
}

export default function Minimap({
  content,
  totalLines,
  viewportHeight,
  scrollTop,
  lineHeight = 4,
  onNavigate,
  syntaxColors = DEFAULT_SYNTAX_COLORS,
}: MinimapProps) {
  const SCALE = 0.4
  const CHAR_WIDTH = 1.2
  const MINIMAP_LINE_HEIGHT = lineHeight

  const lines = useMemo(() => {
    const rawLines = content.split('\n')
    return rawLines.map((text): MinimapLine => ({
      text,
      width: Math.min(text.length * CHAR_WIDTH, 120),
      tokens: tokenizeLine(text),
    }))
  }, [content])

  const viewportLines = useMemo(() => {
    const linesPerPixel = 1 / MINIMAP_LINE_HEIGHT
    const viewportLines = viewportHeight * linesPerPixel
    const startLine = Math.floor(scrollTop / MINIMAP_LINE_HEIGHT)
    return { startLine, viewportLines, totalHeight: totalLines * MINIMAP_LINE_HEIGHT }
  }, [totalLines, viewportHeight, scrollTop])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const lineNumber = Math.floor(y / MINIMAP_LINE_HEIGHT)
    onNavigate(Math.min(Math.max(lineNumber, 0), totalLines - 1))
  }, [onNavigate, totalLines])

  const viewportTop = (scrollTop / viewportLines.totalHeight) * viewportLines.totalHeight
  const viewportHeightPx = (viewportHeight / (totalLines * MINIMAP_LINE_HEIGHT)) * viewportLines.totalHeight

  return (
    <div
      className="minimap-container relative cursor-pointer overflow-hidden"
      onClick={handleClick}
      style={{ width: 120, height: '100%', background: 'rgba(0,0,0,0.1)' }}
    >
      {/* Viewport indicator */}
      <div
        className="absolute left-0 right-0 bg-white/5 border border-white/10"
        style={{
          top: Math.min(viewportTop, viewportLines.totalHeight - viewportHeightPx),
          height: Math.max(viewportHeightPx, 20),
          transition: 'top 0.1s ease-out',
        }}
      />

      {/* Lines */}
      <div className="minimap-lines" style={{ padding: '2px 4px' }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className="minimap-line"
            style={{
              height: MINIMAP_LINE_HEIGHT,
              display: 'flex',
              gap: 0,
            }}
          >
            {line.tokens.map((token, j) => (
              <div
                key={j}
                style={{
                  width: token.length * CHAR_WIDTH * SCALE,
                  height: MINIMAP_LINE_HEIGHT - 1,
                  backgroundColor: syntaxColors[token.type] || syntaxColors.default,
                  opacity: token.type === 'default' ? 0.4 : 0.7,
                  borderRadius: 0,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
