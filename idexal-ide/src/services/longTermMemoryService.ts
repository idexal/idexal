/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               LONG-TERM MEMORY SERVICE v1.0                    ║
 * ║     Persistent • IndexedDB • Cross-Agent • Project-Aware       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - IndexedDB-backed persistent storage (survives refresh/restart)
 * - 6 memory categories: agent, project, user, task, conversation, skill
 * - TTL-based expiry with auto-cleanup
 * - Importance scoring for memory prioritization
 * - Cross-agent shared memory with visibility rules
 * - Full-text search across all memories
 * - Memory consolidation (merge similar memories)
 * - Export/import for backup
 */

import { AgentType } from './agentOrchestrator'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type MemoryCategory =
  | 'agent'        // What each agent learned
  | 'project'      // Project-specific knowledge
  | 'user'         // User preferences & expertise
  | 'task'         // Task outcomes & patterns
  | 'conversation' // Chat history summaries
  | 'skill'        // Skill proficiency & learning
  | 'decision'     // Architecture & design decisions
  | 'error'        // Error patterns & fixes
  | 'preference'   // User preferences & settings

export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low' | 'ephemeral'

export interface MemoryEntry {
  id: string
  category: MemoryCategory
  /** Agent that created this memory (or 'system' for global) */
  agentType: AgentType | 'system' | 'user'
  /** Project ID this memory belongs to (null = global) */
  projectId: string | null
  /** Memory key for dedup/lookup */
  key: string
  /** The actual memory content */
  value: string
  /** Structured data for complex memories */
  metadata?: Record<string, unknown>
  /** Importance level */
  importance: MemoryImportance
  /** Tags for search/filtering */
  tags: string[]
  /** Access count (popularity) */
  accessCount: number
  /** TTL in ms (undefined = permanent) */
  ttl?: number
  /** Expiry timestamp */
  expiresAt?: number
  /** Creation timestamp */
  createdAt: number
  /** Last access timestamp */
  accessedAt: number
  /** Last update timestamp */
  updatedAt: number
  /** Memory version (for conflict resolution) */
  version: number
}

export interface MemorySearchResult {
  entry: MemoryEntry
  score: number
  matchType: 'exact' | 'partial' | 'tag' | 'category'
}

export interface MemoryStats {
  totalEntries: number
  byCategory: Record<MemoryCategory, number>
  byAgent: Record<string, number>
  byProject: Record<string, number>
  byImportance: Record<MemoryImportance, number>
  oldestEntry: number | null
  newestEntry: number | null
  totalAccessCount: number
  averageImportance: number
}

export interface MemoryConsolidationResult {
  merged: number
  removed: number
  kept: number
}

// ══════════════════════════════════════════════════════════════
// PERSISTENT STORAGE LAYER (IndexedDB with in-memory fallback)
// ══════════════════════════════════════════════════════════════

const DB_NAME = 'idexal-long-term-memory'
const DB_VERSION = 1
const STORE_NAME = 'memories'
const hasIndexedDB = typeof indexedDB !== 'undefined'

/** In-memory fallback when IndexedDB is unavailable */
const memStore = new Map<string, MemoryEntry>()

/** Cached DB connection (avoids re-opening on every operation) */
let dbCache: IDBDatabase | null = null
async function getDB(): Promise<IDBDatabase> {
  if (dbCache) return dbCache
  dbCache = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => { dbCache = null; reject(req.error) }
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('category', 'category', { unique: false })
        store.createIndex('agentType', 'agentType', { unique: false })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('key', 'key', { unique: false })
        store.createIndex('importance', 'importance', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true })
      }
    }
  })
  return dbCache!
}

