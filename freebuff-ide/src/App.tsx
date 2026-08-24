import React, { useEffect, useState } from 'react'
import { useAgentStore } from './stores/agentStore'
import { useSettingsStore } from './stores/settingsStore'
import TitleBar from './components/Layout/TitleBar'
import Sidebar from './components/Layout/Sidebar'
import EditorArea from './components/Editor/EditorArea'
import ChatPanel from './components/AI/ChatPanel'
import TerminalPanel from './components/Terminal/TerminalPanel'
import GitPanel from './components/Git/GitPanel'
import StatusBar from './components/Layout/StatusBar'
import CommandPalette from './components/Layout/CommandPalette'
import SettingsPanel from './components/Settings/SettingsPanel'

type RightPanel = 'chat' | 'terminal' | 'git' | null

function App() {
  const { initializeAgents } = useAgentStore()
  const { loadSettings } = useSettingsStore()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')

  useEffect(() => {
    initializeAgents()
    loadSettings()
  }, [initializeAgents, loadSettings])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
      // Cmd/Ctrl + B: Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
      // Cmd/Ctrl + `: Toggle Terminal
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault()
        setRightPanel(prev => prev === 'terminal' ? null : 'terminal')
      }
      // Cmd/Ctrl + Shift + A: Toggle AI Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        setRightPanel(prev => prev === 'chat' ? null : 'chat')
      }
      // Cmd/Ctrl + Shift + G: Toggle Git
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        setRightPanel(prev => prev === 'git' ? null : 'git')
      }
      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-ide-bg text-ide-text overflow-hidden">
      {/* Title Bar */}
      <TitleBar
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onToggleTerminal={() => setRightPanel(prev => prev === 'terminal' ? null : 'terminal')}
        onToggleChat={() => setRightPanel(prev => prev === 'chat' ? null : 'chat')}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar onClose={() => setSidebarOpen(false)} />
        )}

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor */}
          <div className="flex-1 overflow-hidden">
            <EditorArea />
          </div>

          {/* Right Panel */}
          {rightPanel && (
            <div className="w-[400px] border-l border-ide-border overflow-hidden flex-shrink-0">
              {rightPanel === 'chat' && (
                <ChatPanel
                  onClose={() => setRightPanel(null)}
                  onOpenSettings={() => setShowSettings(true)}
                />
              )}
              {rightPanel === 'terminal' && (
                <TerminalPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'git' && (
                <GitPanel onClose={() => setRightPanel(null)} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        onOpenTerminal={() => setRightPanel('terminal')}
        onOpenChat={() => setRightPanel('chat')}
        onOpenGit={() => setRightPanel('git')}
      />

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
