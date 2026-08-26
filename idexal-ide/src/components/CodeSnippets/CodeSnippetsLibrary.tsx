import React, { useState, useMemo } from 'react'
import {
  FaCode, FaSearch, FaStar, FaCopy, FaCheck, FaTag, FaFilter, FaChevronDown, FaChevronRight, FaFolder, FaFileAlt, FaPlus, FaTrash, FaDownload, FaUpload, FaClock, FaBolt
} from '../Icon'

interface Snippet {
  id: string
  name: string
  prefix: string
  language: string
  category: string
  code: string
  description: string
  tags: string[]
  isFavorite: boolean
  usageCount: number
  createdAt: Date
}

const CATEGORIES = [
  { id: 'react', name: 'React', icon: '⚛️', color: 'text-blue-400' },
  { id: 'typescript', name: 'TypeScript', icon: '📘', color: 'text-blue-300' },
  { id: 'hooks', name: 'React Hooks', icon: '🪝', color: 'text-green-400' },
  { id: 'backend', name: 'Backend', icon: '🔧', color: 'text-orange-400' },
  { id: 'database', name: 'Database', icon: '🗄️', color: 'text-purple-400' },
  { id: 'testing', name: 'Testing', icon: '🧪', color: 'text-yellow-400' },
  { id: 'devops', name: 'DevOps', icon: '🚀', color: 'text-red-400' },
  { id: 'utilities', name: 'Utilities', icon: '🛠️', color: 'text-cyan-400' },
]

