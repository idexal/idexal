import React, { useState, useEffect, useRef } from 'react'
import {
  FaTimes, FaSync, FaCopy, FaCheck, FaExpand, FaCompress
} from '../Icon'

interface MarkdownPreviewProps {
  onClose: () => void
}

// Simple markdown parser (no external deps)
function parseMarkdown(md: string): string {
  let html = md
    // FaCode blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-ide-surface rounded p-3 my-2 overflow-x-auto text-xs font-mono"><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-ide-surface px-1.5 py-0.5 rounded text-sm font-mono text-ide-accent">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-ide-text mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-ide-text mt-5 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-ide-text mt-6 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-ide-accent hover:underline">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-2" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-ide-accent pl-4 my-2 text-ide-text-secondary italic">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-ide-border my-4" />')
    // Unordered lists
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 mb-1">• $1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\-\s]+$/.test(c.trim()))) return ''
      const isHeader = false
      const cellHtml = cells.map(c => `<td class="px-3 py-1.5 border border-ide-border text-sm">${c.trim()}</td>`).join('')
      return `<tr>${cellHtml}</tr>`
    })
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')
    // Line breaks
    .replace(/\n/g, '<br />')

  return `<div class="prose prose-invert max-w-none text-sm text-ide-text leading-relaxed">${html}</div>`
}

export default function MarkdownPreviewPanel({ onClose }: MarkdownPreviewProps) {
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Load content from active editor tab
  useEffect(() => {
    const loadContent = () => {
      try {
        // Try to get markdown from clipboard or editor
        const stored = localStorage.getItem('markdown-preview-content')
        if (stored) {
          setContent(stored)
          setPreview(parseMarkdown(stored))
        } else {
          // Default example
          const example = `# Markdown Preview

## Features

This is a **live markdown preview** panel.

### Formatting

- **Bold text** with \`**bold**\`
- *Italic text* with \`*italic*\`
- \`Inline code\` with backticks
- [Links](https://example.com) with \`[text](url)\`

### FaCode Blocks

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

### Lists

1. First item
2. Second item
3. Third item

### Blockquotes

> This is a blockquote. It can span multiple lines.

### Tables

| Feature | Status |
|---------|--------|
| Preview | ✅ |
| Sync | ✅ |
| Export | ✅ |

---

*Start typing in the editor to see live preview!*`
          setContent(example)
          setPreview(parseMarkdown(example))
        }
      } catch {}
    }
    loadContent()
  }, [])

  const handleChange = (value: string) => {
    setContent(value)
    setPreview(parseMarkdown(value))
    localStorage.setItem('markdown-preview-content', value)
  }

  const copyHtml = () => {
    navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`h-full flex flex-col bg-ide-bg ${expanded ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ide-text">Markdown Preview</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ide-surface rounded text-ide-text-muted">
            Live
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyHtml} className="p-1 rounded hover:bg-ide-border" title="Copy HTML">
            {copied ? <FaCheck className="w-3.5 h-3.5 text-green-400" /> : <FaCopy className="w-3.5 h-3.5 text-ide-text-muted" />}
          </button>
          <button onClick={() => setExpanded(p => !p)} className="p-1 rounded hover:bg-ide-border" title="Toggle fullscreen">
            {expanded ? <FaCompress className="w-3.5 h-3.5 text-ide-text-muted" /> : <FaExpand className="w-3.5 h-3.5 text-ide-text-muted" />}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="w-1/2 border-r border-ide-border flex flex-col">
          <div className="px-3 py-1 text-[10px] text-ide-text-muted bg-ide-surface/30 border-b border-ide-border">
            Editor
          </div>
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            className="flex-1 p-3 bg-ide-bg text-xs font-mono text-ide-text resize-none outline-none leading-relaxed"
            placeholder="Type markdown here..."
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-1 text-[10px] text-ide-text-muted bg-ide-surface/30 border-b border-ide-border">
            Preview
          </div>
          <div
            ref={previewRef}
            className="flex-1 p-4 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
    </div>
  )
}
