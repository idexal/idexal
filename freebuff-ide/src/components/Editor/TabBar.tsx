import React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { X, SplitSquareVertical, Plus } from 'lucide-react'
import { detectLanguage } from '../../utils/languageDetector'

interface TabBarProps {
  onToggleSplit: () => void
}

export default function TabBar({ onToggleSplit }: TabBarProps) {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()
  
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
    }
    return colors[language] || 'text-ide-text-muted'
  }
  
  return (
    <div className="h-10 bg-ide-surface border-b border-ide-border flex items-center overflow-x-auto">
      {/* Tabs */}
      <div className="flex-1 flex items-center h-full overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-4 h-full border-r border-ide-border cursor-pointer transition-colors min-w-0 max-w-48
              ${tab.id === activeTabId 
                ? 'bg-ide-editor text-ide-text border-t-2 border-t-ide-accent' 
                : 'text-ide-text-muted hover:bg-ide-border/50 hover:text-ide-text'
              }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {/* Language indicator dot */}
            <div className={`w-2 h-2 rounded-full ${getLanguageColor(tab.language)}`} />
            
            {/* File name */}
            <span className="text-sm truncate">{tab.name}</span>
            
            {/* Modified indicator */}
            {tab.modified && (
              <div className="w-2 h-2 rounded-full bg-ide-warning" />
            )}
            
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="p-0.5 rounded hover:bg-ide-border opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 px-2">
        <button
          onClick={onToggleSplit}
          className="p-2 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors"
          title="Toggle Split View"
        >
          <SplitSquareVertical className="w-4 h-4" />
        </button>
        
        <button
          className="p-2 rounded hover:bg-ide-border text-ide-text-muted hover:text-ide-text transition-colors"
          title="New Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
