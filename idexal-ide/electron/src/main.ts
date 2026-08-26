import { app, BrowserWindow, ipcMain, dialog, clipboard, shell, Notification, screen, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, exec, execFile, execSync, ChildProcess } from 'child_process'
import { promisify } from 'util'
import { loadEngine } from './native/engine-loader'
import { initAutoUpdater, checkForUpdates } from './updater'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let workspaceRoot: string | null = null
const watchers: Map<string, fs.FSWatcher> = new Map()
const terminals: Map<string, ChildProcess> = new Map()
let terminalIdCounter = 0

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 800,
    minHeight: 600,
    title: 'Idexal IDE',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    // Check for updates 30 seconds after startup (production only)
    if (!isDev) {
      setTimeout(() => checkForUpdates(), 30_000)
    }
  })

  // Initialize auto-updater
  if (!isDev) {
    initAutoUpdater(mainWindow)
  }

  mainWindow.on('closed', () => {
    // Clean up all watchers
    for (const watcher of watchers.values()) {
      watcher.close()
    }
    watchers.clear()

    // Clean up all terminals
    for (const terminal of terminals.values()) {
      terminal.kill()
    }
    terminals.clear()

    mainWindow = null
  })

  // Build application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new-file') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu-open-file') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow?.webContents.send('menu-open-folder') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu-save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu-save-as') },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu-settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu-toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu-toggle-terminal') },
        { label: 'Toggle AI Chat', accelerator: 'CmdOrCtrl+Shift+A', click: () => mainWindow?.webContents.send('menu-toggle-ai') },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Terminal', accelerator: 'CmdOrCtrl+Shift+`', click: () => mainWindow?.webContents.send('menu-new-terminal') },
        { label: 'Kill Terminal', accelerator: 'CmdOrCtrl+Shift+K', click: () => mainWindow?.webContents.send('menu-kill-terminal') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Idexal IDE', click: () => showAbout() },
        { label: 'Check for Updates...', click: () => { if (!isDev) checkForUpdates() } },
        { type: 'separator' },
        { label: 'Documentation', click: () => shell.openExternal('https://github.com/idexal/idexal-ide') },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/idexal/idexal-ide/issues') },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function showAbout() {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'About Idexal IDE',
    message: 'Idexal IDE v1.0.0',
    detail: 'AI-Powered Multi-Agent Development Environment\nBuilt with Electron + React + Rust',
  })
}

// ── Single instance lock ─────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // When a second instance launches, focus the existing window and
    // forward any deep-link URL that was passed on the command line.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const deepLink = commandLine.find(arg => arg.startsWith('idexal://'))
    if (deepLink && mainWindow) {
      mainWindow.webContents.send('deep-link', deepLink)
    }
  })

  // ── Register idexal:// protocol for deep linking ────────────────
  app.setAsDefaultProtocolClient('idexal')

  // macOS: handle deep-link via open-url event
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (mainWindow) {
      mainWindow.webContents.send('deep-link', url)
    }
  })

  app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  for (const watcher of watchers.values()) {
    watcher.close()
  }
  watchers.clear()
  for (const terminal of terminals.values()) {
    terminal.kill()
  }
  terminals.clear()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ============================================================
// FILE OPERATIONS (Full Access)
// ============================================================

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'TypeScript', extensions: ['ts', 'tsx'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'Rust', extensions: ['rs'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'Web', extensions: ['html', 'css', 'scss'] },
    ],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const stats = fs.statSync(filePath)
      return { success: true, filePath, content, size: stats.size, modified: stats.mtime.toISOString() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }
  return { success: false, canceled: true }
})

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0]
    // Set workspace root for path validation
    workspaceRoot = path.resolve(folderPath)
    return { success: true, folderPath }
  }
  return { success: false, canceled: true }
})

ipcMain.handle('set-workspace-root', (_event, rootPath: string) => {
  workspaceRoot = path.resolve(rootPath)
  return { success: true }
})

ipcMain.handle('get-workspace-root', () => {
  return workspaceRoot
})

ipcMain.handle('save-file', async (_event, content: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'All Files', extensions: ['*'] }],
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false, canceled: true }
})

ipcMain.handle('save-file-as', async (_event, filePath: string, content: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// ── Path validation helper ────────────────────────────────────────
// Ensures file operations stay within the workspace root.
// Returns null if safe, or an error object if blocked.
function validatePath(filePath: string): { success: boolean; error?: string } | null {
  if (!workspaceRoot) return null // no workspace set — allow (dialog-based operations)
  const resolved = path.resolve(filePath)
  // Allow the workspace root itself and anything inside it
  if (resolved === workspaceRoot || resolved.startsWith(workspaceRoot + path.sep) || resolved.startsWith(workspaceRoot + '/')) {
    return null
  }
  return { success: false, error: `access denied: path outside workspace` }
}

ipcMain.handle('read-file', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    return { success: true, content, size: stats.size, modified: stats.mtime.toISOString() }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
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

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  try {
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('create-directory', async (_event, dirPath: string) => {
  const blocked = validatePath(dirPath)
  if (blocked) return blocked
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('rename', async (_event, oldPath: string, newPath: string) => {
  const blockedOld = validatePath(oldPath)
  if (blockedOld) return blockedOld
  const blockedNew = validatePath(newPath)
  if (blockedNew) return blockedNew
  try {
    fs.renameSync(oldPath, newPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('copy-file', async (_event, source: string, destination: string) => {
  const blockedSrc = validatePath(source)
  if (blockedSrc) return blockedSrc
  const blockedDst = validatePath(destination)
  if (blockedDst) return blockedDst
  try {
    fs.copyFileSync(source, destination)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file-exists', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return false
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('get-file-stats', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  try {
    const stats = fs.statSync(filePath)
    return {
      success: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('read-dir', async (_event, dirPath: string, maxDepth: number = 5) => {
  const blocked = validatePath(dirPath)
  if (blocked) return blocked
  try {
    const readTree = (dir: string, depth: number = 0): any[] => {
      if (depth > maxDepth) return []
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return []
      }
      const items: any[] = []

      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue
        if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.git') continue

        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            items.push({
              name: entry.name,
              path: fullPath,
              type: 'directory',
              children: readTree(fullPath, depth + 1),
            })
          } else {
            const ext = path.extname(entry.name).toLowerCase()
            items.push({
              name: entry.name,
              path: fullPath,
              type: 'file',
              extension: ext,
            })
          }
        } catch {
          // Skip inaccessible entries
        }
      }

      items.sort((a: any, b: any) => {
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

ipcMain.handle('search-files', async (_event, dirPath: string, query: string, maxResults: number = 50) => {
  const blocked = validatePath(dirPath)
  if (blocked) return blocked
  try {
    const results: Array<{ path: string; name: string; extension: string }> = []
    const lowerQuery = query.toLowerCase()

    const search = (dir: string, depth: number = 0) => {
      if (depth > 10 || results.length >= maxResults) return
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= maxResults) break
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.git') continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          search(fullPath, depth + 1)
        } else if (entry.name.toLowerCase().includes(lowerQuery)) {
          results.push({ path: fullPath, name: entry.name, extension: path.extname(entry.name) })
        }
      }
    }

    search(dirPath)
    return { success: true, results }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// File watching
ipcMain.handle('watch-file', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  if (watchers.has(filePath)) return { success: true }
  try {
    const watcher = fs.watch(filePath, (eventType, filename) => {
      mainWindow?.webContents.send('file-changed', eventType, filePath)
    })
    watchers.set(filePath, watcher)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('unwatch-file', async (_event, filePath: string) => {
  const blocked = validatePath(filePath)
  if (blocked) return blocked
  const watcher = watchers.get(filePath)
  if (watcher) {
    watcher.close()
    watchers.delete(filePath)
  }
  return { success: true }
})

// ============================================================
// TERMINAL (Real Shell Execution)
// ============================================================

function getShell(): { shell: string; args: string[] } {
  if (process.platform === 'win32') {
    return { shell: 'powershell.exe', args: ['-NoLogo', '-NoProfile'] }
  } else if (process.platform === 'darwin') {
    return { shell: process.env.SHELL || '/bin/zsh', args: [] }
  } else {
    return { shell: process.env.SHELL || '/bin/bash', args: [] }
  }
}

ipcMain.handle('terminal-create', async (_event, cwd?: string) => {
  const id = `term-${++terminalIdCounter}`
  const { shell: shellPath, args } = getShell()
  const workingDir = cwd || process.cwd()

  try {
    const child = spawn(shellPath, args, {
      cwd: workingDir,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    child.stdout?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('terminal-output', id, data.toString())
    })

    child.stderr?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('terminal-output', id, data.toString())
    })

    child.on('close', (code: number | null) => {
      mainWindow?.webContents.send('terminal-exit', id, code)
      terminals.delete(id)
    })

    child.on('error', (error: Error) => {
      mainWindow?.webContents.send('terminal-error', id, error.message)
    })

    terminals.set(id, child)
    return { success: true, id, shell: shellPath, cwd: workingDir }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('terminal-write', async (_event, id: string, data: string) => {
  const terminal = terminals.get(id)
  if (terminal && terminal.stdin && !terminal.stdin.destroyed) {
    terminal.stdin.write(data)
    return { success: true }
  }
  return { success: false, error: 'Terminal not found or closed' }
})

ipcMain.handle('terminal-resize', async (_event, id: string, cols: number, rows: number) => {
  const terminal = terminals.get(id)
  if (terminal) {
    // Send resize signal via SIGWINCH (Unix) or mode command (Windows)
    try {
      if (process.platform !== 'win32') {
        // On Unix, we'd need pty for proper resize
        // For now this is a no-op on non-pty terminals
      }
    } catch {}
    return { success: true }
  }
  return { success: false, error: 'Terminal not found' }
})

ipcMain.handle('terminal-kill', async (_event, id: string) => {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.kill()
    terminals.delete(id)
    return { success: true }
  }
  return { success: false, error: 'Terminal not found' }
})

ipcMain.handle('terminal-list', async () => {
  return Array.from(terminals.keys())
})

// ============================================================
// COMMAND EXECUTION
// ============================================================
// SECURITY: Arbitrary command execution is intentionally NOT exposed.
// Use the terminal IPC handlers for shell access, or the git-specific
// handlers below for version control operations.

// ============================================================
// GIT OPERATIONS (Full Access)
// ============================================================

ipcMain.handle('git-status', async (_event, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const { stdout } = await execAsync('git status --porcelain', { cwd: dir, timeout: 10000 })
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: dir, timeout: 5000 })
    return { success: true, status: stdout.trim(), branch: branch.trim() }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-log', async (_event, cwd?: string, maxCount: number = 20) => {
  try {
    const dir = cwd || process.cwd()
    const { stdout } = await execAsync(
      `git log --oneline -n ${maxCount} --format="%H|%s|%an|%ai"`,
      { cwd: dir, timeout: 10000 }
    )
    const commits = stdout.trim().split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|')
      return { hash, message, author, date }
    })
    return { success: true, commits }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-diff', async (_event, cwd?: string, file?: string) => {
  try {
    const dir = cwd || process.cwd()
    const args = file ? ['diff', file] : ['diff']
    const { stdout } = await execFileAsync('git', args, { cwd: dir, timeout: 10000 })
    return { success: true, diff: stdout }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-add', async (_event, files: string[], cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const args = ['add', ...files]
    await execFileAsync('git', args, { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-commit', async (_event, message: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const { stdout } = await execFileAsync('git', ['commit', '-m', message], { cwd: dir, timeout: 10000 })
    return { success: true, output: stdout }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-branches', async (_event, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const { stdout } = await execAsync('git branch -a --format="%(refname:short)"', { cwd: dir, timeout: 5000 })
    const branches = stdout.trim().split('\n').filter(Boolean)
    return { success: true, branches }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-checkout', async (_event, branch: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    await execFileAsync('git', ['checkout', branch], { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-create-branch', async (_event, name: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    await execFileAsync('git', ['checkout', '-b', name], { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-reset', async (_event, files: string[], cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    if (files.length === 0) {
      await execFileAsync('git', ['reset', 'HEAD'], { cwd: dir, timeout: 10000 })
    } else {
      await execFileAsync('git', ['reset', 'HEAD', '--', ...files], { cwd: dir, timeout: 10000 })
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-checkout-file', async (_event, filePath: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    await execFileAsync('git', ['checkout', '--', filePath], { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ============================================================
// CLIPBOARD & NATIVE OS
// ============================================================

ipcMain.handle('clipboard-read', () => {
  return clipboard.readText()
})

ipcMain.handle('clipboard-write', (_event, text: string) => {
  clipboard.writeText(text)
  return { success: true }
})

ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    // Only allow https: URLs to prevent protocol handler abuse
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { success: false, error: `blocked: protocol '${parsed.protocol}' not allowed` }
    }
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('show-notification', (_event, title: string, body: string, silent: boolean = false) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent }).show()
  }
  return { success: true }
})

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    release: process.release.name,
    nodeVersion: process.version,
    homedir: require('os').homedir(),
    tmpdir: require('os').tmpdir(),
    cpus: require('os').cpus().length,
    totalMemory: require('os').totalmem(),
    freeMemory: require('os').freemem(),
  }
})

const SAFE_ENV_KEYS = new Set([
  'HOME', 'USER', 'SHELL', 'PATH', 'LANG', 'LC_ALL', 'LC_TYPE',
  'TERM', 'COLORTERM', 'EDITOR', 'VISUAL',
  'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME',
  'APPDATA', 'LOCALAPPDATA', 'USERPROFILE',
  'PROGRAMFILES', 'PROGRAMFILES(X86)',
  'TMPDIR', 'TEMP', 'TMP',
  'NODE_ENV', 'VITE_DEV_SERVER_URL',
])

ipcMain.handle('get-env', (_event, key: string) => {
  if (!SAFE_ENV_KEYS.has(key)) return ''
  return process.env[key] || ''
})

// ============================================================
// NETWORK (for AI API calls)
// ============================================================

// Allowed URL prefixes for http-request (AI provider APIs + common services)
const ALLOWED_HTTP_PREFIXES = [
  'https://api.openai.com/',
  'https://api.anthropic.com/',
  'https://generativelanguage.googleapis.com/',
  'https://api.cohere.ai/',
  'https://api.mistral.ai/',
  'https://api.groq.com/',
  'https://api.deepseek.com/',
  'https://openrouter.ai/api/',
  'https://huggingface.co/api/',
  'https://api-inference.huggingface.co/',
  'https://api.idexal.com/',
]

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Always block non-HTTP protocols
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    // Always block localhost and private IPs (SSRF protection)
    const host = parsed.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) return false
    // Check against allowlist
    return ALLOWED_HTTP_PREFIXES.some(prefix => url.startsWith(prefix))
  } catch {
    return false
  }
}

ipcMain.handle('http-request', async (_event, options: {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}) => {
  if (!isUrlAllowed(options.url)) {
    return { success: false, error: `blocked: URL not in allowlist` }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(options.url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const text = await response.text()
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// ============================================================
// APP INFO
// ============================================================

// ============================================================
// AUTO-UPDATE
// ============================================================

ipcMain.handle('check-for-updates', async () => {
  try {
    const { checkForUpdates: check } = require('./updater')
    check()
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.handle('get-current-dir', () => process.cwd())

ipcMain.handle('get-home-dir', () => require('os').homedir())

ipcMain.handle('get-resources-path', () => process.resourcesPath)

ipcMain.handle('is-packaged', () => app.isPackaged)

// ============================================================
// RUST ENGINE (N-API via native module)
// ============================================================

const engine = loadEngine()

ipcMain.handle('engine-init', () => {
  try {
    return { success: true, result: engine.initEngine() }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-version', () => {
  try {
    return { success: true, version: engine.getVersion() }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-supported-languages', () => {
  try {
    return { success: true, languages: JSON.parse(engine.supportedLanguages()) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-detect-language', (_event, filePath: string) => {
  try {
    return { success: true, language: engine.detectLanguage(filePath) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-process-file', (_event, filePath: string, content: string, language: string) => {
  try {
    return JSON.parse(engine.processFile(filePath, content, language))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-parse-structured', (_event, filePath: string, content: string, language: string) => {
  try {
    return JSON.parse(engine.parseFileStructured(filePath, content, language))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-get-parse-errors', (_event, content: string, language: string) => {
  try {
    return JSON.parse(engine.getParseErrors(content, language))
  } catch (error) {
    return { error: (error as Error).message }
  }
})

ipcMain.handle('engine-search-codebase', (_event, query: string, files: string[]) => {
  try {
    return JSON.parse(engine.searchCodebase(query, files))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-init-project-memory', (_event, rootPath: string, name: string) => {
  try {
    return JSON.parse(engine.initProjectMemory(rootPath, name))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-add-symbol', (_event, name: string, symbolType: string, filePath: string, line: number, column: number, snippet: string) => {
  try {
    return JSON.parse(engine.addProjectSymbol(name, symbolType, filePath, line, column, snippet))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-search-symbols', (_event, query: string) => {
  try {
    return JSON.parse(engine.searchProjectSymbols(query))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-project-summary', () => {
  try {
    return JSON.parse(engine.getProjectSummary())
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-clear-project-memory', () => {
  try {
    return JSON.parse(engine.clearProjectMemory())
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-create-task', (_event, agentType: string, description: string, priority: number) => {
  try {
    return JSON.parse(engine.createAgentTask(agentType, description, priority))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-agent-prompt', (_event, agentType: string) => {
  try {
    return JSON.parse(engine.getAgentPrompt(agentType))
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('engine-list-agents', () => {
  try {
    return JSON.parse(engine.listAgentTypes())
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
