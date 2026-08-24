import React, { useState, useMemo } from 'react'
import {
  Users, MessageSquare, Bell, Clock, GitPullRequest, GitCommit,
  CheckCircle, AlertCircle, Star, Send, Search, Filter,
  ChevronDown, ChevronRight, Circle, Eye, Heart, Bookmark
} from 'lucide-react'

interface TeamActivity {
  id: string
  type: 'commit' | 'pr' | 'review' | 'deploy' | 'comment' | 'issue' | 'achievement'
  user: string
  avatar: string
  action: string
  target: string
  timestamp: Date
  reactions: { emoji: string; count: number }[]
}

interface Discussion {
  id: string
  title: string
  author: string
  avatar: string
  content: string
  tags: string[]
  replies: number
  likes: number
  timestamp: Date
  pinned: boolean
}

interface TeamMember {
  name: string
  avatar: string
  role: string
  status: 'online' | 'away' | 'offline'
  lastActive: Date
  commits: number
  reviews: number
}

const MOCK_ACTIVITIES: TeamActivity[] = [
  { id: 'a1', type: 'commit', user: 'Alice Chen', avatar: '👩', action: 'pushed 3 commits to', target: 'feature/multi-agent', timestamp: new Date(Date.now() - 300000), reactions: [{ emoji: '🎉', count: 2 }] },
  { id: 'a2', type: 'pr', user: 'Bob Smith', avatar: '👨', action: 'opened PR #42:', target: 'feat: agent orchestration system', timestamp: new Date(Date.now() - 600000), reactions: [{ emoji: '👀', count: 3 }] },
  { id: 'a3', type: 'review', user: 'Alice Chen', avatar: '👩', action: 'approved PR #41:', target: 'fix: terminal rendering', timestamp: new Date(Date.now() - 900000), reactions: [{ emoji: '✅', count: 1 }] },
  { id: 'a4', type: 'deploy', user: 'CI/CD Bot', avatar: '🤖', action: 'deployed v2.4.1 to', target: 'production', timestamp: new Date(Date.now() - 1200000), reactions: [{ emoji: '🚀', count: 4 }] },
  { id: 'a5', type: 'comment', user: 'Carol Dev', avatar: '🧑', action: 'commented on PR #40:', target: 'Consider adding error boundaries', timestamp: new Date(Date.now() - 1800000), reactions: [] },
  { id: 'a6', type: 'achievement', user: 'System', avatar: '🏆', action: 'Alice earned badge:', target: '100+ Reviews', timestamp: new Date(Date.now() - 3600000), reactions: [{ emoji: '🎉', count: 5 }, { emoji: '👏', count: 3 }] },
  { id: 'a7', type: 'issue', user: 'Bob Smith', avatar: '👨', action: 'opened issue #56:', target: 'Memory leak in agent system', timestamp: new Date(Date.now() - 5400000), reactions: [] },
]

const MOCK_DISCUSSIONS: Discussion[] = [
  { id: 'd1', title: 'Architecture Decision: Event-driven vs Request-response for agents', author: 'Alice Chen', avatar: '👩', content: 'We need to decide on the communication pattern for our multi-agent system...', tags: ['architecture', 'agents', 'decision'], replies: 12, likes: 8, timestamp: new Date(Date.now() - 86400000), pinned: true },
  { id: 'd2', title: 'RFC: Plugin System Design', author: 'Bob Smith', avatar: '👨', content: 'Proposal for implementing a plugin system that allows third-party extensions...', tags: ['rfc', 'plugins'], replies: 5, likes: 3, timestamp: new Date(Date.now() - 172800000), pinned: true },
  { id: 'd3', title: 'Performance optimization brainstorm', author: 'Carol Dev', avatar: '🧑', content: 'Let\'s discuss potential performance improvements for the editor component...', tags: ['performance', 'discussion'], replies: 8, likes: 6, timestamp: new Date(Date.now() - 259200000), pinned: false },
  { id: 'd4', title: 'New team member onboarding guide', author: 'Alice Chen', avatar: '👩', content: 'Updated onboarding documentation for new developers joining the team...', tags: ['docs', 'onboarding'], replies: 2, likes: 4, timestamp: new Date(Date.now() - 345600000), pinned: false },
]

