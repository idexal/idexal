import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Hash, ArrowRight, ArrowDown, Search, ChevronDown, ChevronRight, FileText } from 'lucide-react'

const MOCK_LINES = Array.from({ length: 200 }, (_, i) => {
  const line = i + 1
  const templates = [
    "import React, { useState, useEffect } from 'react'",
    "import { useAgentStore } from './stores/agentStore'",
    "export default function App() {",
    "  const [count, setCount] = useState(0)",
    "  useEffect(() => { document.title = `Count: ${count}` }, [count])",
    "  return <div>Hello World</div>",
    "}",
    "// TODO: Add error handling",
    "async function fetchData(url: string) {",
    "  const res = await fetch(url)",
    "  return res.json()",
    "}",
    "interface User { id: number; name: string }",
    "const users: User[] = []",
    "function processUser(user: User) {",
    "  console.log(user.name)",
    "}",
    "export const helper = (x: number) => x * 2",
  ]
  return templates[i % templates.length]
})

export default function GoToLinePanel({ onClose }: { onClose: () => void }) {
  const [lineInput, setLineInput] = useState('')
  const [colInput, setColInput] = useState('')
  const [previewLine, setPreviewLine] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([1, 10, 25, 42, 100])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const targetLine = parseInt(lineInput) || 1
  const targetCol = parseInt(colInput) || 1
  const maxLine = MOCK_LINES.length

  useEffect(() => {
    if (lineInput) {
      const num = Math.min(Math.max(1, parseInt(lineInput) || 1), maxLine)
      setPreviewLine(num)
    } else {
      setPreviewLine(null)
    }
  }, [lineInput, maxLine])

  const goToLine = (line: number) => {
    if (!history.includes(line)) {
      setHistory(prev => [line, ...prev].slice(0, 20))
    }
    onClose()
  }

  const surroundingLines = useMemo(() => {
    if (!previewLine) return []
    const start = Math.max(0, previewLine - 4)
    const end = Math.min(MOCK_LINES.length, previewLine + 4)
    return Array.from({ length: end - start }, (_, i) => ({
      line: start + i + 1,
      content: MOCK_LINES[start + i],
      isTarget: start + i + 1 === previewLine,
    }))
  }, [previewLine])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Hash size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">Go to Line/Column</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-b border-ide-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-ide-text-secondary mb-0.5 block">Line</label>
            <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1.5 border border-ide-border">
              <Hash size={12} className="text-ide-text-secondary" />
              <input
                ref={inputRef}
                value={lineInput}
                onChange={e => setLineInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && goToLine(targetLine)}
                placeholder={`1-${maxLine}`}
                className="flex-1 bg-transparent text-sm outline-none text-ide-text font-mono placeholder:text-ide-text-secondary/30"
              />
            </div>
          </div>
          <div className="w-24">
            <label className="text-[10px] text-ide-text-secondary mb-0.5 block">Column</label>
            <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1.5 border border-ide-border">
              <span className="text-ide-text-secondary text-xs">Col</span>
              <input
                value={colInput}
                onChange={e => setColInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && goToLine(targetLine)}
                placeholder="1"
                className="flex-1 bg-transparent text-sm outline-none text-ide-text font-mono placeholder:text-ide-text-secondary/30 w-full"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToLine(targetLine)}
            className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-medium flex items-center justify-center gap-1"
          >
            <ArrowRight size={12} /> Go to Line {targetLine}{targetCol > 1 ? `, Col ${targetCol}` : ''}
          </button>
        </div>
      </div>

      {/* Preview */}
      {surroundingLines.length > 0 && (
        <div className="border-b border-ide-border">
          <div className="px-3 py-1.5 text-[10px] text-ide-text-secondary bg-ide-bg-secondary/20 flex items-center gap-1">
            <FileText size={10} /> Preview — Line {previewLine} of {maxLine}
          </div>
          <div className="font-mono text-[11px] max-h-[180px] overflow-y-auto">
            {surroundingLines.map(l => (
              <div
                key={l.line}
                className={`flex items-stretch ${
                  l.isTarget ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'hover:bg-ide-bg-secondary/10'
                }`}
              >
                <div className={`w-10 text-right pr-2 py-0.5 select-none border-r border-ide-border/20 ${
                  l.isTarget ? 'text-cyan-400 font-bold' : 'text-ide-text-secondary/40'
                }`}>
                  {l.line}
                </div>
                <div className={`flex-1 px-3 py-0.5 whitespace-pre ${
                  l.isTarget ? 'text-cyan-300' : 'text-ide-text'
                }`}>
                  {l.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] text-ide-text-secondary bg-ide-bg-secondary/20 flex items-center gap-1">
            <ArrowDown size={10} /> Recent Lines
          </div>
          {history.map((line, i) => (
            <div
              key={`${line}-${i}`}
              onClick={() => { setLineInput(String(line)); goToLine(line) }}
              className="flex items-center gap-3 px-3 py-1.5 hover:bg-ide-bg-secondary/10 cursor-pointer border-b border-ide-border/10"
            >
              <Hash size={12} className="text-ide-text-secondary" />
              <span className="text-xs font-mono text-ide-text">Line {line}</span>
              <span className="text-[10px] text-ide-text-secondary truncate flex-1 font-mono">
                {MOCK_LINES[line - 1]?.substring(0, 60)}...
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
