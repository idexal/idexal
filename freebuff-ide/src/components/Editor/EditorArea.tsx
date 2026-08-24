import React, { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import MonacoEditor from './MonacoEditor'
import TabBar from './TabBar'
import { Code, FileText, Plus } from 'lucide-react'

export default function EditorArea() {
  const { tabs, activeTabId } = useEditorStore()
  const [splitView, setSplitView] = useState(false)
  
  const activeTab = tabs.find(t => t.id === activeTabId)
  
  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-ide-editor text-ide-text-muted">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ide-surface border border-ide-border flex items-center justify-center">
            <Code className="w-8 h-8 text-ide-accent" />
          </div>
          <h2 className="text-xl font-semibold text-ide-text mb-2">Welcome to Idexal IDE</h2>
          <p className="text-sm text-ide-text-muted mb-6">
            AI-Powered Multi-Agent Development Environment
          </p>
          
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button className="p-4 rounded-lg bg-ide-surface border border-ide-border hover:border-ide-accent transition-colors text-left">
              <FileText className="w-5 h-5 text-ide-accent mb-2" />
              <div className="text-sm font-medium text-ide-text">Open File</div>
              <div className="text-xs text-ide-text-muted">⌘O</div>
            </button>
            
            <button className="p-4 rounded-lg bg-ide-surface border border-ide-border hover:border-ide-accent transition-colors text-left">
              <Plus className="w-5 h-5 text-ide-success mb-2" />
              <div className="text-sm font-medium text-ide-text">New File</div>
              <div className="text-xs text-ide-text-muted">⌘N</div>
            </button>
          </div>
          
          <div className="mt-8 text-xs text-ide-text-muted">
            <p>Press <kbd className="px-1.5 py-0.5 bg-ide-surface rounded border border-ide-border">⌘K</kbd> to open Command Palette</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col bg-ide-editor">
      {/* Tab Bar */}
      <TabBar onToggleSplit={() => setSplitView(!splitView)} />
      
      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {splitView ? (
          <div className="h-full flex">
            <div className="flex-1 border-r border-ide-border">
              {activeTab && <MonacoEditor tab={activeTab} />}
            </div>
            <div className="flex-1">
              {tabs.length > 1 && (
                <MonacoEditor tab={tabs.find(t => t.id !== activeTabId) || tabs[0]} />
              )}
            </div>
          </div>
        ) : (
          activeTab && <MonacoEditor tab={activeTab} />
        )}
      </div>
    </div>
  )
}
