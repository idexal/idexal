import React, { useState, useMemo } from 'react'
import {
  GitBranch, Search, ChevronDown, ChevronRight, Copy, Check,
  Clock, User, Tag, Hash, MessageSquare, FileText, Eye,
  ArrowRight, RotateCcw, GitCommit, Shield
} from 'lucide-react'

interface Commit {
  hash: string
  shortHash: string
  author: string
  authorEmail: string
  date: Date
  message: string
  branch: string
  tags: string[]
  filesChanged: number
  additions: number
  deletions: number
  parents: string[]
  verified: boolean
}

const AUTHOR_COLORS: Record<string, string> = {
  'Ahmed Hassan': '#3b82f6',
  'Sara Khan': '#22c55e',
  'Omar Ali': '#a855f7',
  'Fatima Zayed': '#f59e0b',
  'Yusuf Dev': '#06b6d4',
  'AI Agent': '#ec4899',
}

const MOCK_COMMITS: Commit[] = [
  { hash: 'a1b2c3d4e5f6', shortHash: 'a1b2c3d', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 3600000), message: 'feat: implement AI provider system with all major providers', branch: 'feature/ai-providers', tags: ['v1.2.0'], filesChanged: 12, additions: 847, deletions: 23, parents: ['b2c3d4e5f6a1'], verified: true },
  { hash: 'b2c3d4e5f6a1', shortHash: 'b2c3d4e', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 7200000), message: 'refactor: restructure settings store for multi-provider support', branch: 'feature/ai-providers', tags: [], filesChanged: 5, additions: 156, deletions: 89, parents: ['c3d4e5f6a1b2'], verified: true },
  { hash: 'c3d4e5f6a1b2', shortHash: 'c3d4e5f', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 14400000), message: 'feat: add schema visualizer with interactive ER diagrams', branch: 'main', tags: [], filesChanged: 3, additions: 423, deletions: 0, parents: ['d4e5f6a1b2c3'], verified: false },
  { hash: 'd4e5f6a1b2c3', shortHash: 'd4e5f6a', author: 'Fatima Zayed', authorEmail: 'fatima@idexal.dev', date: new Date(Date.now() - 28800000), message: 'feat: add process manager with live CPU/memory monitoring', branch: 'main', tags: [], filesChanged: 2, additions: 312, deletions: 0, parents: ['e5f6a1b2c3d4'], verified: true },
  { hash: 'e5f6a1b2c3d4', shortHash: 'e5f6a1b', author: 'Yusuf Dev', authorEmail: 'yusuf@idexal.dev', date: new Date(Date.now() - 43200000), message: 'feat: implement diff viewer with split and unified views', branch: 'main', tags: [], filesChanged: 4, additions: 287, deletions: 12, parents: ['f6a1b2c3d4e5'], verified: true },
  { hash: 'f6a1b2c3d4e5', shortHash: 'f6a1b2c', author: 'AI Agent', authorEmail: 'agent@idexal.dev', date: new Date(Date.now() - 57600000), message: 'fix: resolve TypeScript errors in provider service', branch: 'main', tags: [], filesChanged: 2, additions: 15, deletions: 8, parents: ['a1b2c3d4e5f7'], verified: true },
  { hash: 'a1b2c3d4e5f7', shortHash: 'a1b2c3d', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 72000000), message: 'feat: add keyboard shortcuts cheat sheet panel', branch: 'main', tags: [], filesChanged: 1, additions: 198, deletions: 0, parents: ['b2c3d4e5f6a2'], verified: true },
  { hash: 'b2c3d4e5f6a2', shortHash: 'b2c3d4e', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 86400000), message: 'feat: add SSL certificate manager with renewal tracking', branch: 'main', tags: ['v1.1.0'], filesChanged: 3, additions: 234, deletions: 0, parents: ['c3d4e5f6a1b3'], verified: true },
  { hash: 'c3d4e5f6a1b3', shortHash: 'c3d4e5f', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 100800000), message: 'feat: add database backup manager with scheduling', branch: 'main', tags: [], filesChanged: 2, additions: 312, deletions: 0, parents: ['d4e5f6a1b2c4'], verified: false },
  { hash: 'd4e5f6a1b2c4', shortHash: 'd4e5f6a', author: 'Fatima Zayed', authorEmail: 'fatima@idexal.dev', date: new Date(Date.now() - 115200000), message: 'feat: add call hierarchy panel for code navigation', branch: 'main', tags: [], filesChanged: 1, additions: 186, deletions: 0, parents: ['e5f6a1b2c3d5'], verified: true },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  return `${hours}h ago`
}

