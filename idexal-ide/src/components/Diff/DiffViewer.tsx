import React, { useState, useMemo } from 'react'
import {
  FaFileAlt, FaCopy, FaCheck, FaChevronDown, FaChevronRight, FaArrowLeft, FaArrowRight, FaSearch, FaFilter, FaPlus, FaMinus, FaUndo
} from '../Icon'

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context'
  leftNum?: number
  rightNum?: number
  content: string
}

interface DiffFile {
  name: string
  additions: number
  deletions: number
  status: 'modified' | 'added' | 'deleted' | 'renamed'
}

const MOCK_FILES: DiffFile[] = [
  { name: 'src/App.tsx', additions: 24, deletions: 8, status: 'modified' },
  { name: 'src/services/aiService.ts', additions: 45, deletions: 12, status: 'modified' },
  { name: 'src/components/GitBlamePanel.tsx', additions: 186, deletions: 0, status: 'added' },
  { name: 'src/components/ProcessManagerPanel.tsx', additions: 210, deletions: 0, status: 'added' },
  { name: 'src/stores/settingsStore.ts', additions: 3, deletions: 15, status: 'modified' },
]

const MOCK_DIFF: DiffLine[] = [
  { type: 'unchanged', leftNum: 1, rightNum: 1, content: "import React, { useEffect, useState } from 'react'" },
  { type: 'unchanged', leftNum: 2, rightNum: 2, content: "import { useAgentStore } from './stores/agentStore'" },
  { type: 'removed', leftNum: 3, content: "import { useSettingsStore } from './stores/settingsStore'" },
  { type: 'added', rightNum: 3, content: "import { useSettingsStore, useThemeStore } from './stores/settingsStore'" },
  { type: 'unchanged', leftNum: 4, rightNum: 4, content: "import TitleBar from './components/Layout/TitleBar'" },
  { type: 'unchanged', leftNum: 5, rightNum: 5, content: "import Sidebar, { SidebarTab } from './components/Layout/Sidebar'" },
  { type: 'unchanged', leftNum: 6, rightNum: 6, content: "import EditorArea from './components/Editor/EditorArea'" },
  { type: 'removed', leftNum: 7, content: "import ChatPanel from './components/AI/ChatPanel'" },
  { type: 'removed', leftNum: 8, content: "import TerminalPanel from './components/Terminal/TerminalPanel'" },
  { type: 'added', rightNum: 7, content: "import ChatPanel from './components/AI/ChatPanel'" },
  { type: 'added', rightNum: 8, content: "import TerminalPanel from './components/Terminal/TerminalPanel'" },
  { type: 'added', rightNum: 9, content: "import GitBlamePanel from './components/Git/GitBlamePanel'" },
  { type: 'added', rightNum: 10, content: "import ProcessManagerPanel from './components/ProcessManager/ProcessManagerPanel'" },
  { type: 'unchanged', leftNum: 9, rightNum: 11, content: "" },
  { type: 'unchanged', leftNum: 10, rightNum: 12, content: "type RightPanel = 'chat' | 'terminal' | 'git' | 'debug'" },
  { type: 'removed', leftNum: 11, content: "  | 'snippets' | 'agents' | 'outline'" },
  { type: 'added', rightNum: 13, content: "  | 'snippets' | 'agents' | 'outline' | 'git-blame' | 'processes'" },
  { type: 'unchanged', leftNum: 12, rightNum: 14, content: "  | 'markdown' | 'tasks' | 'api' | 'json'" },
  { type: 'unchanged', leftNum: 13, rightNum: 15, content: "  | null" },
  { type: 'unchanged', leftNum: 14, rightNum: 16, content: "" },
  { type: 'unchanged', leftNum: 15, rightNum: 17, content: "function App() {" },
  { type: 'unchanged', leftNum: 16, rightNum: 18, content: "  const { initializeAgents } = useAgentStore()" },
  { type: 'removed', leftNum: 17, content: "  const { loadSettings } = useSettingsStore()" },
  { type: 'added', rightNum: 19, content: "  const { loadSettings } = useSettingsStore()" },
  { type: 'added', rightNum: 20, content: "  const { loadTheme } = useThemeStore()" },
  { type: 'unchanged', leftNum: 18, rightNum: 21, content: "  const [showCommandPalette, setShowCommandPalette] = useState(false)" },
  { type: 'context', leftNum: 19, rightNum: 22, content: "  // ..." },
]

const STATUS_CONFIG = {
  modified: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'M' },
  added: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'A' },
  deleted: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'D' },
  renamed: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'R' },
}

