import React, { useState, useMemo } from 'react'
import {
  X, FileText, Copy, Check, Printer, Download,
  ZoomIn, ZoomOut, Maximize2, Eye, Code, SplitSquareVertical
} from 'lucide-react'

interface MarkdownPreviewProps {
  content?: string
  filePath?: string
  onClose?: () => void
}

export default function MarkdownPreview({ content, filePath, onClose }: MarkdownPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source' | 'split'>('preview')
  const [fontSize, setFontSize] = useState(14)
  const [copied, setCopied] = useState(false)

  const fileName = filePath?.split(/[\\/]/).pop() || 'untitled.md'

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const rendered = useMemo(() => {
    if (!content) return '<p class="text-ide-text-muted">No content to preview</p>'
    return renderMarkdown(content)
  }, [content])

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Markdown Preview</span>
          <span className="text-xs text-ide-text-muted truncate max-w-[150px]">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded ${viewMode === 'preview' ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:bg-ide-border'}`}
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={`p-1.5 rounded ${viewMode === 'source' ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:bg-ide-border'}`}
            title="Source"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded ${viewMode === 'split' ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-text-muted hover:bg-ide-border'}`}
            title="Split"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-ide-border mx-1" />

          {/* Font Size */}
          <button
            onClick={() => setFontSize(s => Math.max(10, s - 1))}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-ide-text-muted w-8 text-center">{fontSize}px</span>
          <button
            onClick={() => setFontSize(s => Math.min(24, s + 1))}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-ide-border mx-1" />

          {/* Actions */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-ide-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!content ? (
          <div className="flex flex-col items-center justify-center h-full text-ide-text-muted gap-3">
            <FileText className="w-12 h-12 opacity-30" />
            <div className="text-sm">No markdown file open</div>
            <div className="text-xs">Open a .md file to see the preview</div>
          </div>
        ) : viewMode === 'preview' ? (
          <div
            className="p-6 max-w-3xl mx-auto"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div
              className="markdown-preview text-ide-text leading-relaxed"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          </div>
        ) : viewMode === 'source' ? (
          <pre
            className="p-6 font-mono text-ide-text whitespace-pre-wrap"
            style={{ fontSize: `${fontSize}px` }}
          >
            {content}
          </pre>
        ) : (
          <div className="flex h-full">
            <div
              className="w-1/2 border-r border-ide-border overflow-auto p-4"
              style={{ fontSize: `${fontSize}px` }}
            >
              <div
                className="markdown-preview text-ide-text leading-relaxed"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            </div>
            <pre
              className="w-1/2 overflow-auto p-4 font-mono text-ide-text whitespace-pre-wrap"
              style={{ fontSize: `${fontSize}px` }}
            >
              {content}
            </pre>
          </div>
        )}
      </div>

      {/* Word Count */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-muted">
        <span>{content?.split(/\s+/).length || 0} words · {content?.length || 0} chars · {content?.split('\n').length || 0} lines</span>
        <span>{fileName}</span>
      </div>
    </div>
  )
}

// ── Markdown Renderer ─────────────────────────────────────────

function renderMarkdown(md: string): string {
  let html = md

  // Code blocks (fenced)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trim())
    return `<div class="my-4 rounded-lg border border-ide-border overflow-hidden">
      <div class="px-3 py-1.5 bg-ide-surface border-b border-ide-border text-[10px] text-ide-text-muted">${lang || 'text'}</div>
      <pre class="p-4 overflow-x-auto bg-ide-bg"><code class="text-sm font-mono text-ide-text">${escaped}</code></pre>
    </div>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-ide-bg rounded text-ide-accent font-mono text-[0.9em]">$1</code>')

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="text-sm font-bold text-ide-text mt-4 mb-2">$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="text-sm font-bold text-ide-text mt-4 mb-2">$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-base font-bold text-ide-text mt-4 mb-2">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-bold text-ide-text mt-5 mb-3">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-bold text-ide-text mt-6 mb-3 pb-2 border-b border-ide-border">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold text-ide-text mt-6 mb-4 pb-3 border-b border-ide-border">$1</h1>')

  // Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ide-text">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-ide-text">$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del class="line-through text-ide-text-muted">$1</del>')

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="pl-4 border-l-4 border-ide-accent text-ide-text-muted italic my-2">$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="my-6 border-ide-border" />')

  // Unordered lists
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-ide-text py-0.5">$1</li>')

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-ide-text py-0.5">$1</li>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-ide-accent hover:underline" target="_blank" rel="noopener">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-4 border border-ide-border" />')

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, header, _sep, body) => {
    const headers = header.split('|').filter((c: string) => c.trim())
    const rows = body.trim().split('\n').map((row: string) =>
      row.split('|').filter((c: string) => c.trim())
    )
    let table = '<div class="my-4 overflow-x-auto"><table class="w-full border-collapse text-sm">'
    table += '<thead><tr>'
    for (const h of headers) {
      table += `<th class="px-3 py-2 bg-ide-surface border border-ide-border text-left text-ide-text font-medium">${h.trim()}</th>`
    }
    table += '</tr></thead><tbody>'
    for (const row of rows) {
      table += '<tr>'
      for (const cell of row) {
        table += `<td class="px-3 py-2 border border-ide-border text-ide-text">${cell.trim()}</td>`
      }
      table += '</tr>'
    }
    table += '</tbody></table></div>'
    return table
  })

  // Paragraphs (remaining lines)
  html = html.replace(/^(?!<[a-z/])((?!^\s*$).+)$/gm, (match) => {
    if (match.startsWith('<')) return match
    return `<p class="my-2 text-ide-text">${match}</p>`
  })

  // Clean up consecutive <li> into <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`)

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