async function idbGetAll(): Promise<MemoryEntry[]> {
  if (!hasIndexedDB) return Array.from(memStore.values())
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as MemoryEntry[])
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(entry: MemoryEntry): Promise<void> {
  if (!hasIndexedDB) { memStore.set(entry.id, entry); return }
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(entry)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(id: string): Promise<void> {
  if (!hasIndexedDB) { memStore.delete(id); return }
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function idbClear(): Promise<void> {
  if (!hasIndexedDB) { memStore.clear(); return }
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ══════════════════════════════════════════════════════════════
// IMPORTANCE SCORES
// ══════════════════════════════════════════════════════════════

const IMPORTANCE_SCORES: Record<MemoryImportance, number> = {
  critical: 10,
  high: 8,
  medium: 5,
  low: 2,
  ephemeral: 1,
}

// ══════════════════════════════════════════════════════════════
// LONG-TERM MEMORY SERVICE
// ══════════════════════════════════════════════════════════════

class LongTermMemoryService {
  private cache: Map<string, MemoryEntry> = new Map()
  private loaded = false
  private listeners: Set<() => void> = new Set()
  private counter = 0

  // ── Initialization ───────────────────────────────────────

  async init(): Promise<void> {
    if (this.loaded) return
    try {
      const entries = await idbGetAll()
      for (const entry of entries) {
        this.cache.set(entry.id, entry)
      }
      this.loaded = true
      // Run cleanup on init
      this.cleanupExpired()
    } catch (e) {
      console.warn('Failed to load long-term memory:', e)
      this.loaded = true // proceed with empty cache
    }
  }

  // ── Core Operations ──────────────────────────────────────

  /** Store a memory entry */
  async set(
    category: MemoryCategory,
    agentType: AgentType | 'system' | 'user',
    key: string,
    value: string,
    options?: {
      projectId?: string | null
      importance?: MemoryImportance
      tags?: string[]
      ttl?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<MemoryEntry> {
    await this.init()

    const now = Date.now()
    const id = `${category}:${agentType}:${key}:${now}`

    const entry: MemoryEntry = {
      id,
      category,
      agentType,
      projectId: options?.projectId ?? null,
      key,
      value,
      metadata: options?.metadata,
      importance: options?.importance ?? 'medium',
      tags: options?.tags ?? [],
      accessCount: 0,
      ttl: options?.ttl,
      expiresAt: options?.ttl ? now + options.ttl : undefined,
      createdAt: now,
      accessedAt: now,
      updatedAt: now,
      version: 1,
    }

    this.cache.set(id, entry)
    await idbPut(entry)
    this.notify()
    return entry
  }

  /** Update an existing memory entry */
  async update(id: string, updates: Partial<Pick<MemoryEntry, 'value' | 'importance' | 'tags' | 'metadata' | 'ttl'>>): Promise<MemoryEntry | null> {
    await this.init()
    const entry = this.cache.get(id)
    if (!entry) return null

    const now = Date.now()
    const updated: MemoryEntry = {
      ...entry,
      ...updates,
      updatedAt: now,
      version: entry.version + 1,
      expiresAt: updates.ttl ? now + updates.ttl : entry.expiresAt,
    }

    this.cache.set(id, updated)
    await idbPut(updated)
    this.notify()
    return updated
  }

  /** Get a memory by ID (read-only — does not write back to IDB) */
  async get(id: string): Promise<MemoryEntry | null> {
    await this.init()
    const entry = this.cache.get(id)
    if (!entry) return null

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.delete(id)
      return null
    }

    // Update in-memory stats only (avoid write amplification on reads)
    entry.accessCount++
    entry.accessedAt = Date.now()

    return entry
  }

  /** Get a memory by key (read-only — does not write back to IDB) */
  async getByKey(category: MemoryCategory, agentType: string, key: string): Promise<MemoryEntry | null> {
    await this.init()
    for (const entry of this.cache.values()) {
      if (entry.category === category && entry.agentType === agentType && entry.key === key) {
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          await this.delete(entry.id)
          return null
        }
        entry.accessCount++
        entry.accessedAt = Date.now()
        return entry
      }
    }
    return null
  }

  /** Delete a memory by ID */
  async delete(id: string): Promise<boolean> {
    await this.init()
    if (!this.cache.has(id)) return false
    this.cache.delete(id)
    await idbDelete(id)
    this.notify()
    return true
  }

  /** Clear all memories */
  async clearAll(): Promise<void> {
    this.cache.clear()
    await idbClear()
    this.notify()
  }

  // ── Query Operations ─────────────────────────────────────

  /** Get all memories in a category */
  async getByCategory(category: MemoryCategory): Promise<MemoryEntry[]> {
    await this.init()
    return Array.from(this.cache.values())
      .filter(e => e.category === category)
      .filter(e => !e.expiresAt || Date.now() <= e.expiresAt)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /** Get all memories for an agent */
  async getByAgent(agentType: AgentType | 'system' | 'user'): Promise<MemoryEntry[]> {
    await this.init()
    return Array.from(this.cache.values())
      .filter(e => e.agentType === agentType)
      .filter(e => !e.expiresAt || Date.now() <= e.expiresAt)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /** Get all memories for a project */
  async getByProject(projectId: string): Promise<MemoryEntry[]> {
    await this.init()
    return Array.from(this.cache.values())
      .filter(e => e.projectId === projectId || e.projectId === null)
      .filter(e => !e.expiresAt || Date.now() <= e.expiresAt)
      .sort((a, b) => b.importance.localeCompare(a.importance) || b.createdAt - a.createdAt)
  }

  /** Get memories visible to an agent (own + shared + project) */
  async getVisible(agentType: AgentType, projectId?: string): Promise<MemoryEntry[]> {
    await this.init()
    return Array.from(this.cache.values())
      .filter(e => {
        if (e.expiresAt && Date.now() > e.expiresAt) return false
        if (e.agentType === agentType) return true
        if (e.agentType === 'system') return true
        if (projectId && e.projectId === projectId) return true
        if (e.projectId === null) return true // global memories
        return false
      })
      .sort((a, b) => {
        const impDiff = (IMPORTANCE_SCORES[b.importance] || 5) - (IMPORTANCE_SCORES[a.importance] || 5)
        if (impDiff !== 0) return impDiff
        return b.accessedAt - a.accessedAt
      })
  }

  /** Full-text search across all memories */
  async search(query: string, options?: { category?: MemoryCategory; agentType?: AgentType; projectId?: string; limit?: number }): Promise<MemorySearchResult[]> {
    await this.init()
    const lower = query.toLowerCase()
    const words = lower.split(/\s+/).filter(w => w.length > 1)
    const results: MemorySearchResult[] = []

    for (const entry of this.cache.values()) {
      if (entry.expiresAt && Date.now() > entry.expiresAt) continue
      if (options?.category && entry.category !== options.category) continue
      if (options?.agentType && entry.agentType !== options.agentType) continue
      if (options?.projectId && entry.projectId !== options.projectId) continue

      let score = 0
      let matchType: MemorySearchResult['matchType'] = 'partial'

      // Exact key match
      if (entry.key.toLowerCase() === lower) {
        score += 100
        matchType = 'exact'
      }

      // Key contains query
      if (entry.key.toLowerCase().includes(lower)) {
        score += 50
      }

      // Value contains query
      const valueLower = entry.value.toLowerCase()
      for (const word of words) {
        if (valueLower.includes(word)) {
          score += 10
        }
      }

      // Tag match
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(lower)) {
          score += 30
          matchType = 'tag'
        }
      }

      // Importance boost
      score += IMPORTANCE_SCORES[entry.importance] || 5

      // Popularity boost
      score += Math.min(entry.accessCount, 10)

      if (score > 0) {
        results.push({ entry, score, matchType })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, options?.limit ?? 50)
  }

  // ── Memory Patterns ──────────────────────────────────────

  /** Record a task outcome for learning */
  async recordTaskOutcome(
    agentType: AgentType,
    taskType: string,
    input: string,
    output: string,
    success: boolean,
    duration: number,
    projectId?: string
  ): Promise<MemoryEntry> {
    return this.set('task', agentType, `task:${taskType}:${Date.now()}`, output, {
      projectId: projectId ?? null,
      importance: success ? 'medium' : 'high',
      tags: ['task-outcome', taskType, success ? 'success' : 'failure'],
      metadata: { taskType, input: input.slice(0, 500), success, duration },
    })
  }

  /** Record an error pattern and fix */
  async recordErrorPattern(
    agentType: AgentType,
    errorType: string,
    errorMessage: string,
    fix: string,
    projectId?: string
  ): Promise<MemoryEntry> {
    return this.set('error', agentType, `error:${errorType}:${errorMessage.slice(0, 100)}`, fix, {
      projectId: projectId ?? null,
      importance: 'high',
      tags: ['error-pattern', errorType],
      metadata: { errorType, errorMessage: errorMessage.slice(0, 1000), fix: fix.slice(0, 1000) },
    })
  }

  /** Record a user preference */
  async recordPreference(
    key: string,
    value: string,
    context?: string
  ): Promise<MemoryEntry> {
    return this.set('preference', 'user', `pref:${key}`, value, {
      importance: 'high',
      tags: ['preference', key],
      metadata: { context },
    })
  }

  /** Record a project decision */
  async recordDecision(
    agentType: AgentType,
    decision: string,
    rationale: string,
    alternatives: string[],
    projectId: string
  ): Promise<MemoryEntry> {
    return this.set('decision', agentType, `decision:${decision.slice(0, 100)}`, rationale, {
      projectId,
      importance: 'high',
      tags: ['decision', 'architecture'],
      metadata: { decision, alternatives },
    })
  }

  /** Record skill learning (agent got better at something) */
  async recordSkillLearning(
    agentType: AgentType,
    skillId: string,
    learning: string,
    confidence: number
  ): Promise<MemoryEntry> {
    return this.set('skill', agentType, `skill:${skillId}:${Date.now()}`, learning, {
      importance: confidence > 0.8 ? 'high' : 'medium',
      tags: ['skill-learning', skillId],
      metadata: { skillId, confidence },
    })
  }

  // ── Memory Consolidation ─────────────────────────────────

  /** Merge similar memories to reduce noise */
  async consolidate(category: MemoryCategory): Promise<MemoryConsolidationResult> {
    await this.init()
    const entries = await this.getByCategory(category)
    let merged = 0
    let removed = 0
    let kept = 0

    // Group by key similarity
    const groups: Map<string, MemoryEntry[]> = new Map()
    for (const entry of entries) {
      const keyBase = entry.key.replace(/:\d+$/, '').replace(/:.+$/, '')
      if (!groups.has(keyBase)) groups.set(keyBase, [])
      groups.get(keyBase)!.push(entry)
    }

    for (const [, group] of groups) {
      if (group.length <= 1) {
        kept++
        continue
      }

      // Keep the most recent, important one
      group.sort((a, b) => {
        const impDiff = (IMPORTANCE_SCORES[b.importance] || 5) - (IMPORTANCE_SCORES[a.importance] || 5)
        if (impDiff !== 0) return impDiff
        return b.createdAt - a.createdAt
      })

      const keep = group[0]
      const duplicates = group.slice(1)

      // Merge metadata from duplicates
      for (const dup of duplicates) {
        keep.accessCount += dup.accessCount
        if (dup.tags.length > 0) {
          keep.tags = [...new Set([...keep.tags, ...dup.tags])]
        }
        await this.delete(dup.id)
        removed++
      }

      await idbPut(keep)
      merged++
    }

    return { merged, removed, kept }
  }

  // ── Cleanup ──────────────────────────────────────────────

  /** Remove expired memories */
  async cleanupExpired(): Promise<number> {
    await this.init()
    const now = Date.now()
    let removed = 0

    for (const [id, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(id)
        await idbDelete(id)
        removed++
      }
    }

    if (removed > 0) this.notify()
    return removed
  }

  /** Remove low-importance old memories to free space */
  async prune(maxEntries: number = 10000): Promise<number> {
    await this.init()
    if (this.cache.size <= maxEntries) return 0

    const entries = Array.from(this.cache.values())
      .sort((a, b) => {
        // Sort by importance (lowest first), then by access time (oldest first)
        const impDiff = (IMPORTANCE_SCORES[a.importance] || 5) - (IMPORTANCE_SCORES[b.importance] || 5)
        if (impDiff !== 0) return impDiff
        return a.accessedAt - b.accessedAt
      })

    const toRemove = entries.slice(0, this.cache.size - maxEntries)
    for (const entry of toRemove) {
      this.cache.delete(entry.id)
      await idbDelete(entry.id)
    }

    if (toRemove.length > 0) this.notify()
    return toRemove.length
  }

  // ── Export/Import ─────────────────────────────────────────

  /** Export all memories as JSON */
  async exportMemories(): Promise<string> {
    await this.init()
    const entries = Array.from(this.cache.values())
    return JSON.stringify({
      version: 1,
      exportedAt: Date.now(),
      count: entries.length,
      entries,
    }, null, 2)
  }

  /** Import memories from JSON */
  async importMemories(json: string): Promise<number> {
    await this.init()
    const data = JSON.parse(json)
    if (!data.entries || !Array.isArray(data.entries)) return 0

    let imported = 0
    for (const entry of data.entries) {
      if (entry.id && entry.category && entry.key) {
        this.cache.set(entry.id, entry)
        await idbPut(entry)
        imported++
      }
    }

    this.notify()
    return imported
  }

  // ── Stats ────────────────────────────────────────────────

  async getStats(): Promise<MemoryStats> {
    await this.init()
    const entries = Array.from(this.cache.values())
      .filter(e => !e.expiresAt || Date.now() <= e.expiresAt)

    const byCategory: Record<string, number> = {}
    const byAgent: Record<string, number> = {}
    const byProject: Record<string, number> = {}
    const byImportance: Record<string, number> = {}
    let totalAccessCount = 0
    let totalImportance = 0

    for (const entry of entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
      byAgent[entry.agentType] = (byAgent[entry.agentType] || 0) + 1
      byProject[entry.projectId || 'global'] = (byProject[entry.projectId || 'global'] || 0) + 1
      byImportance[entry.importance] = (byImportance[entry.importance] || 0) + 1
      totalAccessCount += entry.accessCount
      totalImportance += IMPORTANCE_SCORES[entry.importance] || 5
    }

    return {
      totalEntries: entries.length,
      byCategory: byCategory as Record<MemoryCategory, number>,
      byAgent,
      byProject,
      byImportance: byImportance as Record<MemoryImportance, number>,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt)) : null,
      totalAccessCount,
      averageImportance: entries.length > 0 ? totalImportance / entries.length : 0,
    }
  }

  // ── Subscription ─────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  // ── Convenience: Agent Memory Helpers ────────────────────

  /** Get a context summary for an agent */
  async getContextSummary(agentType: AgentType, projectId?: string): Promise<string> {
    const memories = await this.getVisible(agentType, projectId)
    if (memories.length === 0) return ''

    return memories.slice(0, 15).map(m =>
      `[${m.category}] ${m.key}: ${m.value.slice(0, 200)}`
    ).join('\n')
  }

  /** Get recent task outcomes for learning */
  async getRecentOutcomes(agentType: AgentType, limit: number = 10): Promise<MemoryEntry[]> {
    const tasks = await this.getByCategory('task')
    return tasks
      .filter(t => t.agentType === agentType)
      .slice(0, limit)
  }

  /** Get error patterns for an agent */
  async getErrorPatterns(agentType: AgentType): Promise<MemoryEntry[]> {
    const errors = await this.getByCategory('error')
    return errors.filter(e => e.agentType === agentType || e.agentType === 'system')
  }

  /** Get user preferences */
  async getPreferences(): Promise<MemoryEntry[]> {
    return this.getByCategory('preference')
  }

  /** Get project decisions */
  async getDecisions(projectId: string): Promise<MemoryEntry[]> {
    const decisions = await this.getByCategory('decision')
    return decisions.filter(d => d.projectId === projectId || d.projectId === null)
  }
}

export const longTermMemory = new LongTermMemoryService()
export default longTermMemory
