import { Suspense, useEffect, useState } from 'react'
import { useAgentStore } from './stores/agentStore'
import { useSettingsStore } from './stores/settingsStore'
import { useEditorStore } from './stores/editorStore'
import TitleBar from './components/Layout/TitleBar'
import Sidebar, { SidebarTab } from './components/Layout/Sidebar'
import EditorArea from './components/Editor/EditorArea'
import Breadcrumbs from './components/Editor/Breadcrumbs'
import StatusBar from './components/Layout/StatusBar'
import CommandPalette from './components/Layout/CommandPalette'
import SettingsPanel from './components/Settings/SettingsPanel'
import QuickOpen from './components/QuickOpen/QuickOpen'
import { NotificationToast } from './components/Notifications/NotificationSystem'
import ShortcutsOverlay from './components/KeyboardShortcuts/ShortcutsOverlay'
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
  const { tabs, activeTabId, currentLine, symbols } = useEditorStore()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')
  const closePanel = () => setRightPanel(null)

  useEffect(() => {
    initializeAgents()
    loadSettings()
    // Auto-load the bundled project skills library (default-on support)
    import('./services/projectSkillsService').then(async ({ projectSkillsService }) => {
      try {
        const api = (window as any).electronAPI
        const root = await api?.getWorkspaceRoot?.()
        if (root) await projectSkillsService.load(root)
      } catch { /* skills stay empty in browser mode */ }
    })
  }, [initializeAgents, loadSettings])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'p' && !e.shiftKey) { e.preventDefault(); setShowQuickOpen(p => !p); return }
      if (mod && e.key === 'k' && !e.shiftKey) { e.preventDefault(); setShowCommandPalette(p => !p); return }
      if (mod && e.key === 'b') { e.preventDefault(); setSidebarOpen(p => !p); return }
      if (mod && e.key === '`') { e.preventDefault(); setRightPanel(p => p === 'terminal' ? null : 'terminal'); return }
      if (mod && e.key === ',') { e.preventDefault(); setShowSettings(p => !p); return }
      if (e.key === '/' && !mod) { e.preventDefault(); setShowShortcuts(p => !p); return }
      if (e.key === 'Escape') { setShowCommandPalette(false); setShowQuickOpen(false); setShowSettings(false); setShowShortcuts(false); return }

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
        onOpenAbout={() => setRightPanel('about' as any)}
        onOpenDocs={() => setRightPanel('docs')}
        onOpenFeatureDashboard={() => setRightPanel('feature-dashboard' as any)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar onClose={() => setSidebarOpen(false)} activeTab={sidebarTab} onTabChange={setSidebarTab} />
        )}

        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
            <Breadcrumbs
              filePath={tabs.find(t => t.id === activeTabId)?.path}
              symbols={symbols}
              currentLine={currentLine}
            />
            <div className="flex-1 overflow-hidden min-w-0">
              <EditorArea />
            </div>
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

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onToggleTerminal={() => setRightPanel(p => p === 'terminal' ? null : 'terminal')}
          onToggleChat={() => setRightPanel(p => p === 'chat' ? null : 'chat')}
          onOpenSettings={() => { setShowSettings(true); setShowCommandPalette(false) }}
          onOpenGit={() => { setRightPanel('git'); setShowCommandPalette(false) }}
          onOpenTerminal={() => { setRightPanel('terminal'); setShowCommandPalette(false) }}
          onOpenPackages={() => { setRightPanel('packages'); setShowCommandPalette(false) }}
          onOpenGitAdvanced={() => { setRightPanel('git-advanced'); setShowCommandPalette(false) }}
          onOpenAgents={() => { setRightPanel('agents'); setShowCommandPalette(false) }}
          onOpenMemory={() => { setRightPanel('memory'); setShowCommandPalette(false) }}
          onOpenAbout={() => { setRightPanel('about' as any); setShowCommandPalette(false) }}
          onOpenSSH={() => { setRightPanel('ssh'); setShowCommandPalette(false) }}
          onOpenDatabase={() => { setRightPanel('db-panel'); setShowCommandPalette(false) }}
          onOpenAPIDoc={() => { setRightPanel('api-docs'); setShowCommandPalette(false) }}
          onOpenCollab={() => { setRightPanel('collaboration'); setShowCommandPalette(false) }}
          onOpenMCP={() => { setRightPanel('mcp-client'); setShowCommandPalette(false) }}
          onOpenMultiSearch={() => { setRightPanel('multi-search'); setShowCommandPalette(false) }}
          onOpenExtensions={() => { setRightPanel('extensions'); setShowCommandPalette(false) }}
          onOpenExtDeveloper={() => { setRightPanel('ext-developer' as any); setShowCommandPalette(false) }}
          onOpenBenchmark={() => { setRightPanel('benchmark'); setShowCommandPalette(false) }}
          onOpenDocs={() => { setRightPanel('docs'); setShowCommandPalette(false) }}
          onOpenFeatureDashboard={() => { setRightPanel('feature-dashboard' as any); setShowCommandPalette(false) }}
        />
      )}
      {showQuickOpen && <QuickOpen onClose={() => setShowQuickOpen(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      <NotificationToast />
    </div>
  )
}

export default App
