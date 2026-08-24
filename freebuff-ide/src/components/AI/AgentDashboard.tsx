import React, { useState, useEffect, useMemo } from 'react'
import { agentHierarchy } from '../../services/agentHierarchy'
import { agentOrchestrator } from '../../services/agentOrchestrator'
import {
  Activity, Users, Layers, Zap, TrendingUp, Clock,
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  BarChart3, GitBranch, Cpu, Target
} from 'lucide-react'

interface AgentDashboardProps {
  onClose: () => void
}

type Tab = 'overview' | 'teams' | 'chains' | 'performance'

export default function AgentDashboard({ onClose }: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [, forceUpdate] = useState(0)

  // Force re-render on hierarchy changes
  useEffect(() => {
    const unsub = agentHierarchy.onChange(() => forceUpdate(n => n + 1))
    return () => { unsub() }
  }, [])

  const leadAgents = agentHierarchy.getAllLeadAgents()
  const teams = agentHierarchy.getAllTeams()
  const chains = agentHierarchy.getAllChains()
  const allPerformance = agentHierarchy.getAllPerformance()
  const allStatuses = agentHierarchy.getAllStatuses()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'teams', label: 'Teams', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'chains', label: 'Chains', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ]

  const totalCompleted = allPerformance.reduce((sum, p) => sum + p.completedTasks, 0)
  const totalFailed = allPerformance.reduce((sum, p) => sum + p.failedTasks, 0)
  const avgSuccessRate = allPerformance.length > 0
    ? allPerformance.reduce((sum, p) => sum + p.successRate, 0) / allPerformance.length
    : 1.0

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-ide-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">Agent Dashboard</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ide-accent/10 text-ide-accent">
            {allStatuses.filter(s => s.status !== 'idle').length} active
          </span>
        </div>
        <button onClick={onClose} className="text-ide-text-muted hover:text-ide-text text-lg">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border px-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-ide-accent text-ide-accent'
                : 'border-transparent text-ide-text-muted hover:text-ide-text'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={<Users className="w-4 h-4" />} label="Agents" value="8" sub={`${leadAgents.length} leads`} color="text-blue-400" />
              <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Completed" value={String(totalCompleted)} sub={`${totalFailed} failed`} color="text-green-400" />
              <StatCard icon={<Target className="w-4 h-4" />} label="Success" value={`${Math.round(avgSuccessRate * 100)}%`} sub="avg rate" color="text-cyan-400" />
              <StatCard icon={<Zap className="w-4 h-4" />} label="Active" value={String(allStatuses.filter(s => s.status !== 'idle').length)} sub="working" color="text-yellow-400" />
            </div>

            {/* Lead Agents */}
            <div>
              <h3 className="text-xs font-semibold text-ide-text-muted uppercase mb-2">Lead Agents</h3>
              <div className="space-y-2">
                {leadAgents.map(lead => (
                  <LeadAgentCard key={lead.type} lead={lead} />
                ))}
              </div>
            </div>

            {/* Agent Status Grid */}
            <div>
              <h3 className="text-xs font-semibold text-ide-text-muted uppercase mb-2">Agent Status</h3>
              <div className="grid grid-cols-4 gap-2">
                {allStatuses.map(status => (
                  <StatusBadge key={status.agentType} status={status} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TEAMS TAB ═══ */}
        {activeTab === 'teams' && (
          <div className="space-y-3">
            {teams.map(team => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        {/* ═══ CHAINS TAB ═══ */}
        {activeTab === 'chains' && (
          <div className="space-y-3">
            {chains.map(chain => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        )}

        {/* ═══ PERFORMANCE TAB ═══ */}
        {activeTab === 'performance' && (
          <div className="space-y-3">
            {allPerformance
              .sort((a, b) => b.totalTasks - a.totalTasks)
              .map(perf => (
                <PerformanceCard key={perf.agentType} perf={perf} />
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="p-3 rounded-lg bg-ide-bg border border-ide-border">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-[10px] font-medium uppercase">{label}</span>
      </div>
      <div className="text-lg font-bold text-ide-text">{value}</div>
      <div className="text-[10px] text-ide-text-muted">{sub}</div>
    </div>
  )
}

function LeadAgentCard({ lead }: { lead: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-ide-bg border border-ide-border overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-ide-border/30"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-ide-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-ide-text-muted" />}
        <span className="text-lg">{lead.icon}</span>
        <div className="flex-1">
          <div className={`text-sm font-medium ${lead.color}`}>{lead.name}</div>
          <div className="text-[10px] text-ide-text-muted">{lead.description.slice(0, 80)}...</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ide-text">{lead.totalCompleted}</div>
          <div className="text-[10px] text-ide-text-muted">completed</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ide-text">{Math.round(lead.successRate * 100)}%</div>
          <div className="text-[10px] text-ide-text-muted">success</div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-ide-border">
          <div className="pt-2">
            <div className="text-[10px] text-ide-text-muted mb-1">Sub-Agents</div>
            <div className="flex flex-wrap gap-1.5">
              {lead.subAgents.map((agentType: string) => (
                <span key={agentType} className="px-2 py-0.5 rounded text-[10px] bg-ide-surface border border-ide-border text-ide-text">
                  {agentType}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-ide-text-muted mt-2 mb-1">Specialties</div>
            <div className="flex flex-wrap gap-1.5">
              {lead.specialties.map((spec: string) => (
                <span key={spec} className="px-2 py-0.5 rounded text-[10px] bg-ide-accent/10 text-ide-accent">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: any }) {
  const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
    idle: { bg: 'bg-ide-bg', dot: 'bg-ide-text-muted', text: 'text-ide-text-muted' },
    working: { bg: 'bg-green-500/10', dot: 'bg-green-400 animate-pulse', text: 'text-green-400' },
    delegating: { bg: 'bg-blue-500/10', dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400' },
    waiting: { bg: 'bg-yellow-500/10', dot: 'bg-yellow-400', text: 'text-yellow-400' },
    error: { bg: 'bg-red-500/10', dot: 'bg-red-400', text: 'text-red-400' },
  }

  const colors = statusColors[status.status] || statusColors.idle

  return (
    <div className={`p-2 rounded-lg ${colors.bg} border border-ide-border`}>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span className={`text-[10px] font-medium capitalize ${colors.text}`}>{status.status}</span>
      </div>
      <div className="text-[10px] text-ide-text mt-0.5 capitalize">{status.agentType}</div>
      {status.currentTask && (
        <div className="text-[9px] text-ide-text-muted truncate mt-0.5">{status.currentTask}</div>
      )}
    </div>
  )
}

function TeamCard({ team }: { team: any }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-ide-bg border border-ide-border overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-ide-border/30"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-lg">{team.icon}</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-ide-text">{team.name}</div>
          <div className="text-[10px] text-ide-text-muted">{team.description}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ide-text">{team.members.length}</div>
          <div className="text-[10px] text-ide-text-muted">members</div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-ide-border">
          <div className="pt-2 space-y-2">
            <div>
              <div className="text-[10px] text-ide-text-muted mb-1">Members</div>
              <div className="flex flex-wrap gap-1.5">
                {team.members.map((m: string) => (
                  <span key={m} className="px-2 py-0.5 rounded text-[10px] bg-ide-surface border border-ide-border text-ide-text capitalize">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-ide-text-muted mb-1">Specializations</div>
              <div className="flex flex-wrap gap-1.5">
                {team.specializations.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-ide-accent/10 text-ide-accent">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-4 text-[10px] text-ide-text-muted">
              <span>Lead: <span className="text-ide-text capitalize">{team.lead}</span></span>
              <span>Completed: <span className="text-ide-text">{team.tasksCompleted}</span></span>
              <span>Active: <span className="text-ide-text">{team.activeWorkflows}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChainCard({ chain }: { chain: any }) {
  const statusColors: Record<string, string> = {
    idle: 'text-ide-text-muted',
    running: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  }

  return (
    <div className="rounded-lg bg-ide-bg border border-ide-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-3.5 h-3.5 text-ide-accent" />
        <span className="text-sm font-medium text-ide-text">{chain.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${statusColors[chain.status]} bg-ide-bg`}>
          {chain.status}
        </span>
      </div>
      <p className="text-[10px] text-ide-text-muted mb-2">{chain.description}</p>

      {/* Steps visualization */}
      <div className="flex items-center gap-1">
        {chain.steps.map((step: any, i: number) => {
          const isCompleted = i < chain.currentStep
          const isCurrent = i === chain.currentStep && chain.status === 'running'

          return (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                isCompleted ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : isCurrent ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse'
                  : 'bg-ide-surface text-ide-text-muted border border-ide-border'
              }`}>
                {isCompleted ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center text-[9px]">{i + 1}</span>}
                <span className="capitalize">{step.agentType}</span>
              </div>
              {i < chain.steps.length - 1 && (
                <div className={`w-4 h-px ${isCompleted ? 'bg-green-400' : 'bg-ide-border'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {chain.results.length > 0 && (
        <div className="mt-2 pt-2 border-t border-ide-border">
          <div className="text-[10px] text-ide-text-muted mb-1">Results</div>
          {chain.results.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
              {r.success ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
              <span className="text-ide-text capitalize">{r.agentType}</span>
              <span className="text-ide-text-muted">{r.duration}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PerformanceCard({ perf }: { perf: any }) {
  const agentColors: Record<string, string> = {
    code: 'text-blue-400',
    review: 'text-green-400',
    debug: 'text-yellow-400',
    architect: 'text-purple-400',
    test: 'text-pink-400',
    devops: 'text-orange-400',
    security: 'text-red-400',
    performance: 'text-cyan-400',
  }

  const agentIcons: Record<string, string> = {
    code: '💻', review: '🔍', debug: '🐛', architect: '🏗️',
    test: '🧪', devops: '🚀', security: '🛡️', performance: '⚡',
  }

  const color = agentColors[perf.agentType] || 'text-ide-text'
  const icon = agentIcons[perf.agentType] || '🤖'

  return (
    <div className="rounded-lg bg-ide-bg border border-ide-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-sm font-medium capitalize ${color}`}>{perf.agentType}</span>
        <span className="text-[10px] text-ide-text-muted ml-auto">
          Last active: {perf.lastActive ? new Date(perf.lastActive).toLocaleTimeString() : 'never'}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div>
          <div className="text-[10px] text-ide-text-muted">Total</div>
          <div className="text-sm font-bold text-ide-text">{perf.totalTasks}</div>
        </div>
        <div>
          <div className="text-[10px] text-ide-text-muted">Completed</div>
          <div className="text-sm font-bold text-green-400">{perf.completedTasks}</div>
        </div>
        <div>
          <div className="text-[10px] text-ide-text-muted">Failed</div>
          <div className="text-sm font-bold text-red-400">{perf.failedTasks}</div>
        </div>
        <div>
          <div className="text-[10px] text-ide-text-muted">Avg Time</div>
          <div className="text-sm font-bold text-ide-text">{Math.round(perf.avgResponseTime)}ms</div>
        </div>
      </div>

      {/* Success rate bar */}
      <div className="h-1.5 bg-ide-border rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all"
          style={{ width: `${Math.round(perf.successRate * 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-ide-text-muted mt-1">
        Success rate: {Math.round(perf.successRate * 100)}%
      </div>

      {/* Recent tasks */}
      {perf.recentTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-ide-border">
          <div className="text-[10px] text-ide-text-muted mb-1">Recent Tasks</div>
          {perf.recentTasks.slice(0, 3).map((task: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
              {task.success ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
              <span className="text-ide-text truncate flex-1">{task.title}</span>
              <span className="text-ide-text-muted">{task.duration}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
