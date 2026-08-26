/**
 * Command History Service
 * Tracks all executed commands across the IDE for quick re-execution and search
 */

export interface CommandEntry {
  id: string
  command: string
  args?: string[]
  cwd?: string
  timestamp: number
  duration?: number
  exitCode?: number
  output?: string
  source: 'terminal' | 'task-runner' | 'git' | 'ai' | 'user'
  favorite?: boolean
  tags?: string[]
}

export interface CommandStats {
  totalCommands: number
  bySource: Record<string, number>
  byHour: number[]
  recentCommands: CommandEntry[]
  favorites: CommandEntry[]
  mostUsed: Array<{ command: string; count: number }>
}

class CommandHistoryService {
  private history: CommandEntry[] = []
  private maxEntries = 1000
  private storageKey = 'idexal-command-history'
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  // ── Recording ────────────────────────────────────────────

  record(entry: Omit<CommandEntry, 'id' | 'timestamp'>): CommandEntry {
    const fullEntry: CommandEntry = {
      ...entry,
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    }

    this.history.unshift(fullEntry)
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(0, this.maxEntries)
    }

    this.saveToStorage()
    this.notify()
    return fullEntry
  }

  recordTerminal(command: string, args?: string[], cwd?: string): CommandEntry {
    return this.record({ command, args, cwd, source: 'terminal' })
  }

  recordTask(command: string, args?: string[]): CommandEntry {
    return this.record({ command, args, source: 'task-runner' })
  }

  recordGit(command: string, args?: string[]): CommandEntry {
    return this.record({ command, args, source: 'git' })
  }

  recordAI(command: string): CommandEntry {
    return this.record({ command, source: 'ai' })
  }

  // ── Querying ─────────────────────────────────────────────

  getAll(): CommandEntry[] {
    return [...this.history]
  }

  getRecent(count: number = 20): CommandEntry[] {
    return this.history.slice(0, count)
  }

  getFavorites(): CommandEntry[] {
    return this.history.filter(e => e.favorite)
  }

  getBySource(source: CommandEntry['source']): CommandEntry[] {
    return this.history.filter(e => e.source === source)
  }

  search(query: string): CommandEntry[] {
    const q = query.toLowerCase()
    return this.history.filter(e =>
      e.command.toLowerCase().includes(q) ||
      e.args?.some(a => a.toLowerCase().includes(q)) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  // ── Modification ─────────────────────────────────────────

  toggleFavorite(id: string): boolean {
    const entry = this.history.find(e => e.id === id)
    if (entry) {
      entry.favorite = !entry.favorite
      this.saveToStorage()
      this.notify()
      return true
    }
    return false
  }

  addTag(id: string, tag: string): boolean {
    const entry = this.history.find(e => e.id === id)
    if (entry) {
      if (!entry.tags) entry.tags = []
      if (!entry.tags.includes(tag)) {
        entry.tags.push(tag)
        this.saveToStorage()
        this.notify()
      }
      return true
    }
    return false
  }

  updateResult(id: string, duration: number, exitCode: number, output?: string) {
    const entry = this.history.find(e => e.id === id)
    if (entry) {
      entry.duration = duration
      entry.exitCode = exitCode
      entry.output = output?.slice(0, 1000) // Limit output size
      this.saveToStorage()
      this.notify()
    }
  }

  delete(id: string): boolean {
    const idx = this.history.findIndex(e => e.id === id)
    if (idx !== -1) {
      this.history.splice(idx, 1)
      this.saveToStorage()
      this.notify()
      return true
    }
    return false
  }

  clear() {
    this.history = []
    this.saveToStorage()
    this.notify()
  }

  // ── Statistics ───────────────────────────────────────────

  getStats(): CommandStats {
    const bySource: Record<string, number> = {}
    const byHour = new Array(24).fill(0)
    const commandCounts: Record<string, number> = {}

    for (const entry of this.history) {
      bySource[entry.source] = (bySource[entry.source] || 0) + 1
      byHour[new Date(entry.timestamp).getHours()]++
      commandCounts[entry.command] = (commandCounts[entry.command] || 0) + 1
    }

    const mostUsed = Object.entries(commandCounts)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalCommands: this.history.length,
      bySource,
      byHour,
      recentCommands: this.getRecent(10),
      favorites: this.getFavorites(),
      mostUsed,
    }
  }

  // ── Persistence ──────────────────────────────────────────

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history))
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        this.history = JSON.parse(saved)
      }
    } catch {}
  }

  // ── Subscriptions ────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach(l => l())
  }
}

export const commandHistoryService = new CommandHistoryService()
export default commandHistoryService
