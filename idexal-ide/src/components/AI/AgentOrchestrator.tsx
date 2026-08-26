import React, { useState, useEffect, useRef } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import {
  FaRobot, FaCode, FaSearch, FaBug, FaCubes, FaFlask,
  FaRocket, FaShieldAlt, FaTachometerAlt, FaSpinner,
  FaCheck, FaTimes, FaPaperPlane, FaTrash, FaSync,
  FaArrowRight, FaChevronDown, FaChevronRight,
} from '../Icon'

type AgentStatus = 'idle' | 'thinking' | 'working' | 'done' | 'error'

interface AgentInstance {
  id: string
  type: string
  name: string
  status: AgentStatus
  task?: string
  result?: string
  progress?: number
  startTime?: number
  endTime?: number
}

const AGENT_TYPES = [
  { type: 'code', name: 'Code Agent', icon: FaCode, color: 'blue', desc: 'Writes and refactors code' },
  { type: 'review', name: 'Review Agent', icon: FaSearch, color: 'green', desc: 'Reviews code quality' },
  { type: 'debug', name: 'Debug Agent', icon: FaBug, color: 'yellow', desc: 'Finds and fixes bugs' },
  { type: 'architect', name: 'Architect', icon: FaCubes, color: 'purple', desc: 'Designs architecture' },
  { type: 'test', name: 'Test Agent', icon: FaFlask, color: 'pink', desc: 'Writes unit tests' },
  { type: 'devops', name: 'DevOps Agent', icon: FaRocket, color: 'orange', desc: 'CI/CD and deployment' },
  { type: 'security', name: 'Security Agent', icon: FaShieldAlt, color: 'red', desc: 'Security auditing' },
  { type: 'performance', name: 'Perf Agent', icon: FaTachometerAlt, color: 'cyan', desc: 'Performance optimization' },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  green:  { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-400' },
  pink:   { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', dot: 'bg-pink-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  red:    { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  cyan:   { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-400' },
}

const STATUS_CONFIG: Record<AgentStatus, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: <div className="w-2 h-2 rounded-full bg-gray-400" />, label: 'Idle', color: 'text-gray-400' },
  thinking: { icon: <FaSpinner className="w-3 h-3 animate-spin text-blue-400" />, label: 'Thinking', color: 'text-blue-400' },
  working: { icon: <FaSpinner className="w-3 h-3 animate-spin text-yellow-400" />, label: 'Working', color: 'text-yellow-400' },
  done: { icon: <FaCheck className="w-3 h-3 text-green-400" />, label: 'Done', color: 'text-green-400' },
  error: { icon: <FaTimes className="w-3 h-3 text-red-400" />, label: 'Error', color: 'text-red-400' },
}

export default function AgentOrchestrator() {
  const [task, setTask] = useState('')
  const [agents, setAgents] = useState<AgentInstance[]>([])
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set(['code', 'review', 'test']))
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [logs, setLogs] = useState<Array<{ time: string; agent: string; message: string }>>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (agent: string, message: string) => {
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      agent,
      message,
    }])
  }

  const toggleAgent = (type: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const startOrchestration = async () => {
    if (!task.trim() || selectedAgents.size === 0) return

    setIsOrchestrating(true)
    setLogs([])
    addLog('system', `Starting orchestration with ${selectedAgents.size} agents...`)

    // Create agent instances
    const instances: AgentInstance[] = Array.from(selectedAgents).map(type => {
      const agentType = AGENT_TYPES.find(a => a.type === type)!
      return {
        id: `${type}-${Date.now()}`,
        type,
        name: agentType.name,
        status: 'idle' as AgentStatus,
        task,
        startTime: Date.now(),
      }
    })
    setAgents(instances)

    // Simulate orchestration (in production, this would call the Rust engine)
    for (let i = 0; i < instances.length; i++) {
      const agent = instances[i]

      // Set to thinking
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'thinking' } : a))
      addLog(agent.type, 'Analyzing task...')
      await sleep(500 + Math.random() * 1000)

      // Set to working
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'working', progress: 0 } : a))
      addLog(agent.type, 'Executing...')

      // Simulate progress
      for (let p = 0; p <= 100; p += 20) {
        await sleep(200 + Math.random() * 300)
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, progress: p } : a))
      }

      // Set to done
      setAgents(prev => prev.map(a => a.id === agent.id ? {
        ...a,
        status: 'done',
        result: generateResult(agent.type, task),
        endTime: Date.now(),
      } : a))
      addLog(agent.type, 'Completed successfully ✓')
    }

    addLog('system', `Orchestration complete — ${instances.length} agents finished`)
    setIsOrchestrating(false)
  }

  const clearAll = () => {
    setAgents([])
    setLogs([])
    setTask('')
    setIsOrchestrating(false)
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <FaCubes className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Agent Orchestrator</h2>
            <p className="text-[10px] text-[var(--color-text-secondary)]">Multi-agent task coordination</p>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {AGENT_TYPES.map(agent => {
            const Icon = agent.icon
            const colors = COLOR_MAP[agent.color]
            const selected = selectedAgents.has(agent.type)
            return (
              <button
                key={agent.type}
                onClick={() => toggleAgent(agent.type)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  selected
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/30'
                }`}
              >
                <Icon className="w-3 h-3" />
                {agent.name.replace(' Agent', '')}
              </button>
            )
          })}
        </div>

        {/* Task Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startOrchestration()}
            placeholder="Describe the task for the agents..."
            className="flex-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            disabled={isOrchestrating}
          />
          <button
            onClick={isOrchestrating ? clearAll : startOrchestration}
            disabled={!isOrchestrating && (!task.trim() || selectedAgents.size === 0)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isOrchestrating
                ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                : 'bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-30'
            }`}
          >
            {isOrchestrating ? <FaTimes className="w-4 h-4" /> : <FaPaperPlane className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Agent Status Grid */}
      {agents.length > 0 && (
        <div className="p-3 border-b border-[var(--color-border)]">
          <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Agent Status</div>
          <div className="grid grid-cols-2 gap-2">
            {agents.map(agent => {
              const agentType = AGENT_TYPES.find(a => a.type === agent.type)!
              const colors = COLOR_MAP[agentType.color]
              const status = STATUS_CONFIG[agent.status]
              return (
                <div
                  key={agent.id}
                  className={`p-3 rounded-xl border ${colors.border} ${colors.bg} transition-all`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <agentType.icon className={`w-3.5 h-3.5 ${colors.text}`} />
                      <span className={`text-xs font-semibold ${colors.text}`}>{agentType.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {status.icon}
                      <span className={`text-[10px] ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                  {agent.progress !== undefined && agent.status === 'working' && (
                    <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.dot} rounded-full transition-all duration-300`}
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  )}
                  {agent.result && (
                    <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)] line-clamp-2">{agent.result}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="flex-1 overflow-auto p-3">
        <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Activity Log</div>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-secondary)]">
            <FaCubes className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs">Select agents and describe a task</span>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-[11px]">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="text-[var(--color-text-secondary)] flex-shrink-0">{log.time}</span>
                <span className={`font-semibold flex-shrink-0 ${
                  log.agent === 'system' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                }`}>[{log.agent}]</span>
                <span className="text-[var(--color-text-secondary)]">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateResult(agentType: string, task: string): string {
  const results: Record<string, string> = {
    code: `Implemented core logic for: ${task.slice(0, 40)}...`,
    review: 'No critical issues found. 2 suggestions for improvement.',
    debug: 'Identified 1 potential null reference. Added safety check.',
    architect: 'Recommended modular structure with clear boundaries.',
    test: 'Generated 8 unit tests covering edge cases.',
    devops: 'CI pipeline configured. Build time: ~45s.',
    security: 'No vulnerabilities detected. All inputs validated.',
    performance: 'Identified 1 N+1 query. Suggested batch loading.',
  }
  return results[agentType] || 'Task completed.'
}
