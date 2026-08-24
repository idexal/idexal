import React, { useState, useRef, useEffect } from 'react'
import { X, Terminal, Plus, Trash2 } from 'lucide-react'

interface TerminalPanelProps {
  onClose: () => void
}

interface TerminalSession {
  id: string
  name: string
  history: string[]
  currentDir: string
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: '1',
      name: 'Terminal 1',
      history: [
        '$ cd /workspace/freebuff-ide',
        '$ npm run dev',
        '> freebuff-ide@1.0.0 dev',
        '> concurrently "vite" "wait-on http://localhost:5173 && electron ."',
        '',
        '[0] VITE v5.0.12  ready in 312 ms',
        '[0]',
        '[0]   ➜  Local:   http://localhost:5173/',
        '[0]   ➜  Network: use --host to expose',
      ],
      currentDir: '/workspace/freebuff-ide',
    },
  ])
  const [activeSessionId, setActiveSessionId] = useState('1')
  const [input, setInput] = useState('')
  const historyRef = useRef<HTMLDivElement>(null)
  
  const activeSession = sessions.find(s => s.id === activeSessionId)
  
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [activeSession?.history])
  
  const handleCommand = (command: string) => {
    if (!command.trim()) return
    
    const newHistory = [...(activeSession?.history || []), `$ ${command}`]
    
    // Simulate command output
    const output = simulateCommand(command)
    if (output) {
      newHistory.push(...output)
    }
    
    setSessions(sessions.map(s => 
      s.id === activeSessionId 
        ? { ...s, history: newHistory, currentDir: s.currentDir }
        : s
    ))
    
    setInput('')
  }
  
  const simulateCommand = (command: string): string[] => {
    const parts = command.split(' ')
    const cmd = parts[0]
    
    switch (cmd) {
      case 'ls':
        return ['src/  rust-engine/  node_modules/  package.json  README.md']
      case 'pwd':
        return [activeSession?.currentDir || '/']
      case 'echo':
        return [parts.slice(1).join(' ')]
      case 'clear':
        return []
      case 'help':
        return [
          'Available commands:',
          '  ls     - List directory contents',
          '  pwd    - Print working directory',
          '  echo   - Display text',
          '  clear  - Clear terminal',
          '  help   - Show this help',
        ]
      default:
        return [`zsh: command not found: ${cmd}`]
    }
  }
  
  const addSession = () => {
    const newSession: TerminalSession = {
      id: String(Date.now()),
      name: `Terminal ${sessions.length + 1}`,
      history: ['$ '],
      currentDir: activeSession?.currentDir || '/',
    }
    setSessions([...sessions, newSession])
    setActiveSessionId(newSession.id)
  }
  
  const closeSession = (id: string) => {
    if (sessions.length === 1) return
    const newSessions = sessions.filter(s => s.id !== id)
    setSessions(newSessions)
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[0].id)
    }
  }
  
  return (
    <div className="h-full flex flex-col bg-ide-terminal">
      {/* Header */}
      <div className="h-10 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center h-full overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`h-full px-4 flex items-center gap-2 text-sm border-r border-ide-border transition-colors
                ${session.id === activeSessionId
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
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => closeSession(activeSessionId)}
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text"
            title="Close Terminal"
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
          <div key={index} className={`${line.startsWith('$') ? 'text-ide-success' : 'text-ide-text'}`}>
            {line}
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-ide-border">
        <div className="flex items-center gap-2">
          <span className="text-ide-success font-mono">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCommand(input)
              }
            }}
            className="flex-1 bg-transparent font-mono text-sm text-ide-text focus:outline-none"
            placeholder="Type a command..."
          />
        </div>
      </div>
    </div>
  )
}
