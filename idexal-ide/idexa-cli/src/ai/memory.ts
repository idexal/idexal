import fs from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.idexa',
  'memory'
);

export interface MemoryEntry {
  id: string;
  project: string;
  category: 'analysis' | 'decision' | 'fact' | 'error' | 'pattern' | 'preference';
  content: string;
  keywords: string[];
  filePath?: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  source: 'chat' | 'analyze' | 'review' | 'fix' | 'manual';
  importance: number; // 1-10, higher = more important
}

export interface MemoryStore {
  project: string;
  entries: MemoryEntry[];
  summaries: ProjectSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  project: string;
  summary: string;
  keyFiles: string[];
  architecture: string;
  dependencies: string[];
  patterns: string[];
  issues: string[];
  createdAt: string;
}

export class ProjectMemory {
  private memoryDir: string;

  constructor() {
    this.memoryDir = MEMORY_DIR;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
  }

  private getStorePath(project: string): string {
    const safeName = project.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
    return path.join(this.memoryDir, `${safeName}.json`);
  }

  private loadStore(project: string): MemoryStore {
    const filePath = this.getStorePath(project);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch { /* corrupted, start fresh */ }
    }
    return {
      project,
      entries: [],
      summaries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private saveStore(store: MemoryStore): void {
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.getStorePath(store.project), JSON.stringify(store, null, 2));
  }

  // ── Store memories ─────────────────────────────────────

  remember(
    project: string,
    category: MemoryEntry['category'],
    content: string,
    options: {
      keywords?: string[];
      filePath?: string;
      source?: MemoryEntry['source'];
      importance?: number;
    } = {}
  ): MemoryEntry {
    const store = this.loadStore(project);
    const entry: MemoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      project,
      category,
      content,
      keywords: options.keywords || this.extractKeywords(content),
      filePath: options.filePath,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
      source: options.source || 'chat',
      importance: options.importance || 5,
    };

    // Deduplicate: if a very similar entry exists, update it instead
    const existing = store.entries.findIndex(e =>
      e.category === category &&
      e.content.substring(0, 80) === content.substring(0, 80)
    );

    if (existing >= 0) {
      store.entries[existing].content = content;
      store.entries[existing].keywords = entry.keywords;
      store.entries[existing].importance = Math.max(store.entries[existing].importance, entry.importance);
      store.entries[existing].lastAccessed = entry.lastAccessed;
    } else {
      store.entries.push(entry);
    }

    // Cap at 500 entries per project, drop lowest importance
    if (store.entries.length > 500) {
      store.entries.sort((a, b) => b.importance - a.importance);
      store.entries = store.entries.slice(0, 500);
    }

