import React, { useState, useEffect } from 'react'
import { gitService, GitFileChange, GitBranch, GitCommit, GitDiff, GitStatus } from '../../services/gitService'
import {
  FaCodeBranch, FaSync, FaPlus, FaMinus, FaCheck, FaTimes,
  FaChevronDown, FaChevronRight, FaCloudUploadAlt, FaCloudDownloadAlt,
  FaTrash
} from '../Icon'

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
      default: return <span className="text-ide-text-dim font-bold">?</span>
    }
  }

  const allFiles = status ? [...status.staged, ...status.unstaged, ...status.untracked.map(f => ({ path: f, status: 'added' as const, staged: false }))] : []

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border brand-line-top">
        <div className="flex items-center gap-2">
          <FaCodeBranch className="w-4 h-4 text-ide-brand-light" />
          <span className="text-sm font-medium">Source Control</span>
          {status && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ide-brand-50 text-ide-brand-light border border-ide-brand-20">
              {status.currentBranch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadGitData} className="p-1.5 rounded hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-brand transition-colors" title="Refresh">
            <FaSync className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-surface-alt text-ide-text-dim hover:text-ide-brand transition-colors">
            <FaTimes className="w-4 h-4" />
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
            className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded-lg text-sm text-ide-text ide-input"
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
            className="px-3 py-1.5 rounded-lg ide-button-primary disabled:opacity-40"
          >
            <FaCodeBranch className="w-4 h-4" />
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
              view === v ? 'text-ide-brand-light tab-active' : 'text-ide-text-dim hover:text-ide-text'
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
              <div className="p-8 text-center text-ide-text-dim text-sm">
                <FaCodeBranch className="w-8 h-8 mx-auto mb-2 opacity-30 text-ide-brand-light" />
                <p>No changes detected</p>
                <p className="text-[10px] mt-1">{status?.currentBranch || 'main'}</p>
              </div>
            ) : (
              allFiles.map((file) => (
                <div key={file.path} className="mb-1">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ide-surface-alt/40 cursor-pointer file-tree-item"
                    onClick={() => toggleFile(file.path)}
                  >
                    {expandedFiles.has(file.path) ?
                      <FaChevronDown className="w-3.5 h-3.5 text-ide-text-dim" /> :
                      <FaChevronRight className="w-3.5 h-3.5 text-ide-text-dim" />
                    }
                    {getStatusIcon(file.status)}
                    <span className="text-sm flex-1 truncate">{file.path}</span>
                    {file.staged && <span className="text-[9px] px-1 rounded-full bg-ide-success/10 text-ide-success border border-ide-success/20">staged</span>}
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded hover:bg-ide-surface-alt" title="Stage" onClick={(e) => { e.stopPropagation(); gitService.stageFiles([file.path]) }}>
                        <FaCheck className="w-3.5 h-3.5 text-ide-success" />
                      </button>
                      <button className="p-1 rounded hover:bg-ide-surface-alt" title="Discard" onClick={(e) => { e.stopPropagation(); gitService.discardFile(file.path) }}>
                        <FaTrash className="w-3.5 h-3.5 text-ide-error" />
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
              <span className="text-xs font-semibold text-ide-text-dim uppercase">Branches</span>
              <button className="flex items-center gap-1 text-xs text-ide-brand-light hover:text-ide-brand transition-colors">
                <FaPlus className="w-3.5 h-3.5" /> New Branch
              </button>
            </div>
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  branch.current
                    ? 'border-ide-brand bg-ide-brand-50 sidebar-item-active'
                    : 'border-ide-border hover:border-ide-brand/50 hover:bg-ide-surface-alt/20'
                }`}
              >
                <FaCodeBranch className={`w-4 h-4 ${branch.current ? 'text-ide-brand-light' : 'text-ide-text-dim'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{branch.name}</div>
                  {(branch.ahead !== undefined || branch.behind !== undefined) && (
                    <div className="text-[10px] text-ide-text-dim">
                      {branch.ahead && branch.ahead > 0 && <span className="text-ide-success">↑{branch.ahead} </span>}
                      {branch.behind && branch.behind > 0 && <span className="text-ide-warning">↓{branch.behind}</span>}
                    </div>
                  )}
                </div>
                {branch.current && (
                  <span className="text-xs text-ide-brand-light bg-ide-brand/10 px-2 py-0.5 rounded-full">current</span>
                )}
                {!branch.current && (
                  <button
                    onClick={() => gitService.switchBranch(branch.name)}
                    className="text-xs text-ide-text-dim hover:text-ide-brand-light transition-colors"
                  >
                    <FaCodeBranch className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="p-3 space-y-3">
            {commits.map((commit) => (
              <div key={commit.hash} className="p-3 bg-ide-bg rounded-lg border border-ide-border hover:border-ide-brand/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-ide-surface-alt flex items-center justify-center flex-shrink-0">
                    <FaCodeBranch className="w-4 h-4 text-ide-brand-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ide-text">{commit.message}</div>
                    <div className="text-xs text-ide-text-dim mt-1">
                      {commit.author} • {commit.date} • <span className="font-mono text-ide-brand-light">{commit.shortHash}</span>
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
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ide-button hover:border-ide-success/50 transition-colors">
          <FaCloudDownloadAlt className="w-4 h-4 text-ide-success" /> Pull
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ide-button hover:border-ide-brand/50 transition-colors">
          <FaCloudUploadAlt className="w-4 h-4 text-ide-brand-light" /> Push
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
    <div className="ml-6 mb-2 bg-ide-bg rounded-lg border border-ide-border overflow-hidden">
      <div className="px-3 py-1.5 text-xs text-ide-text-dim border-b border-ide-border flex items-center gap-3">
        <span className="text-ide-success">+{diff.additions}</span>
        <span className="text-ide-error">-{diff.deletions}</span>
      </div>
      <div className="font-mono text-xs overflow-x-auto max-h-60">
        {diff.hunks.map((hunk, hi) => (
          <div key={hi}>
            <div className="px-3 py-1 bg-ide-surface-alt text-ide-text-dim border-b border-ide-border text-[10px]">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, li) => (
              <div
                key={li}
                className={`px-3 py-0.5 flex ${
                  line.type === 'add'
                    ? 'bg-ide-success/10 text-ide-success'
                    : line.type === 'remove'
                    ? 'bg-ide-error/10 text-ide-error'
                    : 'text-ide-text'
                }`}
              >
                <span className="w-8 text-right text-ide-text-dim mr-3 select-none">
                  {line.oldLine || ''}
                </span>
                <span className="w-8 text-right text-ide-text-dim mr-3 select-none">
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