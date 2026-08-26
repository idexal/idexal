import React, { useState, useEffect, useCallback } from 'react'
import {
  FaCodeBranch, FaPlus, FaMinus, FaSync, FaCheck, FaTimes, FaChevronDown, FaChevronRight, FaFileAlt, FaCode, FaExclamationCircle, FaBolt
} from '../Icon'

interface GitFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

interface GitStagingProps {
  onClose: () => void
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  added: <FaCode className="w-3.5 h-3.5 text-green-400" />,
  modified: <FaCode className="w-3.5 h-3.5 text-yellow-400" />,
  deleted: <FaCode className="w-3.5 h-3.5 text-red-400" />,
  renamed: <FaFileAlt className="w-3.5 h-3.5 text-blue-400" />,
  untracked: <FaPlus className="w-3.5 h-3.5 text-purple-400" />,
}

const STATUS_LABELS: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  untracked: '?',
}

export default function GitStaging({ onClose }: GitStagingProps) {
  const [files, setFiles] = useState<GitFile[]>([])
  const [branch, setBranch] = useState('main')
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [diff, setDiff] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)

  const loadStatus = useCallback(async () => {
    if (!window.electronAPI?.gitStatus) return
    try {
      const result = await window.electronAPI.gitStatus()
      if (result.success && result.status) {
        const parsed = parseGitStatus(result.status)
        setFiles(parsed)
      }
      if (result.branch) setBranch(result.branch)
    } catch {
      // Git not available
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const parseGitStatus = (raw: string): GitFile[] => {
    return raw.split('\n').filter(Boolean).map(line => {
      const indexStatus = line[0]
      const workStatus = line[1]
      const filePath = line.substring(3)

      let status: GitFile['status'] = 'modified'
      if (indexStatus === '?' && workStatus === '?') status = 'untracked'
      else if (indexStatus === 'A' || workStatus === 'A') status = 'added'
      else if (indexStatus === 'D' || workStatus === 'D') status = 'deleted'
      else if (indexStatus === 'R' || workStatus === 'R') status = 'renamed'
      else status = 'modified'

      return {
        path: filePath,
        status,
        staged: indexStatus !== '?' && indexStatus !== ' ' && indexStatus !== '!',
      }
    })
  }

  const toggleStage = async (filePath: string) => {
    const file = files.find(f => f.path === filePath)
    if (!file) return

    if (file.staged) {
      // Unstage
      await window.electronAPI?.gitReset?.([filePath])
    } else {
      // Stage
      await window.electronAPI?.gitAdd?.([filePath])
    }
    loadStatus()
  }

  const stageAll = async () => {
    const unstaged = files.filter(f => !f.staged)
    if (unstaged.length > 0) {
      await window.electronAPI?.gitAdd?.(unstaged.map(f => f.path))
      loadStatus()
    }
  }

  const unstageAll = async () => {
    const staged = files.filter(f => f.staged)
    if (staged.length > 0) {
      await window.electronAPI?.gitReset?.(staged.map(f => f.path))
      loadStatus()
    }
  }

  const commit = async () => {
    if (!commitMessage.trim() || isCommitting) return
    setIsCommitting(true)
    try {
      await window.electronAPI?.gitCommit?.(commitMessage.trim())
      setCommitMessage('')
      loadStatus()
    } catch {
      // Commit failed
    }
    setIsCommitting(false)
  }

  // AI commit message generation
  const generateCommitMessage = async () => {
    if (isGeneratingMessage || stagedFiles.length === 0) return
    setIsGeneratingMessage(true)
    try {
      // Get diff for staged files
      let diffContent = ''
      for (const file of stagedFiles) {
        try {
          const result = await window.electronAPI?.gitDiff?.(undefined, file.path)
          if (result?.diff) diffContent += result.diff + '\n'
        } catch {}
      }

      // Build a prompt for the AI
      const fileList = stagedFiles.map(f => `  ${f.status}: ${f.path}`).join('\n')
      const prompt = `Generate a concise conventional commit message for these changes:

Changed files:
${fileList}

Diff:
\`\`\`
${diffContent.slice(0, 4000)}
\`\`\`

Rules:
- Use conventional commits format (type(scope): description)
- Types: feat, fix, refactor, docs, test, chore, perf
- Keep subject line under 72 characters
- Add body if changes are complex
- Only return the commit message, nothing else`

      // Use the AI streaming service
      const { aiStreamingService } = await import('../../services/aiStreamingService')
      const response = await aiStreamingService.sendMessage(prompt, {
        model: 'default',
        temperature: 0.3,
        maxTokens: 200,
      })

      // Clean up the response - remove markdown code blocks if present
      let message = response.trim()
      message = message.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim()
      // Take only the first few lines (skip any explanations)
      const lines = message.split('\n').filter((l: string) => l.trim())
      setCommitMessage(lines.slice(0, 5).join('\n'))
    } catch {
      setCommitMessage('feat: update changes')
    }
    setIsGeneratingMessage(false)
  }

  const showDiff = async (filePath: string) => {
    if (selectedFile === filePath) {
      setSelectedFile(null)
      setDiff('')
      return
    }
    setSelectedFile(filePath)
    try {
      const result = await window.electronAPI?.gitDiff?.(undefined, filePath)
      if (result?.success && result.diff) {
        setDiff(result.diff)
      }
    } catch {
      setDiff('')
    }
  }

  const stagedFiles = files.filter(f => f.staged)
  const unstagedFiles = files.filter(f => !f.staged)

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCodeBranch className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Git Staging</span>
          <span className="text-xs text-ide-text-muted px-1.5 py-0.5 bg-ide-surface rounded">{branch}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadStatus} className="p-1 rounded hover:bg-ide-border transition-colors" title="Refresh">
            <FaSync className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border transition-colors">
            <FaTimes className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* File Lists */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-ide-text-muted">
            <FaCheck className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">No changes</span>
          </div>
        ) : (
          <>
            {/* Staged Changes */}
            {stagedFiles.length > 0 && (
              <div>
                <button
                  onClick={() => setStagedExpanded(p => !p)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-ide-text-secondary hover:bg-ide-surface"
                >
                  {stagedExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
                  <span className="text-green-400">STAGED</span>
                  <span className="text-ide-text-muted">({stagedFiles.length})</span>
                  <button
                    onClick={e => { e.stopPropagation(); unstageAll() }}
                    className="ml-auto px-1.5 py-0.5 rounded hover:bg-ide-border text-[10px] text-ide-text-muted"
                  >
                    Unstage All
                  </button>
                </button>
                {stagedExpanded && stagedFiles.map(file => (
                  <FileRow key={file.path} file={file} onToggleStage={toggleStage} onSelect={showDiff} isSelected={selectedFile === file.path} />
                ))}
              </div>
            )}

            {/* Unstaged Changes */}
            {unstagedFiles.length > 0 && (
              <div>
                <button
                  onClick={() => setUnstagedExpanded(p => !p)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-ide-text-secondary hover:bg-ide-surface"
                >
                  {unstagedExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
                  <span className="text-yellow-400">CHANGES</span>
                  <span className="text-ide-text-muted">({unstagedFiles.length})</span>
                  <button
                    onClick={e => { e.stopPropagation(); stageAll() }}
                    className="ml-auto px-1.5 py-0.5 rounded hover:bg-ide-border text-[10px] text-ide-text-muted"
                  >
                    Stage All
                  </button>
                </button>
                {unstagedExpanded && unstagedFiles.map(file => (
                  <FileRow key={file.path} file={file} onToggleStage={toggleStage} onSelect={showDiff} isSelected={selectedFile === file.path} />
                ))}
              </div>
            )}

            {/* Diff Preview */}
            {selectedFile && diff && (
              <div className="border-t border-ide-border">
                <div className="px-3 py-1 text-[10px] text-ide-text-muted bg-ide-surface">
                  Diff: {selectedFile}
                </div>
                <pre className="p-3 text-[11px] font-mono text-ide-text overflow-x-auto max-h-48 overflow-y-auto">
                  {diff.split('\n').map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith('+') ? 'text-green-400' :
                        line.startsWith('-') ? 'text-red-400' :
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
          </>
        )}
      </div>

      {/* Commit Box */}
      <div className="border-t border-ide-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <FaExclamationCircle className="w-3.5 h-3.5 text-ide-text-muted flex-shrink-0" />
          <span className="text-[10px] text-ide-text-muted">
            {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} staged
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-1 bg-ide-surface border border-ide-border rounded focus-within:border-ide-accent">
            <input
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit() }}
              placeholder="Commit message..."
              className="flex-1 px-3 py-1.5 bg-transparent text-xs text-ide-text placeholder:text-ide-text-muted/50 outline-none"
            />
            <button
              onClick={generateCommitMessage}
              disabled={isGeneratingMessage || stagedFiles.length === 0}
              className="px-2 py-1.5 text-ide-text-muted hover:text-violet-400 disabled:opacity-30 transition-colors"
              title="Generate commit message with AI"
            >
              {isGeneratingMessage ? (
                <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
              ) : (
                <FaBolt className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <button
            onClick={commit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0 || isCommitting}
            className="px-3 py-1.5 bg-ide-accent text-white rounded text-xs font-medium hover:bg-ide-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FileRow({
  file,
  onToggleStage,
  onSelect,
  isSelected,
}: {
  file: GitFile
  onToggleStage: (path: string) => void
  onSelect: (path: string) => void
  isSelected: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 text-xs cursor-pointer group ${
        isSelected ? 'bg-ide-accent/10' : 'hover:bg-ide-surface'
      }`}
      onClick={() => onSelect(file.path)}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggleStage(file.path) }}
        className="p-0.5 rounded hover:bg-ide-border transition-colors"
        title={file.staged ? 'Unstage' : 'Stage'}
      >
        {file.staged ? (
          <FaMinus className="w-3 h-3 text-red-400" />
        ) : (
          <FaPlus className="w-3 h-3 text-green-400" />
        )}
      </button>
      <span className="text-[10px] font-mono w-4 text-center opacity-60">
        {STATUS_LABELS[file.status]}
      </span>
      {STATUS_ICONS[file.status]}
      <span className="flex-1 truncate text-ide-text font-mono text-[11px]">{file.path}</span>
    </div>
  )
}
