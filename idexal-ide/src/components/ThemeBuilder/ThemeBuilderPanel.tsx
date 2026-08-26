import React, { useState, useMemo } from 'react'
import {
  FaCode, FaSearch, FaPlus, FaCopy, FaCheck, FaDownload, FaUpload, FaChevronDown, FaChevronRight, FaEye, FaSun, FaMoon, FaSync, FaTrash
} from '../Icon'

interface ThemeColor {
  name: string
  value: string
  category: 'editor' | 'syntax' | 'ui' | 'terminal'
}

interface Theme {
  id: string
  name: string
  author: string
  isDark: boolean
  colors: ThemeColor[]
  isBuiltIn: boolean
}

const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'idexal-dark', name: 'Idexal Dark', author: 'Idexal', isDark: true, isBuiltIn: true,
    colors: [
      { name: 'editor.background', value: '#0d1117', category: 'editor' },
      { name: 'editor.foreground', value: '#c9d1d9', category: 'editor' },
      { name: 'editor.lineHighlightBackground', value: '#161b22', category: 'editor' },
      { name: 'editor.selectionBackground', value: '#264f78', category: 'editor' },
      { name: 'editorCursor.foreground', value: '#58a6ff', category: 'editor' },
      { name: 'sidebar.background', value: '#0d1117', category: 'ui' },
      { name: 'sidebar.foreground', value: '#8b949e', category: 'ui' },
      { name: 'statusBar.background', value: '#0d1117', category: 'ui' },
      { name: 'titleBar.activeBackground', value: '#010409', category: 'ui' },
      { name: 'syntax.keyword', value: '#ff7b72', category: 'syntax' },
      { name: 'syntax.string', value: '#a5d6ff', category: 'syntax' },
      { name: 'syntax.number', value: '#79c0ff', category: 'syntax' },
      { name: 'syntax.function', value: '#d2a8ff', category: 'syntax' },
      { name: 'syntax.variable', value: '#ffa657', category: 'syntax' },
      { name: 'syntax.comment', value: '#8b949e', category: 'syntax' },
      { name: 'syntax.type', value: '#7ee787', category: 'syntax' },
      { name: 'terminal.background', value: '#0d1117', category: 'terminal' },
      { name: 'terminal.foreground', value: '#c9d1d9', category: 'terminal' },
      { name: 'terminal.ansi.green', value: '#3fb950', category: 'terminal' },
      { name: 'terminal.ansi.red', value: '#f85149', category: 'terminal' },
    ]
  },
  {
    id: 'catppuccin', name: 'Catppuccin Mocha', author: 'Catppuccin', isDark: true, isBuiltIn: true,
    colors: [
      { name: 'editor.background', value: '#1e1e2e', category: 'editor' },
      { name: 'editor.foreground', value: '#cdd6f4', category: 'editor' },
      { name: 'editor.lineHighlightBackground', value: '#313244', category: 'editor' },
      { name: 'editor.selectionBackground', value: '#585b70', category: 'editor' },
      { name: 'editorCursor.foreground', value: '#f5e0dc', category: 'editor' },
      { name: 'sidebar.background', value: '#181825', category: 'ui' },
      { name: 'sidebar.foreground', value: '#a6adc8', category: 'ui' },
      { name: 'statusBar.background', value: '#11111b', category: 'ui' },
      { name: 'titleBar.activeBackground', value: '#11111b', category: 'ui' },
      { name: 'syntax.keyword', value: '#cba6f7', category: 'syntax' },
      { name: 'syntax.string', value: '#a6e3a1', category: 'syntax' },
      { name: 'syntax.number', value: '#fab387', category: 'syntax' },
      { name: 'syntax.function', value: '#89b4fa', category: 'syntax' },
      { name: 'syntax.variable', value: '#f9e2af', category: 'syntax' },
      { name: 'syntax.comment', value: '#6c7086', category: 'syntax' },
      { name: 'syntax.type', value: '#94e2d5', category: 'syntax' },
      { name: 'terminal.background', value: '#1e1e2e', category: 'terminal' },
      { name: 'terminal.foreground', value: '#cdd6f4', category: 'terminal' },
      { name: 'terminal.ansi.green', value: '#a6e3a1', category: 'terminal' },
      { name: 'terminal.ansi.red', value: '#f38ba8', category: 'terminal' },
    ]
  },
  {
    id: 'dracula', name: 'Dracula', author: 'Dracula', isDark: true, isBuiltIn: true,
    colors: [
      { name: 'editor.background', value: '#282a36', category: 'editor' },
      { name: 'editor.foreground', value: '#f8f8f2', category: 'editor' },
      { name: 'editor.lineHighlightBackground', value: '#44475a', category: 'editor' },
      { name: 'editor.selectionBackground', value: '#44475a', category: 'editor' },
      { name: 'editorCursor.foreground', value: '#f8f8f2', category: 'editor' },
      { name: 'sidebar.background', value: '#21222c', category: 'ui' },
      { name: 'sidebar.foreground', value: '#f8f8f2', category: 'ui' },
      { name: 'statusBar.background', value: '#191a21', category: 'ui' },
      { name: 'titleBar.activeBackground', value: '#191a21', category: 'ui' },
      { name: 'syntax.keyword', value: '#ff79c6', category: 'syntax' },
      { name: 'syntax.string', value: '#f1fa8c', category: 'syntax' },
      { name: 'syntax.number', value: '#bd93f9', category: 'syntax' },
      { name: 'syntax.function', value: '#50fa7b', category: 'syntax' },
      { name: 'syntax.variable', value: '#f8f8f2', category: 'syntax' },
      { name: 'syntax.comment', value: '#6272a4', category: 'syntax' },
      { name: 'syntax.type', value: '#8be9fd', category: 'syntax' },
      { name: 'terminal.background', value: '#282a36', category: 'terminal' },
      { name: 'terminal.foreground', value: '#f8f8f2', category: 'terminal' },
      { name: 'terminal.ansi.green', value: '#50fa7b', category: 'terminal' },
      { name: 'terminal.ansi.red', value: '#ff5555', category: 'terminal' },
    ]
  },
  {
    id: 'nord', name: 'Nord', author: 'Nord', isDark: true, isBuiltIn: true,
    colors: [
      { name: 'editor.background', value: '#2e3440', category: 'editor' },
      { name: 'editor.foreground', value: '#d8dee9', category: 'editor' },
      { name: 'editor.lineHighlightBackground', value: '#3b4252', category: 'editor' },
      { name: 'editor.selectionBackground', value: '#434c5e', category: 'editor' },
      { name: 'editorCursor.foreground', value: '#88c0d0', category: 'editor' },
      { name: 'sidebar.background', value: '#2e3440', category: 'ui' },
      { name: 'sidebar.foreground', value: '#a0a8b8', category: 'ui' },
      { name: 'statusBar.background', value: '#242933', category: 'ui' },
      { name: 'titleBar.activeBackground', value: '#242933', category: 'ui' },
      { name: 'syntax.keyword', value: '#81a1c1', category: 'syntax' },
      { name: 'syntax.string', value: '#a3be8c', category: 'syntax' },
      { name: 'syntax.number', value: '#b48ead', category: 'syntax' },
      { name: 'syntax.function', value: '#88c0d0', category: 'syntax' },
      { name: 'syntax.variable', value: '#d8dee9', category: 'syntax' },
      { name: 'syntax.comment', value: '#616e88', category: 'syntax' },
      { name: 'syntax.type', value: '#8fbcbb', category: 'syntax' },
      { name: 'terminal.background', value: '#2e3440', category: 'terminal' },
      { name: 'terminal.foreground', value: '#d8dee9', category: 'terminal' },
      { name: 'terminal.ansi.green', value: '#a3be8c', category: 'terminal' },
      { name: 'terminal.ansi.red', value: '#bf616a', category: 'terminal' },
    ]
  },
]

