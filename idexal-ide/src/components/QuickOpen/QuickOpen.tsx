import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  FaSearch, FaFileAlt, FaFileCode, FaTimes
} from '../Icon'
import { fileSystemService, detectLanguage } from '../../services/fileSystemService'
import { useEditorStore } from '../../stores/editorStore'

interface QuickOpenProps {
  onClose: () => void
}

interface QuickOpenItem {
  id: string
  name: string
  path: string
  type: 'file' | 'command'
  language?: string
  icon?: string
  description?: string
}

const COMMANDS: QuickOpenItem[] = [
  { id: 'c1', name: 'Open Settings', path: 'settings', type: 'command', icon: '⚙️', description: 'Open IDE settings' },
  { id: 'c2', name: 'Toggle Sidebar', path: 'toggle-sidebar', type: 'command', icon: '📁', description: 'Show/hide sidebar' },
  { id: 'c3', name: 'Toggle Terminal', path: 'toggle-terminal', type: 'command', icon: '💻', description: 'Show/hide terminal' },
  { id: 'c4', name: 'Toggle AI Chat', path: 'toggle-chat', type: 'command', icon: '🤖', description: 'Show/hide AI chat' },
  { id: 'c5', name: 'Format Document', path: 'format', type: 'command', icon: '✨', description: 'Format current document' },
  { id: 'c6', name: 'Change Theme', path: 'theme', type: 'command', icon: '🎨', description: 'Switch between themes' },
  { id: 'c7', name: 'Keyboard Shortcuts', path: 'shortcuts', type: 'command', icon: '⌨️', description: 'View all shortcuts' },
  { id: 'c8', name: 'New File', path: 'new-file', type: 'command', icon: '📄', description: 'Create a new file' },
  { id: 'c9', name: 'Open Folder', path: 'open-folder', type: 'command', icon: '📂', description: 'Open a folder' },
]

export default function QuickOpen({ onClose }: QuickOpenProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<'files' | 'commands'>('files')
  const [files, setFiles] = useState<QuickOpenItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const { openTab } = useEditorStore()

  // Load files on mount
  useEffect(() => {
    fileSystemService.readDir('/mock/project').then((result) => {
      if (result.success && result.tree) {
        const allFiles = fileSystemService.getAllFiles(result.tree)
        setFiles(allFiles.map((f: any, i: number) => ({
          id: `f${i}`,
          name: f.name,
          path: f.path,
          type: 'file' as const,
          language: f.extension ? f.extension.replace('.', '') : undefined,
        })))
      }
    })
  }, [])

  const items = useMemo(() => {
    const source = mode === 'files' ? files : COMMANDS
    if (!query) return source.slice(0, 20)

    const q = query.toLowerCase()
    return source.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aStart = a.name.toLowerCase().startsWith(q) ? 2 : a.name.toLowerCase().includes(q) ? 1 : 0
      const bStart = b.name.toLowerCase().startsWith(q) ? 2 : b.name.toLowerCase().includes(q) ? 1 : 0
      return bStart - aStart
    }).slice(0, 20)
  }, [query, mode, files])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, mode])

  const handleSelect = useCallback(async (item: QuickOpenItem) => {
    if (item.type === 'file') {
      const result = await fileSystemService.readFile(item.path)
      if (result.success && result.content) {
        const lang = detectLanguage(item.path)
        openTab({ name: item.name, path: item.path, content: result.content, language: lang })
      }
    }
    onClose()
  }, [openTab, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[selectedIndex]) {
        handleSelect(items[selectedIndex])
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setMode(prev => prev === 'files' ? 'commands' : 'files')
    }
  }

  const getLanguageColor = (lang?: string) => {
    const colors: Record<string, string> = {
      typescript: 'text-blue-400',
      javascript: 'text-yellow-400',
      rust: 'text-orange-400',
      python: 'text-green-400',
      json: 'text-yellow-300',
      markdown: 'text-gray-400',
    }
    return colors[lang || ''] || 'text-ide-text-muted'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50" onClick={onClose}>
      <div className="w-full max-w-lg bg-ide-surface border border-ide-border rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ide-border">
          <FaSearch className="w-5 h-5 text-ide-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'files' ? 'Search files by name...' : 'Run a command...'}
            className="flex-1 bg-transparent text-ide-text placeholder:text-ide-text-muted focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode('files')}
              className={`px-2 py-0.5 text-xs rounded ${mode === 'files' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:bg-ide-border'}`}
            >
              Files
            </button>
            <button
              onClick={() => setMode('commands')}
              className={`px-2 py-0.5 text-xs rounded ${mode === 'commands' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:bg-ide-border'}`}
            >
              Commands
            </button>
          </div>
          <button onClick={onClose} className="text-ide-text-muted hover:text-ide-text">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-ide-text-muted">No results</div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
                  index === selectedIndex
                    ? 'bg-ide-accent/10 text-ide-accent'
                    : 'text-ide-text hover:bg-ide-border/30'
                }`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {mode === 'files' ? (
                  <FaFileCode className={`w-4 h-4 flex-shrink-0 ${getLanguageColor(item.language)}`} />
                ) : (
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.name}</div>
                  <div className="text-[11px] text-ide-text-muted truncate">{item.path}</div>
                </div>
                {item.language && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded bg-ide-bg ${getLanguageColor(item.language)}`}>
                    {item.language}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-ide-border flex items-center gap-4 text-[10px] text-ide-text-muted">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Tab Switch</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}
