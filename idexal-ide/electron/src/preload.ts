import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ═══════════════════════════════════════════════════════════
  // FILE OPERATIONS (Full Access)
  // ═══════════════════════════════════════════════════════════
  openFile: () => ipcRenderer.invoke('open-file'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  setWorkspaceRoot: (rootPath: string) => ipcRenderer.invoke('set-workspace-root', rootPath),
  getWorkspaceRoot: () => ipcRenderer.invoke('get-workspace-root'),
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
  gitReset: (files: string[], cwd?: string) => ipcRenderer.invoke('git-reset', files, cwd),
  gitCheckoutFile: (filePath: string, cwd?: string) => ipcRenderer.invoke('git-checkout-file', filePath, cwd),

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
    // Only allow listening on known menu event channels
    const ALLOWED_CHANNELS = new Set([
      'menu-new-file', 'menu-open-file', 'menu-open-folder',
      'menu-save', 'menu-save-as', 'menu-settings',
      'menu-toggle-sidebar', 'menu-toggle-terminal', 'menu-toggle-ai',
      'menu-new-terminal', 'menu-kill-terminal',
    ])
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.warn(`[preload] blocked menu event channel: ${channel}`)
      return () => {}
    }
    const handler = (_event: any, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  // ═══════════════════════════════════════════════════════════
  // RUST ENGINE (N-API)
  // ═══════════════════════════════════════════════════════════
  engineInit: () => ipcRenderer.invoke('engine-init'),
  engineVersion: () => ipcRenderer.invoke('engine-version'),
  engineSupportedLanguages: () => ipcRenderer.invoke('engine-supported-languages'),
  engineDetectLanguage: (filePath: string) => ipcRenderer.invoke('engine-detect-language', filePath),
  engineProcessFile: (filePath: string, content: string, language: string) =>
    ipcRenderer.invoke('engine-process-file', filePath, content, language),
  engineParseStructured: (filePath: string, content: string, language: string) =>
    ipcRenderer.invoke('engine-parse-structured', filePath, content, language),
  engineGetParseErrors: (content: string, language: string) =>
    ipcRenderer.invoke('engine-get-parse-errors', content, language),
  engineSearchCodebase: (query: string, files: string[]) =>
    ipcRenderer.invoke('engine-search-codebase', query, files),
  engineInitProjectMemory: (rootPath: string, name: string) =>
    ipcRenderer.invoke('engine-init-project-memory', rootPath, name),
  engineAddSymbol: (name: string, symbolType: string, filePath: string, line: number, column: number, snippet: string) =>
    ipcRenderer.invoke('engine-add-symbol', name, symbolType, filePath, line, column, snippet),
  engineSearchSymbols: (query: string) =>
    ipcRenderer.invoke('engine-search-symbols', query),
  engineProjectSummary: () => ipcRenderer.invoke('engine-project-summary'),
  engineClearProjectMemory: () => ipcRenderer.invoke('engine-clear-project-memory'),
  engineCreateTask: (agentType: string, description: string, priority: number) =>
    ipcRenderer.invoke('engine-create-task', agentType, description, priority),
  engineAgentPrompt: (agentType: string) =>
    ipcRenderer.invoke('engine-agent-prompt', agentType),
  engineListAgents: () => ipcRenderer.invoke('engine-list-agents'),

  // ═══════════════════════════════════════════════════════════
  // AUTO-UPDATE
  // ═══════════════════════════════════════════════════════════
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateChecking: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('update-checking', handler)
    return () => ipcRenderer.removeListener('update-checking', handler)
  },
  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string }) => void) => {
    const handler = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('update-download-progress', handler)
    return () => ipcRenderer.removeListener('update-download-progress', handler)
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  onUpdateError: (callback: (error: { message: string }) => void) => {
    const handler = (_event: any, error: any) => callback(error)
    ipcRenderer.on('update-error', handler)
    return () => ipcRenderer.removeListener('update-error', handler)
  },

  // ═══════════════════════════════════════════════════════════
  // DEEP LINKING (idexal:// protocol)
  // ═══════════════════════════════════════════════════════════
  onDeepLink: (callback: (url: string) => void) => {
    const handler = (_event: any, url: string) => callback(url)
    ipcRenderer.on('deep-link', handler)
    return () => ipcRenderer.removeListener('deep-link', handler)
  },

  // Platform info
  platform: process.platform,
  isElectron: true,
})