const COLOR_CATEGORIES = [
  { id: 'editor', name: 'Editor', icon: '📝' },
  { id: 'syntax', name: 'Syntax', icon: '🎨' },
  { id: 'ui', name: 'UI', icon: '🖥️' },
  { id: 'terminal', name: 'Terminal', icon: '💻' },
]

export default function ThemeBuilderPanel({ onClose }: { onClose: () => void }) {
  const [themes, setThemes] = useState(BUILT_IN_THEMES)
  const [selectedTheme, setSelectedTheme] = useState(BUILT_IN_THEMES[0])
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredColors = useMemo(() => {
    let colors = selectedTheme.colors
    if (activeCategory) colors = colors.filter(c => c.category === activeCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      colors = colors.filter(c => c.name.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
    }
    return colors
  }, [selectedTheme, activeCategory, searchQuery])

  const updateColor = (name: string, value: string) => {
    const updated = {
      ...selectedTheme,
      colors: selectedTheme.colors.map(c => c.name === name ? { ...c, value } : c),
      isBuiltIn: false,
    }
    setSelectedTheme(updated)
    setThemes(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  const exportTheme = () => {
    const json = JSON.stringify(selectedTheme, null, 2)
    navigator.clipboard?.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadTheme = () => {
    const blob = new Blob([JSON.stringify(selectedTheme, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTheme.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Generate CSS variables from theme
  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {}
    selectedTheme.colors.forEach(c => {
      const varName = `--${c.name.replace(/\./g, '-')}`
      vars[varName] = c.value
    })
    return vars
  }, [selectedTheme])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-purple-400" />
          <span className="text-sm font-semibold">Theme Builder</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportTheme} className="px-2 py-0.5 bg-ide-bg-secondary rounded text-xs flex items-center gap-1">
            {copied ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button onClick={downloadTheme} className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded text-xs flex items-center gap-1">
            <FaDownload size={10} /> Export
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Theme List */}
        <div className="w-[200px] border-r border-ide-border overflow-y-auto flex-shrink-0">
          <div className="px-2 py-1.5 border-b border-ide-border/30">
            <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1">
              <FaSearch size={10} className="text-ide-text-secondary" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Themes..."
                className="flex-1 bg-transparent text-[10px] outline-none text-ide-text"
              />
            </div>
          </div>

          {themes.map(theme => (
            <div
              key={theme.id}
              onClick={() => setSelectedTheme(theme)}
              className={`px-2 py-1.5 cursor-pointer border-b border-ide-border/10 ${
                selectedTheme.id === theme.id ? 'bg-purple-500/10' : 'hover:bg-ide-bg-secondary/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {theme.colors.filter(c => c.category === 'syntax').slice(0, 4).map(c => (
                    <div key={c.name} className="w-2 h-2 rounded-full" style={{ backgroundColor: c.value }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate">{theme.name}</div>
                  <div className="text-[9px] text-ide-text-secondary">{theme.author}</div>
                </div>
                {theme.isBuiltIn && <span className="text-[8px] bg-ide-bg-secondary px-1 rounded">built-in</span>}
              </div>
            </div>
          ))}

          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-purple-400 hover:bg-ide-bg-secondary/20 text-xs">
            <FaPlus size={12} /> Create Theme
          </button>
        </div>

        {/* Color Editor */}
        <div className="flex-1 overflow-y-auto">
          {/* Category Tabs */}
          <div className="flex border-b border-ide-border">
            {COLOR_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex-1 px-2 py-1.5 text-[10px] border-b-2 text-center ${
                  activeCategory === cat.id ? 'border-purple-400 text-purple-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="p-2 space-y-1">
            {filteredColors.map(color => (
              <div
                key={color.name}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-bg-secondary/20"
              >
                <div
                  className="w-6 h-6 rounded border border-ide-border cursor-pointer flex-shrink-0"
                  style={{ backgroundColor: color.value }}
                  onClick={() => setEditingColor(editingColor === color.name ? null : color.name)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-ide-text truncate">{color.name}</div>
                </div>
                <input
                  type="color"
                  value={color.value}
                  onChange={e => updateColor(color.name, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <span className="text-[10px] font-mono text-ide-text-secondary w-16">{color.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="w-[280px] border-l border-ide-border overflow-y-auto flex-shrink-0">
          <div className="px-2 py-1.5 text-[10px] text-ide-text-secondary bg-ide-bg-secondary/20 border-b border-ide-border">
            Live Preview
          </div>

          {/* Editor Preview */}
          <div className="m-2 rounded border border-ide-border overflow-hidden" style={{ backgroundColor: cssVars['--editor-background'] || '#0d1117' }}>
            <div className="px-2 py-1 text-[9px] font-mono" style={{ color: cssVars['--syntax-comment'] || '#8b949e' }}>
              {'// Preview code'}
            </div>
            <div className="px-2 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--syntax-keyword'] || '#ff7b72' }}>
              {'const '}
              <span style={{ color: cssVars['--syntax-variable'] || '#ffa657' }}>message</span>
              {' = '}
              <span style={{ color: cssVars['--syntax-string'] || '#a5d6ff' }}>"Hello, Idexal!"</span>
            </div>
            <div className="px-2 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--syntax-keyword'] || '#ff7b72' }}>
              {'function '}
              <span style={{ color: cssVars['--syntax-function'] || '#d2a8ff' }}>greet</span>
              {'() {'}
            </div>
            <div className="px-4 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--editor-foreground'] || '#c9d1d9' }}>
              console.log(message)
            </div>
            <div className="px-2 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--syntax-keyword'] || '#ff7b72' }}>
              {'}'}
            </div>
          </div>

          {/* Sidebar Preview */}
          <div className="m-2 rounded border border-ide-border overflow-hidden" style={{ backgroundColor: cssVars['--sidebar-background'] || '#0d1117' }}>
            <div className="px-2 py-1 text-[9px] font-semibold border-b" style={{ color: cssVars['--sidebar-foreground'] || '#8b949e', borderColor: 'rgba(255,255,255,0.1)' }}>
              Explorer
            </div>
            <div className="px-2 py-0.5 text-[9px]" style={{ color: cssVars['--sidebar-foreground'] || '#8b949e' }}>
              📁 src/
            </div>
            <div className="px-4 py-0.5 text-[9px]" style={{ color: cssVars['--sidebar-foreground'] || '#8b949e' }}>
              📘 App.tsx
            </div>
            <div className="px-4 py-0.5 text-[9px]" style={{ color: cssVars['--sidebar-foreground'] || '#8b949e' }}>
              📘 main.tsx
            </div>
          </div>

          {/* Terminal Preview */}
          <div className="m-2 rounded border border-ide-border overflow-hidden" style={{ backgroundColor: cssVars['--terminal-background'] || '#0d1117' }}>
            <div className="px-2 py-1 text-[9px] font-mono" style={{ color: cssVars['--terminal-foreground'] || '#c9d1d9' }}>
              <span style={{ color: cssVars['--terminal-ansi-green'] || '#3fb950' }}>$</span> npm run build
            </div>
            <div className="px-2 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--terminal-ansi-green'] || '#3fb950' }}>
              ✓ Build completed
            </div>
            <div className="px-2 py-0.5 text-[9px] font-mono" style={{ color: cssVars['--terminal-ansi-red'] || '#f85149' }}>
              ✗ Error: missing module
            </div>
          </div>

          {/* Status Bar Preview */}
          <div className="m-2 rounded border border-ide-border overflow-hidden px-2 py-1 flex items-center gap-2" style={{ backgroundColor: cssVars['--statusBar-background'] || '#0d1117' }}>
            <span className="text-[8px]" style={{ color: cssVars['--editorCursor-foreground'] || '#58a6ff' }}>main</span>
            <span className="text-[8px]" style={{ color: cssVars['--sidebar-foreground'] || '#8b949e' }}>0 problems</span>
          </div>

          {/* CSS Variables */}
          <div className="m-2">
            <div className="text-[9px] text-ide-text-secondary mb-1">CSS Variables:</div>
            <pre className="text-[8px] font-mono text-ide-text-secondary bg-ide-bg-secondary/20 rounded p-2 overflow-x-auto max-h-[150px] overflow-y-auto">
              {Object.entries(cssVars).slice(0, 12).map(([k, v]) => `${k}: ${v};`).join('\n')}
              {'\n...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
