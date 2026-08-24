import React, { useState, useEffect, useRef } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import { Loader2, Copy, Check, RotateCcw, Trash2 } from 'lucide-react'

interface StreamingMessageProps {
  content: string
  isStreaming: boolean
  agentType?: string
  agentIcon?: string
  onApplyCode?: (filePath: string, content: string) => void
  onRegenerate?: () => void
  onDelete?: () => void
}

export default function StreamingMessage({
  content,
  isStreaming,
  agentType,
  agentIcon,
  onApplyCode,
  onRegenerate,
  onDelete,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const contentRef = useRef(content)
  const indexRef = useRef(0)

  // Streaming effect - simulate typing
  useEffect(() => {
    if (isStreaming && content !== contentRef.current) {
      contentRef.current = content
      indexRef.current = 0
      setDisplayedContent('')
    }

    if (!isStreaming) {
      setDisplayedContent(content)
      return
    }

    const interval = setInterval(() => {
      if (indexRef.current < content.length) {
        // Add characters in chunks for better performance
        const chunkSize = Math.max(1, Math.floor((content.length - indexRef.current) / 20))
        const newIndex = Math.min(indexRef.current + chunkSize, content.length)
        setDisplayedContent(content.substring(0, newIndex))
        indexRef.current = newIndex
      } else {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [content, isStreaming])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="group relative">
      {/* Message Content */}
      <div className={`${isStreaming ? 'streaming-cursor' : ''}`}>
        <MarkdownRenderer content={displayedContent} onApplyCode={onApplyCode} />
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mt-2 text-xs text-ide-text-muted">
          <Loader2 className="w-3 h-3 animate-spin text-ide-accent" />
          <span>Generating...</span>
        </div>
      )}

      {/* Action Buttons */}
      {!isStreaming && displayedContent && (
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-ide-text-muted hover:bg-ide-border rounded transition-colors"
          >
            {isCopied ? <Check className="w-3 h-3 text-ide-success" /> : <Copy className="w-3 h-3" />}
            {isCopied ? 'Copied' : 'Copy'}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 px-2 py-1 text-xs text-ide-text-muted hover:bg-ide-border rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Regenerate
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs text-ide-text-muted hover:bg-ide-border hover:text-ide-error rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