export default function DiffViewer({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState(0)
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [showWhitespace, setShowWhitespace] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const file = MOCK_FILES[selectedFile]

  const filteredDiff = useMemo(() => {
    if (!searchQuery) return MOCK_DIFF
    const q = searchQuery.toLowerCase()
    return MOCK_DIFF.filter(line => line.content.toLowerCase().includes(q))
  }, [searchQuery])

  const totalStats = useMemo(() => ({
    additions: MOCK_FILES.reduce((s, f) => s + f.additions, 0),
    deletions: MOCK_FILES.reduce((s, f) => s + f.deletions, 0),
  }), [])

  const copyDiff = () => {
    const text = filteredDiff.map(l => {
      const prefix = l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' '
      return `${prefix} ${l.content}`
    }).join('\n')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaFileAlt size={16} className="text-purple-400" />
          <span className="text-sm font-semibold">Diff Viewer</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            {MOCK_FILES.length} files changed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyDiff} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Copy diff">
            {copied ? <FaCheck size={14} className="text-green-400" /> : <FaCopy size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-ide-bg-secondary/20 border-b border-ide-border">
        <span className="flex items-center gap-1 text-[10px]">
          <FaPlus size={10} className="text-green-400" />
          <span className="text-green-400">+{totalStats.additions}</span>
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <FaMinus size={10} className="text-red-400" />
          <span className="text-red-400">-{totalStats.deletions}</span>
        </span>
        <span className="text-[10px] text-ide-text-secondary">{MOCK_FILES.length} files</span>
      </div>

      {/* File List */}
      <div className="border-b border-ide-border max-h-[140px] overflow-y-auto">
        {MOCK_FILES.map((f, i) => {
          const config = STATUS_CONFIG[f.status]
          return (
            <div
              key={f.name}
              onClick={() => setSelectedFile(i)}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-ide-border/20 ${
                i === selectedFile ? 'bg-ide-accent/10' : 'hover:bg-ide-bg-secondary/20'
              }`}
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${config.bg} ${config.color}`}>
                {config.label}
              </span>
              <FaFileAlt size={12} className="text-ide-text-secondary flex-shrink-0" />
              <span className="text-xs font-mono truncate flex-1">{f.name}</span>
              <span className="text-[10px] text-green-400">+{f.additions}</span>
              <span className="text-[10px] text-red-400">-{f.deletions}</span>
            </div>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border bg-ide-bg-secondary/10">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'split' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary'}`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'unified' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary'}`}
          >
            Unified
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-0.5">
          <FaSearch size={10} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="FaFilter..."
            className="w-24 bg-transparent text-[10px] outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
        <button
          onClick={() => setShowWhitespace(!showWhitespace)}
          className={`px-2 py-0.5 text-[10px] rounded ${showWhitespace ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-secondary'}`}
        >
          Whitespace
        </button>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px]">
        {viewMode === 'split' ? (
          <div className="flex">
            {/* Left side (original) */}
            <div className="flex-1 border-r border-ide-border">
              {filteredDiff.filter(l => l.type !== 'added').map((line, i) => (
                <div
                  key={`l-${i}`}
                  className={`flex items-stretch border-b border-ide-border/10 ${
                    line.type === 'removed' ? 'bg-red-500/10' : line.type === 'unchanged' ? '' : 'bg-ide-bg-secondary/5'
                  }`}
                >
                  <div className="w-10 text-right pr-1 py-0.5 text-ide-text-secondary/40 select-none border-r border-ide-border/10 text-[10px]">
                    {line.leftNum || ''}
                  </div>
                  <div className="w-5 flex items-center justify-center flex-shrink-0">
                    {line.type === 'removed' && <FaMinus size={10} className="text-red-400" />}
                  </div>
                  <div className={`flex-1 px-2 py-0.5 whitespace-pre ${
                    line.type === 'removed' ? 'text-red-300' : 'text-ide-text'
                  }`}>
                    {line.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Right side (modified) */}
            <div className="flex-1">
              {filteredDiff.filter(l => l.type !== 'removed').map((line, i) => (
                <div
                  key={`r-${i}`}
                  className={`flex items-stretch border-b border-ide-border/10 ${
                    line.type === 'added' ? 'bg-green-500/10' : line.type === 'unchanged' ? '' : 'bg-ide-bg-secondary/5'
                  }`}
                >
                  <div className="w-10 text-right pr-1 py-0.5 text-ide-text-secondary/40 select-none border-r border-ide-border/10 text-[10px]">
                    {line.rightNum || ''}
                  </div>
                  <div className="w-5 flex items-center justify-center flex-shrink-0">
                    {line.type === 'added' && <FaPlus size={10} className="text-green-400" />}
                  </div>
                  <div className={`flex-1 px-2 py-0.5 whitespace-pre ${
                    line.type === 'added' ? 'text-green-300' : 'text-ide-text'
                  }`}>
                    {line.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Unified view */
          filteredDiff.map((line, i) => (
            <div
              key={i}
              className={`flex items-stretch border-b border-ide-border/10 ${
                line.type === 'added' ? 'bg-green-500/10' :
                line.type === 'removed' ? 'bg-red-500/10' : ''
              }`}
            >
              <div className="w-10 text-right pr-1 py-0.5 text-ide-text-secondary/40 select-none border-r border-ide-border/10 text-[10px]">
                {line.leftNum || ''}
              </div>
              <div className="w-10 text-right pr-1 py-0.5 text-ide-text-secondary/40 select-none border-r border-ide-border/10 text-[10px]">
                {line.rightNum || ''}
              </div>
              <div className="w-5 flex items-center justify-center flex-shrink-0 border-r border-ide-border/10">
                {line.type === 'added' && <FaPlus size={10} className="text-green-400" />}
                {line.type === 'removed' && <FaMinus size={10} className="text-red-400" />}
              </div>
              <div className={`flex-1 px-2 py-0.5 whitespace-pre ${
                line.type === 'added' ? 'text-green-300' :
                line.type === 'removed' ? 'text-red-300' : 'text-ide-text'
              }`}>
                {line.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>File {selectedFile + 1} of {MOCK_FILES.length}: {file.name}</span>
        <span>
          <span className="text-green-400">+{file.additions}</span>{' '}
          <span className="text-red-400">-{file.deletions}</span>
        </span>
      </div>
    </div>
  )
}
