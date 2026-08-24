import React, { useState, useEffect } from 'react'
import { gitService, GitFileChange, GitBranch, GitCommit, GitDiff, GitStatus } from '../../services/gitService'
import {
  GitBranch as GitBranchIcon, GitCommit as GitCommitIcon, RefreshCw,
  Plus, Minus, Check, X, ChevronDown, ChevronRight, Upload, Download,
  Trash2, GitMerge
} from 'lucide-react'

interface GitPanelProps {
  onClose: () => void
}

type GitView = 'changes' | 'branches' | 'history'

export default function GitPanel({ onClose }: GitPanelProps) {
  const [view, setView] = useState<GitView>('changes')
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [commitMessage, setCommitMessage] = useState('')
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadGitData()
  }, [])

  const loadGitData = async () => {
    const [s, b, c] = await Promise.all([
      gitService.getStatus(),
      gitService.getBranches(),
      gitService.getLog(),
    ])
    setStatus(s)
    setBranches(b)
    setCommits(c)
  }

  const toggleFile = (path: string) => {
    const next = new Set(expandedFiles)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setExpandedFiles(next)
  }

  const getStatusIcon = (status: GitFileChange['status']) => {
    switch (status) {
      case 'added': return <span className="text-ide-success font-bold">A</span>
      case 'modified': return <span className="text-ide-warning font-bold">M</span>
      case 'deleted': return <span className="text-ide-error font-bold">D</span>
      case 'renamed': return <span className="text-ide-accent font-bold">R</span>
      default: return <span className="text-ide-text-muted font-bold">?</span>
    }
  }

  const allFiles = status ? [...status.staged, ...status.unstaged, ...status.untracked.map(f => ({ path: f, status: 'added' as const, staged: false }))] : []

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <GitBranchIcon className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Source Control</span>
          {status && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-ide-bg text-ide-text-muted">
              {status.currentBranch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadGitData} className="p-1.5 rounded hover:bg-ide-border" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border">
            <X className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Commit Input */}
      <div className="p-3 border-b border-ide-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
          <button
            onClick={async () => {
              if (commitMessage.trim()) {
                await gitService.commit(commitMessage)
                setCommitMessage('')
                loadGitData()
              }
            }}
            disabled={!commitMessage.trim()}
            className="px-3 py-1.5 rounded bg-ide-accent text-white text-sm hover:bg-ide-accent/80 disabled:opacity-40"
          >
            <GitCommitIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-ide-border">
        {(['changes', 'branches', 'history'] as GitView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              view === v ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'changes' && (
          <div className="p-2">
            {allFiles.length === 0 ? (
              <div className="p-8 text-center text-ide-text-muted text-sm">
                <GitBranchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No changes detected</p>
                <p className="text-[10px] mt-1">{status?.currentBranch || 'main'}</p>
              </div>
            ) : (
              allFiles.map((file) => (
                <div key={file.path} className="mb-1">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-border/50 cursor-pointer"
                    onClick={() => toggleFile(file.path)}
                  >
                    {expandedFiles.has(file.path) ?
                      <ChevronDown className="w-3.5 h-3.5 text-ide-text-muted" /> :
                      <ChevronRight className="w-3.5 h-3.5 text-ide-text-muted" />
                    }
                    {getStatusIcon(file.status)}
                    <span className="text-sm flex-1 truncate">{file.path}</span>
                    {file.staged && <span className="text-[9px] px-1 rounded bg-green-500/10 text-green-400">staged</span>}
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded hover:bg-ide-border" title="Stage" onClick={(e) => { e.stopPropagation(); gitService.stageFiles([file.path]) }}>
                        <Check className="w-3.5 h-3.5 text-ide-success" />
                      </button>
                      <button className="p-1 rounded hover:bg-ide-border" title="Discard" onClick={(e) => { e.stopPropagation(); gitService.discardFile(file.path) }}>
                        <Trash2 className="w-3.5 h-3.5 text-ide-error" />
                      </button>
                    </div>
                  </div>
                  {expandedFiles.has(file.path) && (
                    <DiffView filePath={file.path} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {view === 'branches' && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-ide-text-muted uppercase">Branches</span>
              <button className="flex items-center gap-1 text-xs text-ide-accent hover:text-ide-accent/80">
                <Plus className="w-3.5 h-3.5" /> New Branch
              </button>
            </div>
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  branch.current
                    ? 'border-ide-accent bg-ide-accent/10'
                    : 'border-ide-border hover:border-ide-accent/50'
                }`}
              >
                <GitBranchIcon className={`w-4 h-4 ${branch.current ? 'text-ide-accent' : 'text-ide-text-muted'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{branch.name}</div>
                  {(branch.ahead !== undefined || branch.behind !== undefined) && (
                    <div className="text-[10px] text-ide-text-muted">
                      {branch.ahead && branch.ahead > 0 && <span className="text-green-400">↑{branch.ahead} </span>}
                      {branch.behind && branch.behind > 0 && <span className="text-yellow-400">↓{branch.behind}</span>}
                    </div>
                  )}
                </div>
                {branch.current && (
                  <span className="text-xs text-ide-accent bg-ide-accent/10 px-2 py-0.5 rounded">current</span>
                )}
                {!branch.current && (
                  <button
                    onClick={() => gitService.switchBranch(branch.name)}
                    className="text-xs text-ide-text-muted hover:text-ide-accent"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="p-3 space-y-3">
            {commits.map((commit) => (
              <div key={commit.hash} className="p-3 bg-ide-bg rounded-lg border border-ide-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-ide-surface flex items-center justify-center flex-shrink-0">
                    <GitCommitIcon className="w-4 h-4 text-ide-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ide-text">{commit.message}</div>
                    <div className="text-xs text-ide-text-muted mt-1">
                      {commit.author} • {commit.date} • <span className="font-mono">{commit.shortHash}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-ide-border flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-ide-bg border border-ide-border text-sm hover:border-ide-accent transition-colors">
          <Download className="w-4 h-4" /> Pull
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-ide-bg border border-ide-border text-sm hover:border-ide-accent transition-colors">
          <Upload className="w-4 h-4" /> Push
        </button>
      </div>
    </div>
  )
}

function DiffView({ filePath }: { filePath: string }) {
  const [diff, setDiff] = useState<GitDiff | null>(null)

  useEffect(() => {
    gitService.getDiff(filePath).then((diffs) => {
      setDiff(diffs[0] || null)
    })
  }, [filePath])

  if (!diff) return null

  return (
    <div className="ml-6 mb-2 bg-ide-bg rounded border border-ide-border overflow-hidden">
      <div className="px-3 py-1.5 text-xs text-ide-text-muted border-b border-ide-border flex items-center gap-3">
        <span className="text-ide-success">+{diff.additions}</span>
        <span className="text-ide-error">-{diff.deletions}</span>
      </div>
      <div className="font-mono text-xs overflow-x-auto max-h-60">
        {diff.hunks.map((hunk, hi) => (
          <div key={hi}>
            <div className="px-3 py-1 bg-ide-surface text-ide-text-muted border-b border-ide-border text-[10px]">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, li) => (
              <div
                key={li}
                className={`px-3 py-0.5 flex ${
                  line.type === 'add'
                    ? 'bg-green-900/20 text-green-300'
                    : line.type === 'remove'
                    ? 'bg-red-900/20 text-red-300'
                    : 'text-ide-text'
                }`}
              >
                <span className="w-8 text-right text-ide-text-muted mr-3 select-none">
                  {line.oldLine || ''}
                </span>
                <span className="w-8 text-right text-ide-text-muted mr-3 select-none">
                  {line.newLine || ''}
                </span>
                <span className="mr-2 select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <span className="flex-1">{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
