export interface ElectronAPI {
  // File operations
  openFile: () => Promise<{ success: boolean; filePath?: string; content?: string; error?: string; canceled?: boolean }>
  openFolder: () => Promise<{ success: boolean; folderPath?: string; error?: string; canceled?: boolean }>
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

  // Command execution
  execCommand: (command: string, cwd?: string, timeout?: number) => Promise<{
    success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string
  }>
  execCommandSync: (command: string, cwd?: string) => Promise<{
    success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string
  }>

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

  // Menu events
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => () => void

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
