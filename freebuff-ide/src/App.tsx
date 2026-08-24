import React, { useEffect, useState } from 'react'
import { useAgentStore } from './stores/agentStore'
import { useSettingsStore } from './stores/settingsStore'
import TitleBar from './components/Layout/TitleBar'
import Sidebar, { SidebarTab } from './components/Layout/Sidebar'
import EditorArea from './components/Editor/EditorArea'
import ChatPanel from './components/AI/ChatPanel'
import TerminalPanel from './components/Terminal/TerminalPanel'
import GitPanel from './components/Git/GitPanel'
import DebugPanel from './components/Debug/DebugPanel'
import SnippetPanel from './components/Snippets/SnippetPanel'
import AgentDashboard from './components/AI/AgentDashboard'
import SymbolOutline from './components/SymbolOutline/SymbolOutline'
import MarkdownPreview from './components/Markdown/MarkdownPreview'
import TaskRunnerPanel from './components/TaskRunner/TaskRunnerPanel'
import APIClientPanel from './components/APIClient/APIClientPanel'
import JSONViewerPanel from './components/JSONViewer/JSONViewerPanel'
import RegexTesterPanel from './components/RegexTester/RegexTesterPanel'
import DatabaseViewer from './components/Database/DatabaseViewer'
import TodoFinderPanel from './components/TodoFinder/TodoFinderPanel'
import BookmarksPanel from './components/Bookmarks/BookmarksPanel'
import DockerPanel from './components/Docker/DockerPanel'
import PackageManagerPanel from './components/PackageManager/PackageManagerPanel'
import NotificationCenter from './components/NotificationCenter/NotificationCenter'
import GitAdvancedPanel from './components/Git/GitAdvancedPanel'
import ExtensionMarketplacePanel from './components/ExtensionMarketplace/ExtensionMarketplacePanel'
import PerformanceProfilerPanel from './components/PerformanceProfiler/PerformanceProfilerPanel'
import LiveSharePanel from './components/LiveShare/LiveSharePanel'
import ThemeEditorPanel from './components/ThemeEditor/ThemeEditorPanel'
import EnvironmentManagerPanel from './components/EnvironmentManager/EnvironmentManagerPanel'
import GraphQLExplorerPanel from './components/GraphQLExplorer/GraphQLExplorerPanel'
import WebSocketClientPanel from './components/WebSocketClient/WebSocketClientPanel'
import CodeMetricsPanel from './components/CodeMetrics/CodeMetricsPanel'
import MockServerPanel from './components/MockServer/MockServerPanel'
import ComponentLibraryPanel from './components/ComponentLibrary/ComponentLibraryPanel'
import CICDPipelinePanel from './components/CICDPipeline/CICDPipelinePanel'
import LogViewerPanel from './components/LogViewer/LogViewerPanel'
import DependencyGraphPanel from './components/DependencyGraph/DependencyGraphPanel'
import SystemMonitorPanel from './components/SystemMonitor/SystemMonitorPanel'
import CodeReviewPanel from './components/CodeReview/CodeReviewPanel'
import QueryHistoryPanel from './components/QueryHistory/QueryHistoryPanel'
import SnippetGeneratorPanel from './components/SnippetGenerator/SnippetGeneratorPanel'
import RateLimiterPanel from './components/RateLimiter/RateLimiterPanel'
import CloudDeployPanel from './components/CloudDeploy/CloudDeployPanel'
import WorkflowBuilderPanel from './components/WorkflowBuilder/WorkflowBuilderPanel'
import SecurityScannerPanel from './components/SecurityScanner/SecurityScannerPanel'
import AnalyticsPanel from './components/Analytics/AnalyticsPanel'
import APIDocGeneratorPanel from './components/APIDocGenerator/APIDocGeneratorPanel'
import KubernetesDashboardPanel from './components/KubernetesDashboard/KubernetesDashboardPanel'
import CodeMigrationPanel from './components/CodeMigration/CodeMigrationPanel'
import CollaborationHubPanel from './components/CollaborationHub/CollaborationHubPanel'
import CloudFunctionsPanel from './components/CloudFunctions/CloudFunctionsPanel'
import FeatureFlagsPanel from './components/FeatureFlags/FeatureFlagsPanel'
import IncidentManagementPanel from './components/IncidentManagement/IncidentManagementPanel'
import ContainerRegistryPanel from './components/ContainerRegistry/ContainerRegistryPanel'
import ABTestingPanel from './components/ABTesting/ABTestingPanel'
import WebhookManagerPanel from './components/WebhookManager/WebhookManagerPanel'
import DatabaseBackupPanel from './components/DatabaseBackup/DatabaseBackupPanel'
import SSLCertificatesPanel from './components/SSLCertificates/SSLCertificatesPanel'
import GitBlamePanel from './components/Git/GitBlamePanel'
import KeyboardShortcutsPanel from './components/KeyboardShortcuts/KeyboardShortcutsPanel'
import SchemaVisualizer from './components/Database/SchemaVisualizer'
import CallHierarchyPanel from './components/Git/CallHierarchyPanel'
import ProcessManagerPanel from './components/ProcessManager/ProcessManagerPanel'
import SnippetManagerPanel from './components/Snippets/SnippetManagerPanel'
import DiffViewer from './components/Diff/DiffViewer'
import GoToLinePanel from './components/Editor/GoToLinePanel'
import CodeSnippetsLibrary from './components/CodeSnippets/CodeSnippetsLibrary'
import ThemeBuilderPanel from './components/ThemeBuilder/ThemeBuilderPanel'
import CodeFormatterPanel from './components/CodeFormatter/CodeFormatterPanel'
import GitHistoryPanel from './components/Git/GitHistoryPanel'
import AgentWorkbench from './components/AI/AgentWorkbench'
import CodeIntelligencePanel from './components/AI/CodeIntelligencePanel'
import ProjectDashboard from './components/Layout/ProjectDashboard'
import APIPlaygroundPanel from './components/APIClient/APIPlaygroundPanel'
import StatusBar from './components/Layout/StatusBar'
import CommandPalette from './components/Layout/CommandPalette'
import SettingsPanel from './components/Settings/SettingsPanel'
import QuickOpen from './components/QuickOpen/QuickOpen'
import { NotificationToast } from './components/Notifications/NotificationSystem'

