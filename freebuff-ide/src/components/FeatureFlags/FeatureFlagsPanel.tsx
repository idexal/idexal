import React, { useState, useMemo } from 'react'
import {
  Flag, Plus, Trash2, Edit3, Search, Filter, ChevronDown, ChevronRight,
  Users, Target, Clock, CheckCircle, XCircle, AlertTriangle, Copy, Check,
  ToggleLeft, ToggleRight, Eye, EyeOff
} from 'lucide-react'

interface FeatureFlag {
  id: string
  name: string
  key: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  targeting: { type: 'all' | 'percentage' | 'users' | 'segments'; value: string }
  environment: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  tags: string[]
  usageCount: number
  variants?: string[]
  controlGroup?: number
}

const MOCK_FLAGS: FeatureFlag[] = [
  { id: '1', name: 'New AI Chat', key: 'new_ai_chat', description: 'Enable the new multi-agent AI chat interface', enabled: true, rolloutPercentage: 100, targeting: { type: 'all', value: '' }, environment: 'production', createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(Date.now() - 86400000), createdBy: 'Alice Chen', tags: ['ai', 'ui'], usageCount: 15000, controlGroup: 0 },
  { id: '2', name: 'Dark Mode V2', key: 'dark_mode_v2', description: 'New dark mode with improved contrast', enabled: true, rolloutPercentage: 75, targeting: { type: 'percentage', value: '75%' }, environment: 'production', createdAt: new Date(Date.now() - 1209600000), updatedAt: new Date(Date.now() - 172800000), createdBy: 'Bob Smith', tags: ['ui', 'theme'], usageCount: 8200, controlGroup: 25 },
  { id: '3', name: 'Beta Keyboard Shortcuts', key: 'beta_shortcuts', description: 'New keyboard shortcuts for power users', enabled: false, rolloutPercentage: 0, targeting: { type: 'users', value: 'beta-testers' }, environment: 'production', createdAt: new Date(Date.now() - 2592000000), updatedAt: new Date(Date.now() - 604800000), createdBy: 'Carol Dev', tags: ['ux', 'shortcuts'], usageCount: 0, controlGroup: 100 },
  { id: '4', name: 'Performance Profiler', key: 'perf_profiler', description: 'Enable the built-in performance profiler', enabled: true, rolloutPercentage: 50, targeting: { type: 'segments', value: 'developers' }, environment: 'production', createdAt: new Date(Date.now() - 432000000), updatedAt: new Date(Date.now() - 432000000), createdBy: 'Alice Chen', tags: ['devtools', 'performance'], usageCount: 3400, controlGroup: 50 },
  { id: '5', name: 'Git Advanced Panel', key: 'git_advanced', description: 'Advanced Git operations panel (stash, rebase, cherry-pick)', enabled: true, rolloutPercentage: 100, targeting: { type: 'all', value: '' }, environment: 'production', createdAt: new Date(Date.now() - 864000000), updatedAt: new Date(Date.now() - 259200000), createdBy: 'David Ops', tags: ['git', 'devtools'], usageCount: 12000, controlGroup: 0 },
  { id: '6', name: 'Experimental WebGL Renderer', key: 'webgl_renderer', description: 'Use WebGL for syntax highlighting and minimap', enabled: false, rolloutPercentage: 5, targeting: { type: 'percentage', value: '5%' }, environment: 'staging', createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 172800000), createdBy: 'Bob Smith', tags: ['experimental', 'performance'], usageCount: 150, controlGroup: 95 },
  { id: '7', name: 'Collaborative Editing', key: 'collab_edit', description: 'Real-time collaborative code editing', enabled: true, rolloutPercentage: 30, targeting: { type: 'users', value: 'enterprise' }, environment: 'production', createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 86400000), createdBy: 'Alice Chen', tags: ['collab', 'enterprise'], usageCount: 4500, controlGroup: 70 },
  { id: '8', name: 'AI Code Review', key: 'ai_code_review', description: 'Automated AI-powered code review on PRs', enabled: true, rolloutPercentage: 60, targeting: { type: 'segments', value: 'teams' }, environment: 'production', createdAt: new Date(Date.now() - 345600000), updatedAt: new Date(Date.now() - 259200000), createdBy: 'Carol Dev', tags: ['ai', 'review'], usageCount: 6700, controlGroup: 40 },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export default function FeatureFlagsPanel({ onClose }: { onClose: () => void }) {
  const [flags, setFlags] = useState(MOCK_FLAGS)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return flags.filter(f => {
      if (filterEnabled === 'enabled' && !f.enabled) return false
      if (filterEnabled === 'disabled' && f.enabled) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [flags, searchQuery, filterEnabled])

  const toggleFlag = (id: string) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled, updatedAt: new Date() } : f))
  }

  const updateRollout = (id: string, pct: number) => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, rolloutPercentage: pct, updatedAt: new Date() } : f))
  }

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const stats = useMemo(() => ({
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    disabled: flags.filter(f => !f.enabled).length,
    production: flags.filter(f => f.environment === 'production').length,
  }), [flags])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold">Feature Flags</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30"><Plus size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Total', value: stats.total, color: 'text-ide-text' },
          { label: 'Enabled', value: stats.enabled, color: 'text-green-400' },
          { label: 'Disabled', value: stats.disabled, color: 'text-red-400' },
          { label: 'Production', value: stats.production, color: 'text-indigo-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search flags..." className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary" />
        </div>
        <select value={filterEnabled} onChange={e => setFilterEnabled(e.target.value as typeof filterEnabled)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs">
          <option value="all">All ({stats.total})</option>
          <option value="enabled">Enabled ({stats.enabled})</option>
          <option value="disabled">Disabled ({stats.disabled})</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(flag => (
          <div key={flag.id}>
            <div onClick={() => setExpandedId(expandedId === flag.id ? null : flag.id)} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                {expandedId === flag.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <button onClick={e => { e.stopPropagation(); toggleFlag(flag.id) }} className="flex-shrink-0">
                  {flag.enabled ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} className="text-ide-text-secondary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">{flag.name}</span>
                    <span className={`px-1 py-0 rounded text-[10px] ${flag.environment === 'production' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{flag.environment}</span>
                  </div>
                  <div className="text-[10px] text-ide-text-secondary truncate">{flag.description}</div>
                </div>
                {flag.enabled && (
                  <div className="text-right">
                    <div className="text-xs text-indigo-400">{flag.rolloutPercentage}%</div>
                    <div className="w-16 h-1 bg-ide-bg-secondary rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${flag.rolloutPercentage}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {expandedId === flag.id && (
                <div className="mt-2 ml-8 space-y-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-ide-text-secondary">Key:</span>
                    <code className="bg-ide-bg-secondary px-1.5 rounded text-indigo-400">{flag.key}</code>
                    <button onClick={e => { e.stopPropagation(); copyKey(flag.key) }} className="text-ide-text-secondary hover:text-ide-text">
                      {copiedKey === flag.key ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-ide-text-secondary">Created:</span> {timeAgo(flag.createdAt)}</div>
                    <div><span className="text-ide-text-secondary">Updated:</span> {timeAgo(flag.updatedAt)}</div>
                    <div><span className="text-ide-text-secondary">Created by:</span> {flag.createdBy}</div>
                    <div><span className="text-ide-text-secondary">Usage:</span> {flag.usageCount.toLocaleString()} requests</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {flag.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{t}</span>)}
                  </div>
                  <div>
                    <div className="text-xs text-ide-text-secondary mb-1">Rollout: {flag.rolloutPercentage}%</div>
                    <input type="range" min={0} max={100} value={flag.rolloutPercentage} onChange={e => { e.stopPropagation(); updateRollout(flag.id, Number(e.target.value)) }} className="w-full accent-indigo-500" onClick={e => e.stopPropagation()} />
                  </div>
                  <div className="text-xs">
                    <span className="text-ide-text-secondary">Targeting:</span> {flag.targeting.type === 'all' ? 'All users' : flag.targeting.type === 'percentage' ? `${flag.rolloutPercentage}% rollout` : `${flag.targeting.type}: ${flag.targeting.value}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
