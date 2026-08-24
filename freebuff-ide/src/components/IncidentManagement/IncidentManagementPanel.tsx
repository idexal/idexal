import React, { useState, useMemo } from 'react'
import {
  AlertTriangle, AlertCircle, CheckCircle, Clock, Users, Bell,
  ChevronDown, ChevronRight, Plus, MessageSquare, FileText,
  Shield, Calendar, ArrowRight, Eye, Siren
} from 'lucide-react'

interface Incident {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'resolved'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed'
  assignee: string
  reporter: string
  createdAt: Date
  updatedAt: Date
  timeline: { time: Date; action: string; author: string }[]
  affectedServices: string[]
  description: string
}

interface OnCallSchedule {
  name: string
  current: string
  next: string
  avatar: string
  nextAvatar: string
  shiftEnd: Date
}

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-1', title: 'API Response Time Degradation', severity: 'critical', status: 'investigating',
    assignee: 'Alice Chen', reporter: 'Monitoring Bot', createdAt: new Date(Date.now() - 1800000), updatedAt: new Date(Date.now() - 300000),
    affectedServices: ['API Gateway', 'User Service', 'Database'],
    description: 'API response times have increased from 45ms to 2.5s average. Database connection pool appears exhausted.',
    timeline: [
      { time: new Date(Date.now() - 1800000), action: 'Alert triggered: API response time > 2s', author: 'Monitoring Bot' },
      { time: new Date(Date.now() - 1500000), action: 'Incident created and assigned to Alice Chen', author: 'PagerDuty' },
      { time: new Date(Date.now() - 1200000), action: 'Investigating: Database connection pool exhaustion confirmed', author: 'Alice Chen' },
      { time: new Date(Date.now() - 600000), action: 'Identified root cause: Connection leak in agent orchestrator', author: 'Alice Chen' },
      { time: new Date(Date.now() - 300000), action: 'Applying hotfix: Adding connection pool monitoring', author: 'Alice Chen' },
    ],
  },
  {
    id: 'inc-2', title: 'Authentication Service Intermittent Failures', severity: 'high', status: 'monitoring',
    assignee: 'Bob Smith', reporter: 'User Report', createdAt: new Date(Date.now() - 7200000), updatedAt: new Date(Date.now() - 1800000),
    affectedServices: ['Auth Service', 'Login Page'],
    description: 'Users reporting intermittent login failures. JWT token validation timing out sporadically.',
    timeline: [
      { time: new Date(Date.now() - 7200000), action: 'Issue reported: Users unable to login', author: 'User Report' },
      { time: new Date(Date.now() - 6600000), action: 'Investigating auth service logs', author: 'Bob Smith' },
      { time: new Date(Date.now() - 5400000), action: 'Identified: Redis cache miss causing DB overload', author: 'Bob Smith' },
      { time: new Date(Date.now() - 3600000), action: 'Fix deployed: Added cache warming on startup', author: 'Bob Smith' },
      { time: new Date(Date.now() - 1800000), action: 'Monitoring: Error rate dropping to normal levels', author: 'Bob Smith' },
    ],
  },
  {
    id: 'inc-3', title: 'CDN Cache Invalidation Failure', severity: 'medium', status: 'resolved',
    assignee: 'David Ops', reporter: 'CI/CD Bot', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(Date.now() - 82800000),
    affectedServices: ['CDN', 'Static Assets'],
    description: 'CDN cache not invalidating on deployment causing stale assets to be served.',
    timeline: [
      { time: new Date(Date.now() - 86400000), action: 'Alert: CDN cache stale after deployment', author: 'CI/CD Bot' },
      { time: new Date(Date.now() - 84600000), action: 'Identified: Cache invalidation API returning 429', author: 'David Ops' },
      { time: new Date(Date.now() - 82800000), action: 'Resolved: Added retry with exponential backoff', author: 'David Ops' },
    ],
  },
  {
    id: 'inc-4', title: 'Scheduled: Database Migration Window', severity: 'low', status: 'closed',
    assignee: 'Alice Chen', reporter: 'Alice Chen', createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 172800000),
    affectedServices: ['Database'],
    description: 'Scheduled database migration for schema v3.2. Expected 5min downtime.',
    timeline: [
      { time: new Date(Date.now() - 259200000), action: 'Scheduled maintenance window created', author: 'Alice Chen' },
      { time: new Date(Date.now() - 172800000), action: 'Migration completed successfully', author: 'Alice Chen' },
    ],
  },
]

const MOCK_SCHEDULES: OnCallSchedule[] = [
  { name: 'Primary', current: 'Alice Chen', next: 'Bob Smith', avatar: '👩', nextAvatar: '👨', shiftEnd: new Date(Date.now() + 14400000) },
  { name: 'Secondary', current: 'Carol Dev', next: 'David Ops', avatar: '🧑', nextAvatar: '🧔', shiftEnd: new Date(Date.now() + 28800000) },
]

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertCircle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle },
  low: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle },
  resolved: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
}

