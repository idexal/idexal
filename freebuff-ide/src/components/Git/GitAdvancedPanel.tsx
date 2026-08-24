import React, { useState, useMemo } from 'react'
import {
  GitBranch, GitCommit, GitMerge, GitPullRequest, Archive,
  Cherry, RotateCcw, ArrowUpDown, History, ChevronDown, ChevronRight,
  Plus, Minus, Check, X, Loader2, AlertCircle, Tag
} from 'lucide-react'

interface GitStash {
  id: string
  branch: string
  message: string
  timestamp: Date
  files: string[]
}

interface GitRebaseStep {
  hash: string
  message: string
  action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'
}

interface GitReflog {
  hash: string
  action: string
  ref: string
  timestamp: Date
}

const MOCK_STASHES: GitStash[] = [
  { id: 'stash@{0}', branch: 'feature/api', message: 'WIP: add user authentication', timestamp: new Date(Date.now() - 1800000), files: ['src/auth.ts', 'src/routes.ts'] },
  { id: 'stash@{1}', branch: 'main', message: 'Stash before merge', timestamp: new Date(Date.now() - 86400000), files: ['package.json', 'src/App.tsx'] },
  { id: 'stash@{2}', branch: 'fix/bug-123', message: 'Temp save: debug console logs', timestamp: new Date(Date.now() - 172800000), files: ['src/utils.ts'] },
]

const MOCK_REBASE_STEPS: GitRebaseStep[] = [
  { hash: 'a1b2c3d', message: 'feat: add user model', action: 'pick' },
  { hash: 'e4f5g6h', message: 'feat: add auth middleware', action: 'pick' },
  { hash: 'i7j8k9l', message: 'fix: typo in auth handler', action: 'squash' },
  { hash: 'm0n1o2p', message: 'test: add auth tests', action: 'pick' },
  { hash: 'q3r4s5t', message: 'docs: update README', action: 'pick' },
]

const MOCK_REFLOG: GitReflog[] = [
  { hash: 'a1b2c3d', action: 'commit', ref: 'HEAD', timestamp: new Date(Date.now() - 300000) },
  { hash: 'e4f5g6h', action: 'checkout', ref: 'feature/api', timestamp: new Date(Date.now() - 600000) },
  { hash: 'i7j8k9l', action: 'merge', ref: 'main', timestamp: new Date(Date.now() - 1200000) },
  { hash: 'm0n1o2p', action: 'reset', ref: 'HEAD~1', timestamp: new Date(Date.now() - 2400000) },
  { hash: 'q3r4s5t', action: 'commit', ref: 'HEAD', timestamp: new Date(Date.now() - 3600000) },
  { hash: 'u6v7w8x', action: 'rebase', ref: 'main', timestamp: new Date(Date.now() - 7200000) },
]

type Tab = 'stash' | 'rebase' | 'cherry-pick' | 'reflog' | 'tags'

