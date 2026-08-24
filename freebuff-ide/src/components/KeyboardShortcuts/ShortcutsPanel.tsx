import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Keyboard, X, Search, Edit3, Check, RotateCcw, Filter, ChevronDown } from 'lucide-react'

interface ShortcutsPanelProps {
  onClose: () => void
}

interface KeyBinding {
  id: string
  category: string
  command: string
  description: string
  keys: string[]
  isCustom: boolean
  enabled: boolean
}

const DEFAULT_BINDINGS: KeyBinding[] = [
  // Editor
  { id: 'editor.format', category: 'Editor', command: 'editor.action.formatDocument', description: 'Format Document', keys: ['Ctrl', 'Shift', 'F'], isCustom: false, enabled: true },
  { id: 'editor.find', category: 'Editor', command: 'actions.find', description: 'Find', keys: ['Ctrl', 'F'], isCustom: false, enabled: true },
  { id: 'editor.findReplace', category: 'Editor', command: 'editor.action.startFindReplaceAction', description: 'Find & Replace', keys: ['Ctrl', 'H'], isCustom: false, enabled: true },
  { id: 'editor.gotoLine', category: 'Editor', command: 'editor.action.gotoLine', description: 'Go to Line', keys: ['Ctrl', 'G'], isCustom: false, enabled: true },
  { id: 'editor.selectAll', category: 'Editor', command: 'editor.action.selectAll', description: 'Select All', keys: ['Ctrl', 'A'], isCustom: false, enabled: true },
  { id: 'editor.undo', category: 'Editor', command: 'undo', description: 'Undo', keys: ['Ctrl', 'Z'], isCustom: false, enabled: true },
  { id: 'editor.redo', category: 'Editor', command: 'redo', description: 'Redo', keys: ['Ctrl', 'Shift', 'Z'], isCustom: false, enabled: true },
  { id: 'editor.comment', category: 'Editor', command: 'editor.action.commentLine', description: 'Toggle Line Comment', keys: ['Ctrl', '/'], isCustom: false, enabled: true },
  { id: 'editor.duplicate', category: 'Editor', command: 'editor.action.copyLinesDownAction', description: 'Duplicate Line', keys: ['Shift', 'Alt', 'Down'], isCustom: false, enabled: true },
  { id: 'editor.deleteLine', category: 'Editor', command: 'editor.action.deleteLines', description: 'Delete Line', keys: ['Ctrl', 'Shift', 'K'], isCustom: false, enabled: true },
  { id: 'editor.moveLineUp', category: 'Editor', command: 'editor.action.moveLinesUpAction', description: 'Move Line Up', keys: ['Alt', 'Up'], isCustom: false, enabled: true },
  { id: 'editor.moveLineDown', category: 'Editor', command: 'editor.action.moveLinesDownAction', description: 'Move Line Down', keys: ['Alt', 'Down'], isCustom: false, enabled: true },
  { id: 'editor.indent', category: 'Editor', command: 'editor.action.indentLines', description: 'Indent Line', keys: ['Tab'], isCustom: false, enabled: true },
  { id: 'editor.outdent', category: 'Editor', command: 'editor.action.outdentLines', description: 'Outdent Line', keys: ['Shift', 'Tab'], isCustom: false, enabled: true },

  // Navigation
  { id: 'nav.quickOpen', category: 'Navigation', command: 'workbench.action.quickOpen', description: 'Quick Open File', keys: ['Ctrl', 'P'], isCustom: false, enabled: true },
  { id: 'nav.commandPalette', category: 'Navigation', command: 'workbench.action.showCommands', description: 'Command Palette', keys: ['Ctrl', 'Shift', 'P'], isCustom: false, enabled: true },
  { id: 'nav.toggleSidebar', category: 'Navigation', command: 'workbench.action.toggleSidebarVisibility', description: 'Toggle Sidebar', keys: ['Ctrl', 'B'], isCustom: false, enabled: true },
  { id: 'nav.goToDefinition', category: 'Navigation', command: 'editor.action.revealDefinition', description: 'Go to Definition', keys: ['F12'], isCustom: false, enabled: true },
  { id: 'nav.peekDefinition', category: 'Navigation', command: 'editor.action.peekDefinition', description: 'Peek Definition', keys: ['Alt', 'F12'], isCustom: false, enabled: true },
  { id: 'nav.findReferences', category: 'Navigation', command: 'editor.action.findReferences', description: 'Find References', keys: ['Shift', 'F12'], isCustom: false, enabled: true },
  { id: 'nav.rename', category: 'Navigation', command: 'editor.action.rename', description: 'Rename Symbol', keys: ['F2'], isCustom: false, enabled: true },

  // View
  { id: 'view.terminal', category: 'View', command: 'workbench.action.terminal.toggleTerminal', description: 'Toggle Terminal', keys: ['Ctrl', '`'], isCustom: false, enabled: true },
  { id: 'view.chat', category: 'View', command: 'idexal.toggleChat', description: 'Toggle AI Chat', keys: ['Ctrl', 'Shift', 'A'], isCustom: false, enabled: true },
  { id: 'view.git', category: 'View', command: 'idexal.toggleGit', description: 'Toggle Git Panel', keys: ['Ctrl', 'Shift', 'G'], isCustom: false, enabled: true },
  { id: 'view.debug', category: 'View', command: 'idexal.toggleDebug', description: 'Toggle Debug Panel', keys: ['Ctrl', 'Shift', 'D'], isCustom: false, enabled: true },
  { id: 'view.agents', category: 'View', command: 'idexal.toggleAgents', description: 'Toggle Agent Dashboard', keys: ['Ctrl', 'Shift', 'M'], isCustom: false, enabled: true },
  { id: 'view.outline', category: 'View', command: 'idexal.toggleOutline', description: 'Toggle Symbol Outline', keys: ['Ctrl', 'Shift', 'O'], isCustom: false, enabled: true },
  { id: 'view.tasks', category: 'View', command: 'idexal.toggleTasks', description: 'Toggle Task Runner', keys: ['Ctrl', 'Shift', 'R'], isCustom: false, enabled: true },
  { id: 'view.settings', category: 'View', command: 'workbench.action.openSettings', description: 'Open Settings', keys: ['Ctrl', ','], isCustom: false, enabled: true },
  { id: 'view.zoomIn', category: 'View', command: 'workbench.action.zoomIn', description: 'Zoom In', keys: ['Ctrl', '='], isCustom: false, enabled: true },
  { id: 'view.zoomOut', category: 'View', command: 'workbench.action.zoomOut', description: 'Zoom Out', keys: ['Ctrl', '-'], isCustom: false, enabled: true },

  // File
  { id: 'file.new', category: 'File', command: 'workbench.action.files.newFile', description: 'New File', keys: ['Ctrl', 'N'], isCustom: false, enabled: true },
  { id: 'file.open', category: 'File', command: 'workbench.action.files.openFile', description: 'Open File', keys: ['Ctrl', 'O'], isCustom: false, enabled: true },
  { id: 'file.save', category: 'File', command: 'workbench.action.files.save', description: 'Save', keys: ['Ctrl', 'S'], isCustom: false, enabled: true },
  { id: 'file.saveAll', category: 'File', command: 'workbench.action.files.saveAll', description: 'Save All', keys: ['Ctrl', 'Shift', 'S'], isCustom: false, enabled: true },
  { id: 'file.close', category: 'File', command: 'workbench.action.closeActiveEditor', description: 'Close Editor', keys: ['Ctrl', 'W'], isCustom: false, enabled: true },
  { id: 'file.closeAll', category: 'File', command: 'workbench.action.closeAllEditors', description: 'Close All Editors', keys: ['Ctrl', 'K', 'W'], isCustom: false, enabled: true },

  // Git
  { id: 'git.commit', category: 'Git', command: 'git.commit', description: 'Commit', keys: ['Ctrl', 'Enter'], isCustom: false, enabled: true },
  { id: 'git.pull', category: 'Git', command: 'git.pull', description: 'Pull', keys: ['Ctrl', 'Shift', 'P'], isCustom: false, enabled: true },
  { id: 'git.push', category: 'Git', command: 'git.push', description: 'Push', keys: ['Ctrl', 'Shift', 'U'], isCustom: false, enabled: true },

  // Debug
  { id: 'debug.start', category: 'Debug', command: 'debug.action.start', description: 'Start Debugging', keys: ['F5'], isCustom: false, enabled: true },
  { id: 'debug.stop', category: 'Debug', command: 'workbench.action.debug.stop', description: 'Stop Debugging', keys: ['Shift', 'F5'], isCustom: false, enabled: true },
  { id: 'debug.stepOver', category: 'Debug', command: 'debug.action.stepOver', description: 'Step Over', keys: ['F10'], isCustom: false, enabled: true },
  { id: 'debug.stepInto', category: 'Debug', command: 'debug.action.stepInto', description: 'Step Into', keys: ['F11'], isCustom: false, enabled: true },
  { id: 'debug.stepOut', category: 'Debug', command: 'debug.action.stepOut', description: 'Step Out', keys: ['Shift', 'F11'], isCustom: false, enabled: true },
  { id: 'debug.toggleBreakpoint', category: 'Debug', command: 'editor.debug.action.toggleBreakpoint', description: 'Toggle Breakpoint', keys: ['F9'], isCustom: false, enabled: true },
]

