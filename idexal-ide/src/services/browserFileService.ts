/**
 * Browser File Service
 * Uses File System Access API (Chromium) or IndexedDB fallback
 * for real file operations in the browser without Electron.
 */

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: FileEntry[]
}

export interface FileResult {
  success: boolean
  content?: string
  error?: string
  filePath?: string
  size?: number
  modified?: string
}

export interface DirResult {
  success: boolean
  tree?: FileEntry[]
  error?: string
}

// Check for File System Access API support
const hasFSAccess = typeof window !== 'undefined' && 'showDirectoryPicker' in window

// IndexedDB store name
const DB_NAME = 'idexal-files'
const DB_VERSION = 1
const STORE_NAME = 'files'

let dbInstance: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'path' })
      }
    }
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result) }
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(path: string, content: string, type: string) {
  const db = await getDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ path, content, type, modified: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(path: string): Promise<{ content: string; type: string } | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(path)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGetAll(): Promise<Array<{ path: string; content: string; type: string }>> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(path: string) {
  const db = await getDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(path)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── File System Access API layer ──────────────────────────────

let rootDirHandle: any = null
let rootName = 'browser-project'

export function isFileSystemAccessAvailable(): boolean {
  return hasFSAccess
}

export function getRootName(): string {
  return rootName
}

async function readDirRecursive(dirHandle: any, path: string, depth: number, maxDepth: number): Promise<FileEntry[]> {
  if (depth > maxDepth) return []
  const entries: FileEntry[] = []

  for await (const [name, handle] of dirHandle) {
    if (name.startsWith('.') && name !== '.env') continue
    if (name === 'node_modules' || name === 'target' || name === '.git') continue

    const entryPath = path ? `${path}/${name}` : name
    if (handle.kind === 'directory') {
      entries.push({
        name,
        path: `/${entryPath}`,
        type: 'directory',
        children: await readDirRecursive(handle, entryPath, depth + 1, maxDepth),
      })
    } else {
      const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
      entries.push({ name, path: `/${entryPath}`, type: 'file', extension: ext })
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return entries
}

export const browserFileService = {
  get isAvailable(): boolean {
    return hasFSAccess && rootDirHandle !== null
  },

  async openDirectory(): Promise<boolean> {
    if (!hasFSAccess) return false
    try {
      rootDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      rootName = rootDirHandle.name
      return true
    } catch {
      return false
    }
  },

  async readDir(dirPath: string = '/', maxDepth: number = 3): Promise<DirResult> {
    if (!rootDirHandle) return { success: false, error: 'No directory open' }

    try {
      const parts = dirPath.replace(/^\//, '').split('/').filter(Boolean)
      let dirHandle = rootDirHandle
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part)
      }
      const tree = await readDirRecursive(dirHandle, parts.join('/'), 0, maxDepth)
      return { success: true, tree }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  async readFile(filePath: string): Promise<FileResult> {
    if (!rootDirHandle) return { success: false, error: 'No directory open' }

    try {
      const parts = filePath.replace(/^\//, '').split('/')
      const fileName = parts.pop()!
      let dirHandle = rootDirHandle
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part)
      }
      const fileHandle = await dirHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      const content = await file.text()
      return { success: true, content, size: file.size, modified: new Date(file.lastModified).toISOString() }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    if (!rootDirHandle) return { success: false, error: 'No directory open' }

    try {
      const parts = filePath.replace(/^\//, '').split('/')
      const fileName = parts.pop()!
      let dirHandle = rootDirHandle
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: true })
      }
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!rootDirHandle) return { success: false, error: 'No directory open' }

    try {
      const parts = filePath.replace(/^\//, '').split('/')
      const fileName = parts.pop()!
      let dirHandle = rootDirHandle
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part)
      }
      await dirHandle.removeEntry(fileName)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  async createDirectory(dirPath: string): Promise<{ success: boolean; error?: string }> {
    if (!rootDirHandle) return { success: false, error: 'No directory open' }

    try {
      const parts = dirPath.replace(/^\//, '').split('/')
      let dirHandle = rootDirHandle
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: true })
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  async rename(oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> {
    const readResult = await this.readFile(oldPath)
    if (!readResult.success || readResult.content === undefined) {
      return { success: false, error: readResult.error || 'File not found' }
    }
    const writeResult = await this.writeFile(newPath, readResult.content)
    if (!writeResult.success) return writeResult
    return this.deleteFile(oldPath)
  },

  async searchFiles(query: string): Promise<Array<{ path: string; name: string; extension: string }>> {
    if (!rootDirHandle) return []

    const results: Array<{ path: string; name: string; extension: string }> = []
    const lowerQuery = query.toLowerCase()

    const search = async (dirHandle: any, prefix: string) => {
      for await (const [name, handle] of dirHandle) {
        if (name.startsWith('.') || name === 'node_modules') continue
        const fullPath = prefix ? `${prefix}/${name}` : name
        if (handle.kind === 'file' && name.toLowerCase().includes(lowerQuery)) {
          results.push({ path: `/${fullPath}`, name, extension: name.includes('.') ? `.${name.split('.').pop()}` : '' })
        } else if (handle.kind === 'directory') {
          await search(handle, fullPath)
        }
        if (results.length >= 50) return
      }
    }

    await search(rootDirHandle, '')
    return results
  },

  // ── IndexedDB fallback for non-Chromium browsers ──────────

  async idbWriteFile(path: string, content: string) {
    await idbPut(path, content, 'file')
  },

  async idbReadFile(path: string): Promise<string | null> {
    const result = await idbGet(path)
    return result?.content ?? null
  },

  async idbReadAll(): Promise<Array<{ path: string; content: string }>> {
    const all = await idbGetAll()
    return all.filter(f => f.type === 'file').map(f => ({ path: f.path, content: f.content }))
  },

  async idbDeleteFile(path: string) {
    await idbDelete(path)
  },

  async idbBuildTree(): Promise<FileEntry[]> {
    const all = await idbGetAll()
    const tree: FileEntry[] = []
    const dirMap = new Map<string, FileEntry>()

    // Create directories
    for (const item of all) {
      const parts = item.path.split('/').filter(Boolean)
      let currentPath = ''
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        const dirPath = `/${currentPath}`
        if (!dirMap.has(dirPath)) {
          const dir: FileEntry = { name: parts[i], path: dirPath, type: 'directory', children: [] }
          dirMap.set(dirPath, dir)
          const parentPath = i === 0 ? '' : `/${currentPath.split('/').slice(0, -1).join('/')}`
          const parent = dirMap.get(parentPath)
          if (parent) parent.children!.push(dir)
          else tree.push(dir)
        }
      }
    }

    // Add files
    for (const item of all) {
      const parts = item.path.split('/').filter(Boolean)
      const name = parts[parts.length - 1]
      const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
      const file: FileEntry = { name, path: item.path, type: 'file', extension: ext }
      const parentPath = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}` : ''
      const parent = dirMap.get(parentPath)
      if (parent) parent.children!.push(file)
      else tree.push(file)
    }

    return tree
  },
}

export default browserFileService
