import React, { useState, useEffect, useMemo } from 'react'
import { gitService } from '../../services/gitService'
import {
  FaCode, FaSync, FaTimes, FaChevronDown, FaChevronRight, FaCopy, FaExternalLinkAlt, FaCodeBranch
} from '../Icon'

interface GitLogGraphProps {
  onClose: () => void
}

interface CommitNode {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
  parents: string[]
  branch?: string
  graphColumn: number
  isMerge: boolean
}

// Branch color palette
const BRANCH_COLORS = [
  '#58a6ff', // blue
  '#7ee787', // green
  '#ffa657', // orange
  '#d2a8ff', // purple
  '#ff7b72', // red
  '#79c0ff', // light blue
  '#56d364', // emerald
  '#e3b341', // gold
]

export default function GitLogGraph({ onClose }: GitLogGraphProps) {
  const [commits, setCommits] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [commitDiff, setCommitDiff] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [branchColors, setBranchColors] = useState<Map<string, string>>(new Map())
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadLog()
  }, [])

  const loadLog = async () => {
    setLoading(true)
    try {
      const logResult = await window.electronAPI?.gitLog?.(undefined, showAll ? 100 : 50)
      const branchResult = await window.electronAPI?.gitBranches?.()

      if (logResult?.success && logResult.commits) {
        setCommits(logResult.commits)
      }      if (branchResult?.success && branchResult.branches) {
          const localBranches = branchResult.branches.filter((b: string) => !b.startsWith('remotes/'))
          setBranches(localBranches)
          // Assign colors to branches using the fresh data (not stale state)
          const colorMap = new Map<string, string>()
          localBranches.forEach((b: string, i: number) => {
            colorMap.set(b, BRANCH_COLORS[i % BRANCH_COLORS.length])
          })
          setBranchColors(colorMap)
        }
    } catch {
      // Git not available
    }
    setLoading(false)
  }

  // Build graph nodes with column assignments
  const graphNodes = useMemo(() => {
    const nodes: Array<CommitNode & { graphLine: string[] }> = []
    const activeColumns: string[] = [] // Which commit hash occupies each column

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i]
      const isLast = i === commits.length - 1

      // Find or assign column for this commit
      let column = activeColumns.indexOf(commit.hash)
      if (column === -1) {
        // Find first empty column, or append
        column = activeColumns.indexOf('')
        if (column === -1) {
          column = activeColumns.length
          activeColumns.push('')
        }
      }
      activeColumns[column] = commit.hash

      const isMerge = commit.parents && commit.parents.length > 1
      const graphLine: string[] = []

      // Build the graph line for this commit
      for (let c = 0; c <= Math.max(column, activeColumns.length - 1); c++) {
        if (c === column) {
          graphLine.push(isMerge ? '◆' : '●')
        } else if (activeColumns[c] && activeColumns[c] !== '') {
          graphLine.push('│')
        } else {
          graphLine.push(' ')
        }
      }

      // Draw connections for parents
      if (isMerge && commit.parents.length > 1) {
        // Add merge line indicator
        for (let c = column + 1; c < activeColumns.length; c++) {
          if (activeColumns[c] && activeColumns[c] !== '') {
            graphLine.push('┐')
            break
          }
        }
      }

      nodes.push({
        hash: commit.hash,
        shortHash: commit.hash?.substring(0, 7) || '',
        message: commit.message,
        author: commit.author,
        date: commit.date,
        parents: commit.parents || [],
        graphColumn: column,
        isMerge,
        graphLine,
      })

      // Mark this column as available for next commit (remove if this is the last in the line)
      if (isLast || (commit.parents && commit.parents.length > 0 && i + 1 < commits.length)) {
        // Keep column open for parent connections
        activeColumns[column] = commit.parents?.[0] || ''
      } else {
        activeColumns[column] = ''
      }
    }

    return nodes
  }, [commits, branches])

  const showDiff = async (hash: string) => {
    if (expandedCommit === hash) {
      setExpandedCommit(null)
      setCommitDiff('')
      return
    }
    setExpandedCommit(hash)
    try {
      const result = await window.electronAPI?.gitDiff?.()
      setCommitDiff(result?.diff || '')
    } catch {
      setCommitDiff('')
    }
  }

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCodeBranch className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Git Log</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ide-surface rounded text-ide-text-muted">
            {commits.length} commits
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAll(p => !p)}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              showAll ? 'bg-ide-accent/20 text-ide-accent border-ide-accent/30' : 'text-ide-text-muted border-ide-border'
            }`}
          >
            {showAll ? 'Showing 100' : 'Last 50'}
          </button>
          <button onClick={loadLog} className="p-1 rounded hover:bg-ide-border" title="Refresh">
            <FaSync className={`w-3.5 h-3.5 text-ide-text-muted ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Branch chips */}
      {branches.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-ide-border overflow-x-auto">
          {branches.slice(0, 6).map(branch => (
            <span
              key={branch}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-ide-border whitespace-nowrap"
              style={{ borderColor: branchColors.get(branch) || '#30363d' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: branchColors.get(branch) || '#58a6ff' }} />
              {branch}
            </span>
          ))}
        </div>
      )}

      {/* Commit Graph */}
      <div className="flex-1 overflow-y-auto font-mono">
        {graphNodes.map((node, i) => (
          <div key={node.hash}>
            {/* Commit row */}
            <div
              className={`flex items-start px-3 py-2 hover:bg-ide-surface/50 cursor-pointer group transition-colors ${
                selectedCommit === node.hash ? 'bg-ide-accent/10' : ''
              }`}
              onClick={() => { setSelectedCommit(node.hash); showDiff(node.hash) }}
            >
              {/* Graph */}
              <div className="flex items-center gap-0 mr-3 flex-shrink-0 select-none" style={{ minWidth: '80px' }}>
                {node.graphLine.map((char, ci) => {
                  const color = branchColors.get(branches[ci] || '') || BRANCH_COLORS[ci % BRANCH_COLORS.length]
                  const isNode = char === '●' || char === '◆'
                  return (
                    <span
                      key={ci}
                      className={`text-sm leading-none ${isNode ? 'font-bold' : ''}`}
                      style={{ color: isNode ? color : '#30363d', width: '12px', textAlign: 'center' }}
                    >
                      {char}
                    </span>
                  )
                })}
              </div>

              {/* Commit info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ide-text leading-tight line-clamp-1">{node.message}</span>
                  {node.isMerge && (
                    <span className="text-[9px] px-1 py-0.5 bg-purple-500/20 text-purple-400 rounded">merge</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-ide-text-muted">{node.author}</span>
                  <span className="text-[10px] text-ide-text-muted/50">•</span>
                  <span className="text-[10px] text-ide-text-muted">{formatDate(node.date)}</span>
                  <span className="text-[10px] text-ide-text-muted/50">•</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyHash(node.hash) }}
                    className="text-[10px] font-mono text-ide-accent/60 hover:text-ide-accent transition-colors"
                    title="Copy full hash"
                  >
                    {node.shortHash}
                  </button>
                </div>
              </div>

              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); copyHash(node.hash) }}
                  className="p-1 rounded hover:bg-ide-border"
                  title="Copy hash"
                >
                  <FaCopy className="w-3 h-3 text-ide-text-muted" />
                </button>
              </div>
            </div>

            {/* Expanded diff */}
            {expandedCommit === node.hash && commitDiff && (
              <div className="mx-3 mb-2 bg-ide-surface rounded border border-ide-border overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] text-ide-text-muted border-b border-ide-border flex items-center justify-between">
                  <span>Changes</span>
                  <span className="font-mono">{node.shortHash}</span>
                </div>
                <pre className="p-3 text-[11px] font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {commitDiff.split('\n').map((line, li) => (
                    <div
                      key={li}
                      className={
                        line.startsWith('+') && !line.startsWith('+++') ? 'text-green-400' :
                        line.startsWith('-') && !line.startsWith('---') ? 'text-red-400' :
                        line.startsWith('@@') ? 'text-cyan-400' :
                        'text-ide-text-muted'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>
        ))}

        {graphNodes.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-ide-text-muted">
            <FaCodeBranch className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">No commits found</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 border-t border-ide-border flex items-center gap-4 text-[9px] text-ide-text-muted">
        <span className="flex items-center gap-1"><span className="text-blue-400">●</span> commit</span>
        <span className="flex items-center gap-1"><span className="text-purple-400">◆</span> merge</span>
        <span className="flex items-center gap-1"><span className="text-ide-border">│</span> branch line</span>
      </div>
    </div>
  )
}
