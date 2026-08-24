import { Suspense, useEffect, useState } from 'react'
import { useAgentStore } from './stores/agentStore'
import { useSettingsStore } from './stores/settingsStore'
import TitleBar from './components/Layout/TitleBar'
import Sidebar, { SidebarTab } from './components/Layout/Sidebar'
import EditorArea from './components/Editor/EditorArea'
import StatusBar from './components/Layout/StatusBar'
import CommandPalette from './components/Layout/CommandPalette'
import SettingsPanel from './components/Settings/SettingsPanel'
import QuickOpen from './components/QuickOpen/QuickOpen'
import { NotificationToast } from './components/Notifications/NotificationSystem'
import { panelRegistry, shortcutBindings, RightPanel } from './panels/panelRegistry'

function PanelFallback() {
  return (
    <div className="flex items-center justify-center h-full text-ide-textMuted">
      <div className="animate-pulse text-sm">Loading panel...</div>
    </div>
  )
}

function App() {
  const { initializeAgents } = useAgentStore()
  const { loadSettings } = useSettingsStore()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')
  const closePanel = () => setRightPanel(null)

  useEffect(() => {
    initializeAgents()
    loadSettings()
  }, [initializeAgents, loadSettings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'p' && !e.shiftKey) { e.preventDefault(); setShowQuickOpen(p => !p); return }
      if (mod && e.key === 'k') { e.preventDefault(); setShowCommandPalette(p => !p); return }
      if (mod && e.key === 'b') { e.preventDefault(); setSidebarOpen(p => !p); return }
      if (mod && e.key === '`') { e.preventDefault(); setRightPanel(p => p === 'terminal' ? null : 'terminal'); return }
      if (mod && e.key === ',') { e.preventDefault(); setShowSettings(p => !p); return }
      if (e.key === 'Escape') { setShowCommandPalette(false); setShowQuickOpen(false); setShowSettings(false); return }

      if (mod) {
        for (const { panelId, key, shift } of shortcutBindings) {
          if (e.key.toLowerCase() === key.toLowerCase() && !!e.shiftKey === !!shift) {
            e.preventDefault()
            setRightPanel(p => p === panelId ? null : panelId)
            return
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const activePanel = rightPanel ? panelRegistry[rightPanel] : null

  return (
    <div className="flex flex-col h-screen bg-ide-bg text-ide-text overflow-hidden">
      <TitleBar
        onToggleSidebar={() => setSidebarOpen(p => !p)}
        onToggleTerminal={() => setRightPanel(p => p === 'terminal' ? null : 'terminal')}
        onToggleChat={() => setRightPanel(p => p === 'chat' ? null : 'chat')}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar onClose={() => setSidebarOpen(false)} activeTab={sidebarTab} onTabChange={setSidebarTab} />
        )}

        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            <EditorArea />
          </div>

          {activePanel && (
            <div className="w-[420px] border-l border-ide-border overflow-hidden flex-shrink-0">
              <Suspense fallback={<PanelFallback />}>
                {rightPanel === 'chat' ? (
                  <activePanel.component onClose={closePanel} onOpenSettings={() => setShowSettings(true)} />
                ) : (
                  <activePanel.component onClose={closePanel} />
                )}
              </Suspense>
            </div>
          )}
        </div>
      </div>

      <StatusBar
        onOpenTerminal={() => setRightPanel('terminal')}
        onOpenChat={() => setRightPanel('chat')}
        onOpenGit={() => setRightPanel('git')}
        onOpenPackages={() => setRightPanel('packages')}
        onOpenNotifications={() => setRightPanel('notifications')}
        onOpenGitAdvanced={() => setRightPanel('git-advanced')}
      />

      {showCommandPalette && <CommandPalette onClose={() => setShowCommandPalette(false)} />}
      {showQuickOpen && <QuickOpen onClose={() => setShowQuickOpen(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <NotificationToast />
    </div>
  )
}

export default App