const MOCK_SNIPPETS: Snippet[] = [
  {
    id: 's1', name: 'React Functional Component', prefix: 'rfc', language: 'TypeScript',
    category: 'react', code: `import React from 'react'\n\ninterface Props {\n  // Add props here\n}\n\nexport default function ComponentName({ }: Props) {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  )\n}`,
    description: 'React functional component with TypeScript props interface', tags: ['react', 'component'], isFavorite: true, usageCount: 47, createdAt: new Date(Date.now() - 864000000)
  },
  {
    id: 's2', name: 'useState with Type', prefix: 'ust', language: 'TypeScript',
    category: 'hooks', code: `const [state, setState] = useState<Type>(initialValue)`,
    description: 'useState hook with typed state and initial value', tags: ['react', 'hooks', 'state'], isFavorite: true, usageCount: 32, createdAt: new Date(Date.now() - 604800000)
  },
  {
    id: 's3', name: 'useEffect Cleanup', prefix: 'uec', language: 'TypeScript',
    category: 'hooks', code: `useEffect(() => {\n  const controller = new AbortController()\n\n  async function fetchData() {\n    try {\n      const res = await fetch(url, { signal: controller.signal })\n      const data = await res.json()\n      setData(data)\n    } catch (err) {\n      if (err instanceof Error && err.name !== 'AbortError') {\n        setError(err.message)\n      }\n    }\n  }\n\n  fetchData()\n  return () => controller.abort()\n}, [url])`,
    description: 'useEffect with AbortController for cleanup', tags: ['react', 'hooks', 'fetch', 'cleanup'], isFavorite: false, usageCount: 18, createdAt: new Date(Date.now() - 432000000)
  },
  {
    id: 's4', name: 'useCallback Memo', prefix: 'ucb', language: 'TypeScript',
    category: 'hooks', code: `const memoizedFn = useCallback((arg: Type) => {\n  // Function body\n  return result\n}, [dependency1, dependency2])`,
    description: 'useCallback for memoizing function references', tags: ['react', 'hooks', 'memo'], isFavorite: false, usageCount: 22, createdAt: new Date(Date.now() - 345600000)
  },
  {
    id: 's5', name: 'useMemo Value', prefix: 'umv', language: 'TypeScript',
    category: 'hooks', code: `const memoizedValue = useMemo(() => {\n  return expensiveComputation(data)\n}, [data])`,
    description: 'useMemo for expensive computations', tags: ['react', 'hooks', 'memo', 'performance'], isFavorite: false, usageCount: 15, createdAt: new Date(Date.now() - 259200000)
  },
  {
    id: 's6', name: 'Express Route Handler', prefix: 'erh', language: 'TypeScript',
    category: 'backend', code: `import { Router, Request, Response } from 'express'\n\nconst router = Router()\n\nrouter.get('/endpoint', async (req: Request, res: Response) => {\n  try {\n    // Logic here\n    res.json({ success: true, data: {} })\n  } catch (error) {\n    console.error(error)\n    res.status(500).json({ error: 'Internal server error' })\n  }\n})\n\nexport default router`,
    description: 'Express.js route handler with error handling', tags: ['express', 'backend', 'api'], isFavorite: false, usageCount: 12, createdAt: new Date(Date.now() - 172800000)
  },
  {
    id: 's7', name: 'Zustand Store', prefix: 'zst', language: 'TypeScript',
    category: 'state', code: `import { create } from 'zustand'\n\ninterface StoreState {\n  count: number\n  increment: () => void\n  decrement: () => void\n  reset: () => void\n}\n\nexport const useStore = create<StoreState>((set) => ({\n  count: 0,\n  increment: () => set((state) => ({ count: state.count + 1 })),\n  decrement: () => set((state) => ({ count: state.count - 1 })),\n  reset: () => set({ count: 0 }),\n}))`,
    description: 'Zustand store with basic actions', tags: ['state', 'zustand', 'store'], isFavorite: true, usageCount: 25, createdAt: new Date(Date.now() - 86400000)
  },
  {
    id: 's8', name: 'Try-Catch Block', prefix: 'try', language: 'TypeScript',
    category: 'utilities', code: `try {\n  // FaCode that might throw\n} catch (error) {\n  if (error instanceof Error) {\n    console.error(error.message)\n  }\n} finally {\n  // Cleanup\n}`,
    description: 'Try-catch with typed error handling', tags: ['error', 'typescript', 'safety'], isFavorite: false, usageCount: 56, createdAt: new Date(Date.now() - 60480000)
  },
  {
    id: 's9', name: 'Docker Compose', prefix: 'dcp', language: 'YAML',
    category: 'devops', code: `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    depends_on:\n      - db\n      - redis\n  db:\n    image: postgres:15\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    environment:\n      POSTGRES_DB: mydb\n  redis:\n    image: redis:7-alpine\nvolumes:\n  pgdata:`,
    description: 'Docker Compose with PostgreSQL and Redis', tags: ['docker', 'devops', 'compose'], isFavorite: false, usageCount: 8, createdAt: new Date(Date.now() - 345600000)
  },
  {
    id: 's10', name: 'Vitest Test File', prefix: 'vtf', language: 'TypeScript',
    category: 'testing', code: `import { describe, it, expect, vi } from 'vitest'\nimport { functionName } from './module'\n\ndescribe('functionName', () => {\n  it('should handle basic case', () => {\n    const result = functionName('input')\n    expect(result).toBe('expected')\n  })\n\n  it('should handle edge case', () => {\n    const result = functionName('')\n    expect(result).toBeNull()\n  })\n\n  it('should throw on invalid input', () => {\n    expect(() => functionName(null)).toThrow()\n  })\n})`,
    description: 'Vitest test file with describe/it blocks', tags: ['test', 'vitest', 'testing'], isFavorite: false, usageCount: 35, createdAt: new Date(Date.now() - 172800000)
  },
  {
    id: 's11', name: 'API Response Type', prefix: 'art', language: 'TypeScript',
    category: 'typescript', code: `interface ApiResponse<T> {\n  success: boolean\n  data: T\n  error?: string\n  timestamp: string\n}\n\ninterface PaginatedResponse<T> extends ApiResponse<T[]> {\n  pagination: {\n    page: number\n    limit: number\n    total: number\n    totalPages: number\n  }\n}`,
    description: 'Generic API response types with pagination', tags: ['typescript', 'api', 'types'], isFavorite: true, usageCount: 19, createdAt: new Date(Date.now() - 259200000)
  },
  {
    id: 's12', name: 'Database Migration', prefix: 'dbm', language: 'SQL',
    category: 'database', code: `-- Migration: Create users table\nCREATE TABLE IF NOT EXISTS users (\n  id BIGSERIAL PRIMARY KEY,\n  email VARCHAR(255) NOT NULL UNIQUE,\n  username VARCHAR(100) NOT NULL,\n  password_hash VARCHAR(255) NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n\nCREATE INDEX idx_users_email ON users(email);\nCREATE INDEX idx_users_username ON users(username);\n\n-- Down migration\n-- DROP TABLE IF EXISTS users;`,
    description: 'PostgreSQL migration for creating a users table', tags: ['database', 'sql', 'migration'], isFavorite: false, usageCount: 14, createdAt: new Date(Date.now() - 518400000)
  },
]

