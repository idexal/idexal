/**
 * Quick Actions Service
 * Provides searchable commands and shortcuts for power users
 */

export interface QuickAction {
  id: string
  label: string
  description: string
  shortcut?: string
  icon: string
  category: 'editor' | 'git' | 'ai' | 'terminal' | 'navigation' | 'view'
  action: () => void | Promise<void>
}

class QuickActionsService {
  private actions: QuickAction[] = []
  private recentlyUsed: string[] = []
  private maxRecent = 10
  private storageKey = 'idexal-quick-actions'

  constructor() {
    this.loadFromStorage()
  }

  register(action: QuickAction) {
    if (!this.actions.find(a => a.id === action.id)) {
      this.actions.push(action)
    }
  }

  unregister(id: string) {
    this.actions = this.actions.filter(a => a.id !== id)
  }

  getAll(): QuickAction[] {
    return [...this.actions]
  }

  search(query: string): QuickAction[] {
    const q = query.toLowerCase()
    const results = this.actions.filter(a =>
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    )

    // Sort by recently used first
    return results.sort((a, b) => {
      const aIdx = this.recentlyUsed.indexOf(a.id)
      const bIdx = this.recentlyUsed.indexOf(b.id)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return 0
    })
  }

  getByCategory(category: QuickAction['category']): QuickAction[] {
    return this.actions.filter(a => a.category === category)
  }

  async execute(id: string): Promise<boolean> {
    const action = this.actions.find(a => a.id === id)
    if (action) {
      await action.action()
      this.recordUsage(id)
      return true
    }
    return false
  }

  getCategories(): Array<{ category: QuickAction['category']; count: number }> {
    const counts: Record<string, number> = {}
    for (const action of this.actions) {
      counts[action.category] = (counts[action.category] || 0) + 1
    }
    return Object.entries(counts).map(([category, count]) => ({
      category: category as QuickAction['category'],
      count,
    }))
  }

  getRecentlyUsed(): QuickAction[] {
    return this.recentlyUsed
      .map(id => this.actions.find(a => a.id === id))
      .filter(Boolean) as QuickAction[]
  }

  private recordUsage(id: string) {
    this.recentlyUsed = this.recentlyUsed.filter(r => r !== id)
    this.recentlyUsed.unshift(id)
    if (this.recentlyUsed.length > this.maxRecent) {
      this.recentlyUsed = this.recentlyUsed.slice(0, this.maxRecent)
    }
    this.saveToStorage()
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.recentlyUsed))
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) this.recentlyUsed = JSON.parse(saved)
    } catch {}
  }
}

export const quickActionsService = new QuickActionsService()
export default quickActionsService
