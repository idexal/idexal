/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                 WORKSPACE SERVICE v1.0                          ║
 * ║         Project Management & State Persistence                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Recent files and projects
 * - Bookmarks and pinned files
 * - Workspace state persistence
 * - Multiple workspace support
 * - Session restore
 */

export interface WorkspaceProject {
  id: string
  name: string
  path: string
  lastOpened: number
  pinned: boolean
  icon?: string
  color?: string
}

export interface RecentFile {
  path: string
  name: string
  language: string
  lastOpened: number
  openCount: number
}

export interface Bookmark {
  id: string
  filePath: string
  line: number
  label: string
  color: string
  createdAt: number
}

export interface WorkspaceState {
  openFiles: string[]
  activeFile: string | null
  sidebarVisible: boolean
  sidebarTab: string
  terminalVisible: boolean
  chatVisible: boolean
  editorLayout: 'split' | 'tabs'
  splitRatio: number
  zoomLevel: number
}

const STORAGE_KEY = 'idexal-workspace'
const RECENT_KEY = 'idexal-recent'
const BOOKMARK_KEY = 'idexal-bookmarks'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// WORKSPACE SERVICE
// ══════════════════════════════════════════════════════════════

class WorkspaceService {
  private projects: WorkspaceProject[]
  private recentFiles: RecentFile[]
  private bookmarks: Bookmark[]
  private state: WorkspaceState
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.projects = loadFromStorage(`${STORAGE_KEY}-projects`, [])
    this.recentFiles = loadFromStorage(RECENT_KEY, [])
    this.bookmarks = loadFromStorage(BOOKMARK_KEY, [])
    this.state = loadFromStorage(`${STORAGE_KEY}-state`, {
      openFiles: [],
      activeFile: null,
      sidebarVisible: true,
      sidebarTab: 'files',
      terminalVisible: false,
      chatVisible: true,
      editorLayout: 'tabs',
      splitRatio: 0.5,
      zoomLevel: 1,
    })
  }

  // ── Projects ───────────────────────────────────────────────

  getProjects(): WorkspaceProject[] {
    return this.projects.sort((a, b) => b.lastOpened - a.lastOpened)
  }

  getPinnedProjects(): WorkspaceProject[] {
    return this.projects.filter(p => p.pinned)
  }

  getRecentProjects(count: number = 10): WorkspaceProject[] {
    return this.getProjects().slice(0, count)
  }

  addProject(path: string, name?: string): WorkspaceProject {
    const existing = this.projects.find(p => p.path === path)
    if (existing) {
      existing.lastOpened = Date.now()
      this.save()
      return existing
    }

    const project: WorkspaceProject = {
      id: `proj-${Date.now()}`,
      name: name || path.split(/[/\\]/).pop() || 'Untitled',
      path,
      lastOpened: Date.now(),
      pinned: false,
    }
    this.projects.push(project)
    this.save()
    return project
  }

  removeProject(id: string) {
    this.projects = this.projects.filter(p => p.id !== id)
    this.save()
  }

  togglePin(id: string) {
    const project = this.projects.find(p => p.id === id)
    if (project) {
      project.pinned = !project.pinned
      this.save()
    }
  }

  // ── Recent Files ───────────────────────────────────────────

  getRecentFiles(count: number = 20): RecentFile[] {
    return this.recentFiles
      .sort((a, b) => b.lastOpened - a.lastOpened)
      .slice(0, count)
  }

  addRecentFile(path: string, language: string) {
    const name = path.split(/[/\\]/).pop() || path
    const existing = this.recentFiles.find(f => f.path === path)
    if (existing) {
      existing.lastOpened = Date.now()
      existing.openCount++
    } else {
      this.recentFiles.push({ path, name, language, lastOpened: Date.now(), openCount: 1 })
    }
    // Keep max 100
    if (this.recentFiles.length > 100) {
      this.recentFiles = this.recentFiles.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, 100)
    }
    this.save()
  }

  clearRecentFiles() {
    this.recentFiles = []
    this.save()
  }

  // ── Bookmarks ──────────────────────────────────────────────

  getBookmarks(): Bookmark[] {
    return this.bookmarks.sort((a, b) => b.createdAt - a.createdAt)
  }

  getBookmarksForFile(filePath: string): Bookmark[] {
    return this.bookmarks.filter(b => b.filePath === filePath)
  }

  addBookmark(filePath: string, line: number, label: string, color: string = 'yellow'): Bookmark {
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      filePath, line, label, color,
      createdAt: Date.now(),
    }
    this.bookmarks.push(bookmark)
    this.save()
    return bookmark
  }

  removeBookmark(id: string) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id)
    this.save()
  }

  // ── State ──────────────────────────────────────────────────

  getState(): WorkspaceState {
    return { ...this.state }
  }

  updateState(updates: Partial<WorkspaceState>) {
    this.state = { ...this.state, ...updates }
    this.save()
  }

  // ── Persistence ────────────────────────────────────────────

  save() {
    saveToStorage(`${STORAGE_KEY}-projects`, this.projects)
    saveToStorage(RECENT_KEY, this.recentFiles)
    saveToStorage(BOOKMARK_KEY, this.bookmarks)
    saveToStorage(`${STORAGE_KEY}-state`, this.state)
    this.notify()
  }

  // ── Export / Import ────────────────────────────────────────

  exportWorkspace(): string {
    return JSON.stringify({
      projects: this.projects,
      bookmarks: this.bookmarks,
      state: this.state,
      exportedAt: new Date().toISOString(),
    }, null, 2)
  }

  importWorkspace(data: string) {
    try {
      const imported = JSON.parse(data)
      if (imported.projects) this.projects = imported.projects
      if (imported.bookmarks) this.bookmarks = imported.bookmarks
      if (imported.state) this.state = { ...this.state, ...imported.state }
      this.save()
    } catch {}
  }

  // ── Listeners ──────────────────────────────────────────────

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

export const workspaceService = new WorkspaceService()
export default workspaceService