type RightPanel = 'chat' | 'terminal' | 'git' | 'debug' | 'snippets' | 'agents' | 'outline' | 'markdown' | 'tasks' | 'api' | 'json' | 'regex' | 'database' | 'todos' | 'bookmarks' | 'docker' | 'packages' | 'notifications' | 'git-advanced' | 'extensions' | 'profiler' | 'liveshare' | 'theme-editor' | 'env' | 'graphql' | 'websocket' | 'metrics' | 'mock-server' | 'components' | 'cicd' | 'logs' | 'deps' | 'monitor' | 'review' | 'query-history' | 'snippet-gen' | 'rate-limiter' | 'deploy' | 'workflow' | 'security' | 'analytics' | 'api-docs' | 'k8s' | 'migration' | 'collab-hub' | 'functions' | 'feature-flags' | 'incidents' | 'containers' | 'ab-testing' | 'webhooks' | 'db-backup' | 'ssl-certs' | 'git-blame' | 'shortcuts' | 'schema' | 'call-hierarchy' | 'processes' | 'snippet-manager' | 'diff' | 'go-to-line' | 'snippets-lib' | 'theme-builder' | 'formatter' | 'git-history' | 'agent-workbench' | 'code-intel' | 'dashboard' | 'api-playground' | null

function App() {
  const { initializeAgents } = useAgentStore()
  const { loadSettings } = useSettingsStore()
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')

  useEffect(() => {
    initializeAgents()
    loadSettings()
  }, [initializeAgents, loadSettings])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + P: Quick Open
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setShowQuickOpen(prev => !prev)
      }
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
      // Cmd/Ctrl + Shift + D: Toggle Debug
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setRightPanel(prev => prev === 'debug' ? null : 'debug')
      }
      // Cmd/Ctrl + Shift + M: Toggle Agent Dashboard
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        setRightPanel(prev => prev === 'agents' ? null : 'agents')
      }
      // Cmd/Ctrl + Shift + O: Toggle Outline
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        setRightPanel(prev => prev === 'outline' ? null : 'outline')
      }
      // Cmd/Ctrl + Shift + R: Toggle Task Runner
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        setRightPanel(prev => prev === 'tasks' ? null : 'tasks')
      }
      // Cmd/Ctrl + Shift + U: Toggle API Client
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'U') {
        e.preventDefault()
        setRightPanel(prev => prev === 'api' ? null : 'api')
      }
      // Cmd/Ctrl + Shift + J: Toggle JSON Viewer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        setRightPanel(prev => prev === 'json' ? null : 'json')
      }
      // Cmd/Ctrl + Shift + B: Toggle Bookmarks
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setRightPanel(prev => prev === 'bookmarks' ? null : 'bookmarks')
      }
      // Cmd/Ctrl + Shift + P: Toggle Package Manager
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setRightPanel(prev => prev === 'packages' ? null : 'packages')
      }
      // Cmd/Ctrl + Shift + N: Toggle Notifications
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        setRightPanel(prev => prev === 'notifications' ? null : 'notifications')
      }
      // Cmd/Ctrl + Shift + H: Toggle Git Advanced
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        setRightPanel(prev => prev === 'git-advanced' ? null : 'git-advanced')
      }
      // Cmd/Ctrl + Shift + E: Toggle Extensions Marketplace
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        setRightPanel(prev => prev === 'extensions' ? null : 'extensions')
      }
      // Cmd/Ctrl + Shift + F: Toggle Performance Profiler
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setRightPanel(prev => prev === 'profiler' ? null : 'profiler')
      }
      // Cmd/Ctrl + Shift + S: Toggle Live Share
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        setRightPanel(prev => prev === 'liveshare' ? null : 'liveshare')
      }
      // Cmd/Ctrl + Shift + T: Toggle Theme Editor
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setRightPanel(prev => prev === 'theme-editor' ? null : 'theme-editor')
      }
      // Cmd/Ctrl + Shift + V: Toggle Environment Variables
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault()
        setRightPanel(prev => prev === 'env' ? null : 'env')
      }
      // Cmd/Ctrl + Shift + Y: Toggle GraphQL Explorer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Y') {
        e.preventDefault()
        setRightPanel(prev => prev === 'graphql' ? null : 'graphql')
      }
      // Cmd/Ctrl + Shift + W: Toggle WebSocket Client
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'W') {
        e.preventDefault()
        setRightPanel(prev => prev === 'websocket' ? null : 'websocket')
      }
      // Cmd/Ctrl + Shift + I: Toggle Code Metrics
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        setRightPanel(prev => prev === 'metrics' ? null : 'metrics')
      }
      // Cmd/Ctrl + Shift + L: Toggle Component Library
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        setRightPanel(prev => prev === 'components' ? null : 'components')
      }
      // Cmd/Ctrl + Shift + C: Toggle CI/CD Pipeline
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setRightPanel(prev => prev === 'cicd' ? null : 'cicd')
      }
      // Cmd/Ctrl + Shift + Y: Toggle Log Viewer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Y') {
        e.preventDefault()
        setRightPanel(prev => prev === 'logs' ? null : 'logs')
      }
      // Cmd/Ctrl + Shift + X: Toggle Dependency Graph
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault()
        setRightPanel(prev => prev === 'deps' ? null : 'deps')
      }
      // Cmd/Ctrl + Shift + Z: Toggle System Monitor
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        setRightPanel(prev => prev === 'monitor' ? null : 'monitor')
      }
      // Cmd/Ctrl + Shift + ': Toggle Code Review
      if ((e.metaKey || e.ctrlKey) && e.key === "'") {
        e.preventDefault()
        setRightPanel(prev => prev === 'review' ? null : 'review')
      }
      // Cmd/Ctrl + ;: Toggle Query History
      if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault()
        setRightPanel(prev => prev === 'query-history' ? null : 'query-history')
      }
      // Cmd/Ctrl + Shift + =: Toggle Snippet Generator
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '=') {
        e.preventDefault()
        setRightPanel(prev => prev === 'snippet-gen' ? null : 'snippet-gen')
      }
      // Cmd/Ctrl + .: Toggle Rate Limiter
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setRightPanel(prev => prev === 'rate-limiter' ? null : 'rate-limiter')
      }
      // Cmd/Ctrl + ,: Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(prev => !prev)
      }
      // Cmd/Ctrl + Shift + B (db): Toggle DB Backup
      // Using Ctrl+Shift+'.' for DB Backup
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '>') {
        e.preventDefault()
        setRightPanel(prev => prev === 'db-backup' ? null : 'db-backup')
      }
      // Cmd/Ctrl + Shift + ': Toggle SSL Certificates
      if ((e.metaKey || e.ctrlKey) && e.key === '"') {
        e.preventDefault()
        setRightPanel(prev => prev === 'ssl-certs' ? null : 'ssl-certs')
      }
      // Cmd/Ctrl + Shift + \\: Toggle Git Blame
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setRightPanel(prev => prev === 'git-blame' ? null : 'git-blame')
      }
      // Cmd/Ctrl + Shift + /: Toggle Shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setRightPanel(prev => prev === 'shortcuts' ? null : 'shortcuts')
      }
      // Cmd/Ctrl + Shift + S (schema): Toggle Schema Visualizer
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        setRightPanel(prev => prev === 'schema' ? null : 'schema')
      }
      // Cmd/Ctrl + Shift + H (hierarchy): Toggle Call Hierarchy
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Q') {
        e.preventDefault()
        setRightPanel(prev => prev === 'call-hierarchy' ? null : 'call-hierarchy')
      }
      // Cmd/Ctrl + Shift + 9: Toggle Process Manager
      if ((e.metaKey || e.ctrlKey) && e.key === '9') {
        e.preventDefault()
        setRightPanel(prev => prev === 'processes' ? null : 'processes')
      }
      // Cmd/Ctrl + Shift + M (snippets): Toggle Snippet Manager
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
        // Already taken by Agent Dashboard, using 8 instead
      }
      // Cmd/Ctrl + D: Toggle Diff Viewer
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        setRightPanel(prev => prev === 'diff' ? null : 'diff')
      }
      // Cmd/Ctrl + G: Go to Line
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setRightPanel(prev => prev === 'go-to-line' ? null : 'go-to-line')
      }
      // Cmd/Ctrl + Shift + 6: Toggle Snippets Library
      if ((e.metaKey || e.ctrlKey) && e.key === '6') {
        e.preventDefault()
        setRightPanel(prev => prev === 'snippets-lib' ? null : 'snippets-lib')
      }
      // Cmd/Ctrl + Shift + 7: Toggle Theme Builder
      if ((e.metaKey || e.ctrlKey) && e.key === '7') {
        e.preventDefault()
        setRightPanel(prev => prev === 'theme-builder' ? null : 'theme-builder')
      }
      // Cmd/Ctrl + Shift + 5: Toggle Code Formatter
      if ((e.metaKey || e.ctrlKey) && e.key === '5') {
        e.preventDefault()
        setRightPanel(prev => prev === 'formatter' ? null : 'formatter')
      }
      // Cmd/Ctrl + Shift + 4: Toggle Git History
      if ((e.metaKey || e.ctrlKey) && e.key === '4') {
        e.preventDefault()
        setRightPanel(prev => prev === 'git-history' ? null : 'git-history')
      }
      // Cmd/Ctrl + Shift + 3: Toggle Agent Workbench
      if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault()
        setRightPanel(prev => prev === 'agent-workbench' ? null : 'agent-workbench')
      }
      // Cmd/Ctrl + Shift + 2: Toggle Code Intelligence
      if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault()
        setRightPanel(prev => prev === 'code-intel' ? null : 'code-intel')
      }
      // Cmd/Ctrl + Shift + 1: Toggle Project Dashboard
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault()
        setRightPanel(prev => prev === 'dashboard' ? null : 'dashboard')
      }
      // Cmd/Ctrl + Shift + ': Toggle API Playground
      if ((e.metaKey || e.ctrlKey) && e.key === '!') {
        e.preventDefault()
        setRightPanel(prev => prev === 'api-playground' ? null : 'api-playground')
      }
      // Escape: Close overlays
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowQuickOpen(false)
        setShowSettings(false)
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
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        )}

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* Main Editor */}
          <div className="flex-1 overflow-hidden min-w-0">
            <EditorArea />
          </div>

          {/* Right Panel */}
          {rightPanel && (
            <div className="w-[420px] border-l border-ide-border overflow-hidden flex-shrink-0">
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
              {rightPanel === 'debug' && (
                <DebugPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'snippets' && (
                <SnippetPanel />
              )}
              {rightPanel === 'agents' && (
                <AgentDashboard onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'outline' && (
                <SymbolOutline onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'markdown' && (
                <MarkdownPreview onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'tasks' && (
                <TaskRunnerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'api' && (
                <APIClientPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'json' && (
                <JSONViewerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'regex' && (
                <RegexTesterPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'database' && (
                <DatabaseViewer onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'todos' && (
                <TodoFinderPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'bookmarks' && (
                <BookmarksPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'docker' && (
                <DockerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'packages' && (
                <PackageManagerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'notifications' && (
                <NotificationCenter onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'git-advanced' && (
                <GitAdvancedPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'extensions' && (
                <ExtensionMarketplacePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'profiler' && (
                <PerformanceProfilerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'liveshare' && (
                <LiveSharePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'theme-editor' && (
                <ThemeEditorPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'env' && (
                <EnvironmentManagerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'graphql' && (
                <GraphQLExplorerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'websocket' && (
                <WebSocketClientPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'metrics' && (
                <CodeMetricsPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'mock-server' && (
                <MockServerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'components' && (
                <ComponentLibraryPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'cicd' && (
                <CICDPipelinePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'logs' && (
                <LogViewerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'deps' && (
                <DependencyGraphPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'monitor' && (
                <SystemMonitorPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'review' && (
                <CodeReviewPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'query-history' && (
                <QueryHistoryPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'snippet-gen' && (
                <SnippetGeneratorPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'rate-limiter' && (
                <RateLimiterPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'deploy' && (
                <CloudDeployPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'workflow' && (
                <WorkflowBuilderPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'security' && (
                <SecurityScannerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'analytics' && (
                <AnalyticsPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'api-docs' && (
                <APIDocGeneratorPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'k8s' && (
                <KubernetesDashboardPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'migration' && (
                <CodeMigrationPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'collab-hub' && (
                <CollaborationHubPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'functions' && (
                <CloudFunctionsPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'feature-flags' && (
                <FeatureFlagsPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'incidents' && (
                <IncidentManagementPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'containers' && (
                <ContainerRegistryPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'ab-testing' && (
                <ABTestingPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'webhooks' && (
                <WebhookManagerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'db-backup' && (
                <DatabaseBackupPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'ssl-certs' && (
                <SSLCertificatesPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'git-blame' && (
                <GitBlamePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'shortcuts' && (
                <KeyboardShortcutsPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'schema' && (
                <SchemaVisualizer onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'call-hierarchy' && (
                <CallHierarchyPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'processes' && (
                <ProcessManagerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'snippet-manager' && (
                <SnippetManagerPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'diff' && (
                <DiffViewer onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'go-to-line' && (
                <GoToLinePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'snippets-lib' && (
                <CodeSnippetsLibrary onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'theme-builder' && (
                <ThemeBuilderPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'formatter' && (
                <CodeFormatterPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'git-history' && (
                <GitHistoryPanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'agent-workbench' && (
                <AgentWorkbench onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'code-intel' && (
                <CodeIntelligencePanel onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'dashboard' && (
                <ProjectDashboard onClose={() => setRightPanel(null)} />
              )}
              {rightPanel === 'api-playground' && (
                <APIPlaygroundPanel onClose={() => setRightPanel(null)} />
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
        onOpenPackages={() => setRightPanel('packages')}
        onOpenNotifications={() => setRightPanel('notifications')}
        onOpenGitAdvanced={() => setRightPanel('git-advanced')}
      />

      {/* Overlays */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
      {showQuickOpen && (
        <QuickOpen onClose={() => setShowQuickOpen(false)} />
      )}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Notifications */}
      <NotificationToast />
    </div>
  )
}

export default App
