import React, { useState, useMemo } from 'react'
import {
  FaCodeBranch, FaUser, FaCalendar, FaCopy, FaCheck, FaSearch, FaChevronDown, FaChevronRight, FaHashtag, FaFileAlt, FaEye, FaClock, FaSync, FaExternalLinkAlt
} from '../Icon'

interface BlameLine {
  lineNumber: number
  content: string
  commitHash: string
  author: string
  authorEmail: string
  date: Date
  message: string
  isLatest: boolean
}

interface CommitSummary {
  hash: string
  shortHash: string
  author: string
  date: Date
  message: string
  linesCount: number
}

const COLORS = [
  'bg-blue-500/10', 'bg-green-500/10', 'bg-purple-500/10',
  'bg-yellow-500/10', 'bg-red-500/10', 'bg-cyan-500/10',
  'bg-pink-500/10', 'bg-orange-500/10'
]

const AUTHOR_COLORS: Record<string, string> = {
  'Ahmed Hassan': 'text-blue-400',
  'Sara Khan': 'text-green-400',
  'Omar Ali': 'text-purple-400',
  'Fatima Zayed': 'text-yellow-400',
  'Yusuf Dev': 'text-cyan-400',
  'AI Agent': 'text-pink-400',
}

const MOCK_BLAME_LINES: BlameLine[] = [
  { lineNumber: 1, content: 'import React, { useState, useEffect } from "react"', commitHash: 'a1b2c3d', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 86400000), message: 'feat: initialize React app with hooks', isLatest: true },
  { lineNumber: 2, content: 'import { ThemeProvider } from "./theme"', commitHash: 'a1b2c3d', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 86400000), message: 'feat: initialize React app with hooks', isLatest: false },
  { lineNumber: 3, content: '', commitHash: 'e5f6g7h', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 172800000), message: 'chore: clean up imports', isLatest: false },
  { lineNumber: 4, content: 'interface AppConfig {', commitHash: 'i9j0k1l', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 259200000), message: 'feat: add TypeScript config types', isLatest: true },
  { lineNumber: 5, content: '  apiUrl: string', commitHash: 'i9j0k1l', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 259200000), message: 'feat: add TypeScript config types', isLatest: false },
  { lineNumber: 6, content: '  debug: boolean', commitHash: 'i9j0k1l', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 259200000), message: 'feat: add TypeScript config types', isLatest: false },
  { lineNumber: 7, content: '  maxRetries: number', commitHash: 'm3n4o5p', author: 'Fatima Zayed', authorEmail: 'fatima@idexal.dev', date: new Date(Date.now() - 345600000), message: 'fix: add retry configuration', isLatest: true },
  { lineNumber: 8, content: '}', commitHash: 'i9j0k1l', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 259200000), message: 'feat: add TypeScript config types', isLatest: false },
  { lineNumber: 9, content: '', commitHash: 'e5f6g7h', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 172800000), message: 'chore: clean up imports', isLatest: false },
  { lineNumber: 10, content: 'function App() {', commitHash: 'q6r7s8t', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 432000000), message: 'feat: main App component', isLatest: true },
  { lineNumber: 11, content: '  const [config, setConfig] = useState<AppConfig | null>(null)', commitHash: 'u9v0w1x', author: 'Yusuf Dev', authorEmail: 'yusuf@idexal.dev', date: new Date(Date.now() - 518400000), message: 'feat: add state management', isLatest: false },
  { lineNumber: 12, content: '  const [loading, setLoading] = useState(true)', commitHash: 'u9v0w1x', author: 'Yusuf Dev', authorEmail: 'yusuf@idexal.dev', date: new Date(Date.now() - 518400000), message: 'feat: add state management', isLatest: false },
  { lineNumber: 13, content: '', commitHash: 'y2z3a4b', author: 'AI Agent', authorEmail: 'agent@idexal.dev', date: new Date(Date.now() - 86400000), message: 'refactor: add loading state', isLatest: true },
  { lineNumber: 14, content: '  useEffect(() => {', commitHash: 'c5d6e7f', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 604800000), message: 'feat: fetch config on mount', isLatest: false },
  { lineNumber: 15, content: '    fetchConfig().then(setConfig).finally(() => setLoading(false))', commitHash: 'c5d6e7f', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 604800000), message: 'feat: fetch config on mount', isLatest: true },
  { lineNumber: 16, content: '  }, [])', commitHash: 'c5d6e7f', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 604800000), message: 'feat: fetch config on mount', isLatest: false },
  { lineNumber: 17, content: '', commitHash: 'g8h9i0j', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 691200000), message: 'feat: add error boundary', isLatest: false },
  { lineNumber: 18, content: '  if (loading) return <Spinner />', commitHash: 'k1l2m3n', author: 'Fatima Zayed', authorEmail: 'fatima@idexal.dev', date: new Date(Date.now() - 777600000), message: 'feat: add loading spinner', isLatest: true },
  { lineNumber: 19, content: '', commitHash: 'g8h9i0j', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 691200000), message: 'feat: add error boundary', isLatest: false },
  { lineNumber: 20, content: '  return (', commitHash: 'q6r7s8t', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 432000000), message: 'feat: main App component', isLatest: false },
  { lineNumber: 21, content: '    <ThemeProvider>', commitHash: 'o4p5q6r', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 864000000), message: 'feat: add theme provider wrapper', isLatest: true },
  { lineNumber: 22, content: '      <ErrorBoundary>', commitHash: 'g8h9i0j', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 691200000), message: 'feat: add error boundary', isLatest: true },
  { lineNumber: 23, content: '        <MainLayout config={config!} />', commitHash: 's7t8u9v', author: 'Yusuf Dev', authorEmail: 'yusuf@idexal.dev', date: new Date(Date.now() - 950400000), message: 'feat: main layout with config prop', isLatest: false },
  { lineNumber: 24, content: '      </ErrorBoundary>', commitHash: 'g8h9i0j', author: 'Sara Khan', authorEmail: 'sara@idexal.dev', date: new Date(Date.now() - 691200000), message: 'feat: add error boundary', isLatest: false },
  { lineNumber: 25, content: '    </ThemeProvider>', commitHash: 'o4p5q6r', author: 'Omar Ali', authorEmail: 'omar@idexal.dev', date: new Date(Date.now() - 864000000), message: 'feat: add theme provider wrapper', isLatest: false },
  { lineNumber: 26, content: '  )', commitHash: 'q6r7s8t', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 432000000), message: 'feat: main App component', isLatest: false },
  { lineNumber: 27, content: '}', commitHash: 'q6r7s8t', author: 'Ahmed Hassan', authorEmail: 'ahmed@idexal.dev', date: new Date(Date.now() - 432000000), message: 'feat: main App component', isLatest: false },
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

