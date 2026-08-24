import { app, BrowserWindow, ipcMain, dialog, clipboard, shell, nativeTheme, Notification, screen, Menu, MenuItem } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn, exec, execSync, ChildProcess } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
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
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: isDev,
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
  })

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
  const template: MenuItem[] = [
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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

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
    return { success: true, folderPath: result.filePaths[0] }
  }
  return { success: false, canceled: true }
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

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    return { success: true, content, size: stats.size, modified: stats.mtime.toISOString() }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

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

ipcMain.handle('delete-file', async (_event, filePath: string) => {
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
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('rename', async (_event, oldPath: string, newPath: string) => {
  try {
    fs.renameSync(oldPath, newPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('copy-file', async (_event, source: string, destination: string) => {
  try {
    fs.copyFileSync(source, destination)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file-exists', async (_event, filePath: string) => {
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('get-file-stats', async (_event, filePath: string) => {
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
// COMMAND EXECUTION (Full Access)
// ============================================================

ipcMain.handle('exec-command', async (_event, command: string, cwd?: string, timeout?: number) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      env: process.env,
      timeout: timeout || 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      encoding: 'utf-8',
    })
    return { success: true, stdout, stderr, exitCode: 0 }
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    }
  }
})

ipcMain.handle('exec-command-sync', async (_event, command: string, cwd?: string) => {
  try {
    const stdout = execSync(command, {
      cwd: cwd || process.cwd(),
      env: process.env,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    })
    return { success: true, stdout, exitCode: 0 }
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    }
  }
})

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
    const cmd = file ? `git diff "${file}"` : 'git diff'
    const { stdout } = await execAsync(cmd, { cwd: dir, timeout: 10000 })
    return { success: true, diff: stdout }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-add', async (_event, files: string[], cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const fileArgs = files.map(f => `"${f}"`).join(' ')
    await execAsync(`git add ${fileArgs}`, { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-commit', async (_event, message: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: dir, timeout: 10000 })
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
    await execAsync(`git checkout "${branch}"`, { cwd: dir, timeout: 10000 })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('git-create-branch', async (_event, name: string, cwd?: string) => {
  try {
    const dir = cwd || process.cwd()
    await execAsync(`git checkout -b "${name}"`, { cwd: dir, timeout: 10000 })
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
    release: process.release(),
    nodeVersion: process.version,
    homedir: require('os').homedir(),
    tmpdir: require('os').tmpdir(),
    cpus: require('os').cpus().length,
    totalMemory: require('os').totalmem(),
    freeMemory: require('os').freemem(),
  }
})

ipcMain.handle('get-env', (_event, key: string) => {
  return process.env[key] || ''
})

// ============================================================
// NETWORK (for AI API calls)
// ============================================================

ipcMain.handle('http-request', async (_event, options: {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}) => {
  try {
    const response = await fetch(options.url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    })
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

ipcMain.handle('get-app-version', () => app.getVersion())

ipcMain.handle('get-current-dir', () => process.cwd())

ipcMain.handle('get-home-dir', () => require('os').homedir())

ipcMain.handle('get-resources-path', () => process.resourcesPath)

ipcMain.handle('is-packaged', () => app.isPackaged)
