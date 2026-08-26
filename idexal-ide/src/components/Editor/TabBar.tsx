import React, { useState, useRef, useCallback } from 'react'
import { Tab } from '../../stores/editorStore'
import { FaTimes, FaThLarge, FaPlus, FaEllipsisV, FaCopy, FaExchangeAlt } from '../Icon'
import { detectLanguage } from '../../utils/languageDetector'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  groupId: string
  onTabClick: (id: string) => void
  onCloseTab: (id: string) => void
  onDragStart?: (e: React.DragEvent, tabId: string, groupId: string) => void
  onToggleSplit?: () => void
  onToggleDirection?: () => void
  splitDirection?: 'horizontal' | 'vertical'
  onCloseGroup?: () => void
}

export default function TabBar({
  tabs, activeTabId, groupId, onTabClick, onCloseTab,
  onDragStart, onToggleSplit, onToggleDirection, splitDirection, onCloseGroup
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null)
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [dragOverTab, setDragOverTab] = useState<string | null>(null)

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      typescript: 'text-blue-400',
      javascript: 'text-yellow-400',
      python: 'text-green-400',
      rust: 'text-orange-400',
      go: 'text-cyan-400',
      html: 'text-orange-300',
      css: 'text-blue-300',
      json: 'text-yellow-300',
      markdown: 'text-gray-400',
      yaml: 'text-purple-400',
      toml: 'text-gray-400',
    }
    return colors[language] || 'text-ide-text-muted'
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId })
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId)
    onDragStart?.(e, tabId, groupId)
  }, [onDragStart, groupId])

  const handleDragEnd = useCallback(() => {
    setDraggedTab(null)
    setDragOverTab(null)
  }, [])

  const handleTabDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    setDragOverTab(tabId)
  }, [])

  const handleTabDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    e.stopPropagation()
    // Reorder within group (handled by parent if needed)
    setDragOverTab(null)
  }, [])

  return (
    <>
      <div className="h-10 bg-ide-surface border-b border-ide-border flex items-center">
        {/* Tabs */}
        <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleTabDragOver(e, tab.id)}
              onDrop={(e) => handleTabDrop(e, tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onClick={() => onTabClick(tab.id)}
              className={`group flex items-center gap-2 px-3 h-full border-r border-ide-border cursor-pointer transition-colors min-w-0 max-w-48 select-none ${
                tab.id === activeTabId
                  ? 'bg-ide-editor text-ide-text border-t-2 border-t-ide-accent'
                  : 'text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text'
              } ${draggedTab === tab.id ? 'opacity-50' : ''} ${
                dragOverTab === tab.id ? 'border-l-2 border-l-ide-accent' : ''
              }`}
            >
              {/* Language indicator dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getLanguageColor(tab.language)}`} />

              {/* File name */}
              <span className="text-sm truncate">{tab.name}</span>

              {/* Modified indicator */}
              {tab.modified && (
                <div className="w-2 h-2 rounded-full bg-ide-warning flex-shrink-0" />
              )}

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                className="p-0.5 rounded hover:bg-ide-border opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
          {onToggleSplit && (
            <button
              onClick={onToggleSplit}
              className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors"
              title="Toggle Split View"
            >
              <FaThLarge className="w-4 h-4" />
            </button>
          )}
          {onToggleDirection && (
            <button
              onClick={onToggleDirection}
              className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors"
              title={`Switch to ${splitDirection === 'horizontal' ? 'Vertical' : 'Horizontal'} Split`}
            >
              <FaExchangeAlt className={`w-4 h-4 ${splitDirection === 'vertical' ? 'rotate-90' : ''}`} />
            </button>
          )}
          <button
            className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors"
            title="New Tab"
          >
            <FaPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-ide-surface border border-ide-border rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => { onCloseTab(contextMenu.tabId); setContextMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ide-text hover:bg-ide-border/50"
            >
              <FaTimes className="w-3.5 h-3.5" />
              Close
            </button>
            <button
              onClick={() => {
                // Close others
                tabs.filter(t => t.id !== contextMenu.tabId).forEach(t => onCloseTab(t.id))
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ide-text hover:bg-ide-border/50"
            >
              <FaCopy className="w-3.5 h-3.5" />
              Close Others
            </button>
            <div className="h-px bg-ide-border my-1" />
            <button
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ide-text hover:bg-ide-border/50"
            >
              <FaExchangeAlt className="w-3.5 h-3.5" />
              Copy Path
            </button>
          </div>
        </>
      )}
    </>
  )
}
