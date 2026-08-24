import React, { useState, useMemo } from 'react'
import {
  GitPullRequest, CheckCircle, XCircle, MessageSquare, Clock,
  ChevronDown, ChevronRight, Plus, Send, ThumbsUp, ThumbsDown,
  AlertTriangle, Eye, User, GitCommit, FileText, Diff
} from 'lucide-react'

interface ReviewComment {
  id: string
  author: string
  avatar: string
  content: string
  file: string
  line: number
  timestamp: Date
  resolved: boolean
  replies: ReviewComment[]
}

interface PRFile {
  path: string
  additions: number
  deletions: number
  status: 'modified' | 'added' | 'deleted'
  comments: ReviewComment[]
}

interface PullRequest {
  id: string
  number: number
  title: string
  author: string
  status: 'open' | 'review' | 'approved' | 'changes-requested' | 'merged'
  reviewers: { name: string; status: 'pending' | 'approved' | 'changes-requested' | 'commented' }[]
  files: PRFile[]
  comments: number
  commits: number
  additions: number
  deletions: number
  created: Date
  branch: string
  target: string
}

const MOCK_PR: PullRequest = {
  id: 'pr-1',
  number: 42,
  title: 'feat: implement multi-agent orchestration system',
  author: 'Developer',
  status: 'review',
  reviewers: [
    { name: 'Alice Chen', status: 'approved' },
    { name: 'Bob Smith', status: 'commented' },
    { name: 'Carol Dev', status: 'pending' },
  ],
  files: [
    { path: 'src/services/agentOrchestrator.ts', additions: 280, deletions: 15, status: 'modified', comments: [
      { id: 'c1', author: 'Alice Chen', avatar: '👩', content: 'The pub/sub message bus looks clean. Consider adding rate limiting for message forwarding.', file: 'src/services/agentOrchestrator.ts', line: 45, timestamp: new Date(Date.now() - 3600000), resolved: false, replies: [
        { id: 'c1r1', author: 'Developer', avatar: '👤', content: 'Good point! Added rate limiting in the next commit.', file: 'src/services/agentOrchestrator.ts', line: 45, timestamp: new Date(Date.now() - 3000000), resolved: false, replies: [] }
      ]},
    ]},
    { path: 'src/services/agentHierarchy.ts', additions: 420, deletions: 0, status: 'added', comments: [
      { id: 'c2', author: 'Bob Smith', avatar: '👨', content: 'The routing logic is complex. Consider extracting it into a separate utility.', file: 'src/services/agentHierarchy.ts', line: 120, timestamp: new Date(Date.now() - 2400000), resolved: false, replies: [] },
    ]},
    { path: 'src/hooks/useAgent.ts', additions: 150, deletions: 30, status: 'modified', comments: [] },
    { path: 'src/components/AI/ChatPanel.tsx', additions: 85, deletions: 20, status: 'modified', comments: [] },
    { path: 'src/components/AI/AgentDashboard.tsx', additions: 300, deletions: 0, status: 'added', comments: [] },
  ],
  comments: 3,
  commits: 8,
  additions: 1235,
  deletions: 65,
  created: new Date(Date.now() - 86400000),
  branch: 'feature/multi-agent',
  target: 'main',
}

