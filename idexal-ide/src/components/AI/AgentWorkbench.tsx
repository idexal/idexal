import React, { useState, useMemo, useEffect } from 'react'
import {
  FaBrain, FaPlay, FaPause, FaCode, FaSync, FaSearch, FaPlus, FaChevronDown, FaChevronRight, FaClock, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaBolt, FaTerminal, FaCodeBranch, FaShieldAlt, FaChartLine, FaCopy, FaCheck, FaCog, FaTrash, FaArrowRight, FaPen
} from '../Icon'

type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused'
type AgentType = 'code' | 'review' | 'debug' | 'test' | 'deploy' | 'security' | 'refactor' | 'docs'

interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  description: string
  model: string
  systemPrompt: string
  tasks: AgentTask[]
  createdAt: Date
  lastRun?: Date
  totalRuns: number
  successRate: number
}

interface AgentTask {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  startTime?: Date
  endTime?: Date
  tokens?: number
}

const AGENT_TYPES: Record<AgentType, { icon: typeof FaCode; color: string; label: string }> = {
  code: { icon: FaCode, color: 'text-blue-400', label: 'FaCode Generator' },
  review: { icon: FaShieldAlt, color: 'text-green-400', label: 'FaCode Reviewer' },
  debug: { icon: FaExclamationTriangle, color: 'text-red-400', label: 'Debugger' },
  test: { icon: FaCheckCircle, color: 'text-yellow-400', label: 'Test Writer' },
  deploy: { icon: FaBolt, color: 'text-purple-400', label: 'Deployer' },
  security: { icon: FaShieldAlt, color: 'text-orange-400', label: 'Security Scanner' },
  refactor: { icon: FaSync, color: 'text-cyan-400', label: 'Refactorer' },
  docs: { icon: FaPen, color: 'text-pink-400', label: 'Doc Writer' },
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'a1', name: 'FaCode Review Agent', type: 'review', status: 'completed', description: 'Reviews code for best practices, security issues, and performance',
    model: 'claude-3.5-sonnet', systemPrompt: 'You are an expert code reviewer...', tasks: [
      { id: 't1', description: 'Review src/App.tsx for patterns', status: 'completed', result: 'Found 3 issues: missing error boundaries, unused imports, potential memory leak', tokens: 1250 },
      { id: 't2', description: 'Check security vulnerabilities', status: 'completed', result: 'No critical vulnerabilities found. 2 warnings for XSS prevention', tokens: 890 },
      { id: 't3', description: 'Performance analysis', status: 'completed', result: 'Suggested lazy loading for 2 components, memo for 1 computation', tokens: 1100 },
    ], createdAt: new Date(Date.now() - 86400000), lastRun: new Date(Date.now() - 3600000), totalRuns: 47, successRate: 98
  },
  {
    id: 'a2', name: 'Test Generator', type: 'test', status: 'running', description: 'Automatically generates unit and integration tests',
    model: 'gpt-4o', systemPrompt: 'Generate comprehensive tests...', tasks: [
      { id: 't4', description: 'Generate tests for aiService.ts', status: 'completed', result: 'Created 12 test cases with 94% coverage', tokens: 2100 },
      { id: 't5', description: 'Generate tests for aiProviders.ts', status: 'running', tokens: 890 },
      { id: 't6', description: 'Generate tests for settingsStore.ts', status: 'pending' },
    ], createdAt: new Date(Date.now() - 172800000), lastRun: new Date(), totalRuns: 23, successRate: 95
  },
  {
    id: 'a3', name: 'Security Scanner', type: 'security', status: 'idle', description: 'Scans codebase for security vulnerabilities and OWASP issues',
    model: 'claude-3-opus', systemPrompt: 'Analyze code for security...', tasks: [
      { id: 't7', description: 'Scan for hardcoded secrets', status: 'completed', result: 'Found 0 hardcoded secrets. All API keys use environment variables', tokens: 1500 },
      { id: 't8', description: 'Check dependency vulnerabilities', status: 'completed', result: '0 critical, 2 high, 5 medium vulnerabilities in dependencies', tokens: 2200 },
    ], createdAt: new Date(Date.now() - 259200000), lastRun: new Date(Date.now() - 86400000), totalRuns: 15, successRate: 100
  },
  {
    id: 'a4', name: 'Refactoring Assistant', type: 'refactor', status: 'idle', description: 'Identifies and performs safe code refactoring opportunities',
    model: 'gpt-4o', systemPrompt: 'Analyze code for refactoring...', tasks: [], createdAt: new Date(Date.now() - 345600000), totalRuns: 8, successRate: 100
  },
  {
    id: 'a5', name: 'Documentation Writer', type: 'docs', status: 'failed', description: 'Generates comprehensive documentation for code',
    model: 'claude-3.5-sonnet', systemPrompt: 'Write documentation...', tasks: [
      { id: 't9', description: 'Generate API documentation', status: 'failed', result: 'Error: Rate limit exceeded', tokens: 0 },
    ], createdAt: new Date(Date.now() - 432000000), lastRun: new Date(Date.now() - 172800000), totalRuns: 12, successRate: 83
  },
]

