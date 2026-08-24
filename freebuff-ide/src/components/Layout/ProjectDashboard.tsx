import React, { useState, useMemo, useEffect } from 'react'
import {
  Layout, Folder, FileText, GitBranch, Clock, Users, Activity,
  Zap, Code, Package, TestTube, Shield, Rocket, Settings,
  ChevronDown, ChevronRight, ArrowRight, Star, Eye, TrendingUp,
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Terminal
} from 'lucide-react'

interface ProjectStat {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'stable'
  icon: typeof Code
  color: string
}

interface RecentActivity {
  id: string
  type: 'commit' | 'deploy' | 'test' | 'review' | 'issue' | 'release'
  title: string
  description: string
  author: string
  time: Date
  status?: 'success' | 'warning' | 'error'
}

const MOCK_STATS: ProjectStat[] = [
  { label: 'Total Files', value: 89, icon: FileText, color: 'text-blue-400', trend: 'up', change: '+12 this week' },
  { label: 'Components', value: 89, icon: Code, color: 'text-green-400', trend: 'up', change: '+8 this week' },
  { label: 'Services', value: 24, icon: Package, color: 'text-purple-400', trend: 'stable' },
  { label: 'Tests', value: 27, icon: TestTube, color: 'text-yellow-400', trend: 'up', change: '+5 this week' },
  { label: 'Git Branches', value: 3, icon: GitBranch, color: 'text-cyan-400', trend: 'stable' },
  { label: 'Open Issues', value: 2, icon: AlertTriangle, color: 'text-orange-400', trend: 'down', change: '-3 this week' },
  { label: 'Build Status', value: 'Passing', icon: CheckCircle, color: 'text-green-400' },
  { label: 'Test Coverage', value: '87%', icon: Shield, color: 'text-emerald-400', trend: 'up', change: '+4%' },
]

const MOCK_ACTIVITIES: RecentActivity[] = [
  { id: '1', type: 'commit', title: 'feat: implement AI provider system', description: 'Added support for 14 AI providers with model fetching', author: 'Ahmed', time: new Date(Date.now() - 3600000), status: 'success' },
  { id: '2', type: 'deploy', title: 'Deploy to production', description: 'Version 1.2.0 deployed successfully', author: 'CI/CD', time: new Date(Date.now() - 7200000), status: 'success' },
  { id: '3', type: 'test', title: 'All tests passing', description: '27/27 tests passed', author: 'CI', time: new Date(Date.now() - 10800000), status: 'success' },
  { id: '4', type: 'review', title: 'PR #42 reviewed', description: 'Code review approved with minor suggestions', author: 'Sara', time: new Date(Date.now() - 14400000), status: 'success' },
  { id: '5', type: 'issue', title: 'Fix memory leak in terminal', description: 'Terminal component not cleaning up event listeners', author: 'Omar', time: new Date(Date.now() - 28800000), status: 'warning' },
  { id: '6', type: 'commit', title: 'refactor: restructure provider service', description: 'Moved provider logic to separate module', author: 'Fatima', time: new Date(Date.now() - 43200000), status: 'success' },
  { id: '7', type: 'release', title: 'Release v1.1.0', description: 'SSL certificates, database backup, git blame', author: 'Ahmed', time: new Date(Date.now() - 86400000), status: 'success' },
  { id: '8', type: 'test', title: 'Build failed', description: 'TypeScript compilation error in aiProviders.ts', author: 'CI', time: new Date(Date.now() - 100800000), status: 'error' },
]