export default function CodeSnippetsLibrary({ onClose }: { onClose: () => void }) {
  const [snippets, setSnippets] = useState(MOCK_SNIPPETS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'recent'>('usage')

  const filtered = useMemo(() => {
    let list = [...snippets]

    if (showFavoritesOnly) list = list.filter(s => s.isFavorite)
    if (selectedCategory) list = list.filter(s => s.category === selectedCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.prefix.includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q))
      )
    }

    list.sort((a, b) => {
      if (sortBy === 'usage') return b.usageCount - a.usageCount
      if (sortBy === 'recent') return b.createdAt.getTime() - a.createdAt.getTime()
      return a.name.localeCompare(b.name)
    })

    return list
  }, [snippets, searchQuery, selectedCategory, showFavoritesOnly, sortBy])

  const stats = useMemo(() => ({
    total: snippets.length,
    favorites: snippets.filter(s => s.isFavorite).length,
    totalUsages: snippets.reduce((s, sn) => s + sn.usageCount, 0),
    categories: new Set(snippets.map(s => s.category)).size,
  }), [snippets])

  const copySnippet = (id: string, code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedId(id)
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, usageCount: s.usageCount + 1 } : s))
    setTimeout(() => setCopiedId(null), 1500)
  }

  const toggleFavorite = (id: string) => {
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">FaCode Snippets</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            {stats.total} snippets
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs flex items-center gap-1">
            <FaPlus size={10} /> New
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Total', value: stats.total, color: 'text-emerald-400' },
          { label: 'Favorites', value: stats.favorites, color: 'text-yellow-400' },
          { label: 'Categories', value: stats.categories, color: 'text-blue-400' },
          { label: 'Total Uses', value: stats.totalUsages, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="px-3 py-1.5 border-b border-ide-border space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1 flex-1">
            <FaSearch size={12} className="text-ide-text-secondary" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search snippets..."
              className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-1.5 rounded ${showFavoritesOnly ? 'bg-yellow-500/20 text-yellow-400' : 'text-ide-text-secondary hover:text-ide-text'}`}
          >
            <FaStar size={14} className={showFavoritesOnly ? 'fill-yellow-400' : ''} />
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${
              !selectedCategory ? 'bg-emerald-500/20 text-emerald-400' : 'text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 flex items-center gap-0.5 ${
                selectedCategory === cat.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-ide-text-secondary hover:text-ide-text'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sort & Count */}
      <div className="px-3 py-1 border-b border-ide-border flex items-center justify-between">
        <span className="text-[10px] text-ide-text-secondary">{filtered.length} snippets shown</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ide-text-secondary">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-ide-bg-secondary text-[10px] text-ide-text px-1.5 py-0.5 rounded border border-ide-border"
          >
            <option value="usage">Most Used</option>
            <option value="recent">Recently Added</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(snippet => {
          const isExpanded = expandedId === snippet.id
          const cat = CATEGORIES.find(c => c.id === snippet.category)
          return (
            <div key={snippet.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : snippet.id)}
                className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(snippet.id) }} className="flex-shrink-0">
                    {snippet.isFavorite ? (
                      <FaStar size={12} className="text-yellow-400 fill-yellow-400" />
                    ) : (
                      <FaCode size={12} className="text-ide-text-secondary/30" />
                    )}
                  </button>
                  <span className="text-xs font-semibold flex-1">{snippet.name}</span>
                  {snippet.prefix && (
                    <span className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-[10px] font-mono text-emerald-400">
                      :{snippet.prefix}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-ide-text-secondary ml-7 flex items-center gap-2">
                  <span className={cat?.color}>{cat?.icon} {cat?.name}</span>
                  <span>•</span>
                  <span>{snippet.usageCount} uses</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <FaTag size={8} /> {snippet.tags.slice(0, 2).join(', ')}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-b border-ide-border/30 bg-ide-bg-secondary/10">
                  <div className="px-3 py-1.5 flex items-center gap-1 border-b border-ide-border/20">
                    <button
                      onClick={() => copySnippet(snippet.id, snippet.code)}
                      className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded text-[10px] flex items-center gap-0.5"
                    >
                      {copiedId === snippet.id ? <FaCheck size={8} /> : <FaCopy size={8} />}
                      {copiedId === snippet.id ? 'Copied!' : 'Copy FaCode'}
                    </button>
                    <span className="text-[10px] text-ide-text-secondary ml-2">{snippet.description}</span>
                  </div>
                  <pre className="px-3 py-2 text-[11px] font-mono text-ide-text overflow-x-auto whitespace-pre-wrap leading-relaxed bg-black/20">
                    {snippet.code}
                  </pre>
                  <div className="px-3 py-1 flex items-center gap-2 text-[10px] text-ide-text-secondary border-t border-ide-border/20">
                    <span>Created: {snippet.createdAt.toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><FaClock size={8} /> {snippet.usageCount} uses</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-ide-text-secondary">
            <FaCode size={32} className="mb-2 opacity-30" />
            <span className="text-xs">No snippets found</span>
            <span className="text-[10px]">Try a different search or category</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>Type <code className="bg-ide-bg-secondary px-1 rounded">:</code> prefix + Tab to insert</span>
        <span>{stats.totalUsages} total uses</span>
      </div>
    </div>
  )
}
