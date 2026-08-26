import React, { useState } from 'react'
import {
  FaCode, FaPlus, FaSave, FaTrash, FaCopy, FaCheck, FaDownload, FaUpload, FaUndo, FaEye, FaSun, FaMoon, FaChevronDown
} from '../Icon'

interface ThemeColor {
  name: string
  value: string
  category: string
}

interface Theme {
  id: string
  name: string
  author: string
  variant: 'dark' | 'light' | 'high-contrast'
  colors: Record<string, string>
  isBuiltIn: boolean
}

const DEFAULT_THEME_COLORS: ThemeColor[] = [
  // Editor Colors
  { name: 'Editor Background', value: '#1e1e2e', category: 'Editor' },
  { name: 'Editor Foreground', value: '#cdd6f4', category: 'Editor' },
  { name: 'Editor Selection', value: '#45475a', category: 'Editor' },
  { name: 'Editor Line Highlight', value: '#313244', category: 'Editor' },
  { name: 'Editor Cursor', value: '#f5e0dc', category: 'Editor' },
  { name: 'Editor Indent Guide', value: '#45475a', category: 'Editor' },
  { name: 'Editor Gutter', value: '#181825', category: 'Editor' },
  { name: 'Editor Line Number', value: '#6c7086', category: 'Editor' },
  
  // Syntax Colors
  { name: 'Keyword', value: '#cba6f7', category: 'Syntax' },
  { name: 'String', value: '#a6e3a1', category: 'Syntax' },
  { name: 'Number', value: '#fab387', category: 'Syntax' },
  { name: 'Comment', value: '#6c7086', category: 'Syntax' },
  { name: 'Function', value: '#89b4fa', category: 'Syntax' },
  { name: 'Variable', value: '#f38ba8', category: 'Syntax' },
  { name: 'Type', value: '#f9e2af', category: 'Syntax' },
  { name: 'Operator', value: '#89dceb', category: 'Syntax' },
  { name: 'Punctuation', value: '#9399b2', category: 'Syntax' },
  
  // UI Colors
  { name: 'Sidebar Background', value: '#11111b', category: 'UI' },
  { name: 'Sidebar Foreground', value: '#cdd6f4', category: 'UI' },
  { name: 'Sidebar Active', value: '#45475a', category: 'UI' },
  { name: 'Sidebar Hover', value: '#313244', category: 'UI' },
  { name: 'Tab Active', value: '#1e1e2e', category: 'UI' },
  { name: 'Tab Inactive', value: '#181825', category: 'UI' },
  { name: 'Tab Border', value: '#313244', category: 'UI' },
  { name: 'Status Bar', value: '#181825', category: 'UI' },
  { name: 'Status Bar Foreground', value: '#bac2de', category: 'UI' },
  { name: 'FaChartLine Bar', value: '#11111b', category: 'UI' },
  { name: 'Panel Background', value: '#181825', category: 'UI' },
  { name: 'Panel Border', value: '#313244', category: 'UI' },
  
  // Button Colors
  { name: 'Primary Button', value: '#89b4fa', category: 'Buttons' },
  { name: 'Primary Button Text', value: '#1e1e2e', category: 'Buttons' },
  { name: 'Secondary Button', value: '#45475a', category: 'Buttons' },
  { name: 'Secondary Button Text', value: '#cdd6f4', category: 'Buttons' },
  { name: 'Danger Button', value: '#f38ba8', category: 'Buttons' },
  { name: 'Danger Button Text', value: '#1e1e2e', category: 'Buttons' },
  
  // Terminal Colors
  { name: 'Terminal Background', value: '#1e1e2e', category: 'Terminal' },
  { name: 'Terminal Foreground', value: '#cdd6f4', category: 'Terminal' },
  { name: 'Terminal Black', value: '#45475a', category: 'Terminal' },
  { name: 'Terminal Red', value: '#f38ba8', category: 'Terminal' },
  { name: 'Terminal Green', value: '#a6e3a1', category: 'Terminal' },
  { name: 'Terminal Yellow', value: '#f9e2af', category: 'Terminal' },
  { name: 'Terminal Blue', value: '#89b4fa', category: 'Terminal' },
  { name: 'Terminal Magenta', value: '#cba6f7', category: 'Terminal' },
  { name: 'Terminal Cyan', value: '#94e2d5', category: 'Terminal' },
  { name: 'Terminal White', value: '#bac2de', category: 'Terminal' },
]