const STATUS_CONFIG: Record<AgentStatus, { color: string; bg: string; icon: typeof FaCheckCircle }> = {
  idle: { color: 'text-gray-400', bg: 'bg-gray-400/10', icon: FaClock },
  running: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: FaChartLine },
  completed: { color: 'text-green-400', bg: 'bg-green-400/10', icon: FaCheckCircle },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', icon: FaTimesCircle },
  paused: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: FaPause },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  return `${hours}h ago`
}

export default function AgentWorkbench({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState(MOCK_AGENTS)
  const [selectedAgent, setSelectedAgent] = useState<string | null>('a1')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const agent = agents.find(a => a.id === selectedAgent)

  const stats = useMemo(() => ({
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    completed: agents.filter(a => a.status === 'completed').length,
    failed: agents.filter(a => a.status === 'failed').length,
    totalTasks: agents.reduce((s, a) => s + a.tasks.length, 0),
    totalTokens: agents.reduce((s, a) => s + a.tasks.reduce((ts, t) => ts + (t.tokens || 0), 0), 0),
  }), [agents])

  // Simulate running agent
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.status !== 'running') return a
        const runningTask = a.tasks.find(t => t.status === 'running')
        if (runningTask && Math.random() > 0.7) {
          return {
            ...a,
            tasks: a.tasks.map(t => t.id === runningTask.id ? {
              ...t, status: 'completed' as const, result: 'Task completed successfully',
              endTime: new Date(), tokens: Math.floor(Math.random() * 2000) + 500
            } : t),
          }
        }
        return a
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBrain size={16} className="text-pink-400" />
          <span className="text-sm font-semibold">Agent Workbench</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            {stats.running} running
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewAgent(true)}
            className="px-2 py-0.5 bg-pink-600 hover:bg-pink-500 rounded text-xs flex items-center gap-1"
          >
            <FaPlus size={10} /> New Agent
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Agents', value: stats.total, color: 'text-pink-400' },
          { label: 'Running', value: stats.running, color: 'text-blue-400' },
          { label: 'Tasks', value: stats.totalTasks, color: 'text-green-400' },
          { label: 'Tokens', value: `${(stats.totalTokens / 1000).toFixed(1)}K`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Agent List */}
        <div className="w-[220px] border-r border-ide-border overflow-y-auto flex-shrink-0">
          <div className="px-2 py-1.5 border-b border-ide-border/30">
            <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1">
              <FaSearch size={10} className="text-ide-text-secondary" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Agents..."
                className="flex-1 bg-transparent text-[10px] outline-none text-ide-text"
              />
            </div>
          </div>

          {agents
            .filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(a => {
              const typeInfo = AGENT_TYPES[a.type]
              const statusCfg = STATUS_CONFIG[a.status]
              const Icon = typeInfo.icon
              const StatusIcon = statusCfg.icon
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAgent(a.id)}
                  className={`px-2 py-1.5 cursor-pointer border-b border-ide-border/10 ${
                    selectedAgent === a.id ? 'bg-pink-500/10' : 'hover:bg-ide-bg-secondary/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={12} className={typeInfo.color} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{a.name}</div>
                      <div className="text-[9px] text-ide-text-secondary truncate">{a.model}</div>
                    </div>
                    <StatusIcon size={10} className={statusCfg.color} />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 ml-5">
                    <span className={`text-[8px] px-1 rounded ${statusCfg.bg} ${statusCfg.color}`}>
                      {a.status}
                    </span>
                    <span className="text-[8px] text-ide-text-secondary">{a.tasks.length} tasks</span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Agent Details */}
        <div className="flex-1 overflow-y-auto">
          {agent ? (
            <div className="p-3 space-y-3">
              {/* Agent Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(AGENT_TYPES[agent.type].icon, { size: 16, className: AGENT_TYPES[agent.type].color })}
                  <div>
                    <h3 className="text-sm font-semibold">{agent.name}</h3>
                    <span className="text-[10px] text-ide-text-secondary">{agent.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {agent.status === 'idle' && (
                    <button className="px-2 py-0.5 bg-green-600 hover:bg-green-500 rounded text-[10px] flex items-center gap-0.5">
                      <FaPlay size={8} /> Run
                    </button>
                  )}
                  {agent.status === 'running' && (
                    <>
                      <button className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-[10px] flex items-center gap-0.5">
                        <FaPause size={8} /> FaPause
                      </button>
                      <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] flex items-center gap-0.5">
                        <FaCode size={8} /> Stop
                      </button>
                    </>
                  )}
                  <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
                    <FaCog size={12} />
                  </button>
                </div>
              </div>

              {/* Agent Info */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-ide-bg-secondary/20 rounded p-2">
                  <span className="text-ide-text-secondary">Model</span>
                  <div className="font-mono text-ide-text">{agent.model}</div>
                </div>
                <div className="bg-ide-bg-secondary/20 rounded p-2">
                  <span className="text-ide-text-secondary">Type</span>
                  <div className={AGENT_TYPES[agent.type].color}>{AGENT_TYPES[agent.type].label}</div>
                </div>
                <div className="bg-ide-bg-secondary/20 rounded p-2">
                  <span className="text-ide-text-secondary">Total Runs</span>
                  <div className="text-ide-text">{agent.totalRuns}</div>
                </div>
                <div className="bg-ide-bg-secondary/20 rounded p-2">
                  <span className="text-ide-text-secondary">Success Rate</span>
                  <div className={agent.successRate >= 90 ? 'text-green-400' : 'text-yellow-400'}>{agent.successRate}%</div>
                </div>
              </div>

              {/* System Prompt */}
              <div className="bg-ide-bg-secondary/20 rounded p-2">
                <div className="text-[10px] text-ide-text-secondary mb-1">System Prompt</div>
                <div className="text-[10px] font-mono text-ide-text truncate">{agent.systemPrompt}</div>
              </div>

              {/* Tasks */}
              <div>
                <div className="text-[10px] text-ide-text-secondary mb-1 flex items-center justify-between">
                  <span>Tasks ({agent.tasks.length})</span>
                  <button className="text-pink-400 flex items-center gap-0.5">
                    <FaPlus size={8} /> Add Task
                  </button>
                </div>
                <div className="space-y-1">
                  {agent.tasks.map(task => {
                    const isExpanded = expandedTask === task.id
                    return (
                      <div key={task.id} className="bg-ide-bg-secondary/10 rounded border border-ide-border/30">
                        <div
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                        >
                          {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                          <span className={`w-2 h-2 rounded-full ${
                            task.status === 'completed' ? 'bg-green-400' :
                            task.status === 'running' ? 'bg-blue-400 animate-pulse' :
                            task.status === 'failed' ? 'bg-red-400' : 'bg-gray-400'
                          }`} />
                          <span className="text-[10px] flex-1 truncate">{task.description}</span>
                          {task.tokens && <span className="text-[9px] text-ide-text-secondary">{task.tokens} tokens</span>}
                        </div>
                        {isExpanded && task.result && (
                          <div className="px-3 pb-2 text-[10px] text-ide-text border-t border-ide-border/20 pt-1">
                            {task.result}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ide-text-secondary">
              <FaBrain size={48} className="mb-3 opacity-20" />
              <span className="text-sm">Select an agent to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
