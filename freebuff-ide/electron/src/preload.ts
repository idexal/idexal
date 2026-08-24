import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ═══════════════════════════════════════════════════════════
  // FILE OPERATIONS (Full Access)
  // ═══════════════════════════════════════════════════════════
  openFile: () => ipcRenderer.invoke('open-file'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),
  saveFileAs: (filePath: string, content: string) => ipcRenderer.invoke('save-file-as', filePath, content),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFileSync: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  createDirectory: (dirPath: string) => ipcRenderer.invoke('create-directory', dirPath),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('rename', oldPath, newPath),
  copyFile: (source: string, destination: string) => ipcRenderer.invoke('copy-file', source, destination),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getFileStats: (filePath: string) => ipcRenderer.invoke('get-file-stats', filePath),
  readDir: (dirPath: string, maxDepth?: number) => ipcRenderer.invoke('read-dir', dirPath, maxDepth),
  searchFiles: (dirPath: string, query: string, maxResults?: number) => ipcRenderer.invoke('search-files', dirPath, query, maxResults),

  // ═══════════════════════════════════════════════════════════
  // FILE WATCHING
  // ═══════════════════════════════════════════════════════════
  watchFile: (filePath: string) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath: string) => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback: (eventType: string, filePath: string) => void) => {
    const handler = (_event: any, eventType: string, filePath: string) => callback(eventType, filePath)
    ipcRenderer.on('file-changed', handler)
    return () => ipcRenderer.removeListener('file-changed', handler)
  },

  // ═══════════════════════════════════════════════════════════
  // TERMINAL (Real Shell)
  // ═══════════════════════════════════════════════════════════
  terminalCreate: (cwd?: string) => ipcRenderer.invoke('terminal-create', cwd),
  terminalWrite: (id: string, data: string) => ipcRenderer.invoke('terminal-write', id, data),
  terminalResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal-resize', id, cols, rows),
  terminalKill: (id: string) => ipcRenderer.invoke('terminal-kill', id),
  terminalList: () => ipcRenderer.invoke('terminal-list'),
  onTerminalOutput: (callback: (id: string, data: string) => void) => {
    const handler = (_event: any, id: string, data: string) => callback(id, data)
    ipcRenderer.on('terminal-output', handler)
    return () => ipcRenderer.removeListener('terminal-output', handler)
  },
  onTerminalExit: (callback: (id: string, code: number | null) => void) => {
    const handler = (_event: any, id: string, code: number | null) => callback(id, code)
    ipcRenderer.on('terminal-exit', handler)
    return () => ipcRenderer.removeListener('terminal-exit', handler)
  },
  onTerminalError: (callback: (id: string, message: string) => void) => {
    const handler = (_event: any, id: string, message: string) => callback(id, message)
    ipcRenderer.on('terminal-error', handler)
    return () => ipcRenderer.removeListener('terminal-error', handler)
  },

  // ═══════════════════════════════════════════════════════════
  // COMMAND EXECUTION
  // ═══════════════════════════════════════════════════════════
  execCommand: (command: string, cwd?: string, timeout?: number) =>
    ipcRenderer.invoke('exec-command', command, cwd, timeout),
  execCommandSync: (command: string, cwd?: string) =>
    ipcRenderer.invoke('exec-command-sync', command, cwd),

  // ═══════════════════════════════════════════════════════════
  // GIT OPERATIONS
  // ═══════════════════════════════════════════════════════════
  gitStatus: (cwd?: string) => ipcRenderer.invoke('git-status', cwd),
  gitLog: (cwd?: string, maxCount?: number) => ipcRenderer.invoke('git-log', cwd, maxCount),
  gitDiff: (cwd?: string, file?: string) => ipcRenderer.invoke('git-diff', cwd, file),
  gitAdd: (files: string[], cwd?: string) => ipcRenderer.invoke('git-add', files, cwd),
  gitCommit: (message: string, cwd?: string) => ipcRenderer.invoke('git-commit', message, cwd),
  gitBranches: (cwd?: string) => ipcRenderer.invoke('git-branches', cwd),
  gitCheckout: (branch: string, cwd?: string) => ipcRenderer.invoke('git-checkout', branch, cwd),
  gitCreateBranch: (name: string, cwd?: string) => ipcRenderer.invoke('git-create-branch', name, cwd),

  // ═══════════════════════════════════════════════════════════
  // CLIPBOARD & NATIVE OS
  // ═══════════════════════════════════════════════════════════
  clipboardRead: () => ipcRenderer.invoke('clipboard-read'),
  clipboardWrite: (text: string) => ipcRenderer.invoke('clipboard-write', text),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showNotification: (title: string, body: string, silent?: boolean) =>
    ipcRenderer.invoke('show-notification', title, body, silent),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getEnv: (key: string) => ipcRenderer.invoke('get-env', key),

  // ═══════════════════════════════════════════════════════════
  // NETWORK (for AI API calls)
  // ═══════════════════════════════════════════════════════════
  httpRequest: (options: { url: string; method?: string; headers?: Record<string, string>; body?: string }) =>
    ipcRenderer.invoke('http-request', options),

  // ═══════════════════════════════════════════════════════════
  // APP INFO
  // ═══════════════════════════════════════════════════════════
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCurrentDir: () => ipcRenderer.invoke('get-current-dir'),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  getResourcesPath: () => ipcRenderer.invoke('get-resources-path'),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),

  // ═══════════════════════════════════════════════════════════
  // MENU EVENTS
  // ═══════════════════════════════════════════════════════════
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  // Platform info
  platform: process.platform,
  isElectron: true,
})
