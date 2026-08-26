import React, { useState, useMemo, useCallback } from 'react'
import {
  FaSearch, FaTimes, FaChevronDown, FaChevronRight, FaExclamationTriangle, FaExclamationCircle, FaLightbulb, FaBug, FaCode, FaFilter
} from '../Icon'

interface TodoFinderProps {
  onClose?: () => void
}

type TodoTag = 'TODO' | 'FIXME' | 'HACK' | 'BUG' | 'NOTE' | 'XXX'

interface TodoItem {
  id: string
  tag: TodoTag
  message: string
  file: string
  line: number
  column: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  context: string
}

const TAG_CONFIG: Record<TodoTag, { icon: React.ReactNode; color: string; bgColor: string; priority: TodoItem['priority'] }> = {
  TODO: { icon: <FaLightbulb className="w-3 h-3" />, color: 'text-blue-400', bgColor: 'bg-blue-400/10', priority: 'low' },
  FIXME: { icon: <FaExclamationTriangle className="w-3 h-3" />, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', priority: 'medium' },
  HACK: { icon: <FaCode className="w-3 h-3" />, color: 'text-orange-400', bgColor: 'bg-orange-400/10', priority: 'high' },
  BUG: { icon: <FaBug className="w-3 h-3" />, color: 'text-red-400', bgColor: 'bg-red-400/10', priority: 'critical' },
  NOTE: { icon: <FaSearch className="w-3 h-3" />, color: 'text-gray-400', bgColor: 'bg-gray-400/10', priority: 'low' },
  XXX: { icon: <FaExclamationCircle className="w-3 h-3" />, color: 'text-purple-400', bgColor: 'bg-purple-400/10', priority: 'high' },
}

const MOCK_TODOS: TodoItem[] = [
  { id: '1', tag: 'FIXME', message: 'Memory leak in useEffect cleanup - need to cancel subscriptions', file: 'src/hooks/useAgent.ts', line: 45, column: 0, priority: 'high', context: 'const unsubscribe = api.subscribe()' },
  { id: '2', tag: 'TODO', message: 'Implement real WebSocket connection for live updates', file: 'src/services/aiStreamingService.ts', line: 120, column: 0, priority: 'medium', context: '// TODO: WebSocket support' },
  { id: '3', tag: 'HACK', message: 'Temporary workaround for Monaco editor resize bug', file: 'src/components/Editor/MonacoEditor.tsx', line: 67, column: 0, priority: 'high', context: '// HACK: force resize after mount' },
  { id: '4', tag: 'BUG', message: 'Tab closing does not update activeTabId correctly when split view', file: 'src/stores/editorStore.ts', line: 34, column: 0, priority: 'critical', context: 'closeTab: (id) => {' },
  { id: '5', tag: 'TODO', message: 'Add proper error boundaries around async operations', file: 'src/components/AI/ChatPanel.tsx', line: 89, column: 0, priority: 'medium', context: 'try { await sendMessage()' },
  { id: '6', tag: 'TODO', message: 'Implement undo/redo for terminal input', file: 'src/components/Terminal/TerminalPanel.tsx', line: 156, column: 0, priority: 'low', context: 'const handleKeyDown' },
  { id: '7', tag: 'FIXME', message: 'Race condition when multiple agents write to shared memory', file: 'src/services/agentOrchestrator.ts', line: 234, column: 0, priority: 'high', context: 'this.sharedMemory.set(key, entry)' },
  { id: '8', tag: 'NOTE', message: 'Consider switching to Web Workers for heavy computations', file: 'src/services/codeIntelligenceService.ts', line: 78, column: 0, priority: 'low', context: 'extractSymbols(content: string' },
  { id: '9', tag: 'TODO', message: 'Add connection pooling for database viewer', file: 'src/components/Database/DatabaseViewer.tsx', line: 23, column: 0, priority: 'medium', context: 'const [connected, setConnected]' },
  { id: '10', tag: 'XXX', message: 'Security: Sanitize user input before displaying in terminal', file: 'src/components/Terminal/TerminalPanel.tsx', line: 88, column: 0, priority: 'critical', context: 'terminal.write(data)' },
]

export default function TodoFinderPanel({ onClose }: TodoFinderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<TodoTag | 'all'>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'file' | 'tag'>('priority')
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const filteredTodos = useMemo(() => {
    let result = MOCK_TODOS

    if (activeTag !== 'all') {
      result = result.filter(t => t.tag === activeTag)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.message.toLowerCase().includes(q) ||
        t.file.toLowerCase().includes(q) ||
        t.context.toLowerCase().includes(q)
      )
    }

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

    if (sortBy === 'priority') {
      result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    } else if (sortBy === 'file') {
      result.sort((a, b) => a.file.localeCompare(b.file))
    } else {
      result.sort((a, b) => a.tag.localeCompare(b.tag))
    }

    return result
  }, [activeTag, searchQuery, sortBy])

  const groupedByFile = useMemo(() => {
    const groups: Record<string, TodoItem[]> = {}
    for (const todo of filteredTodos) {
      if (!groups[todo.file]) groups[todo.file] = []
      groups[todo.file].push(todo)
    }
    return groups
  }, [filteredTodos])

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: MOCK_TODOS.length }
    for (const todo of MOCK_TODOS) {
      counts[todo.tag] = (counts[todo.tag] || 0) + 1
    }
    return counts
  }, [])

  const toggleFile = (file: string) => {
    const next = new Set(expandedFiles)
    if (next.has(file)) next.delete(file)
    else next.add(file)
    setExpandedFiles(next)
  }

  const getPriorityBadge = (priority: TodoItem['priority']) => {
    const styles = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    }
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${styles[priority]}`}>
        {priority}
      </span>
    )
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaSearch className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">TODO Finder</span>
          <span className="text-[10px] text-ide-text-muted">{filteredTodos.length} items</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <FaTimes className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="p-2 space-y-2 border-b border-ide-border">
        <div className="relative">
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TODOs..."
            className="w-full pl-8 pr-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTag('all')}
            className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors ${
              activeTag === 'all' ? 'bg-ide-accent/20 text-ide-accent border border-ide-accent/30' : 'text-ide-text-muted border border-transparent hover:text-ide-text'
            }`}
          >
            All ({tagCounts.all})
          </button>
          {(Object.keys(TAG_CONFIG) as TodoTag[]).map(tag => {
            const config = TAG_CONFIG[tag]
            const count = tagCounts[tag] || 0
            if (count === 0) return null
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? 'all' : tag)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition-colors ${
                  activeTag === tag ? `${config.bgColor} ${config.color} border border-current/30` : 'text-ide-text-muted border border-transparent hover:text-ide-text'
                }`}
              >
                {config.icon}
                {tag} ({count})
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ide-text-muted">Sort:</span>
          {(['priority', 'file', 'tag'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                sortBy === s ? 'bg-ide-surface text-ide-text border border-ide-border' : 'text-ide-text-muted hover:text-ide-text'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {filteredTodos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-muted">
            <div className="text-center">
              <FaSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <div className="text-sm">No TODOs found</div>
            </div>
          </div>
        ) : sortBy === 'file' ? (
          // Grouped by file
          <div className="py-1">
            {Object.entries(groupedByFile).map(([file, items]) => (
              <div key={file}>
                <button
                  onClick={() => toggleFile(file)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-ide-border/30 text-left"
                >
                  {expandedFiles.has(file) ? <FaChevronDown className="w-3 h-3 text-ide-text-muted" /> : <FaChevronRight className="w-3 h-3 text-ide-text-muted" />}
                  <span className="text-xs text-ide-text truncate flex-1 font-mono">{file}</span>
                  <span className="text-[10px] text-ide-text-muted">{items.length}</span>
                </button>
                {expandedFiles.has(file) && items.map(item => (
                  <div key={item.id} className="ml-6 px-3 py-1.5 hover:bg-ide-border/20 flex items-start gap-2">
                    <div className={`mt-0.5 ${TAG_CONFIG[item.tag].color}`}>{TAG_CONFIG[item.tag].icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ide-text">{item.message}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {getPriorityBadge(item.priority)}
                        <span className="text-[10px] text-ide-text-muted">L{item.line}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Flat list (by priority or tag)
          <div className="py-1">
            {filteredTodos.map(item => (
              <div key={item.id} className="px-3 py-2 hover:bg-ide-border/20 flex items-start gap-2">
                <div className={`mt-0.5 ${TAG_CONFIG[item.tag].color}`}>{TAG_CONFIG[item.tag].icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold ${TAG_CONFIG[item.tag].color}`}>{item.tag}</span>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <div className="text-xs text-ide-text">{item.message}</div>
                  <div className="text-[10px] text-ide-text-muted font-mono mt-0.5">
                    {item.file}:{item.line}
                  </div>
                  <div className="text-[10px] text-ide-text-muted mt-0.5 italic truncate">
                    {item.context}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-muted">
        <div className="flex items-center gap-3">
          <span className="text-red-400">{tagCounts.BUG || 0} bugs</span>
          <span className="text-yellow-400">{tagCounts.FIXME || 0} fixes</span>
          <span className="text-blue-400">{tagCounts.TODO || 0} todos</span>
        </div>
        <span>{filteredTodos.length} items shown</span>
      </div>
    </div>
  )
}
