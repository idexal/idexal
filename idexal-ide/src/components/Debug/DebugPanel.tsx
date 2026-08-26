import React, { useState } from 'react'
import {
  FaPlay, FaPause, FaSquare, FaCode, FaArrowRight, FaSync, FaBug, FaBullseye, FaPlus, FaTimes, FaChevronDown, FaChevronRight
} from '../Icon'

interface DebugPanelProps {
  onClose: () => void
}

interface Breakpoint {
  id: string
  file: string
  line: number
  enabled: boolean
}

interface DebugVariable {
  name: string
  value: string
  type: string
}

type DebugView = 'variables' | 'callstack' | 'breakpoints' | 'watch'

export default function DebugPanel({ onClose }: DebugPanelProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [view, setView] = useState<DebugView>('variables')
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
    { id: '1', file: 'src/App.tsx', line: 42, enabled: true },
    { id: '2', file: 'src/hooks/useAgent.ts', line: 15, enabled: true },
  ])
  const [variables] = useState<DebugVariable[]>([
    { name: 'state', value: '{ loading: false, data: [...] }', type: 'Object' },
    { name: 'user', value: '{ id: 1, name: "John" }', type: 'User' },
    { name: 'count', value: '42', type: 'number' },
    { name: 'items', value: 'Array(5)', type: 'Array' },
  ])
  const [callStack] = useState([
    { file: 'src/hooks/useAgent.ts', line: 28, function: 'sendMessage' },
    { file: 'src/components/AI/ChatPanel.tsx', line: 45, function: 'handleSend' },
    { file: 'src/App.tsx', line: 12, function: 'App' },
  ])
  const [watchExpressions, setWatchExpressions] = useState<string[]>(['state', 'user'])
  const [newWatch, setNewWatch] = useState('')

  const handleStart = () => { setIsRunning(true); setIsPaused(false) }
  const handlePause = () => { setIsPaused(true) }
  const handleResume = () => { setIsPaused(false) }
  const handleStop = () => { setIsRunning(false); setIsPaused(false) }

  const toggleBreakpoint = (id: string) => {
    setBreakpoints(bps => bps.map(bp =>
      bp.id === id ? { ...bp, enabled: !bp.enabled } : bp
    ))
  }

  const removeBreakpoint = (id: string) => {
    setBreakpoints(bps => bps.filter(bp => bp.id !== id))
  }

  const addWatch = () => {
    if (newWatch.trim()) {
      setWatchExpressions([...watchExpressions, newWatch.trim()])
      setNewWatch('')
    }
  }

  const views: { id: DebugView; label: string; icon: React.ReactNode }[] = [
    { id: 'variables', label: 'Variables', icon: <FaCode className="w-4 h-4" /> },
    { id: 'callstack', label: 'Call Stack', icon: <FaCode className="w-4 h-4" /> },
    { id: 'breakpoints', label: 'Breakpoints', icon: <FaBullseye className="w-4 h-4" /> },
    { id: 'watch', label: 'Watch', icon: <FaBug className="w-4 h-4" /> },
  ]

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBug className="w-4 h-4 text-ide-warning" />
          <span className="text-sm font-medium">Run & Debug</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-ide-border">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-ide-success text-white rounded hover:bg-ide-success/80 transition-colors"
          >
            <FaPlay className="w-3.5 h-3.5" />
            Start
          </button>
        ) : (
          <>
            {isPaused ? (
              <button onClick={handleResume} className="p-1.5 rounded hover:bg-ide-border text-ide-success" title="Resume">
                <FaPlay className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handlePause} className="p-1.5 rounded hover:bg-ide-border text-ide-warning" title="Pause">
                <FaPause className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleStop} className="p-1.5 rounded hover:bg-ide-border text-ide-error" title="Stop">
              <FaSquare className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="Step Into">
              <FaCode className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="Step Over">
              <FaArrowRight className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="Step Out">
              <FaCode className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted" title="Restart">
              <FaSync className="w-4 h-4" />
            </button>
          </>
        )}

        {isRunning && (
          <div className="ml-2 flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-ide-warning animate-pulse' : 'bg-ide-success'}`} />
            <span className="text-xs text-ide-text-muted">
              {isPaused ? 'Paused at line 42' : 'Running'}
            </span>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-ide-border">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
              view === v.id
                ? 'text-ide-accent border-b-2 border-ide-accent'
                : 'text-ide-text-muted hover:text-ide-text'
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'variables' && (
          <div className="p-2">
            {variables.map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-border/30 text-xs">
                <span className="text-ide-accent font-mono">{v.name}</span>
                <span className="text-ide-text-muted">=</span>
                <span className="text-ide-text font-mono truncate">{v.value}</span>
                <span className="text-ide-text-muted ml-auto text-[10px]">{v.type}</span>
              </div>
            ))}
          </div>
        )}

        {view === 'callstack' && (
          <div className="p-2">
            {callStack.map((frame, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer ${
                i === 0 ? 'bg-ide-accent/10 border border-ide-accent/30' : 'hover:bg-ide-border/30'
              }`}>
                <span className="text-ide-accent font-mono truncate">{frame.function}</span>
                <span className="text-ide-text-muted text-[10px] ml-auto">
                  {frame.file}:{frame.line}
                </span>
              </div>
            ))}
          </div>
        )}

        {view === 'breakpoints' && (
          <div className="p-2">
            {breakpoints.map((bp) => (
              <div key={bp.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-border/30 group">
                <input
                  type="checkbox"
                  checked={bp.enabled}
                  onChange={() => toggleBreakpoint(bp.id)}
                  className="w-3.5 h-3.5 accent-ide-error"
                />
                <div className="w-3 h-3 rounded-full bg-ide-error flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ide-text truncate">{bp.file}</div>
                  <div className="text-[10px] text-ide-text-muted">Line {bp.line}</div>
                </div>
                <button
                  onClick={() => removeBreakpoint(bp.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-ide-border"
                >
                  <FaTimes className="w-3 h-3 text-ide-text-muted" />
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'watch' && (
          <div className="p-2">
            {watchExpressions.map((expr, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-border/30 text-xs">
                <FaChevronRight className="w-3 h-3 text-ide-text-muted" />
                <span className="text-ide-accent font-mono">{expr}</span>
                <span className="text-ide-text-muted">=</span>
                <span className="text-ide-text font-mono">{variables.find(v => v.name === expr)?.value || 'undefined'}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 px-2 py-1 mt-1">
              <FaPlus className="w-3 h-3 text-ide-text-muted" />
              <input
                type="text"
                value={newWatch}
                onChange={(e) => setNewWatch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWatch()}
                placeholder="Add expression..."
                className="flex-1 bg-transparent text-xs text-ide-text focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
