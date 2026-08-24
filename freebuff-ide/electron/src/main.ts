import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
const watchers: Map<string, fs.FSWatcher> = new Map()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Idexal IDE',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Clean up watchers
  for (const watcher of watchers.values()) {
    watcher.close()
  }
  watchers.clear()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// --- IPC Handlers ---

// Open single file dialog
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'TypeScript', extensions: ['ts', 'tsx'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'Rust', extensions: ['rs'] },
      { name: 'Python', extensions: ['py'] },
    ],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, filePath, content }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  return { success: false, canceled: true }
})

// Open folder dialog
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, folderPath: result.filePaths[0] }
  }

  return { success: false, canceled: true }
})

// Save file dialog
ipcMain.handle('save-file', async (_event, content: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  }

  return { success: false, canceled: true }
})

// Save file to specific path
ipcMain.handle('save-file-as', async (_event, filePath: string, content: string) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Read file
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Write file
ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// File exists check
ipcMain.handle('file-exists', async (_event, filePath: string) => {
  return fs.existsSync(filePath)
})

// Read directory (recursive, 3 levels deep)
ipcMain.handle('read-dir', async (_event, dirPath: string) => {
  try {
    const readTree = (dir: string, depth: number = 0): any[] => {
      if (depth > 3) return []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      const items: any[] = []

      for (const entry of entries) {
        // Skip hidden dirs and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'target') {
          continue
        }

        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: readTree(fullPath, depth + 1),
          })
        } else {
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          })
        }
      }

      // Sort: directories first, then alphabetical
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return items
    }

    const tree = readTree(dirPath)
    return { success: true, tree }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Watch file changes
ipcMain.handle('watch-file', async (_event, filePath: string) => {
  if (watchers.has(filePath)) return { success: true }

  try {
    const watcher = fs.watch(filePath, (eventType) => {
      mainWindow?.webContents.send('file-changed', eventType, filePath)
    })
    watchers.set(filePath, watcher)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// Unwatch file
ipcMain.handle('unwatch-file', async (_event, filePath: string) => {
  const watcher = watchers.get(filePath)
  if (watcher) {
    watcher.close()
    watchers.delete(filePath)
  }
  return { success: true }
})

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Get current directory
ipcMain.handle('get-current-dir', () => {
  return process.cwd()
})
