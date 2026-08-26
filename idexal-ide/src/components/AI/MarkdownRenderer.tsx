import React, { useState } from 'react'
import {
  FaCopy, FaCheck, FaExternalLinkAlt, FaFileCode
} from '../Icon'

interface MarkdownRendererProps {
  content: string
  onApplyCode?: (filePath: string, content: string) => void
}

interface CodeBlockProps {
  language: string
  filename?: string
  children: string
  onApply?: () => void
}

export default function MarkdownRenderer({ content, onApplyCode }: MarkdownRendererProps) {
  // Parse markdown content
  const parts = parseMarkdown(content)

  return (
    <div className="markdown-content text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language || 'text'}
              filename={part.filename}
              onApply={onApplyCode && part.filename ? () => onApplyCode(part.filename!, part.content) : undefined}
            >
              {part.content}
            </CodeBlock>
          )
        }
        if (part.type === 'heading') {
          const Tag = `h${part.level || 2}` as keyof JSX.IntrinsicElements
          return <Tag key={index} className={`font-bold text-ide-text ${part.level === 1 ? 'text-lg mb-3' : part.level === 2 ? 'text-base mb-2 mt-4' : 'text-sm mb-2 mt-3'}`}>{part.content}</Tag>
        }
        if (part.type === 'list') {
          return (
            <ul key={index} className="list-disc list-inside space-y-1 text-ide-text my-2">
              {part.items?.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineCode(item) }} />
              ))}
            </ul>
          )
        }
        if (part.type === 'bold') {
          return <strong key={index} className="font-semibold text-ide-text">{part.content}</strong>
        }
        if (part.type === 'divider') {
          return <hr key={index} className="my-3 border-ide-border" />
        }
        if (part.type === 'inline-code') {
          return <code key={index} className="px-1.5 py-0.5 bg-ide-bg rounded text-ide-accent font-mono text-xs">{part.content}</code>
        }
        return (
          <p key={index} className="text-ide-text my-2" dangerouslySetInnerHTML={{ __html: formatInlineCode(part.content || '') }} />
        )
      })}
    </div>
  )
}

function CodeBlock({ language, filename, children, onApply }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg border border-ide-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-ide-surface border-b border-ide-border">
        <div className="flex items-center gap-2 text-xs text-ide-text-muted">
          <FaFileCode className="w-3.5 h-3.5" />
          {filename && <span className="font-mono">{filename}</span>}
          <span className="px-1.5 py-0.5 bg-ide-bg rounded text-ide-accent">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          {onApply && (
            <button
              onClick={onApply}
              className="flex items-center gap-1 px-2 py-1 text-xs text-ide-success hover:bg-ide-success/10 rounded transition-colors"
            >
              <FaExternalLinkAlt className="w-3 h-3" />
              Apply
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-ide-text-muted hover:bg-ide-border rounded transition-colors"
          >
            {copied ? <FaCheck className="w-3 h-3 text-ide-success" /> : <FaCopy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* FaCode Content */}
      <pre className="p-4 overflow-x-auto bg-ide-bg font-mono text-sm">
        <code className="text-ide-text">{children}</code>
      </pre>
    </div>
  )
}

// Helper functions
function parseMarkdown(content: string): Array<{
  type: string
  content: string
  language?: string
  filename?: string
  level?: number
  items?: string[]
}> {
  const parts: Array<{
    type: string
    content: string
    language?: string
    filename?: string
    level?: number
    items?: string[]
  }> = []

  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // FaCode blocks
    if (line.startsWith('```')) {
      const langMatch = line.match(/```(\w+)?(?:\s+filename=([^\s]+))?/)
      const language = langMatch?.[1] || 'text'
      const filename = langMatch?.[2]
      const codeLines: string[] = []
      i++

      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // Skip closing ```

      parts.push({
        type: 'code',
        content: codeLines.join('\n'),
        language,
        filename,
      })
      continue
    }

    // Headings
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1
      parts.push({
        type: 'heading',
        content: line.replace(/^#+\s*/, ''),
        level,
      })
      i++
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      parts.push({ type: 'divider', content: '' })
      i++
      continue
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i++
      }
      parts.push({ type: 'list', content: '', items })
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Regular paragraph
    parts.push({ type: 'paragraph', content: line })
    i++
  }

  return parts
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInlineCode(text: string): string {
  // First escape HTML to prevent XSS, then replace backtick-wrapped code
  const escaped = escapeHtml(text)
  return escaped.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 bg-ide-bg rounded text-ide-accent font-mono text-xs">$1</code>'
  )
}
