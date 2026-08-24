import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Freebuff IDE',
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
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
  
  return result
})

ipcMain.handle('save-file', async (_event, content: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (!result.canceled && result.filePath) {
    const fs = require('fs')
    fs.writeFileSync(result.filePath, content)
    return { success: true, path: result.filePath }
  }
  
  return { success: false }
})

ipcMain.handle('read-file', async (_event, filePath: string) => {
  const fs = require('fs')
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})
