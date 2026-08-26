export interface ElectronAPI {
  // File operations
  openFile: () => Promise<{ success: boolean; filePath?: string; content?: string; error?: string; canceled?: boolean }>
  openFolder: () => Promise<{ success: boolean; folderPath?: string; error?: string; canceled?: boolean }>
  setWorkspaceRoot: (rootPath: string) => Promise<{ success: boolean; error?: string }>
  getWorkspaceRoot: () => Promise<string | null>
  saveFile: (content: string) => Promise<{ success: boolean; path?: string; error?: string; canceled?: boolean }>
  saveFileAs: (filePath: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string; size?: number; modified?: string }>
  writeFileSync: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  createDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>
  rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>
  copyFile: (source: string, destination: string) => Promise<{ success: boolean; error?: string }>
  fileExists: (filePath: string) => Promise<boolean>
  getFileStats: (filePath: string) => Promise<{
    success: boolean; isFile?: boolean; isDirectory?: boolean;
    size?: number; created?: string; modified?: string; accessed?: string; error?: string
  }>
  readDir: (dirPath: string, maxDepth?: number) => Promise<{
    success: boolean; tree?: FileTreeItem[]; error?: string
  }>
  searchFiles: (dirPath: string, query: string, maxResults?: number) => Promise<{
    success: boolean; results?: Array<{ path: string; name: string; extension: string }>; error?: string
  }>

  // File watching
  watchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  unwatchFile: (filePath: string) => Promise<{ success: boolean }>
  onFileChanged: (callback: (eventType: string, filePath: string) => void) => () => void

  // Terminal
  terminalCreate: (cwd?: string) => Promise<{ success: boolean; id?: string; shell?: string; cwd?: string; error?: string }>
  terminalWrite: (id: string, data: string) => Promise<{ success: boolean; error?: string }>
  terminalResize: (id: string, cols: number, rows: number) => Promise<{ success: boolean }>
  terminalKill: (id: string) => Promise<{ success: boolean; error?: string }>
  terminalList: () => Promise<string[]>
  onTerminalOutput: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string, code: number | null) => void) => () => void
  onTerminalError: (callback: (id: string, message: string) => void) => () => void


  // Git
  gitStatus: (cwd?: string) => Promise<{ success: boolean; status?: string; branch?: string; error?: string }>
  gitLog: (cwd?: string, maxCount?: number) => Promise<{
    success: boolean; commits?: Array<{ hash: string; message: string; author: string; date: string }>; error?: string
  }>
  gitDiff: (cwd?: string, file?: string) => Promise<{ success: boolean; diff?: string; error?: string }>
  gitAdd: (files: string[], cwd?: string) => Promise<{ success: boolean; error?: string }>
  gitCommit: (message: string, cwd?: string) => Promise<{ success: boolean; output?: string; error?: string }>
  gitBranches: (cwd?: string) => Promise<{ success: boolean; branches?: string[]; error?: string }>
  gitCheckout: (branch: string, cwd?: string) => Promise<{ success: boolean; error?: string }>
  gitCreateBranch: (name: string, cwd?: string) => Promise<{ success: boolean; error?: string }>
  gitReset: (files: string[], cwd?: string) => Promise<{ success: boolean; error?: string }>
  gitCheckoutFile: (filePath: string, cwd?: string) => Promise<{ success: boolean; error?: string }>

  // Clipboard
  clipboardRead: () => Promise<string>
  clipboardWrite: (text: string) => Promise<{ success: boolean }>

  // Native OS
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  showNotification: (title: string, body: string, silent?: boolean) => Promise<{ success: boolean }>
  getSystemInfo: () => Promise<{
    platform: string; arch: string; release: string; nodeVersion: string;
    homedir: string; tmpdir: string; cpus: number; totalMemory: number; freeMemory: number
  }>
  getEnv: (key: string) => Promise<string>

  // Network
  httpRequest: (options: {
    url: string; method?: string; headers?: Record<string, string>; body?: string
  }) => Promise<{
    success: boolean; status?: number; statusText?: string;
    headers?: Record<string, string>; body?: string; error?: string
  }>

  // App
  getAppVersion: () => Promise<string>
  getCurrentDir: () => Promise<string>
  getHomeDir: () => Promise<string>
  getResourcesPath: () => Promise<string>
  isPackaged: () => Promise<boolean>

  // Auto-update
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) => () => void
  onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => () => void
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
  onUpdateError: (callback: (error: { message: string }) => void) => () => void

  // Menu events
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => () => void

  // Rust Engine (N-API)
  engineInit: () => Promise<{ success: boolean; result?: string; error?: string }>
  engineVersion: () => Promise<{ success: boolean; version?: string; error?: string }>
  engineSupportedLanguages: () => Promise<{ success: boolean; languages?: string[]; error?: string }>
  engineDetectLanguage: (filePath: string) => Promise<{ success: boolean; language?: string; error?: string }>
  engineProcessFile: (filePath: string, content: string, language: string) => Promise<{ success: boolean; symbols?: any[]; symbol_count?: number; error?: string }>
  engineParseStructured: (filePath: string, content: string, language: string) => Promise<{
    success: boolean; file_path?: string; language?: string;
    symbols?: any[]; stats?: { total: number; functions: number; classes: number; enums: number; traits: number };
    error?: string
  }>
  engineSearchCodebase: (query: string, files: string[]) => Promise<{ success: boolean; results?: any[]; total_matches?: number; error?: string }>
  engineInitProjectMemory: (rootPath: string, name: string) => Promise<{ success: boolean; error?: string }>
  engineAddSymbol: (name: string, symbolType: string, filePath: string, line: number, column: number, snippet: string) => Promise<{ success: boolean; error?: string }>
  engineSearchSymbols: (query: string) => Promise<{ success: boolean; results?: any[]; total?: number; error?: string }>
  engineProjectSummary: () => Promise<{ success: boolean; summary?: string; error?: string }>
  engineClearProjectMemory: () => Promise<{ success: boolean; error?: string }>
  engineCreateTask: (agentType: string, description: string, priority: number) => Promise<{ success: boolean; task_id?: string; error?: string }>
  engineAgentPrompt: (agentType: string) => Promise<{ success: boolean; prompt?: string; error?: string }>
  engineListAgents: () => Promise<{ success: boolean; agents?: Array<{ type: string; name: string; description: string }>; error?: string }>

  // Platform
  platform: string
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
