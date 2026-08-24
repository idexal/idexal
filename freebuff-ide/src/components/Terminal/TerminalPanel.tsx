import React, { useState, useRef, useEffect } from 'react'
import { useTerminal } from '../../hooks/useTerminal'
import { X, Terminal, Plus, Trash2, Eraser } from 'lucide-react'

interface TerminalPanelProps {
  onClose: () => void
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const {
    sessions, activeSession, activeSessionId,
    setActiveSessionId, executeCommand, addSession, closeSession, clearSession,
    historyRef,
  } = useTerminal()

  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCommand = (command: string) => {
    if (!command.trim()) return
    executeCommand(command)
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      clearSession()
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  return (
    <div className="h-full flex flex-col bg-ide-terminal">
      {/* Header */}
      <div className="h-10 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center h-full overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`h-full px-4 flex items-center gap-2 text-sm border-r border-ide-border transition-colors whitespace-nowrap ${
                session.id === activeSessionId
                  ? 'bg-ide-editor text-ide-text'
                  : 'text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{session.name}</span>
            </button>
          ))}

          <button
            onClick={addSession}
            className="h-full px-3 text-ide-text-muted hover:text-ide-text hover:bg-ide-border/50 transition-colors"
            title="New Terminal (Ctrl+Shift+`)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-2">
          <button
            onClick={clearSession}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Clear Terminal (Ctrl+L)"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => closeSession(activeSessionId)}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Close Terminal"
            disabled={sessions.length === 1}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={historyRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
      >
        {activeSession?.history.map((line, index) => (
          <div
            key={index}
            className={`whitespace-pre-wrap ${
              line.startsWith('$')
                ? 'text-ide-success'
                : line.startsWith('[') || line.startsWith('>') || line.startsWith(' ')
                ? 'text-ide-text-muted'
                : 'text-ide-text'
            }`}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-ide-border">
        <div className="flex items-center gap-2">
          <span className="text-ide-success font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent font-mono text-sm text-ide-text focus:outline-none"
            placeholder="Type a command... (↑ for history, Ctrl+L to clear)"
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
