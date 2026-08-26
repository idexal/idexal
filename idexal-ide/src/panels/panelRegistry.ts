import { lazy, ComponentType } from 'react'

export interface PanelConfig {
  component: ComponentType<any>
  shortcut?: { key: string; shift?: boolean; ctrl?: boolean }
}

// Lazy imports — one chunk per panel, loaded on first use.
const ChatPanel = lazy(() => import('../components/AI/ChatPanel'))
const TerminalPanel = lazy(() => import('../components/Terminal/TerminalPanel'))
const GitPanel = lazy(() => import('../components/Git/GitPanel'))
const DebugPanel = lazy(() => import('../components/Debug/DebugPanel'))
const SnippetPanel = lazy(() => import('../components/Snippets/SnippetPanel'))
const AgentDashboard = lazy(() => import('../components/AI/AgentDashboard'))
const SymbolOutline = lazy(() => import('../components/SymbolOutline/SymbolOutline'))
const MarkdownPreview = lazy(() => import('../components/Markdown/MarkdownPreview'))
const TaskRunnerPanel = lazy(() => import('../components/TaskRunner/TaskRunnerPanel'))
const APIClientPanel = lazy(() => import('../components/APIClient/APIClientPanel'))
const JSONViewerPanel = lazy(() => import('../components/JSONViewer/JSONViewerPanel'))
const RegexTesterPanel = lazy(() => import('../components/RegexTester/RegexTesterPanel'))
const DatabaseViewer = lazy(() => import('../components/Database/DatabaseViewer'))
const TodoFinderPanel = lazy(() => import('../components/TodoFinder/TodoFinderPanel'))
const BookmarksPanel = lazy(() => import('../components/Bookmarks/BookmarksPanel'))
const DockerPanel = lazy(() => import('../components/Docker/DockerPanel'))
const PackageManagerPanel = lazy(() => import('../components/PackageManager/PackageManagerPanel'))
const NotificationCenter = lazy(() => import('../components/NotificationCenter/NotificationCenter'))
const GitAdvancedPanel = lazy(() => import('../components/Git/GitAdvancedPanel'))
const GitStagingPanel = lazy(() => import('../components/Git/GitStaging'))
const ExtensionMarketplacePanel = lazy(() => import('../components/Extensions/ExtensionMarketplace'))
const PerformanceProfilerPanel = lazy(() => import('../components/PerformanceProfiler/PerformanceProfilerPanel'))
const LiveSharePanel = lazy(() => import('../components/LiveShare/LiveSharePanel'))
const CommandHistoryPanel = lazy(() => import('../components/CommandHistory/CommandHistoryPanel'))
const WorkspaceStatsPanel = lazy(() => import('../components/WorkspaceStats/WorkspaceStatsPanel'))
const QuickActionsPanel = lazy(() => import('../components/QuickActions/QuickActionsPanel'))
const ThemeEditorPanel = lazy(() => import('../components/ThemeEditor/ThemeEditorPanel'))
const EnvironmentManagerPanel = lazy(() => import('../components/EnvironmentManager/EnvironmentManagerPanel'))
const GraphQLExplorerPanel = lazy(() => import('../components/GraphQLExplorer/GraphQLExplorerPanel'))
const WebSocketClientPanel = lazy(() => import('../components/WebSocketClient/WebSocketClientPanel'))
const CodeMetricsPanel = lazy(() => import('../components/CodeMetrics/CodeMetricsPanel'))
const MockServerPanel = lazy(() => import('../components/MockServer/MockServerPanel'))
const ComponentLibraryPanel = lazy(() => import('../components/ComponentLibrary/ComponentLibraryPanel'))
const CICDPipelinePanel = lazy(() => import('../components/CICDPipeline/CICDPipelinePanel'))
const LogViewerPanel = lazy(() => import('../components/LogViewer/LogViewerPanel'))
const DependencyGraphPanel = lazy(() => import('../components/DependencyGraph/DependencyGraphPanel'))
const SystemMonitorPanel = lazy(() => import('../components/SystemMonitor/SystemMonitorPanel'))
const CodeReviewPanel = lazy(() => import('../components/CodeReview/CodeReviewPanel'))
const QueryHistoryPanel = lazy(() => import('../components/QueryHistory/QueryHistoryPanel'))
const SnippetGeneratorPanel = lazy(() => import('../components/SnippetGenerator/SnippetGeneratorPanel'))
const RateLimiterPanel = lazy(() => import('../components/RateLimiter/RateLimiterPanel'))
const CloudDeployPanel = lazy(() => import('../components/CloudDeploy/CloudDeployPanel'))
const WorkflowBuilderPanel = lazy(() => import('../components/WorkflowBuilder/WorkflowBuilderPanel'))
const SecurityScannerPanel = lazy(() => import('../components/SecurityScanner/SecurityScannerPanel'))
const AnalyticsPanel = lazy(() => import('../components/Analytics/AnalyticsPanel'))
const APIDocGeneratorPanel = lazy(() => import('../components/APIDocGenerator/APIDocGeneratorPanel'))
const KubernetesDashboardPanel = lazy(() => import('../components/KubernetesDashboard/KubernetesDashboardPanel'))
const CodeMigrationPanel = lazy(() => import('../components/CodeMigration/CodeMigrationPanel'))
const CollaborationHubPanel = lazy(() => import('../components/CollaborationHub/CollaborationHubPanel'))
const CloudFunctionsPanel = lazy(() => import('../components/CloudFunctions/CloudFunctionsPanel'))
const FeatureFlagsPanel = lazy(() => import('../components/FeatureFlags/FeatureFlagsPanel'))
const IncidentManagementPanel = lazy(() => import('../components/IncidentManagement/IncidentManagementPanel'))
const ContainerRegistryPanel = lazy(() => import('../components/ContainerRegistry/ContainerRegistryPanel'))
const ABTestingPanel = lazy(() => import('../components/ABTesting/ABTestingPanel'))
const WebhookManagerPanel = lazy(() => import('../components/WebhookManager/WebhookManagerPanel'))
const DatabaseBackupPanel = lazy(() => import('../components/DatabaseBackup/DatabaseBackupPanel'))
const SSLCertificatesPanel = lazy(() => import('../components/SSLCertificates/SSLCertificatesPanel'))
const GitBlamePanel = lazy(() => import('../components/Git/GitBlamePanel'))
const GitLogGraph = lazy(() => import('../components/Git/GitLogGraph'))
const KeyboardShortcutsPanel = lazy(() => import('../components/KeyboardShortcuts/KeyboardShortcutsPanel'))
const SchemaVisualizer = lazy(() => import('../components/Database/SchemaVisualizer'))
const CallHierarchyPanel = lazy(() => import('../components/Git/CallHierarchyPanel'))
const ProcessManagerPanel = lazy(() => import('../components/ProcessManager/ProcessManagerPanel'))
const SnippetManagerPanel = lazy(() => import('../components/Snippets/SnippetManagerPanel'))
const DiffViewer = lazy(() => import('../components/Diff/DiffViewer'))
const GoToLinePanel = lazy(() => import('../components/Editor/GoToLinePanel'))
const CodeSnippetsLibrary = lazy(() => import('../components/CodeSnippets/CodeSnippetsLibrary'))
const ThemeBuilderPanel = lazy(() => import('../components/ThemeBuilder/ThemeBuilderPanel'))
const CodeFormatterPanel = lazy(() => import('../components/CodeFormatter/CodeFormatterPanel'))
const GitHistoryPanel = lazy(() => import('../components/Git/GitHistoryPanel'))
const AgentWorkbench = lazy(() => import('../components/AI/AgentWorkbench'))
const CodeIntelligencePanel = lazy(() => import('../components/AI/CodeIntelligencePanel'))
const ProjectDashboard = lazy(() => import('../components/Layout/ProjectDashboard'))
const APIPlaygroundPanel = lazy(() => import('../components/APIClient/APIPlaygroundPanel'))
const EmbeddedBrowser = lazy(() => import('../components/Browser/EmbeddedBrowser'))
const AIHistoryPanel = lazy(() => import('../components/AI/AIHistoryPanel'))
const MultiCursorSnippets = lazy(() => import('../components/Snippets/MultiCursorSnippets'))
const SSHManagerPanel = lazy(() => import('../components/SSH/SSHManager'))
const APIDocGenPanel = lazy(() => import('../components/APIDoc/APIDocGenerator'))
const DatabasePanel = lazy(() => import('../components/Database/DatabasePanel'))
const MultiFileSearchPanel = lazy(() => import('../components/Search/MultiFileSearch'))
const AboutUsPanel = lazy(() => import('../components/About/AboutUsPanel'))
const CollaborationPanel = lazy(() => import('../components/Collaboration/CollaborationManager'))
const MCPClientPanel = lazy(() => import('../components/MCP/MCPClientPanel'))
const ExtensionDeveloperPanel = lazy(() => import('../components/Extensions/ExtensionDeveloperPanel'))
const BenchmarkComparison = lazy(() => import('../components/Benchmark/BenchmarkComparison'))
const DocumentationPortal = lazy(() => import('../components/Docs/DocumentationPortal'))
const FeatureDashboard = lazy(() => import('../components/Dashboard/FeatureDashboard'))