export default function GitBlamePanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLine, setSelectedLine] = useState<BlameLine | null>(null)
  const [showCommitDetails, setShowCommitDetails] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [file] = useState('src/App.tsx')

  const commitSummaries = useMemo(() => {
    const map = new Map<string, CommitSummary>()
    MOCK_BLAME_LINES.forEach(line => {
      if (!map.has(line.commitHash)) {
        map.set(line.commitHash, {
          hash: line.commitHash,
          shortHash: line.commitHash.substring(0, 7),
          author: line.author,
          date: line.date,
          message: line.message,
          linesCount: 0,
        })
      }
      map.get(line.commitHash)!.linesCount++
    })
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [])

  const filteredLines = useMemo(() => {
    if (!searchQuery) return MOCK_BLAME_LINES
    const q = searchQuery.toLowerCase()
    return MOCK_BLAME_LINES.filter(l =>
      l.content.toLowerCase().includes(q) ||
      l.author.toLowerCase().includes(q) ||
      l.commitHash.includes(q) ||
      l.message.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const getAuthorColor = (author: string) => AUTHOR_COLORS[author] || 'text-gray-400'

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
          <FaCodeBranch size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold">Git Blame</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><FaSync size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* File Info */}
      <div className="px-3 py-1.5 bg-ide-bg-secondary/30 border-b border-ide-border flex items-center gap-2">
        <FaFileAlt size={12} className="text-ide-text-secondary" />
        <span className="text-xs font-mono text-ide-text-secondary">{file}</span>
        <span className="text-[10px] text-ide-text-secondary ml-auto">{commitSummaries.length} commits, {MOCK_BLAME_LINES.length} lines</span>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-ide-border">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1">
          <FaSearch size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search blame..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
          {searchQuery && (
            <span className="text-[10px] text-ide-text-secondary">{filteredLines.length} matches</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        <button className="flex-1 px-3 py-1.5 text-xs border-b-2 border-yellow-400 text-yellow-400">
          Blame View
        </button>
        <button className="flex-1 px-3 py-1.5 text-xs border-b-2 border-transparent text-ide-text-secondary hover:text-ide-text">
          Commits ({commitSummaries.length})
        </button>
      </div>

      {/* Blame Content */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px]">
        {filteredLines.map((line, idx) => {
          const authorColor = getAuthorColor(line.author)
          const isExpanded = showCommitDetails === `${line.lineNumber}`
          return (
            <div key={line.lineNumber}>
              <div
                className={`flex items-stretch border-b border-ide-border/20 hover:bg-ide-bg-secondary/20 cursor-pointer ${
                  selectedLine?.lineNumber === line.lineNumber ? 'bg-yellow-500/10' : ''
                } ${COLORS[idx % COLORS.length]}`}
                onClick={() => {
                  setSelectedLine(line)
                  setShowCommitDetails(isExpanded ? null : `${line.lineNumber}`)
                }}
              >
                {/* Line number */}
                <div className="w-8 text-right pr-1 py-0.5 text-ide-text-secondary/50 select-none border-r border-ide-border/20">
                  {line.lineNumber}
                </div>

                {/* Commit hash */}
                <div className="w-16 flex items-center px-1 py-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); copyHash(line.commitHash) }}
                    className={`text-[10px] font-mono ${authorColor} hover:underline flex items-center gap-0.5`}
                    title={line.commitHash}
                  >
                    <FaHashtag size={8} />
                    {line.commitHash.substring(0, 7)}
                    {copiedHash === line.commitHash ? <FaCheck size={8} className="text-green-400" /> : null}
                  </button>
                </div>

                {/* Author */}
                <div className={`w-28 flex items-center px-1 py-0.5 text-[10px] truncate ${authorColor}`}>
                  <FaUser size={8} className="mr-0.5 flex-shrink-0" />
                  {line.author}
                </div>

                {/* Date */}
                <div className="w-14 flex items-center px-1 py-0.5 text-[10px] text-ide-text-secondary">
                  <FaClock size={8} className="mr-0.5 flex-shrink-0" />
                  {timeAgo(line.date)}
                </div>

                {/* FaCode */}
                <div className="flex-1 px-2 py-0.5 overflow-x-auto whitespace-pre text-ide-text">
                  {line.content || ' '}
                </div>
              </div>

              {/* Expanded commit details */}
              {isExpanded && (
                <div className="px-4 py-2 bg-ide-bg-secondary/20 border-b border-ide-border/30 ml-8">
                  <div className="text-[10px] space-y-1">
                    <div className="flex items-center gap-2">
                      <FaCodeBranch size={10} className="text-yellow-400" />
                      <span className="font-semibold">{line.message}</span>
                    </div>
                    <div className="flex items-center gap-4 text-ide-text-secondary">
                      <span className="flex items-center gap-1"><FaUser size={8} /> {line.author} &lt;{line.authorEmail}&gt;</span>
                      <span className="flex items-center gap-1"><FaCalendar size={8} /> {line.date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                        <FaExternalLinkAlt size={8} /> View Commit
                      </button>
                      <button
                        onClick={() => copyHash(line.commitHash)}
                        className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5"
                      >
                        <FaCopy size={8} /> Copy Hash
                      </button>
                      <span className="text-[10px] text-ide-text-secondary">
                        {line.isLatest ? 'Latest commit' : 'Not the latest'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-secondary">
        <span>{commitSummaries.length} commits by {new Set(MOCK_BLAME_LINES.map(l => l.author)).size} authors</span>
        <span>{filteredLines.length} lines shown</span>
      </div>
    </div>
  )
}
