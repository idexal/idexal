import React, { useState } from 'react'
import { FileCode, Copy, Check, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  hunks: DiffHunk[]
  status: 'added' | 'modified' | 'deleted' | 'unchanged'
}

interface DiffViewerProps {
  files: DiffFile[]
  onApply?: (filePath: string) => void
  onDiscard?: (filePath: string) => void
}

export default function DiffViewer({ files, onApply, onDiscard }: DiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set(files.map(f => f.path)))
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified')

  // Update expanded files when files prop changes
  React.useEffect(() => {
    setExpandedFiles(new Set(files.map(f => f.path)))
  }, [files])

  const toggleFile = (path: string) => {
    const next = new Set(expandedFiles)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setExpandedFiles(next)
  }

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)

  return (
    <div className="diff-viewer bg-ide-bg rounded-lg border border-ide-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-ide-surface border-b border-ide-border">
        <div className="flex items-center gap-3">
          <FileCode className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </span>
          <span className="text-xs text-ide-success">+{totalAdditions}</span>
          <span className="text-xs text-ide-error">-{totalDeletions}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('unified')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'unified' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:bg-ide-border'}`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 text-xs rounded ${viewMode === 'split' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:bg-ide-border'}`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Files */}
      <div className="max-h-96 overflow-auto">
        {files.map((file) => (
          <div key={file.path} className="border-b border-ide-border last:border-0">
            {/* File Header */}
            <div
              className="flex items-center gap-2 px-4 py-2 bg-ide-surface hover:bg-ide-border/30 cursor-pointer"
              onClick={() => toggleFile(file.path)}
            >
              {expandedFiles.has(file.path) ? (
                <ChevronDown className="w-4 h-4 text-ide-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-ide-text-muted" />
              )}
              <span className="text-sm font-mono text-ide-text flex-1">{file.path}</span>
              <span className="text-xs text-ide-success">+{file.additions}</span>
              <span className="text-xs text-ide-error">-{file.deletions}</span>
              {onApply && (
                <button
                  onClick={(e) => { e.stopPropagation(); onApply(file.path) }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-ide-success hover:bg-ide-success/10 rounded"
                >
                  <CheckCircle className="w-3 h-3" />
                  Apply
                </button>
              )}
              {onDiscard && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDiscard(file.path) }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-ide-error hover:bg-ide-error/10 rounded"
                >
                  <XCircle className="w-3 h-3" />
                  Discard
                </button>
              )}
            </div>

            {/* Diff Content */}
            {expandedFiles.has(file.path) && (
              <div className="font-mono text-xs overflow-x-auto">
                {file.hunks.map((hunk, hi) => (
                  <div key={hi}>
                    {/* Hunk Header */}
                    <div className="px-4 py-1 bg-ide-surface text-ide-text-muted border-t border-ide-border">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </div>

                    {/* Lines */}
                    {viewMode === 'unified' ? (
                      hunk.lines.map((line, li) => (
                        <DiffLineRow key={li} line={line} viewMode="unified" />
                      ))
                    ) : (
                      <SplitView lines={hunk.lines} />
                    )}
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

function DiffLineRow({ line, viewMode }: { line: DiffLine; viewMode: 'unified' | 'split' }) {
  const bgColor = line.type === 'add' ? 'bg-green-900/20' :
                  line.type === 'remove' ? 'bg-red-900/20' : ''
  const textColor = line.type === 'add' ? 'text-green-300' :
                    line.type === 'remove' ? 'text-red-300' : 'text-ide-text'
  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

  return (
    <div className={`flex px-4 py-0.5 ${bgColor}`}>
      {viewMode === 'unified' && (
        <>
          <span className="w-10 text-right text-ide-text-muted mr-3 select-none">
            {line.oldLine || ''}
          </span>
          <span className="w-10 text-right text-ide-text-muted mr-3 select-none">
            {line.newLine || ''}
          </span>
        </>
      )}
      <span className={`w-4 text-center select-none ${textColor}`}>{prefix}</span>
      <span className={`flex-1 ${textColor} whitespace-pre`}>{line.content}</span>
    </div>
  )
}

function SplitView({ lines }: { lines: DiffLine[] }) {
  const leftLines: Array<{ line?: DiffLine; empty?: boolean }> = []
  const rightLines: Array<{ line?: DiffLine; empty?: boolean }> = []

  for (const line of lines) {
    if (line.type === 'remove') {
      leftLines.push({ line })
      rightLines.push({ empty: true })
    } else if (line.type === 'add') {
      leftLines.push({ empty: true })
      rightLines.push({ line })
    } else {
      leftLines.push({ line })
      rightLines.push({ line })
    }
  }

  return (
    <div className="flex border-t border-ide-border">
      <div className="flex-1 border-r border-ide-border">
        {leftLines.map((item, i) => (
          <SplitLine key={`l${i}`} line={item.line} empty={item.empty} side="old" />
        ))}
      </div>
      <div className="flex-1">
        {rightLines.map((item, i) => (
          <SplitLine key={`r${i}`} line={item.line} empty={item.empty} side="new" />
        ))}
      </div>
    </div>
  )
}

function SplitLine({ line, empty, side }: { line?: DiffLine; empty?: boolean; side: 'old' | 'new' }) {
  if (empty) {
    return <div className="px-4 py-0.5 bg-ide-surface/50 h-5" />
  }

  if (!line) return null

  const bgColor = line.type === 'add' ? 'bg-green-900/20' :
                  line.type === 'remove' ? 'bg-red-900/20' : ''
  const textColor = line.type === 'add' ? 'text-green-300' :
                    line.type === 'remove' ? 'text-red-300' : 'text-ide-text'
  const lineNum = side === 'old' ? line.oldLine : line.newLine

  return (
    <div className={`flex px-4 py-0.5 ${bgColor}`}>
      <span className="w-10 text-right text-ide-text-muted mr-3 select-none">
        {lineNum || ''}
      </span>
      <span className={`flex-1 ${textColor} whitespace-pre`}>{line.content}</span>
    </div>
  )
}