export default function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  const [bindings, setBindings] = useState<KeyBinding[]>(() => {
    try {
      const saved = localStorage.getItem('idexal-keybindings')
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_BINDINGS
  })
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [recordingKeys, setRecordingKeys] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)

  const categories = useMemo(() => {
    return ['all', ...new Set(bindings.map(b => b.category))]
  }, [bindings])

  const filtered = useMemo(() => {
    let result = bindings
    if (filterCategory !== 'all') {
      result = result.filter(b => b.category === filterCategory)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        b.description.toLowerCase().includes(q) ||
        b.command.toLowerCase().includes(q) ||
        b.keys.some(k => k.toLowerCase().includes(q))
      )
    }
    return result
  }, [bindings, search, filterCategory])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('idexal-keybindings', JSON.stringify(bindings))
  }, [bindings])

  // Record key combination
  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const key = e.key
      const keyName = key === ' ' ? 'Space' :
        key === 'Escape' ? '' :
        key.length === 1 ? key.toUpperCase() :
        key === 'Control' ? 'Ctrl' :
        key === 'Meta' ? 'Cmd' :
        key.startsWith('F') && !isNaN(parseInt(key.slice(1))) ? key :
        key.charAt(0).toUpperCase() + key.slice(1)

      if (key === 'Escape') {
        setIsRecording(false)
        setRecordingKeys([])
        return
      }

      if (key === 'Enter') {
        // Save the new keybinding
        if (editingId && recordingKeys.length > 0) {
          setBindings(prev => prev.map(b =>
            b.id === editingId ? { ...b, keys: recordingKeys, isCustom: true } : b
          ))
        }
        setIsRecording(false)
        setRecordingKeys([])
        setEditingId(null)
        return
      }

      if (keyName && !recordingKeys.includes(keyName)) {
        setRecordingKeys(prev => [...prev, keyName])
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecording, editingId, recordingKeys])

  const startRecording = (id: string) => {
    setEditingId(id)
    setRecordingKeys([])
    setIsRecording(true)
  }

  const resetBinding = (id: string) => {
    const original = DEFAULT_BINDINGS.find(b => b.id === id)
    if (original) {
      setBindings(prev => prev.map(b =>
        b.id === id ? { ...original, isCustom: false } : b
      ))
    }
  }

  const resetAll = () => {
    setBindings(DEFAULT_BINDINGS)
  }

  const toggleBinding = (id: string) => {
    setBindings(prev => prev.map(b =>
      b.id === id ? { ...b, enabled: !b.enabled } : b
    ))
  }

  const renderKeys = (keys: string[]) => {
    return keys.map((key, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-ide-text-muted mx-0.5">+</span>}
        <kbd className="px-1.5 py-0.5 text-[10px] bg-ide-bg border border-ide-border rounded font-mono text-ide-text min-w-[24px] text-center">
          {key}
        </kbd>
      </React.Fragment>
    ))
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Keyboard Shortcuts</span>
          <span className="text-xs text-ide-text-muted">{bindings.length} bindings</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetAll}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-ide-text-muted hover:text-ide-text hover:bg-ide-border rounded"
            title="Reset All"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recording Banner */}
      {isRecording && (
        <div className="px-4 py-3 bg-ide-accent/10 border-b border-ide-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-ide-accent animate-pulse" />
            <span className="text-xs text-ide-accent font-medium">Press key combination...</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {recordingKeys.length > 0 ? renderKeys(recordingKeys) : (
                <span className="text-xs text-ide-text-muted italic">Waiting for keys...</span>
              )}
            </div>
            <span className="text-[10px] text-ide-text-muted">Enter to save · Esc to cancel</span>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="p-3 space-y-2 border-b border-ide-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcuts..."
            className="w-full pl-8 pr-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 text-[10px] rounded whitespace-nowrap transition-colors ${
                filterCategory === cat
                  ? 'bg-ide-accent/20 text-ide-accent border border-ide-accent/30'
                  : 'text-ide-text-muted hover:text-ide-text border border-transparent'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bindings List */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-ide-surface border-b border-ide-border">
            <tr className="text-left text-[10px] text-ide-text-muted uppercase tracking-wide">
              <th className="px-4 py-2 font-medium">Command</th>
              <th className="px-4 py-2 font-medium w-48">Keybinding</th>
              <th className="px-4 py-2 font-medium w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((binding) => (
              <tr
                key={binding.id}
                className={`border-b border-ide-border/50 hover:bg-ide-border/20 ${
                  !binding.enabled ? 'opacity-50' : ''
                } ${editingId === binding.id ? 'bg-ide-accent/5' : ''}`}
              >
                <td className="px-4 py-2">
                  <div className="text-xs text-ide-text">{binding.description}</div>
                  <div className="text-[10px] text-ide-text-muted font-mono">{binding.command}</div>
                </td>
                <td className="px-4 py-2">
                  {editingId === binding.id ? (
                    <div className="flex items-center gap-1">
                      {recordingKeys.length > 0 ? renderKeys(recordingKeys) : (
                        <span className="text-[10px] text-ide-accent animate-pulse">Press keys...</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {renderKeys(binding.keys)}
                      {binding.isCustom && (
                        <span className="ml-1 text-[9px] text-ide-accent bg-ide-accent/10 px-1 rounded">custom</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startRecording(binding.id)}
                      disabled={isRecording}
                      className="p-1 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-accent disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {binding.isCustom && (
                      <button
                        onClick={() => resetBinding(binding.id)}
                        className="p-1 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-warning"
                        title="Reset to Default"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleBinding(binding.id)}
                      className={`p-1 rounded ${binding.enabled ? 'text-ide-success hover:bg-ide-success/10' : 'text-ide-text-muted hover:bg-ide-border'}`}
                      title={binding.enabled ? 'Disable' : 'Enable'}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-ide-text-muted">
            No shortcuts found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-ide-border text-[10px] text-ide-text-muted flex items-center justify-between">
        <span>{filtered.length} of {bindings.length} shortcuts shown</span>
        <span>Press Enter to save · Esc to cancel</span>
      </div>
    </div>
  )
}