    this.saveStore(store);
    return entry;
  }

  rememberAnalysis(project: string, analysis: string, source: MemoryEntry['source'] = 'analyze'): MemoryEntry {
    return this.remember(project, 'analysis', analysis, {
      source,
      importance: 7,
      keywords: ['analysis', 'code', 'project', ...this.extractKeywords(analysis)],
    });
  }

  rememberDecision(project: string, decision: string, filePath?: string): MemoryEntry {
    return this.remember(project, 'decision', decision, {
      filePath,
      source: 'chat',
      importance: 8,
      keywords: ['decision', 'chose', 'decided', 'approach', ...this.extractKeywords(decision)],
    });
  }

  rememberFact(project: string, fact: string, filePath?: string): MemoryEntry {
    return this.remember(project, 'fact', fact, {
      filePath,
      source: 'chat',
      importance: 5,
      keywords: this.extractKeywords(fact),
    });
  }

  rememberError(project: string, error: string, filePath?: string): MemoryEntry {
    return this.remember(project, 'error', error, {
      filePath,
      source: 'fix',
      importance: 6,
      keywords: ['error', 'bug', 'fix', 'issue', ...this.extractKeywords(error)],
    });
  }

  rememberPattern(project: string, pattern: string, filePath?: string): MemoryEntry {
    return this.remember(project, 'pattern', pattern, {
      filePath,
      source: 'review',
      importance: 6,
      keywords: ['pattern', 'convention', 'structure', ...this.extractKeywords(pattern)],
    });
  }

  rememberPreference(project: string, preference: string): MemoryEntry {
    return this.remember(project, 'preference', preference, {
      source: 'chat',
      importance: 7,
      keywords: ['preference', 'style', 'preference', ...this.extractKeywords(preference)],
    });
  }

  // ── Store summaries ────────────────────────────────────

  storeSummary(summary: ProjectSummary): void {
    const store = this.loadStore(summary.project);
    // Replace existing summary for same project
    const idx = store.summaries.findIndex(s => s.project === summary.project);
    if (idx >= 0) {
      store.summaries[idx] = summary;
    } else {
      store.summaries.push(summary);
    }
    this.saveStore(store);
  }

  // ── Retrieve memories ──────────────────────────────────

  recall(
    project: string,
    query: string,
    options: {
      limit?: number;
      categories?: MemoryEntry['category'][];
      minImportance?: number;
      recentDays?: number;
    } = {}
  ): MemoryEntry[] {
    const store = this.loadStore(project);
    const limit = options.limit || 20;
    const cutoff = options.recentDays
      ? new Date(Date.now() - options.recentDays * 86400000).toISOString()
      : null;

    let candidates = store.entries;

    // Filter by category
    if (options.categories?.length) {
      candidates = candidates.filter(e => options.categories!.includes(e.category));
    }

    // Filter by recency
    if (cutoff) {
      candidates = candidates.filter(e => e.createdAt >= cutoff);
    }

    // Filter by minimum importance
    const minImp = options.minImportance;
    if (minImp) {
      candidates = candidates.filter(e => e.importance >= minImp);
    }

    // Score by keyword overlap + recency + importance
    const queryWords = this.extractKeywords(query);
    const scored = candidates.map(entry => {
      let score = 0;

      // Keyword overlap
      const overlap = entry.keywords.filter(k =>
        queryWords.some(q => k.includes(q) || q.includes(k))
      );
      score += overlap.length * 3;

      // Exact phrase match in content
      if (entry.content.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
      }

      // Category relevance boosts
      if (queryWords.some(q => entry.keywords.includes(q))) {
        score += 2;
      }

      // Importance weight
      score += entry.importance * 0.5;

      // Recency boost (newer = higher)
      const age = (Date.now() - new Date(entry.createdAt).getTime()) / 86400000;
      score += Math.max(0, 5 - age * 0.5);

      // Access frequency boost
      score += Math.min(entry.accessCount * 0.3, 3);

      return { entry, score };
    });

    // Return top matches
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        // Update access count
        s.entry.accessCount++;
        s.entry.lastAccessed = new Date().toISOString();
        return s.entry;
      });
  }

  getRecent(project: string, count: number = 10): MemoryEntry[] {
    const store = this.loadStore(project);
    return store.entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, count);
  }

  getByCategory(project: string, category: MemoryEntry['category']): MemoryEntry[] {
    const store = this.loadStore(project);
    return store.entries
      .filter(e => e.category === category)
      .sort((a, b) => b.importance - a.importance);
  }

  getSummary(project: string): ProjectSummary | null {
    const store = this.loadStore(project);
    return store.summaries[0] || null;
  }

  // ── Build context for new chats ────────────────────────

  buildContextForChat(project: string, userMessage: string): string {
    const parts: string[] = [];

    // 1. Project summary
    const summary = this.getSummary(project);
    if (summary) {
      parts.push(`## Previous Project Analysis\n${summary.summary}`);
      if (summary.keyFiles.length > 0) {
        parts.push(`Key files: ${summary.keyFiles.join(', ')}`);
      }
      if (summary.architecture) {
        parts.push(`Architecture: ${summary.architecture}`);
      }
      if (summary.issues.length > 0) {
        parts.push(`Known issues: ${summary.issues.slice(0, 5).join('; ')}`);
      }
    }

    // 2. Relevant memories based on the user's question
    const relevant = this.recall(project, userMessage, { limit: 8, minImportance: 4 });
    if (relevant.length > 0) {
      parts.push('\n## Relevant Context from Previous Sessions');
      for (const entry of relevant) {
        const age = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 86400000);
        const ageStr = age === 0 ? 'today' : `${age}d ago`;
        parts.push(`[${entry.category}/${ageStr}] ${entry.content.substring(0, 200)}`);
      }
    }

    // 3. Recent decisions (last 7 days)
    const recentDecisions = this.recall(project, 'decision', {
      categories: ['decision'],
      recentDays: 7,
      limit: 5,
    });
    if (recentDecisions.length > 0) {
      parts.push('\n## Recent Decisions');
      for (const d of recentDecisions) {
        parts.push(`• ${d.content.substring(0, 150)}`);
      }
    }

    // 4. Known errors/patterns
    const errors = this.recall(project, 'error pattern fix bug', {
      categories: ['error', 'pattern'],
      limit: 3,
      minImportance: 5,
    });
    if (errors.length > 0) {
      parts.push('\n## Known Issues & Patterns');
      for (const e of errors) {
        parts.push(`• [${e.category}] ${e.content.substring(0, 150)}`);
      }
    }

    return parts.join('\n\n');
  }

  // ── Auto-extract keywords ──────────────────────────────

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
      'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
      'or', 'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its',
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
      'she', 'her', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .filter((w, i, arr) => arr.indexOf(w) === i) // deduplicate
      .slice(0, 20);
  }

  // ── Stats ──────────────────────────────────────────────

  getStats(project: string): {
    totalEntries: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    avgImportance: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    const store = this.loadStore(project);
    const entries = store.entries;

    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalImportance = 0;

    for (const e of entries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      bySource[e.source] = (bySource[e.source] || 0) + 1;
      totalImportance += e.importance;
    }

    return {
      totalEntries: entries.length,
      byCategory,
      bySource,
      avgImportance: entries.length ? totalImportance / entries.length : 0,
      oldestEntry: entries.length ? entries.reduce((a, b) => a.createdAt < b.createdAt ? a : b).createdAt : null,
      newestEntry: entries.length ? entries.reduce((a, b) => a.createdAt > b.createdAt ? a : b).createdAt : null,
    };
  }

  // ── Cleanup ────────────────────────────────────────────

  pruneOld(project: string, daysToKeep: number = 90): number {
    const store = this.loadStore(project);
    const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
    const before = store.entries.length;
    store.entries = store.entries.filter(e => e.createdAt >= cutoff || e.importance >= 7);
    this.saveStore(store);
    return before - store.entries.length;
  }

  /**
   * Prune memory to keep only the top N entries per project.
   * Uses a scoring algorithm: importance * 2 + recency * 1 + accessCount * 0.5
   * Always keeps entries with importance >= 9 (critical).
   */
  pruneToLimit(project: string, maxEntries: number = 200): number {
    const store = this.loadStore(project);
    const before = store.entries.length;

    if (before <= maxEntries) {
      return 0; // Already within limit
    }

    // Score each entry
    const now = Date.now();
    const scored = store.entries.map(entry => {
      let score = 0;

      // Importance weight (most important factor)
      score += entry.importance * 2;

      // Recency boost (newer = higher score)
      const ageMs = now - new Date(entry.createdAt).getTime();
      const ageDays = ageMs / 86400000;
      score += Math.max(0, 10 - ageDays * 0.1); // Max 10 points for brand new

      // Access frequency boost
      score += Math.min(entry.accessCount * 0.5, 5); // Max 5 points

      // Last accessed recency
      const lastAccessAge = now - new Date(entry.lastAccessed).getTime();
      const lastAccessDays = lastAccessAge / 86400000;
      score += Math.max(0, 5 - lastAccessDays * 0.1); // Max 5 points

      // Category bonuses
      if (entry.category === 'decision') score += 3; // Decisions are valuable
      if (entry.category === 'error') score += 2; // Errors help avoid repeats
      if (entry.category === 'pattern') score += 2; // Patterns are reusable
      if (entry.category === 'preference') score += 1; // Preferences matter

      // Source bonuses
      if (entry.source === 'review') score += 1; // Reviews are insightful
      if (entry.source === 'analyze') score += 1; // Analysis is valuable

      return { entry, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Keep top N entries, always keep importance >= 9
    const kept = new Set<string>();
    const result: MemoryEntry[] = [];

    // First pass: always keep critical entries
    for (const { entry } of scored) {
      if (entry.importance >= 9) {
        result.push(entry);
        kept.add(entry.id);
      }
    }

    // Second pass: fill remaining slots by score
    for (const { entry } of scored) {
      if (kept.has(entry.id)) continue;
      if (result.length >= maxEntries) break;
      result.push(entry);
      kept.add(entry.id);
    }

    store.entries = result;
    this.saveStore(store);

    return before - result.length;
  }

  /**
   * Prune all projects to enforce storage limits.
   * Called on CLI startup to prevent unbounded growth.
   */
  pruneAll(maxEntriesPerProject: number = 200): { projects: number; removed: number } {
    let projects = 0;
    let totalRemoved = 0;

    if (!fs.existsSync(this.memoryDir)) {
      return { projects: 0, removed: 0 };
    }

    const files = fs.readdirSync(this.memoryDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const storePath = path.join(this.memoryDir, file);
        const store: MemoryStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));

        if (store.entries.length > maxEntriesPerProject) {
          const before = store.entries.length;

          // Score and sort
          const now = Date.now();
          const scored = store.entries.map(entry => {
            let score = entry.importance * 2;
            const ageDays = (now - new Date(entry.createdAt).getTime()) / 86400000;
            score += Math.max(0, 10 - ageDays * 0.1);
            score += Math.min(entry.accessCount * 0.5, 5);
            const lastAccessDays = (now - new Date(entry.lastAccessed).getTime()) / 86400000;
            score += Math.max(0, 5 - lastAccessDays * 0.1);
            if (entry.category === 'decision') score += 3;
            if (entry.category === 'error') score += 2;
            if (entry.category === 'pattern') score += 2;
            if (entry.category === 'preference') score += 1;
            if (entry.source === 'review') score += 1;
            if (entry.source === 'analyze') score += 1;
            return { entry, score };
          });

          scored.sort((a, b) => b.score - a.score);

          const kept = new Set<string>();
          const result: MemoryEntry[] = [];

          for (const { entry } of scored) {
            if (entry.importance >= 9) {
              result.push(entry);
              kept.add(entry.id);
            }
          }
          for (const { entry } of scored) {
            if (kept.has(entry.id)) continue;
            if (result.length >= maxEntriesPerProject) break;
            result.push(entry);
            kept.add(entry.id);
          }

          store.entries = result;
          store.updatedAt = new Date().toISOString();
          fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

          totalRemoved += before - result.length;
          projects++;
        }
      } catch {
        // Skip corrupted files
      }
    }

    return { projects, removed: totalRemoved };
  }

  /**
   * Get storage stats across all projects.
   */
  getStorageStats(): { projects: number; totalEntries: number; totalSizeKB: number; perProject: Array<{ name: string; entries: number; sizeKB: number }> } {
    const perProject: Array<{ name: string; entries: number; sizeKB: number }> = [];
    let totalEntries = 0;
    let totalSizeKB = 0;

    if (!fs.existsSync(this.memoryDir)) {
      return { projects: 0, totalEntries: 0, totalSizeKB: 0, perProject: [] };
    }

    const files = fs.readdirSync(this.memoryDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const storePath = path.join(this.memoryDir, file);
        const stats = fs.statSync(storePath);
        const store: MemoryStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        const sizeKB = Math.round(stats.size / 1024);

        perProject.push({
          name: store.project || file.replace('.json', ''),
          entries: store.entries.length,
          sizeKB,
        });

        totalEntries += store.entries.length;
        totalSizeKB += sizeKB;
      } catch {
        // Skip corrupted files
      }
    }

    return { projects: files.length, totalEntries, totalSizeKB, perProject };
  }

  clear(project: string): void {
    const filePath = this.getStorePath(project);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const projectMemory = new ProjectMemory();
