import React, { useState, useEffect, useRef } from 'react'
import { 
  Search, 
  FileText, 
  Settings, 
  Terminal, 
  MessageSquare,
  GitBranch,
  Boxes,
  Brain,
  Layout,
  Palette,
  Keyboard
} from 'lucide-react'

interface CommandPaletteProps {
  onClose: () => void
}

interface Command {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  shortcut?: string
}

const COMMANDS: Command[] = [
  { id: 'open-file', name: 'Open File', description: 'Open a file in the editor', icon: <FileText className="w-4 h-4" />, category: 'File', shortcut: '⌘O' },
  { id: 'save-file', name: 'Save File', description: 'Save the current file', icon: <FileText className="w-4 h-4" />, category: 'File', shortcut: '⌘S' },
  { id: 'new-file', name: 'New File', description: 'Create a new file', icon: <FileText className="w-4 h-4" />, category: 'File', shortcut: '⌘N' },
  { id: 'toggle-sidebar', name: 'Toggle Sidebar', description: 'Show or hide the sidebar', icon: <Layout className="w-4 h-4" />, category: 'View', shortcut: '⌘B' },
  { id: 'toggle-terminal', name: 'Toggle Terminal', description: 'Show or hide the terminal', icon: <Terminal className="w-4 h-4" />, category: 'View', shortcut: '⌘`' },
  { id: 'toggle-chat', name: 'Toggle AI Chat', description: 'Show or hide the AI chat panel', icon: <MessageSquare className="w-4 h-4" />, category: 'View', shortcut: '⌘⇧A' },
  { id: 'git-commit', name: 'Git: Commit', description: 'Commit staged changes', icon: <GitBranch className="w-4 h-4" />, category: 'Git' },
  { id: 'git-push', name: 'Git: Push', description: 'Push commits to remote', icon: <GitBranch className="w-4 h-4" />, category: 'Git' },
  { id: 'agent-code', name: 'Agent: Code', description: 'Switch to Code Agent', icon: <Boxes className="w-4 h-4" />, category: 'Agents' },
  { id: 'agent-review', name: 'Agent: Review', description: 'Switch to Review Agent', icon: <Boxes className="w-4 h-4" />, category: 'Agents' },
  { id: 'agent-debug', name: 'Agent: Debug', description: 'Switch to Debug Agent', icon: <Boxes className="w-4 h-4" />, category: 'Agents' },
  { id: 'memory-search', name: 'Memory: Search', description: 'Search memory store', icon: <Brain className="w-4 h-4" />, category: 'Memory' },
  { id: 'settings', name: 'Settings', description: 'Open IDE settings', icon: <Settings className="w-4 h-4" />, category: 'Preferences' },
  { id: 'theme', name: 'Change Theme', description: 'Switch between themes', icon: <Palette className="w-4 h-4" />, category: 'Preferences' },
  { id: 'keyboard-shortcuts', name: 'Keyboard Shortcuts', description: 'View all keyboard shortcuts', icon: <Keyboard className="w-4 h-4" />, category: 'Preferences' },
]

export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  )
  
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = []
    }
    acc[cmd.category].push(cmd)
    return acc
  }, {} as Record<string, Command[]>)
  
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        // Execute command
        console.log('Execute:', filteredCommands[selectedIndex].id)
        onClose()
      }
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50">
      <div className="w-full max-w-2xl bg-ide-surface border border-ide-border rounded-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ide-border">
          <Search className="w-5 h-5 text-ide-text-muted" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-ide-text placeholder:text-ide-text-muted focus:outline-none"
          />
          <kbd className="px-2 py-1 text-xs bg-ide-bg rounded border border-ide-border text-ide-text-muted">
            ESC
          </kbd>
        </div>
        
        {/* Commands List */}
        <div className="max-h-96 overflow-auto">
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-ide-text-muted uppercase tracking-wider bg-ide-bg/50">
                {category}
              </div>
              {commands.map((cmd) => {
                const globalIndex = filteredCommands.indexOf(cmd)
                return (
                  <div
                    key={cmd.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${globalIndex === selectedIndex 
                        ? 'bg-ide-accent/10 text-ide-accent' 
                        : 'hover:bg-ide-border/50 text-ide-text'
                      }`}
                    onClick={() => {
                      console.log('Execute:', cmd.id)
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    <div className="text-ide-text-muted">{cmd.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{cmd.name}</div>
                      <div className="text-xs text-ide-text-muted">{cmd.description}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="px-2 py-1 text-xs bg-ide-bg rounded border border-ide-border text-ide-text-muted">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-ide-text-muted">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