const QUICK_ACTIONS = [
  { label: 'New File', icon: FileText, color: 'text-blue-400', shortcut: 'Ctrl+N' },
  { label: 'Open Terminal', icon: Terminal, color: 'text-green-400', shortcut: 'Ctrl+`' },
  { label: 'Git Commit', icon: GitBranch, color: 'text-orange-400', shortcut: '' },
  { label: 'Run Tests', icon: TestTube, color: 'text-yellow-400', shortcut: '' },
  { label: 'Build Project', icon: Rocket, color: 'text-purple-400', shortcut: '' },
  { label: 'Settings', icon: Settings, color: 'text-gray-400', shortcut: 'Ctrl+,' },
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

export default function ProjectDashboard({ onClose }: { onClose: () => void }) {
  const [activities] = useState(MOCK_ACTIVITIES)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(k => k + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Layout size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold">Project Dashboard</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            Idexal IDE v1.2.0
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
          >
            <RefreshCw size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Project Overview */}
        <div className="p-3 border-b border-ide-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Code size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Idexal IDE</h2>
              <span className="text-[10px] text-ide-text-secondary">AI-Powered Multi-Agent Development Environment</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] flex items-center gap-0.5">
                <CheckCircle size={8} /> Build Passing
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-ide-text-secondary">
            <span className="flex items-center gap-1"><Folder size={10} /> freebuff-ide/</span>
            <span className="flex items-center gap-1"><GitBranch size={10} /> main</span>
            <span className="flex items-center gap-1"><Clock size={10} /> Last commit: 1h ago</span>
            <span className="flex items-center gap-1"><Users size={10} /> 6 contributors</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-3 border-b border-ide-border">
          <div className="text-[10px] text-ide-text-secondary mb-2 flex items-center gap-1">
            <Activity size={10} /> Project Statistics
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MOCK_STATS.map(stat => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-ide-bg-secondary/20 rounded p-2 border border-ide-border/30">
                  <div className="flex items-center gap-1 mb-1">
                    <Icon size={10} className={stat.color} />
                    <span className="text-[9px] text-ide-text-secondary">{stat.label}</span>
                  </div>
                  <div className="text-sm font-bold text-ide-text">{stat.value}</div>
                  {stat.change && (
                    <div className={`text-[8px] flex items-center gap-0.5 ${
                      stat.trend === 'up' ? 'text-green-400' :
                      stat.trend === 'down' ? 'text-red-400' : 'text-ide-text-secondary'
                    }`}>
                      {stat.trend === 'up' && <TrendingUp size={8} />}
                      {stat.change}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-ide-border">
          <div className="text-[10px] text-ide-text-secondary mb-2 flex items-center gap-1">
            <Zap size={10} /> Quick Actions
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  className="flex items-center gap-2 p-2 bg-ide-bg-secondary/20 hover:bg-ide-bg-secondary/40 rounded border border-ide-border/30 text-left"
                >
                  <Icon size={14} className={action.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-ide-text">{action.label}</div>
                    {action.shortcut && (
                      <div className="text-[8px] text-ide-text-secondary">{action.shortcut}</div>
                    )}
                  </div>
                  <ArrowRight size={10} className="text-ide-text-secondary" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-3">
          <div className="text-[10px] text-ide-text-secondary mb-2 flex items-center gap-1">
            <Clock size={10} /> Recent Activity
          </div>
          <div className="space-y-1">
            {activities.map(activity => {
              const typeIcons: Record<string, typeof Code> = {
                commit: GitBranch, deploy: Rocket, test: TestTube,
                review: Eye, issue: AlertTriangle, release: Star
              }
              const TypeIcon = typeIcons[activity.type] || Code
              return (
                <div key={activity.id} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-ide-bg-secondary/10">
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-500/10' :
                    activity.status === 'error' ? 'bg-red-500/10' :
                    activity.status === 'warning' ? 'bg-yellow-500/10' : 'bg-ide-bg-secondary'
                  }`}>
                    <TypeIcon size={10} className={
                      activity.status === 'success' ? 'text-green-400' :
                      activity.status === 'error' ? 'text-red-400' :
                      activity.status === 'warning' ? 'text-yellow-400' : 'text-ide-text-secondary'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-ide-text truncate">{activity.title}</div>
                    <div className="text-[9px] text-ide-text-secondary truncate">{activity.description}</div>
                    <div className="text-[8px] text-ide-text-secondary/60 flex items-center gap-1">
                      <span>{activity.author}</span>
                      <span>•</span>
                      <span>{timeAgo(activity.time)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>Auto-refresh: 30s</span>
        <span>Last updated: just now</span>
      </div>
    </div>
  )
}