export default function GitHistoryPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [branchFilter, setBranchFilter] = useState<string | null>(null)

  const branches = useMemo(() => [...new Set(MOCK_COMMITS.map(c => c.branch))], [])

  const filtered = useMemo(() => {
    let list = [...MOCK_COMMITS]
    if (branchFilter) list = list.filter(c => c.branch === branchFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.message.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.shortHash.includes(q) ||
        c.tags.some(t => t.includes(q))
      )
    }
    return list
  }, [searchQuery, branchFilter])

  const selected = MOCK_COMMITS.find(c => c.hash === selectedCommit)

  const copyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-orange-400" />
          <span className="text-sm font-semibold">Git History</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            {MOCK_COMMITS.length} commits
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Branch Filter */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
        <button
          onClick={() => setBranchFilter(null)}
          className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 ${
            !branchFilter ? 'bg-orange-500/20 text-orange-400' : 'text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          All Branches
        </button>
        {branches.map(b => (
          <button
            key={b}
            onClick={() => setBranchFilter(branchFilter === b ? null : b)}
            className={`px-2 py-0.5 rounded text-[10px] flex-shrink-0 flex items-center gap-0.5 ${
              branchFilter === b ? 'bg-orange-500/20 text-orange-400' : 'text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <GitBranch size={8} /> {b}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-ide-border">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search commits..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
      </div>

      {/* Commit List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((commit, idx) => {
          const isSelected = selectedCommit === commit.hash
          const authorColor = AUTHOR_COLORS[commit.author] || '#6b7280'
          return (
            <div key={commit.hash + idx}>
              <div
                onClick={() => setSelectedCommit(isSelected ? null : commit.hash)}
                className={`px-3 py-2 border-b border-ide-border/30 cursor-pointer ${
                  isSelected ? 'bg-orange-500/10' : 'hover:bg-ide-bg-secondary/10'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Graph */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div
                      className="w-3 h-3 rounded-full border-2"
                      style={{ borderColor: authorColor, backgroundColor: commit.tags.length ? authorColor : 'transparent' }}
                    />
                    {idx < filtered.length - 1 && (
                      <div className="w-0.5 h-4" style={{ backgroundColor: `${authorColor}40` }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      {commit.verified && <Shield size={10} className="text-green-400 flex-shrink-0" />}
                      <span className="text-xs font-semibold truncate">{commit.message}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ide-text-secondary">
                      <span className="flex items-center gap-0.5">
                        <User size={8} style={{ color: authorColor }} />
                        <span style={{ color: authorColor }}>{commit.author}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={8} /> {timeAgo(commit.date)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); copyHash(commit.hash) }}
                        className="flex items-center gap-0.5 font-mono hover:text-ide-text"
                      >
                        <Hash size={8} /> {commit.shortHash}
                        {copiedHash === commit.hash && <Check size={8} className="text-green-400" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                      <span className="text-ide-text-secondary">{commit.filesChanged} files</span>
                      <span className="text-green-400">+{commit.additions}</span>
                      <span className="text-red-400">-{commit.deletions}</span>
                      {commit.tags.map(tag => (
                        <span key={tag} className="px-1 py-0 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-0.5">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                      <span className="px-1 py-0 bg-ide-bg-secondary rounded text-ide-text-secondary">{commit.branch}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isSelected && (
                <div className="px-6 pb-3 bg-ide-bg-secondary/10 border-b border-ide-border/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-ide-text-secondary">Author:</span> {commit.author}</div>
                    <div><span className="text-ide-text-secondary">Email:</span> {commit.authorEmail}</div>
                    <div><span className="text-ide-text-secondary">Date:</span> {commit.date.toLocaleString()}</div>
                    <div><span className="text-ide-text-secondary">Branch:</span> {commit.branch}</div>
                    <div className="col-span-2"><span className="text-ide-text-secondary">Hash:</span> <span className="font-mono">{commit.hash}</span></div>
                  </div>
                  <div className="flex gap-1">
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                      <Eye size={8} /> View Files
                    </button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                      <RotateCcw size={8} /> Revert
                    </button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                      <ArrowRight size={8} /> Cherry-pick
                    </button>
                    <button
                      onClick={() => copyHash(commit.hash)}
                      className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5"
                    >
                      <Copy size={8} /> Copy Hash
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>{filtered.length} commits shown</span>
        <span>{branches.length} branches</span>
      </div>
    </div>
  )
}