// Panel registry: maps panel IDs to their component and optional keyboard shortcut.
export const panelRegistry: Record<string, PanelConfig> = {
  'chat':             { component: ChatPanel,            shortcut: { key: 'A', shift: true } },
  'agents':           { component: AgentDashboard,       shortcut: { key: 'M', shift: true } },
  'agent-workbench':  { component: AgentWorkbench,       shortcut: { key: '3' } },
  'code-intel':       { component: CodeIntelligencePanel,shortcut: { key: '2' } },
  'diff':             { component: DiffViewer,           shortcut: { key: 'd' } },
  'go-to-line':       { component: GoToLinePanel,        shortcut: { key: 'g' } },
  'formatter':        { component: CodeFormatterPanel,   shortcut: { key: '5' } },
  'snippets-lib':     { component: CodeSnippetsLibrary,  shortcut: { key: '6' } },
  'snippet-manager':  { component: SnippetManagerPanel },
  'snippet-gen':      { component: SnippetGeneratorPanel, shortcut: { key: '=', shift: true } },
  'snippets':         { component: SnippetPanel },
  'review':           { component: CodeReviewPanel,      shortcut: { key: "'" } },
  'metrics':          { component: CodeMetricsPanel,     shortcut: { key: 'I', shift: true } },
  'migration':        { component: CodeMigrationPanel },
  'git':              { component: GitPanel,             shortcut: { key: 'G', shift: true } },
  'git-staging':      { component: GitStagingPanel,    shortcut: { key: 'S' } },
  'git-advanced':     { component: GitAdvancedPanel,     shortcut: { key: 'H', shift: true } },
  'git-log':          { component: GitLogGraph,          shortcut: { key: '\\' } },
  'git-blame':        { component: GitBlamePanel,        shortcut: { key: ';' } },
  'git-history':      { component: GitHistoryPanel,      shortcut: { key: '4' } },
  'call-hierarchy':   { component: CallHierarchyPanel,   shortcut: { key: 'Q', shift: true } },
  'bookmarks':        { component: BookmarksPanel,       shortcut: { key: 'B', shift: true } },
  'todos':            { component: TodoFinderPanel },
  'database':         { component: DatabaseViewer },
  'schema':           { component: SchemaVisualizer,     shortcut: { key: '0' } },
  'query-history':    { component: QueryHistoryPanel,    shortcut: { key: 'q' } },
  'db-backup':        { component: DatabaseBackupPanel,  shortcut: { key: '>', shift: true } },
  'docker':           { component: DockerPanel },
  'cicd':             { component: CICDPipelinePanel,    shortcut: { key: 'C', shift: true } },
  'deploy':           { component: CloudDeployPanel },
  'k8s':              { component: KubernetesDashboardPanel },
  'containers':       { component: ContainerRegistryPanel },
  'functions':        { component: CloudFunctionsPanel },
  'mock-server':      { component: MockServerPanel },
  'ab-testing':       { component: ABTestingPanel },
  'security':         { component: SecurityScannerPanel },
  'ssl-certs':        { component: SSLCertificatesPanel, shortcut: { key: '"' } },
  'rate-limiter':     { component: RateLimiterPanel,     shortcut: { key: '.' } },
  'webhooks':         { component: WebhookManagerPanel },
  'api':              { component: APIClientPanel,       shortcut: { key: 'U', shift: true } },
  'api-playground':   { component: APIPlaygroundPanel,   shortcut: { key: '!' } },
  'json':             { component: JSONViewerPanel,      shortcut: { key: 'J', shift: true } },
  'regex':            { component: RegexTesterPanel },
  'markdown':         { component: MarkdownPreview },
  'graphql':          { component: GraphQLExplorerPanel, shortcut: { key: 'Y', shift: true } },
  'websocket':        { component: WebSocketClientPanel, shortcut: { key: 'W', shift: true } },
  'env':              { component: EnvironmentManagerPanel, shortcut: { key: 'V', shift: true } },
  'packages':         { component: PackageManagerPanel,  shortcut: { key: 'P', shift: true } },
  'extensions':       { component: ExtensionMarketplacePanel, shortcut: { key: 'E', shift: true } },
  'components':       { component: ComponentLibraryPanel, shortcut: { key: 'L', shift: true } },
  'theme-editor':     { component: ThemeEditorPanel,     shortcut: { key: 'T', shift: true } },
  'theme-builder':    { component: ThemeBuilderPanel,    shortcut: { key: '7' } },
  'shortcuts':        { component: KeyboardShortcutsPanel, shortcut: { key: '/' } },
  'monitor':          { component: SystemMonitorPanel,   shortcut: { key: 'Z', shift: true } },
  'processes':        { component: ProcessManagerPanel,  shortcut: { key: '9' } },
  'logs':             { component: LogViewerPanel },
  'analytics':        { component: AnalyticsPanel },
  'profiler':         { component: PerformanceProfilerPanel, shortcut: { key: 'F', shift: true } },
  'liveshare':        { component: LiveSharePanel,       shortcut: { key: 'S', shift: true } },
  'workflow':         { component: WorkflowBuilderPanel },
  'deps':             { component: DependencyGraphPanel, shortcut: { key: 'X', shift: true } },
  'tasks':            { component: TaskRunnerPanel,      shortcut: { key: 'R', shift: true } },
  'notifications':    { component: NotificationCenter,   shortcut: { key: 'N', shift: true } },
  'collab-hub':       { component: CollaborationHubPanel },
  'feature-flags':    { component: FeatureFlagsPanel },
  'incidents':        { component: IncidentManagementPanel },
  'dashboard':        { component: ProjectDashboard,     shortcut: { key: '1' } },
  'browser':          { component: EmbeddedBrowser,       shortcut: { key: 'B' } },
  'command-history':  { component: CommandHistoryPanel,  shortcut: { key: 'H' } },
  'workspace-stats':  { component: WorkspaceStatsPanel,  shortcut: { key: 'I' } },
  'quick-actions':    { component: QuickActionsPanel,    shortcut: { key: 'P' } },
  'ai-history':       { component: AIHistoryPanel,       shortcut: { key: 'Y' } },
  'multi-cursor':     { component: MultiCursorSnippets,  shortcut: { key: 'O', shift: true } },
  'ssh':              { component: SSHManagerPanel,     shortcut: { key: 'K', shift: true } },
  'api-doc-gen':      { component: APIDocGenPanel },
  'api-docs':         { component: APIDocGeneratorPanel, shortcut: { key: '8' } },
  'db-panel':         { component: DatabasePanel,        shortcut: { key: 'D', shift: true } },
  'multi-search':     { component: MultiFileSearchPanel },
  'about':            { component: AboutUsPanel },
  'collaboration':    { component: CollaborationPanel, shortcut: { key: 'c' } },
  'mcp-client':       { component: MCPClientPanel,      shortcut: { key: '0', shift: true } },
  'ext-developer':    { component: ExtensionDeveloperPanel, shortcut: { key: 'e' } },
  'benchmark':        { component: BenchmarkComparison,  shortcut: { key: 'n' } },
  'docs':             { component: DocumentationPortal,  shortcut: { key: 'm' } },
  'feature-dashboard': { component: FeatureDashboard }, 
}

// Flat shortcut list derived from the registry for the keyboard handler.
export const shortcutBindings = Object.entries(panelRegistry)
  .filter(([, cfg]) => cfg.shortcut != null)
  .map(([id, cfg]) => ({
    panelId: id,
    ...cfg.shortcut!,
  }))

export type RightPanel = keyof typeof panelRegistry | null