const BUILTIN_THEMES: Theme[] = [
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', author: 'Catppuccin', variant: 'dark', colors: {}, isBuiltIn: true },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', author: 'Catppuccin', variant: 'light', colors: {}, isBuiltIn: true },
  { id: 'dracula', name: 'Dracula', author: 'Dracula', variant: 'dark', colors: {}, isBuiltIn: true },
  { id: 'github-dark', name: 'GitHub Dark', author: 'GitHub', variant: 'dark', colors: {}, isBuiltIn: true },
  { id: 'github-light', name: 'GitHub Light', author: 'GitHub', variant: 'light', colors: {}, isBuiltIn: true },
  { id: 'monokai', name: 'Monokai Pro', author: 'Monokai', variant: 'dark', colors: {}, isBuiltIn: true },
  { id: 'nord', name: 'Nord', author: 'Arctic Ice Studio', variant: 'dark', colors: {}, isBuiltIn: true },
  { id: 'one-dark', name: 'One Dark Pro', author: 'Binaryify', variant: 'dark', colors: {}, isBuiltIn: true },
]

export default function ThemeEditorPanel({ onClose }: { onClose: () => void }) {
  const [themes, setThemes] = useState<Theme[]>(BUILTIN_THEMES)
  const [selectedTheme, setSelectedTheme] = useState<Theme>(BUILTIN_THEMES[0])
  const [editingColors, setEditingColors] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_THEME_COLORS.map(c => [c.name, c.value]))
  )
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [customThemeName, setCustomThemeName] = useState('My Custom Theme')
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'split' | 'editor' | 'terminal'>('split')

  const categories = ['All', ...new Set(DEFAULT_THEME_COLORS.map(c => c.category))]

  const filteredColors = DEFAULT_THEME_COLORS.filter(c =>
    activeCategory === 'All' || c.category === activeCategory
  )

  const updateColor = (name: string, value: string) => {
    setEditingColors(prev => ({ ...prev, [name]: value }))
  }

  const copyColor = (color: string) => {
    navigator.clipboard?.writeText(color)
    setCopiedColor(color)
    setTimeout(() => setCopiedColor(null), 1500)
  }

  const saveTheme = () => {
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: customThemeName,
      author: 'You',
      variant: 'dark',
      colors: editingColors,
      isBuiltIn: false,
    }
    setThemes(prev => [...prev, newTheme])
    setSelectedTheme(newTheme)
  }

  const resetTheme = () => {
    setEditingColors(Object.fromEntries(DEFAULT_THEME_COLORS.map(c => [c.name, c.value])))
  }

  const exportTheme = () => {
    const themeData = {
      name: customThemeName,
      type: 'dark',
      colors: editingColors,
    }
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${customThemeName.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-purple-400" />
          <span className="text-sm font-semibold">Theme Editor</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportTheme} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Export">
            <FaDownload size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <select
            value={selectedTheme.id}
            onChange={e => {
              const theme = themes.find(t => t.id === e.target.value)
              if (theme) setSelectedTheme(theme)
            }}
            className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
          >
            <optgroup label="Built-in Themes">
              {BUILTIN_THEMES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
            <optgroup label="Custom Themes">
              {themes.filter(t => !t.isBuiltIn).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customThemeName}
              onChange={e => setCustomThemeName(e.target.value)}
              className="w-32 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
              placeholder="Theme name..."
            />
            <button onClick={saveTheme} className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs">
              <FaSave size={12} />
            </button>
            <button onClick={resetTheme} className="p-1.5 bg-ide-bg-secondary hover:bg-ide-bg-secondary/80 rounded text-ide-text-secondary" title="Reset">
              <FaUndo size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
              activeCategory === cat ? 'bg-purple-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Color List */}
      <div className="flex-1 overflow-y-auto">
        {filteredColors.map(color => (
          <div key={color.name} className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border/30 hover:bg-ide-bg-secondary/30">
            <div
              className="w-5 h-5 rounded border border-ide-border cursor-pointer flex-shrink-0 relative"
              style={{ backgroundColor: editingColors[color.name] || color.value }}
              onClick={() => setShowColorPicker(showColorPicker === color.name ? null : color.name)}
            >
              {showColorPicker === color.name && (
                <div className="absolute top-6 left-0 z-20 bg-ide-bg-secondary border border-ide-border rounded p-2 shadow-lg">
                  <input
                    type="color"
                    value={editingColors[color.name] || color.value}
                    onChange={e => updateColor(color.name, e.target.value)}
                    className="w-32 h-32 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingColors[color.name] || color.value}
                    onChange={e => updateColor(color.name, e.target.value)}
                    className="w-full mt-1 bg-ide-bg border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs">{color.name}</span>
            </div>
            <span className="text-xs text-ide-text-secondary font-mono">{editingColors[color.name] || color.value}</span>
            <button
              onClick={() => copyColor(editingColors[color.name] || color.value)}
              className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
            >
              {copiedColor === (editingColors[color.name] || color.value) ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="border-t border-ide-border">
        <div className="flex items-center gap-1 px-3 py-1">
          {(['split', 'editor', 'terminal'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={`px-2 py-0.5 text-xs rounded ${previewMode === mode ? 'bg-purple-600 text-white' : 'text-ide-text-secondary'}`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div className="h-32 overflow-hidden mx-3 mb-2 rounded border border-ide-border" style={{ backgroundColor: editingColors['Editor Background'] || '#1e1e2e' }}>
          <div className="flex h-full">
            {/* Sidebar Preview */}
            {(previewMode === 'split' || previewMode === 'editor') && (
              <div className="w-1/4" style={{ backgroundColor: editingColors['Sidebar Background'] || '#11111b' }}>
                <div className="px-2 py-1 text-xs" style={{ color: editingColors['Sidebar Foreground'] || '#cdd6f4' }}>📁 src</div>
                <div className="px-3 py-0.5 text-xs" style={{ backgroundColor: editingColors['Sidebar Active'] || '#45475a', color: editingColors['Sidebar Foreground'] || '#cdd6f4' }}>App.tsx</div>
                <div className="px-3 py-0.5 text-xs" style={{ color: editingColors['Sidebar Foreground'] || '#cdd6f4' }}>utils.ts</div>
              </div>
            )}
            {/* Editor Preview */}
            {(previewMode === 'split' || previewMode === 'editor') && (
              <div className="flex-1 p-2 font-mono text-xs leading-4">
                <div style={{ color: editingColors['Comment'] || '#6c7086' }}>// Preview</div>
                <div>
                  <span style={{ color: editingColors['Keyword'] || '#cba6f7' }}>const</span>
                  {' '}
                  <span style={{ color: editingColors['Variable'] || '#f38ba8' }}>app</span>
                  {' = '}
                  <span style={{ color: editingColors['Function'] || '#89b4fa' }}>createApp</span>
                  <span style={{ color: editingColors['Punctuation'] || '#9399b2' }}>(</span>
                  <span style={{ color: editingColors['Punctuation'] || '#9399b2' }}>)</span>
                </div>
              </div>
            )}
            {/* Terminal Preview */}
            {(previewMode === 'split' || previewMode === 'terminal') && (
              <div className={`${previewMode === 'terminal' ? 'w-full' : 'w-1/3'}`} style={{ backgroundColor: editingColors['Terminal Background'] || '#1e1e2e' }}>
                <div className="p-2 font-mono text-xs leading-4">
                  <div style={{ color: editingColors['Terminal Green'] || '#a6e3a1' }}>$ npm run dev</div>
                  <div style={{ color: editingColors['Terminal Foreground'] || '#cdd6f4' }}>Server started on port 5173</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
