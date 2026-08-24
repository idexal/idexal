import React, { useState, useEffect, useCallback } from 'react'
import {
  Play, Square, RotateCw, Terminal, Plus, X,
  ChevronDown, ChevronRight, Clock, Check, AlertTriangle
} from 'lucide-react'

interface TaskRunnerPanelProps {
  onClose?: () => void
}

type TaskStatus = 'idle' | 'running' | 'completed' | 'failed'

interface TaskEntry {
  id: string
  name: string
  command: string
  status: TaskStatus
  output: string
  exitCode?: number
  startedAt?: number
  completedAt?: number
}

export default function TaskRunnerPanel({ onClose }: TaskRunnerPanelProps) {
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskCommand, setNewTaskCommand] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // Available scripts from package.json (simulated)
  const availableScripts = [
    { name: 'dev', command: 'vite --port 5173' },
    { name: 'build', command: 'vite build' },
    { name: 'test', command: 'vitest run' },
    { name: 'lint', command: 'eslint src --ext .ts,.tsx' },
    { name: 'typecheck', command: 'tsc --noEmit' },
    { name: 'preview', command: 'vite preview' },
    { name: 'format', command: 'prettier --write src' },
    { name: 'clean', command: 'rm -rf dist node_modules/.vite' },
  ]

  const runTask = useCallback((name: string, command: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const entry: TaskEntry = {
      id,
      name,
      command,
      status: 'running',
      output: `$ ${command}\n`,
      startedAt: Date.now(),
    }

    setTasks(prev => [...prev, entry])
    setActiveTask(id)

    // Simulate task execution
    setTimeout(() => {
      const success = Math.random() > 0.15
      const output = success
        ? `\n✓ ${name} completed successfully (${((Date.now() - entry.startedAt!) / 1000).toFixed(1)}s)\n`
        : `\n✗ ${name} failed with exit code 1\n  Error: Something went wrong\n`

      setTasks(prev => prev.map(t =>
        t.id === id ? {
          ...t,
          status: success ? 'completed' : 'failed',
          output: t.output + output,
          exitCode: success ? 0 : 1,
          completedAt: Date.now(),
        } : t
      ))
    }, 1500 + Math.random() * 2000)
  }, [])

  const stopTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'failed' as TaskStatus, output: t.output + '\n✗ Killed by user\n', exitCode: 130 } : t
    ))
    if (activeTask === id) setActiveTask(null)
  }

  const addCustomTask = () => {
    if (newTaskName.trim() && newTaskCommand.trim()) {
      runTask(newTaskName.trim(), newTaskCommand.trim())
      setNewTaskName('')
      setNewTaskCommand('')
      setShowNewTask(false)
    }
  }

  const rerunTask = (task: TaskEntry) => {
    runTask(task.name, task.command)
  }

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => t.status === 'running'))
  }

  const activeEntry = tasks.find(t => t.id === activeTask)

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-ide-success" />
          <span className="text-sm font-medium">Task Runner</span>
          <span className="text-xs text-ide-text-muted">
            {tasks.filter(t => t.status === 'running').length} running
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewTask(!showNewTask)}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Add Custom Task"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={clearCompleted}
            className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border"
            title="Clear Completed"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="p-3 border-b border-ide-border space-y-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Task name"
            className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
          <input
            type="text"
            value={newTaskCommand}
            onChange={(e) => setNewTaskCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
            placeholder="Command (e.g., npm run build)"
            className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={addCustomTask}
              disabled={!newTaskName.trim() || !newTaskCommand.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-ide-success text-white rounded hover:bg-ide-success/80 disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
            <button
              onClick={() => setShowNewTask(false)}
              className="px-3 py-1.5 text-xs bg-ide-bg border border-ide-border rounded hover:border-ide-accent text-ide-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scripts List */}
        <div className="border-b border-ide-border">
          <div className="px-3 py-2 text-[11px] font-medium text-ide-text-muted uppercase tracking-wide">
            Package Scripts
          </div>
          <div className="grid grid-cols-2 gap-1 px-2 pb-2">
            {availableScripts.map((script) => {
              const running = tasks.some(t => t.name === script.name && t.status === 'running')
              return (
                <button
                  key={script.name}
                  onClick={() => !running && runTask(script.name, script.command)}
                  disabled={running}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded border border-ide-border hover:border-ide-accent/50 hover:bg-ide-accent/5 disabled:opacity-50 text-left"
                >
                  {running ? (
                    <RotateCw className="w-3 h-3 text-ide-accent animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 text-ide-success" />
                  )}
                  <span className="text-ide-text font-mono truncate">{script.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Task History */}
        <div className="flex-1 overflow-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ide-text-muted gap-2">
              <Terminal className="w-8 h-8 opacity-30" />
              <div className="text-xs">Click a script to run it</div>
            </div>
          ) : (
            <div className="divide-y divide-ide-border">
              {[...tasks].reverse().map((task) => (
                <div key={task.id}>
                  {/* Task Header */}
                  <button
                    onClick={() => setActiveTask(activeTask === task.id ? null : task.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-border/30 text-left"
                  >
                    {task.status === 'running' ? (
                      <RotateCw className="w-3.5 h-3.5 text-ide-accent animate-spin flex-shrink-0" />
                    ) : task.status === 'completed' ? (
                      <Check className="w-3.5 h-3.5 text-ide-success flex-shrink-0" />
                    ) : task.status === 'failed' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-ide-error flex-shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
                    )}

                    <span className="text-xs font-mono text-ide-text truncate flex-1">{task.name}</span>
                    <span className="text-[10px] text-ide-text-muted font-mono">{task.command}</span>

                    {task.status === 'running' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); stopTask(task.id) }}
                        className="p-1 rounded text-ide-error hover:bg-ide-error/10"
                        title="Stop"
                      >
                        <Square className="w-3 h-3" />
                      </button>
                    )}

                    {task.status !== 'running' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); rerunTask(task) }}
                        className="p-1 rounded text-ide-text-muted hover:bg-ide-border"
                        title="Re-run"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    )}

                    {activeTask === task.id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-ide-text-muted" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-ide-text-muted" />
                    )}
                  </button>

                  {/* Task Output */}
                  {activeTask === task.id && (
                    <div className="bg-ide-bg border-t border-ide-border">
                      <pre className="p-3 text-xs font-mono text-ide-text overflow-x-auto whitespace-pre-wrap">
                        {task.output}
                      </pre>
                      {task.completedAt && task.startedAt && (
                        <div className="px-3 pb-2 text-[10px] text-ide-text-muted">
                          Duration: {((task.completedAt - task.startedAt) / 1000).toFixed(1)}s
                          {task.exitCode !== undefined && ` · Exit code: ${task.exitCode}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
