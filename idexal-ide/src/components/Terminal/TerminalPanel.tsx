import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { FaTimes, FaTerminal, FaPlus, FaTrash, FaEraser, FaExpand, FaCompress } from '../Icon'

interface TerminalPanelProps {
  onClose: () => void
}

interface TerminalSession {
  id: string
  name: string
  terminal: Terminal | null
  fitAddon: FitAddon | null
  history: string[]
  cwd: string
  isRunning: boolean
}

let sessionCounter = 0

function createTerminal(): { terminal: Terminal; fitAddon: FitAddon } {
  const terminal = new Terminal({
    theme: {
      background: '#0a0e1a',
      foreground: '#c9d1d9',
      cursor: '#3b82f6',
      cursorAccent: '#0a0e1a',
      selectionBackground: '#264f7880',
      selectionForeground: '#c9d1d9',
      black: '#484f58',
      red: '#ff7b72',
      green: '#10b981',
      yellow: '#ffa657',
      blue: '#3b82f6',
      magenta: '#8b5cf6',
      cyan: '#06b6d4',
      white: '#c9d1d9',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan: '#22d3ee',
      brightWhite: '#f0f6fc',
    },
    fontFamily: "'JetBrains Mono', 'Fira FaCode', 'Cascadia FaCode', 'Consolas', monospace",
    fontSize: 14,
    lineHeight: 1.4,
    cursorBlink: true,
    cursorStyle: 'bar',
    allowTransparency: true,
    scrollback: 10000,
    tabStopWidth: 4,
  })

  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  return { terminal, fitAddon }
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionsRef = useRef<Map<string, TerminalSession>>(new Map())

  // Initialize first session
  useEffect(() => {
    const session = createNewSession()
    setSessions([session])
    setActiveSessionId(session.id)
    sessionsRef.current.set(session.id, session)

    return () => {
      // Cleanup all terminals
      sessionsRef.current.forEach(s => s.terminal?.dispose())
      sessionsRef.current.clear()
    }
  }, [])

  const createNewSession = useCallback((): TerminalSession => {
    sessionCounter++
    const { terminal, fitAddon } = createTerminal()
    const id = `term-${sessionCounter}`
    const cwd = '~'

    const session: TerminalSession = {
      id,
      name: `Terminal ${sessionCounter}`,
      terminal,
      fitAddon,
      history: [`$ Welcome to Idexal Terminal (${id})`],
      cwd,
      isRunning: false,
    }

    // Connect to shell via Electron IPC or browser mock
    terminal.onData((data) => {
      const lastHistory = session.history[session.history.length - 1] || ''
      if (data === '\r') {
        // Enter pressed
        const command = lastHistory.replace(/^\$\s*/, '')
        if (command.trim()) {
          executeCommand(session, command)
        }
        session.history.push('$ ')
      } else if (data === '\x7f') {
        // Backspace
        if (lastHistory.length > 2) {
          session.history[session.history.length - 1] = lastHistory.slice(0, -1)
        }
      } else if (data === '\x03') {
        // Ctrl+C
        session.history.push('^C')
        session.history.push('$ ')
      } else if (data >= ' ') {
        session.history[session.history.length - 1] = lastHistory + data
      }

      // Write to xterm for rendering
      if (data === '\r') {
        terminal.writeln('')
        terminal.write('$ ')
      } else if (data === '\x7f') {
        terminal.write('\b \b')
      } else if (data === '\x03') {
        terminal.writeln('^C')
        terminal.write('$ ')
      } else {
        terminal.write(data)
      }
    })

    return session
  }, [])

  const executeCommand = async (session: TerminalSession, command: string) => {
    session.isRunning = true

    // Use the terminal IPC handlers for real command execution
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.terminalWrite && session.id) {
      try {
        await electronAPI.terminalWrite(session.id, command + '\n')
      } catch (err: any) {
        const errMsg = err.message || 'Command failed'
        session.history.push(errMsg)
        session.terminal?.writeln(errMsg)
      }
    } else {
      // Browser fallback - mock responses
      const responses: Record<string, string> = {
        'ls': 'src/  components/  services/  stores/  hooks/  types/  App.tsx  main.tsx  package.json',
        'pwd': session.cwd,
        'whoami': 'idexal',
        'date': new Date().toString(),
        'echo': command.replace('echo ', ''),
        'clear': '',
        'help': 'Available: ls, pwd, whoami, date, echo, clear, help, cat, mkdir, touch, rm, cp, mv, git, npm, node',
        'cat': 'Usage: cat <filename>',
        'mkdir': 'Directory created',
        'touch': 'File created',
        'rm': 'File removed',
        'cp': 'File copied',
        'mv': 'File moved',
        'git': 'git version 2.43.0',
        'npm': 'npm v10.2.0',
        'node': 'v20.11.0',
        'python': 'Python 3.12.1',
        'rustc': 'rustc 1.77.0',
        'cargo': 'cargo 1.77.0',
      }

      const cmd = command.split(' ')[0]
      const response = responses[cmd] || `idexal: ${cmd}: command not found`
      if (response) {
        session.history.push(response)
        session.terminal?.writeln(response)
      }
    }

    session.isRunning = false
  }

  // Mount terminal to DOM when active session changes
  useEffect(() => {
    if (!activeSessionId || !containerRef.current) return
    const session = sessionsRef.current.get(activeSessionId)
    if (!session || !session.terminal) return

    // Clear container and open terminal properly
    containerRef.current.innerHTML = ''
    session.terminal.open(containerRef.current)

    // Fit and focus
    requestAnimationFrame(() => {
      session.fitAddon?.fit()
      session.terminal?.focus()
    })

    // Write initial prompt
    if (session.history.length <= 1) {
      session.terminal.write('$ ')
    }
  }, [activeSessionId])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const session = activeSessionId ? sessionsRef.current.get(activeSessionId) : null
      if (session?.fitAddon) {
        session.fitAddon.fit()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeSessionId])

  const addSession = () => {
    const session = createNewSession()
    sessionsRef.current.set(session.id, session)
    setSessions(prev => [...prev, session])
    setActiveSessionId(session.id)
    // The useEffect for activeSessionId will handle mounting
  }

  const closeSession = (id: string) => {
    const session = sessionsRef.current.get(id)
    if (session) {
      session.terminal?.dispose()
      sessionsRef.current.delete(id)
    }
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeSessionId === id) {
        setActiveSessionId(next.length > 0 ? next[next.length - 1].id : null)
      }
      return next
    })
  }

  const clearSession = () => {
    const session = activeSessionId ? sessionsRef.current.get(activeSessionId) : null
    if (session?.terminal) {
      session.terminal.clear()
      session.history = ['$ ']
      session.terminal.write('$ ')
    }
  }

  const activeSession = sessions.find(s => s.id === activeSessionId)

  return (
    <div className={`h-full flex flex-col bg-ide-surface ${maximized ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="h-10 flex items-center justify-between border-b border-ide-border bg-ide-surface brand-line-top">
        <div className="flex items-center h-full overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`h-full px-4 flex items-center gap-2 text-sm border-r border-ide-border transition-colors whitespace-nowrap ${
                session.id === activeSessionId
                  ? 'bg-ide-surface text-ide-brand tab-active'
                  : 'text-ide-text-dim hover:bg-ide-surface-alt/40 hover:text-ide-text'
              }`}
            >
              <FaTerminal className="w-3.5 h-3.5 text-ide-brand-light" />
              <span>{session.name}</span>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeSession(session.id) }}
                  className="p-0.5 rounded hover:bg-ide-border opacity-60 hover:opacity-100"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}

          <button
            onClick={addSession}
            className="h-full px-3 text-ide-text-dim hover:text-ide-brand hover:bg-ide-brand-50 transition-colors"
            title="New Terminal"
          >
            <FaPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-2">
          <button
            onClick={clearSession}
            className="p-1.5 rounded hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-brand transition-colors"
            title="Clear Terminal"
          >
            <FaEraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMaximized(!maximized)}
            className="p-1.5 rounded hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-brand transition-colors"
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <FaCompress className="w-3.5 h-3.5" /> : <FaExpand className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-brand transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden p-2"
        onClick={() => activeSession?.terminal?.focus()}
      />

      {/* Status Bar */}
      <div className="h-6 flex items-center justify-between px-3 border-t border-ide-border bg-ide-surface text-[10px] text-ide-text-dim status-bar-gradient">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-brand-pulse" />
            Shell Ready
          </span>
          <span>{activeSession?.cwd || '~'}</span>
        </div>
        <span>{activeSession?.history.length || 0} lines</span>
      </div>
    </div>
  )
}