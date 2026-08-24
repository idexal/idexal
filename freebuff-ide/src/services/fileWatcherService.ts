/**
 * File Watcher Service - Monitors file changes
 */

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete'
  path: string
  timestamp: number
}

type WatcherCallback = (event: FileChangeEvent) => void

class FileWatcherService {
  private watchers: Map<string, Set<WatcherCallback>> = new Map()
  private events: FileChangeEvent[] = []
  private maxEvents: number = 100

  /**
   * Watch a file or directory
   */
  watch(path: string, callback: WatcherCallback): () => void {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, new Set())
    }
    this.watchers.get(path)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.watchers.get(path)?.delete(callback)
      if (this.watchers.get(path)?.size === 0) {
        this.watchers.delete(path)
      }
    }
  }

  /**
   * Emit a file change event
   */
  emit(event: Omit<FileChangeEvent, 'timestamp'>) {
    const fullEvent: FileChangeEvent = {
      ...event,
      timestamp: Date.now(),
    }

    // Store event
    this.events.unshift(fullEvent)
    if (this.events.length > this.maxEvents) {
      this.events.pop()
    }

    // Notify watchers
    this.watchers.forEach((callbacks, watchPath) => {
      if (event.path.startsWith(watchPath) || watchPath === '*') {
        callbacks.forEach(cb => cb(fullEvent))
      }
    })
  }

  /**
   * Get recent events
   */
  getEvents(limit: number = 50): FileChangeEvent[] {
    return this.events.slice(0, limit)
  }

  /**
   * Clear events
   */
  clearEvents() {
    this.events = []
  }

  /**
   * Get watcher count
   */
  getWatcherCount(): number {
    return Array.from(this.watchers.values()).reduce((sum, set) => sum + set.size, 0)
  }

  /**
   * Clear all watchers
   */
  clear() {
    this.watchers.clear()
    this.events = []
  }
}

export const fileWatcherService = new FileWatcherService()
export default fileWatcherService
