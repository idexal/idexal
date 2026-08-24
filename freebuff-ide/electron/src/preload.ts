import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),
  saveFileAs: (filePath: string, content: string) => ipcRenderer.invoke('save-file-as', filePath, content),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),

  // Watch
  watchFile: (filePath: string) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath: string) => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback: (event: string, filePath: string) => void) => {
    ipcRenderer.on('file-changed', (_event, eventType, filePath) => callback(eventType, filePath))
  },

  // App
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getCurrentDir: () => ipcRenderer.invoke('get-current-dir'),

  // Platform info
  platform: process.platform,
  isElectron: true,
})