const STATUS_CONFIG = {
  open: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Open' },
  review: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'In Review' },
  approved: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Approved' },
  'changes-requested': { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Changes Requested' },
  merged: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Merged' },
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

export default function CodeReviewPanel({ onClose }: { onClose: () => void }) {
  const [pr] = useState(MOCK_PR)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set(['c1']))
  const [newComment, setNewComment] = useState('')
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'request-changes' | 'comment' | null>(null)
  const [activeTab, setActiveTab] = useState<'files' | 'discussion' | 'reviewers'>('files')

  const statusConfig = STATUS_CONFIG[pr.status]

  const unresolvedCount = useMemo(() => {
    return pr.files.reduce((count, f) => count + f.comments.filter(c => !c.resolved).length, 0)
  }, [pr])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <GitPullRequest size={16} className="text-violet-400" />
          <span className="text-sm font-semibold">PR #{pr.number}</span>
          <span className={`px-2 py-0.5 text-xs rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* PR Info */}
      <div className="px-3 py-2 border-b border-ide-border space-y-1">
        <div className="text-xs font-semibold">{pr.title}</div>
        <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
          <span className="flex items-center gap-1"><User size={10} /> {pr.author}</span>
          <span className="flex items-center gap-1"><GitCommit size={10} /> {pr.commits} commits</span>
          <span className="flex items-center gap-1"><FileText size={10} /> {pr.files.length} files</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">+{pr.additions}</span>
          <span className="text-red-400">-{pr.deletions}</span>
          <span className="text-ide-text-secondary">{pr.branch} → {pr.target}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'files' as const, label: `Files (${pr.files.length})` },
          { key: 'discussion' as const, label: `Discussion (${pr.comments})` },
          { key: 'reviewers' as const, label: `Reviewers (${pr.reviewers.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
              activeTab === tab.key
                ? 'border-violet-400 text-violet-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Files Tab */}
        {activeTab === 'files' && (
          <div>
            {pr.files.map(file => (
              <div key={file.path} className="border-b border-ide-border/30">
                <div
                  onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/30 cursor-pointer"
                >
                  {selectedFile === file.path ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <FileText size={12} className="text-ide-text-secondary" />
                  <span className="text-xs font-mono flex-1 truncate">{file.path}</span>
                  {file.comments.length > 0 && (
                    <span className="text-xs text-violet-400 flex items-center gap-0.5">
                      <MessageSquare size={10} />
                      {file.comments.filter(c => !c.resolved).length}
                    </span>
                  )}
                  <span className="text-xs text-green-400">+{file.additions}</span>
                  <span className="text-xs text-red-400">-{file.deletions}</span>
                </div>

                {/* File Comments */}
                {selectedFile === file.path && file.comments.length > 0 && (
                  <div className="px-4 pb-2 space-y-2">
                    {file.comments.map(comment => (
                      <div key={comment.id} className={`border border-ide-border/50 rounded p-2 ${comment.resolved ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs">{comment.avatar}</span>
                          <span className="text-xs font-semibold">{comment.author}</span>
                          <span className="text-xs text-ide-text-secondary">{comment.file}:{comment.line}</span>
                          <span className="text-xs text-ide-text-secondary">{timeAgo(comment.timestamp)}</span>
                          {comment.resolved && <CheckCircle size={10} className="text-green-400" />}
                        </div>
                        <div className="text-xs">{comment.content}</div>
                        {/* Replies */}
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="ml-4 mt-2 border-l-2 border-ide-border pl-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">{reply.avatar}</span>
                              <span className="text-xs font-semibold">{reply.author}</span>
                              <span className="text-xs text-ide-text-secondary">{timeAgo(reply.timestamp)}</span>
                            </div>
                            <div className="text-xs">{reply.content}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Discussion Tab */}
        {activeTab === 'discussion' && (
          <div className="p-3 space-y-3">
            {pr.files.flatMap(f => f.comments).filter(c => !c.replies.length || c.id.startsWith('c')).map(comment => (
              <div key={comment.id} className="border border-ide-border/50 rounded p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">{comment.avatar}</span>
                  <span className="text-xs font-semibold">{comment.author}</span>
                  <span className="text-xs text-ide-text-secondary">on {comment.file}:{comment.line}</span>
                  <span className="text-xs text-ide-text-secondary">{timeAgo(comment.timestamp)}</span>
                </div>
                <div className="text-xs">{comment.content}</div>
                {comment.replies.map(reply => (
                  <div key={reply.id} className="ml-4 mt-2 border-l-2 border-ide-border pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{reply.avatar}</span>
                      <span className="text-xs font-semibold">{reply.author}</span>
                      <span className="text-xs text-ide-text-secondary">{timeAgo(reply.timestamp)}</span>
                    </div>
                    <div className="text-xs">{reply.content}</div>
                  </div>
                ))}
              </div>
            ))}
            {unresolvedCount > 0 && (
              <div className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle size={10} />
                {unresolvedCount} unresolved comment{unresolvedCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Reviewers Tab */}
        {activeTab === 'reviewers' && (
          <div className="p-3 space-y-2">
            {pr.reviewers.map(reviewer => (
              <div key={reviewer.name} className="flex items-center gap-2 p-2 border border-ide-border/50 rounded">
                <span className="text-lg">👤</span>
                <span className="text-xs font-semibold flex-1">{reviewer.name}</span>
                <span className={`text-xs ${
                  reviewer.status === 'approved' ? 'text-green-400' :
                  reviewer.status === 'changes-requested' ? 'text-red-400' :
                  reviewer.status === 'commented' ? 'text-yellow-400' :
                  'text-ide-text-secondary'
                }`}>
                  {reviewer.status === 'approved' && <><CheckCircle size={10} className="inline mr-1" />Approved</>}
                  {reviewer.status === 'changes-requested' && <><XCircle size={10} className="inline mr-1" />Changes Requested</>}
                  {reviewer.status === 'commented' && <><MessageSquare size={10} className="inline mr-1" />Commented</>}
                  {reviewer.status === 'pending' && <><Clock size={10} className="inline mr-1" />Pending</>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Actions */}
      <div className="border-t border-ide-border p-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Leave a comment..."
            className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
          />
          <button className="p-1 bg-ide-bg-secondary rounded text-ide-text-secondary hover:text-ide-text">
            <Send size={12} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setReviewDecision(reviewDecision === 'approve' ? null : 'approve')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
              reviewDecision === 'approve' ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
            }`}
          >
            <ThumbsUp size={10} /> Approve
          </button>
          <button
            onClick={() => setReviewDecision(reviewDecision === 'request-changes' ? null : 'request-changes')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs ${
              reviewDecision === 'request-changes' ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
            }`}
          >
            <ThumbsDown size={10} /> Request Changes
          </button>
        </div>
      </div>
    </div>
  )
}