export default function GitAdvancedPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('stash')
  const [stashMessage, setStashMessage] = useState('')
  const [selectedStash, setSelectedStash] = useState<string | null>(null)
  const [rebaseSteps, setRebaseSteps] = useState(MOCK_REBASE_STEPS)
  const [expandedStash, setExpandedStash] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [cherryPickHash, setCherryPickHash] = useState('')
  const [tagName, setTagName] = useState('')
  const [tagMessage, setTagMessage] = useState('')

  const simulateOperation = async (op: string, detail: string) => {
    setIsRunning(true)
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000))
    setOperationLog(prev => [`${op}: ${detail}`, ...prev].slice(0, 20))
    setIsRunning(false)
  }

  const stashPush = async () => {
    await simulateOperation('git stash push', stashMessage || 'WIP changes')
    setStashMessage('')
  }

  const stashPop = async (id: string) => {
    await simulateOperation('git stash pop', id)
  }

  const stashDrop = async (id: string) => {
    await simulateOperation('git stash drop', id)
  }

  const stashApply = async (id: string) => {
    await simulateOperation('git stash apply', id)
  }

  const doCherryPick = async () => {
    if (!cherryPickHash) return
    await simulateOperation('git cherry-pick', cherryPickHash)
    setCherryPickHash('')
  }

  const doRebase = async () => {
    await simulateOperation('git rebase -i', `HEAD~${rebaseSteps.length}`)
  }

  const updateRebaseAction = (index: number, action: GitRebaseStep['action']) => {
    setRebaseSteps(prev => prev.map((s, i) => i === index ? { ...s, action } : s))
  }

  const doTag = async () => {
    if (!tagName) return
    await simulateOperation('git tag', `-a ${tagName} -m "${tagMessage}"`)
    setTagName('')
    setTagMessage('')
  }

  const tabs = [
    { key: 'stash' as Tab, label: 'Stash', icon: Archive },
    { key: 'rebase' as Tab, label: 'Rebase', icon: ArrowUpDown },
    { key: 'cherry-pick' as Tab, label: 'Cherry-Pick', icon: Cherry },
    { key: 'reflog' as Tab, label: 'Reflog', icon: History },
    { key: 'tags' as Tab, label: 'Tags', icon: Tag },
  ]

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-orange-400" />
          <span className="text-sm font-semibold">Git Advanced</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-ide-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Stash Tab */}
        {activeTab === 'stash' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={stashMessage}
                onChange={e => setStashMessage(e.target.value)}
                placeholder="Stash message (optional)..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
                onKeyDown={e => e.key === 'Enter' && stashPush()}
              />
              <button
                onClick={stashPush}
                disabled={isRunning}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs flex items-center gap-1"
              >
                {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                Stash
              </button>
            </div>

            {MOCK_STASHES.map(stash => (
              <div key={stash.id} className="border border-ide-border rounded">
                <div
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-ide-bg-secondary/30 cursor-pointer"
                  onClick={() => setExpandedStash(expandedStash === stash.id ? null : stash.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedStash === stash.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span className="text-xs font-mono text-orange-400">{stash.id}</span>
                    <span className="text-xs text-ide-text-secondary">{stash.message}</span>
                  </div>
                  <span className="text-xs text-ide-text-secondary/60">{stash.branch}</span>
                </div>
                {expandedStash === stash.id && (
                  <div className="px-4 py-2 border-t border-ide-border/50 space-y-1">
                    <div className="text-xs text-ide-text-secondary">
                      Files: {stash.files.join(', ')}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => stashPop(stash.id)} className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">
                        Pop
                      </button>
                      <button onClick={() => stashApply(stash.id)} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30">
                        Apply
                      </button>
                      <button onClick={() => stashDrop(stash.id)} className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30">
                        Drop
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rebase Tab */}
        {activeTab === 'rebase' && (
          <div className="space-y-3">
            <div className="text-xs text-ide-text-secondary mb-2">Interactive Rebase — reorder, squash, or drop commits:</div>
            {rebaseSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-ide-bg-secondary/30 border border-ide-border/50 rounded">
                <span className="text-xs font-mono text-orange-400 w-20">{step.hash}</span>
                <span className="text-xs flex-1 truncate">{step.message}</span>
                <select
                  value={step.action}
                  onChange={e => updateRebaseAction(i, e.target.value as GitRebaseStep['action'])}
                  className="bg-ide-bg border border-ide-border rounded px-1.5 py-0.5 text-xs"
                >
                  <option value="pick">pick</option>
                  <option value="reword">reword</option>
                  <option value="edit">edit</option>
                  <option value="squash">squash</option>
                  <option value="fixup">fixup</option>
                  <option value="drop">drop</option>
                </select>
                <button
                  onClick={() => setRebaseSteps(prev => prev.filter((_, j) => j !== i))}
                  className="p-0.5 hover:bg-red-500/20 rounded text-red-400"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={doRebase}
              disabled={isRunning}
              className="w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-xs flex items-center justify-center gap-1"
            >
              {isRunning ? <Loader2 size={10} className="animate-spin" /> : <ArrowUpDown size={10} />}
              Start Interactive Rebase
            </button>
          </div>
        )}

        {/* Cherry-Pick Tab */}
        {activeTab === 'cherry-pick' && (
          <div className="space-y-3">
            <div className="text-xs text-ide-text-secondary">Cherry-pick a specific commit by hash:</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cherryPickHash}
                onChange={e => setCherryPickHash(e.target.value)}
                placeholder="Commit hash (e.g. a1b2c3d)..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
              />
              <button
                onClick={doCherryPick}
                disabled={isRunning || !cherryPickHash}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs flex items-center gap-1"
              >
                {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Cherry size={10} />}
                Cherry-Pick
              </button>
            </div>

            <div className="mt-4 text-xs text-ide-text-secondary">Recent commits (click to copy hash):</div>
            {MOCK_REFLOG.filter(r => r.action === 'commit').map(entry => (
              <div
                key={entry.hash}
                className="flex items-center gap-2 px-2 py-1.5 bg-ide-bg-secondary/30 border border-ide-border/50 rounded hover:bg-ide-bg-secondary/50 cursor-pointer"
                onClick={() => setCherryPickHash(entry.hash)}
              >
                <span className="text-xs font-mono text-orange-400">{entry.hash}</span>
                <span className="text-xs flex-1">{entry.action}</span>
                <span className="text-xs text-ide-text-secondary/60">{entry.ref}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reflog Tab */}
        {activeTab === 'reflog' && (
          <div className="space-y-1">
            <div className="text-xs text-ide-text-secondary mb-2">Git reflog — history of all HEAD movements:</div>
            {MOCK_REFLOG.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-ide-bg-secondary/30 rounded text-xs">
                <span className="font-mono text-orange-400 w-20">{entry.hash}</span>
                <span className="text-green-400 w-16">{entry.action}</span>
                <span className="flex-1 text-ide-text-secondary">{entry.ref}</span>
                <span className="text-ide-text-secondary/60">{timeAgo(entry.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="space-y-3">
            <div className="text-xs text-ide-text-secondary">Create a new annotated tag:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagName}
                onChange={e => setTagName(e.target.value)}
                placeholder="Tag name (v1.0.0)..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
              />
            </div>
            <input
              type="text"
              value={tagMessage}
              onChange={e => setTagMessage(e.target.value)}
              placeholder="Tag message..."
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
            />
            <button
              onClick={doTag}
              disabled={isRunning || !tagName}
              className="w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-xs flex items-center justify-center gap-1"
            >
              {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Tag size={10} />}
              Create Tag
            </button>

            <div className="mt-4 text-xs text-ide-text-secondary">Existing tags:</div>
            {['v1.0.0', 'v0.9.0', 'v0.8.0', 'v0.7.0-beta'].map(tag => (
              <div key={tag} className="flex items-center gap-2 px-2 py-1.5 bg-ide-bg-secondary/30 border border-ide-border/50 rounded">
                <Tag size={10} className="text-orange-400" />
                <span className="text-xs font-mono">{tag}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Log */}
      {operationLog.length > 0 && (
        <div className="border-t border-ide-border max-h-24 overflow-y-auto">
          {operationLog.map((log, i) => (
            <div key={i} className="px-3 py-1 text-xs text-ide-text-secondary border-b border-ide-border/30 flex items-center gap-1">
              <Check size={10} className="text-green-400 flex-shrink-0" />
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
