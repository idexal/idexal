import React, { useState, useMemo } from 'react'
import {
  Code, Search, Plus, Copy, Check, Trash2, Edit3, Tag,
  ChevronDown, ChevronRight, Folder, FileText, Star, StarOff,
  Download, Upload, X
} from 'lucide-react'

interface Snippet {
  id: string
  name: string
  prefix: string
  language: string
  code: string
  description: string
  tags: string[]
  isFavorite: boolean
  usageCount: number
  createdAt: Date
}

const MOCK_SNIPPETS: Snippet[] = [
  { id: 's1', name: 'React Functional Component', prefix: 'rfc', language: 'TypeScript', code: `import React from 'react'\n\ninterface Props {\n  // Add props here\n}\n\nexport default function ComponentName({ }: Props) {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  )\n}`, description: 'React functional component with TypeScript props', tags: ['react', 'component'], isFavorite: true, usageCount: 47, createdAt: new Date(Date.now() - 864000000) },
  { id: 's2', name: 'useState with Interface', prefix: 'usint', language: 'TypeScript', code: `const [state, setState] = useState<{key: string}>({key: 'initial'})`, description: 'useState hook with typed state', tags: ['react', 'hooks'], isFavorite: true, usageCount: 32, createdAt: new Date(Date.now() - 604800000) },
  { id: 's3', name: 'useEffect Cleanup', prefix: 'uefc', language: 'TypeScript', code: `useEffect(() => {\n  const controller = new AbortController()\n\n  async function fetchData() {\n    try {\n      const res = await fetch(url, { signal: controller.signal })\n      const data = await res.json()\n      setData(data)\n    } catch (err) {\n      if (err instanceof Error && err.name !== 'AbortError') {\n        setError(err.message)\n      }\n    }\n  }\n\n  fetchData()\n  return () => controller.abort()\n}, [url])`, description: 'useEffect with AbortController cleanup', tags: ['react', 'hooks', 'fetch'], isFavorite: false, usageCount: 18, createdAt: new Date(Date.now() - 432000000) },
  { id: 's4', name: 'Express Route Handler', prefix: 'exrh', language: 'TypeScript', code: `import { Router, Request, Response } from 'express'\n\nconst router = Router()\n\nrouter.get('/endpoint', async (req: Request, res: Response) => {\n  try {\n    // Logic here\n    res.json({ success: true })\n  } catch (error) {\n    console.error(error)\n    res.status(500).json({ error: 'Internal server error' })\n  }\n})\n\nexport default router`, description: 'Express.js route handler with error handling', tags: ['express', 'backend'], isFavorite: false, usageCount: 12, createdAt: new Date(Date.now() - 259200000) },
  { id: 's5', name: 'Zustand Store', prefix: 'zst', language: 'TypeScript', code: `import { create } from 'zustand'\n\ninterface StoreState {\n  count: number\n  increment: () => void\n  decrement: () => void\n}\n\nexport const useStore = create<StoreState>((set) => ({\n  count: 0,\n  increment: () => set((state) => ({ count: state.count + 1 })),\n  decrement: () => set((state) => ({ count: state.count - 1 })),\n}))`, description: 'Zustand store with basic actions', tags: ['state', 'zustand'], isFavorite: true, usageCount: 25, createdAt: new Date(Date.now() - 172800000) },
  { id: 's6', name: 'Try-Catch Block', prefix: 'try', language: 'TypeScript', code: `try {\n  // Code that might throw\n} catch (error) {\n  if (error instanceof Error) {\n    console.error(error.message)\n  }\n} finally {\n  // Cleanup\n}`, description: 'Try-catch with typed error handling', tags: ['error', 'typescript'], isFavorite: false, usageCount: 56, createdAt: new Date(Date.now() - 86400000) },
  { id: 's7', name: 'Docker Compose', prefix: 'dcomp', language: 'YAML', code: `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n    depends_on:\n      - db\n      - redis\n  db:\n    image: postgres:15\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    environment:\n      POSTGRES_DB: mydb\n      POSTGRES_PASSWORD: secret\n  redis:\n    image: redis:7-alpine\nvolumes:\n  pgdata:`, description: 'Docker Compose with PostgreSQL and Redis', tags: ['docker', 'devops'], isFavorite: false, usageCount: 8, createdAt: new Date(Date.now() - 345600000) },
  { id: 's8', name: 'Rust Error Type', prefix: 'errt', language: 'Rust', code: `use thiserror::Error\n\n#[derive(Error, Debug)]\npub enum AppError {\n    #[error("not found: {0}")] NotFound(String),\n    #[error("invalid input: {0}")] InvalidInput(String),\n    #[error("internal error")] Internal(#[from] anyhow::Error),\n}\n\nimpl AppError {\n    pub fn status_code(&self) -> u16 {\n        match self {\n            Self::NotFound(_) => 404,\n            Self::InvalidInput(_) => 400,\n            Self::Internal(_) => 500,\n        }\n    }\n}`, description: 'Rust error enum with thiserror', tags: ['rust', 'error'], isFavorite: false, usageCount: 5, createdAt: new Date(Date.now() - 518400000) },
  { id: 's9', name: 'Python FastAPI Route', prefix: 'fapi', language: 'Python', code: `from fastapi import APIRouter, HTTPException\nfrom pydantic import BaseModel\n\nrouter = APIRouter()\n\nclass ItemResponse(BaseModel):\n    id: int\n    name: str\n    description: str | None = None\n\n@router.get("/items/{item_id}", response_model=ItemResponse)\nasync def get_item(item_id: int):\n    item = await db.get_item(item_id)\n    if not item:\n        raise HTTPException(status_code=404, detail="Item not found")\n    return item`, description: 'FastAPI endpoint with Pydantic model', tags: ['python', 'fastapi'], isFavorite: false, usageCount: 7, createdAt: new Date(Date.now() - 604800000) },
]

