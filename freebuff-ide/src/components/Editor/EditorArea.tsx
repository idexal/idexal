import React, { useState, useCallback, useRef } from 'react'
import { useEditorStore, Tab } from '../../stores/editorStore'
import MonacoEditor from './MonacoEditor'
import TabBar from './TabBar'
import { Code, FileText, Plus, GripVertical } from 'lucide-react'

interface TabGroup {
  id: string
  tabs: Tab[]
  activeTabId: string | null
}

export default function EditorArea() {
  const { tabs, activeTabId, setActiveTab } = useEditorStore()
  const [splitView, setSplitView] = useState(false)
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal')
  const [groups, setGroups] = useState<TabGroup[]>([])
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [splitRatio, setSplitRatio] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Initialize groups when split view is toggled
  const toggleSplit = useCallback(() => {
    if (!splitView) {
      // Enter split view: create two groups
      const leftTabs = activeTab ? [activeTab] : tabs.slice(0, 1)
      const rightTabs = tabs.filter(t => !leftTabs.find(l => l.id === t.id)).slice(0, 1)
      setGroups([
        { id: 'group-left', tabs: leftTabs, activeTabId: leftTabs[0]?.id || null },
        { id: 'group-right', tabs: rightTabs, activeTabId: rightTabs[0]?.id || null },
      ])
    }
    setSplitView(prev => !prev)
  }, [splitView, activeTab, tabs])

  // Toggle split direction
  const toggleDirection = useCallback(() => {
    setSplitDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, tabId: string, groupId: string) => {
    e.dataTransfer.setData('application/tab-id', tabId)
    e.dataTransfer.setData('application/source-group', groupId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverGroup(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    const tabId = e.dataTransfer.getData('application/tab-id')
    const sourceGroupId = e.dataTransfer.getData('application/source-group')
    setDragOverGroup(null)

    if (!tabId || !sourceGroupId || sourceGroupId === targetGroupId) return

    setGroups(prev => {
      const newGroups = prev.map(g => ({ ...g, tabs: [...g.tabs] }))
      const sourceGroup = newGroups.find(g => g.id === sourceGroupId)
      const targetGroup = newGroups.find(g => g.id === targetGroupId)

      if (!sourceGroup || !targetGroup) return prev

      const tabIndex = sourceGroup.tabs.findIndex(t => t.id === tabId)
      if (tabIndex === -1) return prev

      const [tab] = sourceGroup.tabs.splice(tabIndex, 1)
      targetGroup.tabs.push(tab)

      // Update active tab in target group
      if (!targetGroup.activeTabId) {
        targetGroup.activeTabId = tab.id
      }

      // Update active tab in source group if needed
      if (sourceGroup.activeTabId === tabId) {
        sourceGroup.activeTabId = sourceGroup.tabs[0]?.id || null
      }

      return newGroups
    })
  }, [])

  // Resize handler for split ratio
  const handleResize = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const container = containerRef.current
    const rect = container.getBoundingClientRect()

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (splitDirection === 'horizontal') {
        const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100
        setSplitRatio(Math.max(20, Math.min(80, ratio)))
      } else {
        const ratio = ((moveEvent.clientY - rect.top) / rect.height) * 100
        setSplitRatio(Math.max(20, Math.min(80, ratio)))
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = splitDirection === 'horizontal' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }, [splitDirection])

  // Close group
  const closeGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
    if (groups.length <= 2) {
      setSplitView(false)
    }
  }, [groups.length])

  // Open tab in group
  const openInGroup = useCallback((groupId: string, tab: Tab) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      if (g.tabs.find(t => t.id === tab.id)) return g
      return { ...g, tabs: [...g.tabs, tab], activeTabId: tab.id }
    }))
  }, [])

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

  // Split view mode
  if (splitView && groups.length >= 2) {
    const group1 = groups[0]
    const group2 = groups[1]

    return (
      <div
        ref={containerRef}
        className={`h-full flex bg-ide-editor ${splitDirection === 'vertical' ? 'flex-col' : 'flex-row'}`}
      >
        {/* Group 1 */}
        <div
          className={`overflow-hidden ${dragOverGroup === group1.id ? 'ring-2 ring-ide-accent/50' : ''}`}
          style={{
            flex: `0 0 ${splitRatio}%`,
            minWidth: splitDirection === 'horizontal' ? '200px' : undefined,
            minHeight: splitDirection === 'vertical' ? '100px' : undefined,
          }}
          onDragOver={(e) => handleDragOver(e, group1.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, group1.id)}
        >
          <TabBar
            tabs={group1.tabs}
            activeTabId={group1.activeTabId}
            groupId={group1.id}
            onTabClick={(id) => setGroups(prev => prev.map(g => g.id === group1.id ? { ...g, activeTabId: id } : g))}
            onCloseTab={(id) => setGroups(prev => prev.map(g => g.id === group1.id ? { ...g, tabs: g.tabs.filter(t => t.id !== id), activeTabId: g.activeTabId === id ? g.tabs.find(t => t.id !== id)?.id || null : g.activeTabId } : g))}
            onDragStart={handleDragStart}
            onCloseGroup={() => closeGroup(group1.id)}
          />
          <div className="h-[calc(100%-40px)]">
            {group1.tabs.find(t => t.id === group1.activeTabId) && (
              <MonacoEditor tab={group1.tabs.find(t => t.id === group1.activeTabId)!} />
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className={`flex-shrink-0 bg-ide-border hover:bg-ide-accent transition-colors cursor-${splitDirection === 'horizontal' ? 'col' : 'row'}-resize flex items-center justify-center`}
          style={{
            width: splitDirection === 'horizontal' ? '4px' : '100%',
            height: splitDirection === 'vertical' ? '4px' : '100%',
          }}
          onMouseDown={handleResize}
        >
          <GripVertical className="w-3 h-3 text-ide-text-muted rotate-90" />
        </div>

        {/* Group 2 */}
        <div
          className={`overflow-hidden flex-1 ${dragOverGroup === group2.id ? 'ring-2 ring-ide-accent/50' : ''}`}
          onDragOver={(e) => handleDragOver(e, group2.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, group2.id)}
        >
          <TabBar
            tabs={group2.tabs}
            activeTabId={group2.activeTabId}
            groupId={group2.id}
            onTabClick={(id) => setGroups(prev => prev.map(g => g.id === group2.id ? { ...g, activeTabId: id } : g))}
            onCloseTab={(id) => setGroups(prev => prev.map(g => g.id === group2.id ? { ...g, tabs: g.tabs.filter(t => t.id !== id), activeTabId: g.activeTabId === id ? g.tabs.find(t => t.id !== id)?.id || null : g.activeTabId } : g))}
            onDragStart={handleDragStart}
            onCloseGroup={() => closeGroup(group2.id)}
          />
          <div className="h-[calc(100%-40px)]">
            {group2.tabs.find(t => t.id === group2.activeTabId) && (
              <MonacoEditor tab={group2.tabs.find(t => t.id === group2.activeTabId)!} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Single view mode
  return (
    <div className="h-full flex flex-col bg-ide-editor">
      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        groupId="main"
        onTabClick={setActiveTab}
        onCloseTab={(id) => {
          const store = useEditorStore.getState()
          store.closeTab(id)
        }}
        onToggleSplit={toggleSplit}
        onToggleDirection={toggleDirection}
        splitDirection={splitDirection}
      />

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab && <MonacoEditor tab={activeTab} />}
      </div>
    </div>
  )
}