const MOCK_MEMBERS: TeamMember[] = [
  { name: 'Alice Chen', avatar: '👩', role: 'Tech Lead', status: 'online', lastActive: new Date(), commits: 247, reviews: 156 },
  { name: 'Bob Smith', avatar: '👨', role: 'Senior Dev', status: 'online', lastActive: new Date(Date.now() - 300000), commits: 189, reviews: 98 },
  { name: 'Carol Dev', avatar: '🧑', role: 'Developer', status: 'away', lastActive: new Date(Date.now() - 1800000), commits: 134, reviews: 67 },
  { name: 'David Ops', avatar: '🧔', role: 'DevOps', status: 'offline', lastActive: new Date(Date.now() - 86400000), commits: 78, reviews: 34 },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  commit: GitCommit, pr: GitPullRequest, review: CheckCircle, deploy: Star,
  comment: MessageSquare, issue: AlertCircle, achievement: Star,
}
const TYPE_COLORS: Record<string, string> = {
  commit: 'text-green-400', pr: 'text-blue-400', review: 'text-purple-400', deploy: 'text-orange-400',
  comment: 'text-cyan-400', issue: 'text-yellow-400', achievement: 'text-amber-400',
}

export default function CollaborationHubPanel({ onClose }: { onClose: () => void }) {
  const [activities] = useState(MOCK_ACTIVITIES)
  const [discussions] = useState(MOCK_DISCUSSIONS)
  const [members] = useState(MOCK_MEMBERS)
  const [activeTab, setActiveTab] = useState<'activity' | 'discussions' | 'team'>('activity')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const onlineCount = members.filter(m => m.status === 'online').length

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-teal-400" />
          <span className="text-sm font-semibold">Collaboration Hub</span>
          <span className="text-xs text-green-400">{onlineCount} online</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'activity' as const, label: 'Activity' }, { key: 'discussions' as const, label: `Discussions (${discussions.length})` }, { key: 'team' as const, label: `Team (${members.length})` }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-teal-400 text-teal-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'activity' && activities.map(activity => {
          const Icon = TYPE_ICONS[activity.type]
          return (
            <div key={activity.id} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20">
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">{activity.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs">
                    <span className="font-semibold">{activity.user}</span>
                    <span className="text-ide-text-secondary"> {activity.action} </span>
                    <span className="text-teal-400">{activity.target}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Icon size={10} className={TYPE_COLORS[activity.type]} />
                    <span className="text-[10px] text-ide-text-secondary">{timeAgo(activity.timestamp)}</span>
                    {activity.reactions.length > 0 && (
                      <div className="flex items-center gap-1">
                        {activity.reactions.map((r, i) => (
                          <span key={i} className="text-[10px] bg-ide-bg-secondary px-1 rounded">{r.emoji} {r.count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {activeTab === 'discussions' && (
          <div className="p-3 space-y-2">
            {discussions.map(d => (
              <div key={d.id} className="p-2 border border-ide-border/50 rounded hover:bg-ide-bg-secondary/20 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  {d.pinned && <span className="text-amber-400 text-[10px]">📌 Pinned</span>}
                  <span className="text-xs font-semibold flex-1">{d.title}</span>
                </div>
                <div className="text-xs text-ide-text-secondary truncate">{d.content}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-ide-text-secondary">{d.avatar} {d.author}</span>
                  <span className="text-[10px] text-ide-text-secondary">{timeAgo(d.timestamp)}</span>
                  <span className="text-[10px] text-ide-text-secondary flex items-center gap-0.5"><MessageSquare size={8} /> {d.replies}</span>
                  <span className="text-[10px] text-ide-text-secondary flex items-center gap-0.5"><Heart size={8} /> {d.likes}</span>
                  <div className="flex-1" />
                  {d.tags.map(t => <span key={t} className="px-1 py-0 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="p-3 space-y-2">
            {members.map(m => (
              <div key={m.name} className="flex items-center gap-3 p-2 border border-ide-border/50 rounded">
                <span className="text-2xl">{m.avatar}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">{m.name}</span>
                    <Circle size={6} className={m.status === 'online' ? 'fill-green-400 text-green-400' : m.status === 'away' ? 'fill-yellow-400 text-yellow-400' : 'fill-ide-text-secondary text-ide-text-secondary'} />
                  </div>
                  <div className="text-[10px] text-ide-text-secondary">{m.role} · Last active {timeAgo(m.lastActive)}</div>
                </div>
                <div className="text-right text-[10px] text-ide-text-secondary">
                  <div>{m.commits} commits</div>
                  <div>{m.reviews} reviews</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
