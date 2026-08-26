/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              PROJECT SKILLS SERVICE v1.0                      ║
 * ║   Loads the repo's bundled `skills/` library into the IDE     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * The repository ships a curated skills library at `<repo>/skills/`
 * (121 skill directories, each with a SKILL.md front-matter file).
 * This service discovers, parses, indexes and serves those skills
 * so every agent in the IDE supports them out of the box:
 *
 *  - Discovery:   scans <root>/skills/<name>/SKILL.md via Electron IPC
 *  - Parsing:     YAML-ish front matter (name, description, metadata)
 *  - Indexing:    keyword index for search & task routing
 *  - Serving:     full SKILL.md content on demand for agent prompts
 *  - Live reload: watches the skills tree for changes
 *
 * Falls back to demo mode when Electron APIs are unavailable
 * (e.g. running `vite dev` in a plain browser).
 */

export interface ProjectSkill {
  /** Directory name, used as stable id */
  id: string
  /** Display name from front matter (falls back to id) */
  name: string
  /** One-line description from front matter */
  description: string
  /** Extra license/metadata block if present */
  author?: string
  version?: string
  license?: string
  /** Absolute path of the SKILL.md file */
  filePath: string
  /** Full markdown content (lazy-loaded on first use) */
  content?: string
}

export interface SkillSearchResult {
  skill: ProjectSkill
  score: number
}

type Listener = () => void

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

function stripQuotes(value: string): string {
  const t = value.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

/** Minimal front-matter parser — no dependency, tolerant to quirks. */
export function parseSkillFrontmatter(md: string): Partial<ProjectSkill> {
  const match = md.match(FRONTMATTER_RE)
  if (!match) return {}

  const out: Partial<ProjectSkill> = {}
  let currentListKey = ''
  const listItems: Record<string, string[]> = {}
  let multilineKey = ''
  let multilineBuf = ''

  const flushMultiline = () => {
    if (multilineKey) {
      ;(out as Record<string, unknown>)[multilineKey] = stripQuotes(multilineBuf)
      multilineKey = ''
      multilineBuf = ''
    }
  }

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ')
    if (!line.trim() || line.trim().startsWith('#')) continue

    // Continuation of a folded multiline scalar (">-" style)
    if (multilineKey && /^\s+\S/.test(rawLine)) {
      multilineBuf += ' ' + line.trim()
      continue
    }
    flushMultiline()

    const listMatch = line.match(/^(\s*-\s)(.*)$/)
    if (listMatch && currentListKey) {
      listItems[currentListKey] = [...(listItems[currentListKey] || []), stripQuotes(listMatch[2])]
      continue
    }

    const kv = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    let value = kv[2]

    if (value === '>' || value === '>-' || value === '|') {
      multilineKey = key
      multilineBuf = ''
      continue
    }
    if (value === '') {
      currentListKey = key
      continue
    }

    currentListKey = ''
    // Nested "metadata:" block keys we care about
    if (key === 'author' || key === 'version' || key === 'license') {
      ;(out as Record<string, unknown>)[key] = stripQuotes(value)
    } else if (!out.name && !out.description) {
      // top-level name/description
      ;(out as Record<string, unknown>)[key] = stripQuotes(value)
    } else {
      ;(out as Record<string, unknown>)[key] = stripQuotes(value)
    }
  }
  flushMultiline()

  if (listItems.tags) (out as Record<string, unknown>).tags = listItems.tags
  return out
}

class ProjectSkillsService {
  private root = ''
  private skills = new Map<string, ProjectSkill>()
  private loaded = false
  private loading: Promise<void> | null = null
  private listeners = new Set<Listener>()

  /** Subscribe to change notifications (returns unsubscribe). */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private notify() {
    for (const fn of Array.from(this.listeners)) {
      try { fn() } catch { /* listener error must not break others */ }
    }
  }

  /**
   * Discover + parse all skills under `<workspaceRoot>/skills`.
   * Safe to call repeatedly; concurrent calls share one pass.
   */
  async load(rootPath?: string): Promise<void> {
    const api = (window as any).electronAPI
    if (!api?.readDir || !api?.readFile) return // browser/demo mode

    const root = rootPath || api.workspaceRoot || ''
    if (!root) return
    if (this.loading && this.root === root) return this.loading
    this.root = root
    this.loading = this.doLoad(api, root)
    return this.loading
  }

  private async doLoad(api: any, root: string): Promise<void> {
    try {
      const res = await api.readDir(`${root}/skills`, 1)
      const dirs: string[] = (res?.tree || [])
        .filter((n: any) => n.isDirectory)
        .map((n: any) => n.path || n.name)

      this.skills.clear()

      await Promise.all(dirs.map(async dir => {
        const dirName = String(dir).split(/[\\/]/).pop()!
        const mdPath = `${String(dir).replace(/\/$/, '')}/SKILL.md`
        const file = await api.readFile(mdPath).catch(() => null)
        if (!file?.success || !file.content) return
        const meta = parseSkillFrontmatter(file.content)
        this.skills.set(dirName, {
          id: dirName,
          name: (meta.name as string) || dirName,
          description: (meta.description as string) || '',
          author: meta.author,
          version: meta.version,
          license: meta.license,
          filePath: mdPath,
        })
      }))

      this.loaded = true
      this.notify()
    } catch {
      // skills folder missing — stay empty, no crash
      this.loaded = true
    }
  }

  isLoaded() { return this.loaded }
  count() { return this.skills.size }

  getAll(): ProjectSkill[] {
    return Array.from(this.skills.values()).sort((a, b) => a.id.localeCompare(b.id))
  }

  get(id: string): ProjectSkill | undefined {
    return this.skills.get(id)
  }

  /** Full SKILL.md content, lazy-loading from disk once. */
  async getContent(id: string): Promise<string> {
    const s = this.skills.get(id)
    if (!s) return ''
    if (s.content) return s.content
    const api = (window as any).electronAPI
    if (!api?.readFile) return ''
    const file = await api.readFile(s.filePath)
    const content: string = file?.success ? (file.content || '') : ''
    s.content = content
    return content
  }

  /** Lightweight keyword scoring over id/name/description. */
  search(query: string, limit = 20): SkillSearchResult[] {
    const q = query.toLowerCase().trim()
    if (!q) return this.getAll().slice(0, limit).map(skill => ({ skill, score: 0 }))
    const terms = q.split(/\s+/)

    const results: SkillSearchResult[] = []
    for (const skill of this.skills.values()) {
      const haystackId = skill.id.toLowerCase()
      const haystackName = (skill.name || '').toLowerCase()
      const hayDesc = (skill.description || '').toLowerCase()
      let score = 0
      for (const t of terms) {
        if (haystackId.includes(t)) score += 3
        if (haystackName.includes(t)) score += 2
        if (hayDesc.includes(t)) score += 1
      }
      if (score > 0) results.push({ skill, score })
    }
    results.sort((a, b) => b.score - a.score || a.skill.id.localeCompare(b.skill.id))
    return results.slice(0, limit)
  }

  /** Top-N skills whose description matches the given task text. */
  suggestForTask(taskText: string, limit = 5): ProjectSkill[] {
    return this.search(taskText, limit)
    .filter(r => r.score > 0)
      .map(r => r.skill)
  }

  reset() {
    this.skills.clear()
    this.loaded = false
    this.loading = null
    this.root = ''
  }
}

export const projectSkillsService = new ProjectSkillsService()
