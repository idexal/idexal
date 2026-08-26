import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FaBolt, FaSearch, FaTerminal, FaCodeBranch, FaBrain, FaFileAlt, FaEye, FaCompass, FaClock
} from '../Icon'
import { quickActionsService, QuickAction } from '../../services/quickActionsService'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  editor: <FaFileAlt size={10} className="text-blue-400" />,
  git: <FaCodeBranch size={10} className="text-orange-400" />,
  ai: <FaBrain size={10} className="text-purple-400" />,
  terminal: <FaTerminal size={10} className="text-green-400" />,
  navigation: <FaCompass size={10} className="text-cyan-400" />,
  view: <FaEye size={10} className="text-yellow-400" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  editor: 'bg-blue-500/20 text-blue-400',
  git: 'bg-orange-500/20 text-orange-400',
  ai: 'bg-purple-500/20 text-purple-400',
  terminal: 'bg-green-500/20 text-green-400',
  navigation: 'bg-cyan-500/20 text-cyan-400',
  view: 'bg-yellow-500/20 text-yellow-400',
}

export default function QuickActionsPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [actions, setActions] = useState<QuickAction[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const update = () => setActions(quickActionsService.getAll())
    update()
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    let result = query ? quickActionsService.search(query) : actions
    if (selectedCategory) {
      result = result.filter(a => a.category === selectedCategory)
    }
    return result
  }, [actions, query, selectedCategory])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, selectedCategory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleExecute(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose?.()
    }
  }

  const handleExecute = async (action: QuickAction) => {
    await quickActionsService.execute(action.id)
    onClose?.()
  }

  const categories = useMemo(() => quickActionsService.getCategories(), [actions])
  const recentlyUsed = useMemo(() => quickActionsService.getRecentlyUsed(), [actions])

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBolt size={14} className="text-yellow-400" />
          <span className="text-xs font-semibold">Quick Actions</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-ide-border text-ide-text-muted">
          <FaBolt size={12} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="relative">
          <FaSearch size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ide-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="w-full bg-ide-bg-secondary border border-ide-border rounded pl-7 pr-2 py-1.5 text-xs text-ide-text"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-0.5 text-[9px] rounded whitespace-nowrap ${
            !selectedCategory ? 'bg-ide-accent text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          All ({actions.length})
        </button>
        {categories.map(({ category, count }) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            className={`px-2 py-0.5 text-[9px] rounded whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === category ? 'bg-ide-accent text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {CATEGORY_ICONS[category]}
            {category} ({count})
          </button>
        ))}
      </div>

      {/* Recently Used */}
      {!query && recentlyUsed.length > 0 && (
        <div className="px-3 py-2 border-b border-ide-border/50">
          <div className="flex items-center gap-1 mb-1">
            <FaClock size={10} className="text-ide-text-secondary" />
            <span className="text-[9px] text-ide-text-secondary">Recently Used</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {recentlyUsed.slice(0, 5).map(action => (
              <button
                key={action.id}
                onClick={() => handleExecute(action)}
                className="text-[9px] bg-ide-bg-secondary px-1.5 py-0.5 rounded hover:bg-ide-border flex items-center gap-1"
              >
                {CATEGORY_ICONS[action.category]}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ide-text-muted text-[10px]">
            <FaBolt size={24} className="mb-2 opacity-50" />
            <p>No actions found</p>
          </div>
        ) : (
          <div className="divide-y divide-ide-border/30">
            {filtered.map((action, i) => (
              <div
                key={action.id}
                onClick={() => handleExecute(action)}
                className={`px-3 py-2 cursor-pointer hover:bg-ide-bg-secondary/30 ${
                  i === selectedIndex ? 'bg-ide-bg-secondary/50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1 py-0.5 rounded text-[8px] ${CATEGORY_COLORS[action.category]}`}>
                    {action.category}
                  </span>
                  <span className="flex-1 text-[10px] text-ide-text">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="text-[8px] bg-ide-bg-secondary px-1.5 py-0.5 rounded text-ide-text-secondary font-mono">
                      {action.shortcut}
                    </kbd>
                  )}
                </div>
                <p className="text-[9px] text-ide-text-secondary mt-0.5 ml-12">{action.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-ide-border text-[8px] text-ide-text-muted flex items-center gap-3">
        <span>↑↓ Navigate</span>
        <span>↵ Execute</span>
        <span>ESC Close</span>
      </div>
    </div>
  )
}