const LANGUAGES = ['All', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'YAML', 'HTML', 'CSS']
const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500/20 text-blue-400',
  JavaScript: 'bg-yellow-500/20 text-yellow-400',
  Python: 'bg-green-500/20 text-green-400',
  Rust: 'bg-orange-500/20 text-orange-400',
  YAML: 'bg-purple-500/20 text-purple-400',
  HTML: 'bg-red-500/20 text-red-400',
  CSS: 'bg-cyan-500/20 text-cyan-400',
}

export default function SnippetManagerPanel({ onClose }: { onClose: () => void }) {
  const [snippets, setSnippets] = useState(MOCK_SNIPPETS)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLang, setFilterLang] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newSnippet, setNewSnippet] = useState({ name: '', prefix: '', language: 'TypeScript', code: '', description: '', tags: '' })

  const filtered = useMemo(() => {
    let list = [...snippets]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.prefix.includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)))
    }
    if (filterLang !== 'All') list = list.filter(s => s.language === filterLang)
    return list.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || b.usageCount - a.usageCount)
  }, [snippets, searchQuery, filterLang])

  const stats = useMemo(() => ({
    total: snippets.length,
    favorite: snippets.filter(s => s.isFavorite).length,
    languages: new Set(snippets.map(s => s.language)).size,
    totalUsages: snippets.reduce((s, sn) => s + sn.usageCount, 0),
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

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const addSnippet = () => {
    if (!newSnippet.name || !newSnippet.code) return
    const snippet: Snippet = {
      id: `s${Date.now()}`,
      name: newSnippet.name,
      prefix: newSnippet.prefix,
      language: newSnippet.language,
      code: newSnippet.code,
      description: newSnippet.description,
      tags: newSnippet.tags.split(',').map(t => t.trim()).filter(Boolean),
      isFavorite: false,
      usageCount: 0,
      createdAt: new Date(),
    }
    setSnippets(prev => [snippet, ...prev])
    setNewSnippet({ name: '', prefix: '', language: 'TypeScript', code: '', description: '', tags: '' })
    setShowNew(false)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">Snippets</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowNew(!showNew)} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs flex items-center gap-1">
            <Plus size={10} /> New
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Snippets', value: stats.total, color: 'text-emerald-400' },
          { label: 'Favorites', value: stats.favorite, color: 'text-yellow-400' },
          { label: 'Languages', value: stats.languages, color: 'text-blue-400' },
          { label: 'Usages', value: stats.totalUsages, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Language Filter */}
      <div className="px-3 py-1.5 border-b border-ide-border flex items-center gap-2">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1 flex-1">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search snippets..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          className="bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* New Snippet Form */}
      {showNew && (
        <div className="px-3 py-2 border-b border-ide-border bg-ide-bg-secondary/20 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              value={newSnippet.name}
              onChange={e => setNewSnippet(p => ({ ...p, name: e.target.value }))}
              placeholder="Snippet name"
              className="flex-1 bg-ide-bg-secondary text-xs px-2 py-1 rounded border border-ide-border outline-none text-ide-text"
            />
            <input
              value={newSnippet.prefix}
              onChange={e => setNewSnippet(p => ({ ...p, prefix: e.target.value }))}
              placeholder="Prefix"
              className="w-24 bg-ide-bg-secondary text-xs px-2 py-1 rounded border border-ide-border outline-none text-ide-text font-mono"
            />
          </div>
          <textarea
            value={newSnippet.code}
            onChange={e => setNewSnippet(p => ({ ...p, code: e.target.value }))}
            placeholder="Paste code here..."
            className="w-full bg-ide-bg-secondary text-xs px-2 py-1.5 rounded border border-ide-border outline-none text-ide-text font-mono h-20 resize-none"
          />
          <div className="flex items-center gap-2">
            <input
              value={newSnippet.description}
              onChange={e => setNewSnippet(p => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              className="flex-1 bg-ide-bg-secondary text-xs px-2 py-1 rounded border border-ide-border outline-none text-ide-text"
            />
            <input
              value={newSnippet.tags}
              onChange={e => setNewSnippet(p => ({ ...p, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
              className="w-40 bg-ide-bg-secondary text-xs px-2 py-1 rounded border border-ide-border outline-none text-ide-text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addSnippet} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs">Save Snippet</button>
            <button onClick={() => setShowNew(false)} className="px-3 py-1 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Snippet List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(snippet => {
          const isExpanded = expandedId === snippet.id
          const langColor = LANG_COLORS[snippet.language] || 'bg-gray-500/20 text-gray-400'
          return (
            <div key={snippet.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : snippet.id)}
                className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/10 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <button onClick={e => { e.stopPropagation(); toggleFavorite(snippet.id) }} className="flex-shrink-0">
                    {snippet.isFavorite ? <Star size={12} className="text-yellow-400 fill-yellow-400" /> : <StarOff size={12} className="text-ide-text-secondary/30" />}
                  </button>
                  <span className="text-xs font-semibold flex-1">{snippet.name}</span>
                  {snippet.prefix && (
                    <span className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-[10px] font-mono text-emerald-400">:{snippet.prefix}</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${langColor}`}>{snippet.language}</span>
                </div>
                <div className="text-[10px] text-ide-text-secondary ml-7 flex items-center gap-2">
                  <span>{snippet.description}</span>
                  <span>•</span>
                  <span>{snippet.usageCount} uses</span>
                  {snippet.tags.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Tag size={8} />
                        {snippet.tags.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-b border-ide-border/30 bg-ide-bg-secondary/10">
                  <div className="px-3 py-1.5 flex items-center gap-1 border-b border-ide-border/20">
                    <button
                      onClick={() => copySnippet(snippet.id, snippet.code)}
                      className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded text-[10px] flex items-center gap-0.5"
                    >
                      {copiedId === snippet.id ? <Check size={8} /> : <Copy size={8} />}
                      {copiedId === snippet.id ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button
                      onClick={() => deleteSnippet(snippet.id)}
                      className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] flex items-center gap-0.5"
                    >
                      <Trash2 size={8} /> Delete
                    </button>
                    <span className="ml-auto text-[9px] text-ide-text-secondary">
                      Created {snippet.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <pre className="px-3 py-2 text-[11px] font-mono text-ide-text overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {snippet.code}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-ide-text-secondary">
            <Code size={32} className="mb-2 opacity-30" />
            <span className="text-xs">No snippets found</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>{filtered.length} snippets shown</span>
        <span>Type <code className="bg-ide-bg-secondary px-1 rounded">:</code> prefix + Tab to insert</span>
      </div>
    </div>
  )
}