const STATUS_COLORS: Record<string, string> = {
  investigating: 'text-red-400', identified: 'text-orange-400', monitoring: 'text-yellow-400', resolved: 'text-green-400', closed: 'text-ide-text-secondary',
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

function timeUntil(date: Date): string {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000)
  if (seconds <= 0) return 'now'
  const hours = Math.floor(seconds / 3600)
  if (hours > 0) return `in ${hours}h`
  return `in ${Math.floor(seconds / 60)}m`
}

export default function IncidentManagementPanel({ onClose }: { onClose: () => void }) {
  const [incidents] = useState(MOCK_INCIDENTS)
  const [schedules] = useState(MOCK_SCHEDULES)
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'incidents' | 'oncall' | 'postmortem'>('incidents')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')

  const filtered = useMemo(() => {
    if (filterSeverity === 'all') return incidents
    return incidents.filter(i => i.severity === filterSeverity)
  }, [incidents, filterSeverity])

  const activeCount = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Siren size={16} className="text-red-400" />
          <span className="text-sm font-semibold">Incident Management</span>
          {activeCount > 0 && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px]">{activeCount} active</span>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'incidents' as const, label: `Incidents (${incidents.length})` }, { key: 'oncall' as const, label: 'On-Call' }, { key: 'postmortem' as const, label: 'Post-Mortems' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-red-400 text-red-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'incidents' && (
          <>
            <div className="px-3 py-1.5 border-b border-ide-border flex items-center gap-1">
              {['all', 'critical', 'high', 'medium', 'low', 'resolved'].map(s => (
                <button key={s} onClick={() => setFilterSeverity(s)} className={`px-2 py-0.5 text-xs rounded ${filterSeverity === s ? 'bg-red-600 text-white' : 'text-ide-text-secondary'}`}>{s}</button>
              ))}
            </div>
            {filtered.map(incident => {
              const config = SEVERITY_CONFIG[incident.severity]
              const Icon = config.icon
              return (
                <div key={incident.id}>
                  <div onClick={() => setExpandedIncident(expandedIncident === incident.id ? null : incident.id)} className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${config.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {expandedIncident === incident.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <Icon size={12} className={config.color} />
                      <span className="text-xs font-semibold flex-1">{incident.title}</span>
                      <span className={`text-xs ${STATUS_COLORS[incident.status]}`}>{incident.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                      <span>{incident.assignee}</span>
                      <span>{timeAgo(incident.createdAt)}</span>
                      <span>{incident.affectedServices.length} services affected</span>
                    </div>
                  </div>
                  {expandedIncident === incident.id && (
                    <div className="px-4 pb-3 space-y-3">
                      <div className="text-xs">{incident.description}</div>
                      <div className="flex flex-wrap gap-1">
                        {incident.affectedServices.map(s => <span key={s} className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">{s}</span>)}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-ide-text-secondary">Timeline</div>
                        {incident.timeline.map((event, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-ide-text-secondary w-16 flex-shrink-0">{timeAgo(event.time)}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-ide-text">{event.action}</span>
                              <span className="text-ide-text-secondary"> — {event.author}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {activeTab === 'oncall' && (
          <div className="p-3 space-y-3">
            {schedules.map(schedule => (
              <div key={schedule.name} className="border border-ide-border/50 rounded p-3">
                <div className="text-xs font-semibold text-indigo-400 mb-2">{schedule.name} On-Call</div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{schedule.avatar}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{schedule.current}</div>
                    <div className="text-[10px] text-ide-text-secondary">Current · Shift ends {timeUntil(schedule.shiftEnd)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
                  <ArrowRight size={10} />
                  <span className="text-2xl">{schedule.nextAvatar}</span>
                  <div>
                    <div>{schedule.next}</div>
                    <div className="text-[10px]">Next on-call</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-3">
              <div className="text-xs font-semibold mb-2">Escalation Policy</div>
              <div className="space-y-1 text-xs text-ide-text-secondary">
                <div>1. Primary on-call notified via PagerDuty</div>
                <div>2. If no response in 15min → Secondary on-call</div>
                <div>3. If no response in 30min → Engineering Manager</div>
                <div>4. If no response in 60min → CTO</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'postmortem' && (
          <div className="p-3 space-y-3">
            {incidents.filter(i => i.status === 'resolved' || i.status === 'closed').map(incident => (
              <div key={incident.id} className="border border-ide-border/50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={12} className="text-green-400" />
                  <span className="text-xs font-semibold">{incident.title}</span>
                </div>
                <div className="text-xs text-ide-text-secondary mb-2">{incident.description}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-ide-text-secondary">Duration:</span> {Math.round((incident.updatedAt.getTime() - incident.createdAt.getTime()) / 60000)}min</div>
                  <div><span className="text-ide-text-secondary">Severity:</span> {incident.severity}</div>
                  <div><span className="text-ide-text-secondary">Assignee:</span> {incident.assignee}</div>
                  <div><span className="text-ide-text-secondary">Services:</span> {incident.affectedServices.length}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
