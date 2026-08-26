/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                 AGENT HIERARCHY v2.0                            ║
 * ║          Lead Agents • Sub-Agent Pools • Teams • Chains         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *   Lead Agent (Orchestrator)
 *   ├── Sub-Agent Pool (specialized workers)
 *   ├── Team (cross-functional group)
 *   └── Chain (sequential processing pipeline)
 *
 * Features:
 * - 3 Lead agents that manage sub-agent pools
 * - 5 domain teams for cross-functional work
 * - Chain system for sequential processing
 * - Performance tracking per agent
 * - Adaptive routing based on task complexity
 */

import { AgentType, TaskPriority, TaskResult, AgentTask } from './agentOrchestrator'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface LeadAgent {
  type: LeadAgentType
  name: string
  icon: string
  color: string
  description: string
  subAgents: AgentType[]
  maxConcurrent: number
  currentTasks: number
  totalCompleted: number
  avgResponseTime: number    // ms
  successRate: number        // 0-1
  specialties: string[]
  canHandleDirectly: boolean // can work without sub-agents
}

export type LeadAgentType = 'engineering' | 'quality' | 'operations'

export interface AgentTeam {
  id: string
  name: string
  icon: string
  description: string
  members: AgentType[]
  lead: LeadAgentType
  specializations: string[]
  avgCompletionTime: number
  tasksCompleted: number
  activeWorkflows: number
}

export interface AgentChain {
  id: string
  name: string
  description: string
  steps: ChainStep[]
  currentStep: number
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  context: Map<string, string>
  results: ChainResult[]
}

export interface ChainStep {
  agentType: AgentType
  action: string
  inputTemplate: string
  timeout?: number          // ms
  retryCount?: number
  skipIf?: (context: Map<string, string>) => boolean
}

export interface ChainResult {
  stepIndex: number
  agentType: AgentType
  success: boolean
  output: string
  duration: number          // ms
  timestamp: number
}

export interface AgentPerformance {
  agentType: AgentType
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number          // 0-1
  avgResponseTime: number
  lastActive: number
  specialtyScores: Record<string, number>  // 0-1 per specialty
  recentTasks: { title: string; success: boolean; duration: number; timestamp: number }[]
}

export interface AgentStatus {
  agentType: AgentType
  status: 'idle' | 'working' | 'delegating' | 'waiting' | 'error'
  currentTask?: string
  queuedTasks: number
  lastActivity: number
}

// ══════════════════════════════════════════════════════════════
// LEAD AGENTS DEFINITION
// ══════════════════════════════════════════════════════════════

const LEAD_AGENTS: Record<LeadAgentType, Omit<LeadAgent, 'currentTasks' | 'totalCompleted' | 'avgResponseTime' | 'successRate'>> = {
  engineering: {
    type: 'engineering',
    name: 'Engineering Lead',
    icon: '🏗️',
    color: 'text-blue-400',
    description: 'Manages code implementation, architecture, and technical design. Delegates to Code, Architect, Debug, Data, and Design agents.',
    subAgents: ['code', 'architect', 'debug', 'data', 'design'],
    maxConcurrent: 7,
    specialties: ['implementation', 'architecture', 'debugging', 'refactoring', 'technical-design', 'data-science', 'ui-design'],
    canHandleDirectly: true,
  },
  quality: {
    type: 'quality',
    name: 'Quality Lead',
    icon: '🔍',
    color: 'text-green-400',
    description: 'Manages code review, testing, and quality assurance. Delegates to Review, Test, Security, and Performance agents.',
    subAgents: ['review', 'test', 'security', 'performance'],
    maxConcurrent: 4,
    specialties: ['review', 'testing', 'security-audit', 'performance', 'quality-assurance'],
    canHandleDirectly: true,
  },
  operations: {
    type: 'operations',
    name: 'Operations Lead',
    icon: '🚀',
    color: 'text-orange-400',
    description: 'Manages deployment, infrastructure, and DevOps. Delegates to DevOps, Security, Performance, and Data agents.',
    subAgents: ['devops', 'security', 'performance', 'data'],
    maxConcurrent: 4,
    specialties: ['deployment', 'ci-cd', 'infrastructure', 'monitoring', 'scaling', 'data-pipelines'],
    canHandleDirectly: true,
  },
}

// ══════════════════════════════════════════════════════════════
// AGENT TEAMS DEFINITION
// ══════════════════════════════════════════════════════════════

const AGENT_TEAMS: Omit<AgentTeam, 'avgCompletionTime' | 'tasksCompleted' | 'activeWorkflows'>[] = [
  {
    id: 'fullstack',
    name: 'Full-Stack Team',
    icon: '🌐',
    description: 'End-to-end feature development from frontend to backend',
    members: ['code', 'architect', 'review', 'test'],
    lead: 'engineering',
    specializations: ['fullstack', 'feature-development', 'api-design', 'ui-implementation'],
  },
  {
    id: 'security-hardening',
    name: 'Security Hardening Team',
    icon: '🛡️',
    description: 'Comprehensive security analysis, fixes, and compliance',
    members: ['security', 'code', 'review', 'devops'],
    lead: 'quality',
    specializations: ['vulnerability-fixing', 'security-audit', 'compliance', 'secure-coding'],
  },
  {
    id: 'performance-optimization',
    name: 'Performance Team',
    icon: '⚡',
    description: 'Profiling, optimization, and performance monitoring',
    members: ['performance', 'code', 'architect', 'test'],
    lead: 'quality',
    specializations: ['profiling', 'optimization', 'caching', 'scaling', 'benchmarking'],
  },
  {
    id: 'incident-response',
    name: 'Incident Response Team',
    icon: '🚨',
    description: 'Rapid bug detection, fixing, and regression prevention',
    members: ['debug', 'code', 'test', 'review'],
    lead: 'engineering',
    specializations: ['bug-fixing', 'root-cause-analysis', 'hotfix', 'regression-prevention'],
  },
  {
    id: 'delivery',
    name: 'Delivery Team',
    icon: '🚢',
    description: 'Build, test, containerize, and deploy',
    members: ['devops', 'code', 'test', 'security'],
    lead: 'operations',
    specializations: ['ci-cd', 'docker', 'deployment', 'monitoring', 'release-management'],
  },
  {
    id: 'data-ai',
    name: 'Data & AI Team',
    icon: '📊',
    description: 'Data analysis, ML models, embeddings, and RAG pipelines',
    members: ['data', 'code', 'database', 'review'],
    lead: 'engineering',
    specializations: ['data-science', 'machine-learning', 'embeddings', 'rag', 'analytics'],
  },
  {
    id: 'ui-design',
    name: 'UI/UX Design Team',
    icon: '🎨',
    description: 'Interface design, design systems, and user experience',
    members: ['design', 'code', 'review', 'test'],
    lead: 'engineering',
    specializations: ['ui-design', 'ux-research', 'design-system', 'accessibility', 'animations'],
  },
]

// ══════════════════════════════════════════════════════════════
// CHAIN TEMPLATES
// ══════════════════════════════════════════════════════════════

const CHAIN_TEMPLATES: Omit<AgentChain, 'currentStep' | 'status' | 'context' | 'results'>[] = [
  {
    id: 'implement-review-test',
    name: 'Implement → Review → Test',
    description: 'Write code, review it, then test it',
    steps: [
      { agentType: 'code', action: 'implement', inputTemplate: '{task}' },
      { agentType: 'review', action: 'review', inputTemplate: 'Review this implementation:\n\n{step:0}' },
      { agentType: 'test', action: 'test', inputTemplate: 'Write tests for:\n\n{step:0}\n\nReview: {step:1}' },
    ],
  },
  {
    id: 'secure-build-deploy',
    name: 'Secure → Build → Deploy',
    description: 'Security check, build, containerize, deploy',
    steps: [
      { agentType: 'security', action: 'scan', inputTemplate: 'Security scan:\n\n{task}' },
      { agentType: 'code', action: 'fix', inputTemplate: 'Fix security issues:\n\n{step:0}', skipIf: (ctx) => !ctx.get('step:0')?.includes('Critical') },
      { agentType: 'devops', action: 'build', inputTemplate: 'Build and containerize:\n\n{task}' },
      { agentType: 'devops', action: 'deploy', inputTemplate: 'Deploy:\n\n{step:2}' },
    ],
  },
  {
    id: 'analyze-optimize-verify',
    name: 'Analyze → Optimize → Verify',
    description: 'Performance analysis, optimization, verification',
    steps: [
      { agentType: 'performance', action: 'analyze', inputTemplate: 'Analyze performance:\n\n{task}' },
      { agentType: 'code', action: 'optimize', inputTemplate: 'Apply optimizations:\n\n{step:0}' },
      { agentType: 'test', action: 'benchmark', inputTemplate: 'Benchmark the optimizations:\n\n{step:1}' },
      { agentType: 'performance', action: 'verify', inputTemplate: 'Verify performance gains:\n\nOriginal: {step:0}\nOptimized: {step:1}\nBenchmark: {step:2}' },
    ],
  },
  {
    id: 'design-implement-review',
    name: 'Design → Implement → Review',
    description: 'Architecture design, implementation, code review',
    steps: [
      { agentType: 'architect', action: 'design', inputTemplate: 'Design the architecture:\n\n{task}' },
      { agentType: 'code', action: 'implement', inputTemplate: 'Implement based on design:\n\n{step:0}' },
      { agentType: 'review', action: 'review', inputTemplate: 'Review implementation against design:\n\nDesign: {step:0}\nCode: {step:1}' },
    ],
  },
  {
    id: 'document-api',
    name: 'Document API',
    description: 'Analyze API, write OpenAPI spec, generate SDK docs',
    steps: [
      { agentType: 'api', action: 'analyze', inputTemplate: 'Analyze the API endpoints:\n\n{task}' },
      { agentType: 'documentation', action: 'openapi', inputTemplate: 'Write OpenAPI specification:\n\n{step:0}' },
      { agentType: 'documentation', action: 'sdk-docs', inputTemplate: 'Generate SDK documentation:\n\nAPI: {step:0}\nSpec: {step:1}' },
      { agentType: 'review', action: 'verify', inputTemplate: 'Verify documentation accuracy:\n\nAPI: {step:0}\nDocs: {step:2}' },
    ],
  },
  {
    id: 'migrate-database',
    name: 'Database Migration',
    description: 'Analyze schema, plan migration, implement, test, verify',
    steps: [
      { agentType: 'database', action: 'analyze', inputTemplate: 'Analyze current database schema:\n\n{task}' },
      { agentType: 'migration', action: 'plan', inputTemplate: 'Plan migration steps:\n\nSchema: {step:0}\n\n{task}' },
      { agentType: 'code', action: 'implement', inputTemplate: 'Implement migration scripts:\n\nPlan: {step:1}' },
      { agentType: 'test', action: 'test-migration', inputTemplate: 'Test migration:\n\nScripts: {step:2}\nPlan: {step:1}' },
      { agentType: 'review', action: 'verify', inputTemplate: 'Verify migration is safe and reversible:\n\nPlan: {step:1}\nTests: {step:3}' },
    ],
  },
  {
    id: 'refactor-module',
    name: 'Module Refactoring',
    description: 'Analyze code smells, plan refactoring, execute, review, test',
    steps: [
      { agentType: 'review', action: 'audit', inputTemplate: 'Audit code for smells and improvement opportunities:\n\n{task}' },
      { agentType: 'architect', action: 'plan', inputTemplate: 'Plan refactoring approach:\n\nAudit: {step:0}\n\n{task}' },
      { agentType: 'refactoring', action: 'refactor', inputTemplate: 'Execute refactoring:\n\nPlan: {step:1}\nAudit: {step:0}' },
      { agentType: 'test', action: 'verify', inputTemplate: 'Verify refactored code:\n\nRefactored: {step:2}' },
      { agentType: 'review', action: 'final-review', inputTemplate: 'Final review of refactored code:\n\nOriginal: {task}\nRefactored: {step:2}\nTests: {step:3}' },
    ],
  },
  {
    id: 'api-migration',
    name: 'API Version Migration',
    description: 'Analyze breaking changes, update clients, document new version',
    steps: [
      { agentType: 'api', action: 'analyze', inputTemplate: 'Analyze API breaking changes:\n\n{task}' },
      { agentType: 'migration', action: 'plan', inputTemplate: 'Plan migration path:\n\nBreaking changes: {step:0}\n\n{task}' },
      { agentType: 'code', action: 'update', inputTemplate: 'Update API clients and consumers:\n\nPlan: {step:1}' },
      { agentType: 'documentation', action: 'changelog', inputTemplate: 'Write migration guide and changelog:\n\nChanges: {step:0}\nPlan: {step:1}' },
      { agentType: 'test', action: 'verify', inputTemplate: 'Test API compatibility:\n\nUpdated code: {step:2}\nDocs: {step:3}' },
    ],
  },
  {
    id: 'write-tests',
    name: 'Add Test Coverage',
    description: 'Analyze coverage gaps, write unit, integration, and e2e tests',
    steps: [
      { agentType: 'test', action: 'analyze-coverage', inputTemplate: 'Analyze test coverage gaps:\n\n{task}' },
      { agentType: 'test', action: 'unit', inputTemplate: 'Write unit tests:\n\nCoverage gaps: {step:0}\n\n{task}' },
      { agentType: 'test', action: 'integration', inputTemplate: 'Write integration tests:\n\nUnit tests: {step:1}\n\n{task}' },
      { agentType: 'review', action: 'verify', inputTemplate: 'Review test quality:\n\nUnit: {step:1}\nIntegration: {step:2}' },
    ],
  },
  {
    id: 'security-harden',
    name: 'Security Hardening',
    description: 'Scan vulnerabilities, fix issues, add security tests, audit',
    steps: [
      { agentType: 'security', action: 'scan', inputTemplate: 'Security vulnerability scan:\n\n{task}' },
      { agentType: 'code', action: 'fix', inputTemplate: 'Fix security vulnerabilities:\n\nVulnerabilities: {step:0}\n\n{task}' },
      { agentType: 'test', action: 'security', inputTemplate: 'Write security tests:\n\nFixes: {step:1}\nVulnerabilities: {step:0}' },
      { agentType: 'security', action: 'audit', inputTemplate: 'Final security audit:\n\nFixes: {step:1}\nTests: {step:2}' },
    ],
  },
]

// ══════════════════════════════════════════════════════════════
// HIERARCHY MANAGER
// ══════════════════════════════════════════════════════════════

class AgentHierarchyManager {
  private leadAgents: Map<LeadAgentType, LeadAgent>
  private teams: Map<string, AgentTeam>
  private chains: Map<string, AgentChain>
  private performance: Map<AgentType, AgentPerformance>
  private agentStatus: Map<AgentType, AgentStatus>
  private listeners: Set<() => void> = new Set()

  constructor() {
    // Initialize lead agents
    this.leadAgents = new Map()
    for (const [type, def] of Object.entries(LEAD_AGENTS)) {
      this.leadAgents.set(type as LeadAgentType, {
        ...def,
        currentTasks: 0,
        totalCompleted: 0,
        avgResponseTime: 0,
        successRate: 1.0,
      })
    }

    // Initialize teams
    this.teams = new Map()
    for (const team of AGENT_TEAMS) {
      this.teams.set(team.id, {
        ...team,
        avgCompletionTime: 0,
        tasksCompleted: 0,
        activeWorkflows: 0,
      })
    }

    // Initialize chains
    this.chains = new Map()
    for (const chain of CHAIN_TEMPLATES) {
      this.chains.set(chain.id, {
        ...chain,
        currentStep: 0,
        status: 'idle',
        context: new Map(),
        results: [],
      })
    }

    // Initialize performance tracking
    this.performance = new Map()
    const allAgentTypes: AgentType[] = ['code', 'review', 'debug', 'architect', 'test', 'devops', 'security', 'performance']
    for (const type of allAgentTypes) {
      this.performance.set(type, {
        agentType: type,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        successRate: 1.0,
        avgResponseTime: 0,
        lastActive: 0,
        specialtyScores: {},
        recentTasks: [],
      })
    }

    // Initialize agent status
    this.agentStatus = new Map()
    for (const type of allAgentTypes) {
      this.agentStatus.set(type, {
        agentType: type,
        status: 'idle',
        queuedTasks: 0,
        lastActivity: Date.now(),
      })
    }
  }

  // ── Lead Agent Management ──────────────────────────────────

  getLeadAgent(type: LeadAgentType): LeadAgent | undefined {
    return this.leadAgents.get(type)
  }

  getAllLeadAgents(): LeadAgent[] {
    return Array.from(this.leadAgents.values())
  }

  /** Route a task to the best lead agent based on content analysis */
  routeToLead(taskDescription: string): LeadAgentType {
    const lower = taskDescription.toLowerCase()

    // Engineering: code, architecture, debugging
    if (lower.match(/implement|build|create|write|code|refactor|fix|debug|architect|design/)) {
      return 'engineering'
    }

    // Quality: review, testing, security, performance
    if (lower.match(/review|test|security|performance|audit|quality|check|verify/)) {
      return 'quality'
    }

    // Operations: deployment, infrastructure, devops
    if (lower.match(/deploy|docker|ci\/cd|pipeline|infrastructure|server|scale|monitor/)) {
      return 'operations'
    }

    // Default to engineering
    return 'engineering'
  }

  /** Get the best sub-agent within a lead for a specific task */
  selectSubAgent(leadType: LeadAgentType, taskDescription: string): AgentType | null {
    const lead = this.leadAgents.get(leadType)
    if (!lead) return null

    const lower = taskDescription.toLowerCase()
    const candidates = lead.subAgents

    // Score each candidate based on task content
    const scored = candidates.map(agent => {
      let score = 0
      const perf = this.performance.get(agent)

      // Base relevance score
      if (agent === 'code' && lower.match(/implement|write|create|build|code|fix/)) score += 10
      if (agent === 'review' && lower.match(/review|check|audit|quality/)) score += 10
      if (agent === 'debug' && lower.match(/debug|bug|error|crash|fix|issue/)) score += 10
      if (agent === 'architect' && lower.match(/design|architect|plan|structure|refactor/)) score += 10
      if (agent === 'test' && lower.match(/test|spec|coverage|assert|verify/)) score += 10
      if (agent === 'devops' && lower.match(/deploy|docker|ci|cd|build|pipeline/)) score += 10
      if (agent === 'security' && lower.match(/security|vulnerability|exploit|auth|xss|injection/)) score += 10
      if (agent === 'performance' && lower.match(/performance|slow|optimize|cache|speed|fast/)) score += 10

      // Performance bonus
      if (perf) {
        score += perf.successRate * 3
        score -= perf.avgResponseTime / 5000  // Penalty for slow agents
      }

      return { agent, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.agent || null
  }

  // ── Team Management ────────────────────────────────────────

  getTeam(id: string): AgentTeam | undefined {
    return this.teams.get(id)
  }

  getAllTeams(): AgentTeam[] {
    return Array.from(this.teams.values())
  }

  /** Find the best team for a task */
  selectTeam(taskDescription: string): AgentTeam | null {
    const lower = taskDescription.toLowerCase()
    let bestTeam: AgentTeam | null = null
    let bestScore = -1

    for (const team of this.teams.values()) {
      let score = 0

      // Match specializations
      for (const spec of team.specializations) {
        if (lower.includes(spec.replace(/-/g, ' '))) score += 5
      }

      // Match member agents
      for (const member of team.members) {
        if (lower.match(new RegExp(member))) score += 2
      }

      // Prefer teams with better track record
      if (team.tasksCompleted > 0) {
        score += Math.min(team.tasksCompleted / 10, 2)
      }

      if (score > bestScore) {
        bestScore = score
        bestTeam = team
      }
    }

    return bestTeam
  }

  // ── Chain Management ───────────────────────────────────────

  getChain(id: string): AgentChain | undefined {
    return this.chains.get(id)
  }

  getAllChains(): AgentChain[] {
    return Array.from(this.chains.values())
  }

  /** Select best chain for a task */
  selectChain(taskDescription: string): AgentChain | null {
    const lower = taskDescription.toLowerCase()

    if (lower.match(/implement|build|create|feature/)) {
      return this.chains.get('implement-review-test') || null
    }
    if (lower.match(/deploy|release|ship|container/)) {
      return this.chains.get('secure-build-deploy') || null
    }
    if (lower.match(/performance|slow|optimize|speed/)) {
      return this.chains.get('analyze-optimize-verify') || null
    }
    if (lower.match(/design|architect|plan|structure/)) {
      return this.chains.get('design-implement-review') || null
    }

    return this.chains.get('implement-review-test') || null
  }

  /** Execute a chain step */
  executeChainStep(chainId: string, input: string): ChainStep | null {
    const chain = this.chains.get(chainId)
    if (!chain || chain.status === 'completed' || chain.status === 'failed') return null

    chain.status = 'running'
    chain.context.set('task', input)

    const step = chain.steps[chain.currentStep]
    if (!step) {
      chain.status = 'completed'
      return null
    }

    // Check skip condition
    if (step.skipIf && step.skipIf(chain.context)) {
      chain.currentStep++
      return this.executeChainStep(chainId, input)
    }

    return step
  }

  /** Record chain step result */
  recordChainResult(chainId: string, success: boolean, output: string, duration: number) {
    const chain = this.chains.get(chainId)
    if (!chain) return

    const step = chain.steps[chain.currentStep]
    chain.results.push({
      stepIndex: chain.currentStep,
      agentType: step.agentType,
      success,
      output,
      duration,
      timestamp: Date.now(),
    })

    chain.context.set(`step:${chain.currentStep}`, output)
    chain.currentStep++

    if (!success) {
      chain.status = 'failed'
    } else if (chain.currentStep >= chain.steps.length) {
      chain.status = 'completed'
    }

    this.notify()
  }

  // ── Performance Tracking ───────────────────────────────────

  recordTaskCompletion(agentType: AgentType, title: string, success: boolean, duration: number) {
    const perf = this.performance.get(agentType)
    if (!perf) return

    perf.totalTasks++
    if (success) perf.completedTasks++
    else perf.failedTasks++

    perf.avgResponseTime = (perf.avgResponseTime * (perf.totalTasks - 1) + duration) / perf.totalTasks
    perf.lastActive = Date.now()

    perf.recentTasks.unshift({ title, success, duration, timestamp: Date.now() })
    if (perf.recentTasks.length > 20) perf.recentTasks = perf.recentTasks.slice(0, 20)

    // Update success rate
    perf.successRate = perf.totalTasks > 0 ? perf.completedTasks / perf.totalTasks : 1.0

    // Update lead agent stats
    for (const lead of this.leadAgents.values()) {
      if (lead.subAgents.includes(agentType)) {
        lead.totalCompleted++
        lead.avgResponseTime = (lead.avgResponseTime * (lead.totalCompleted - 1) + duration) / lead.totalCompleted
        lead.successRate = lead.totalCompleted > 0 ? lead.successRate * 0.9 + (success ? 0.1 : 0) : 1.0
      }
    }

    this.notify()
  }

  getPerformance(agentType: AgentType): AgentPerformance | undefined {
    return this.performance.get(agentType)
  }

  getAllPerformance(): AgentPerformance[] {
    return Array.from(this.performance.values())
  }

  // ── Agent Status ───────────────────────────────────────────

  setAgentStatus(agentType: AgentType, status: AgentStatus['status'], task?: string) {
    const s = this.agentStatus.get(agentType)
    if (s) {
      s.status = status
      s.currentTask = task
      s.lastActivity = Date.now()
      if (status === 'idle') s.currentTask = undefined
      this.notify()
    }
  }

  getAgentStatus(agentType: AgentType): AgentStatus | undefined {
    return this.agentStatus.get(agentType)
  }

  getAllStatuses(): AgentStatus[] {
    return Array.from(this.agentStatus.values())
  }

  // ── Smart Orchestration ────────────────────────────────────

  /**
   * Analyze a task and return the optimal execution plan
   */
  analyzeAndPlan(taskDescription: string): {
    lead: LeadAgentType
    agent: AgentType | null
    team: AgentTeam | null
    chain: AgentChain | null
    estimatedSteps: number
    complexity: 'simple' | 'moderate' | 'complex'
    reasoning: string
  } {
    const lead = this.routeToLead(taskDescription)
    const agent = this.selectSubAgent(lead, taskDescription)
    const team = this.selectTeam(taskDescription)
    const chain = this.selectChain(taskDescription)

    // Estimate complexity
    const lower = taskDescription.toLowerCase()
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
    let reasoning = ''

    const wordCount = taskDescription.split(/\s+/).length
    const hasMultipleRequests = (taskDescription.match(/and|also|additionally|then|after that/gi) || []).length > 0
    const needsMultipleAgents = chain ? chain.steps.length > 2 : false

    if (wordCount < 10 && !hasMultipleRequests) {
      complexity = 'simple'
      reasoning = `Short, focused request. Single agent (${agent}) should handle it.`
    } else if (needsMultipleAgents || hasMultipleRequests) {
      complexity = 'complex'
      reasoning = `Multi-part request requiring ${chain?.steps.length || 'multiple'} steps across agents.`
    } else {
      reasoning = `Standard request suitable for ${agent || 'default'} agent.`
    }

    return {
      lead,
      agent,
      team,
      chain,
      estimatedSteps: chain?.steps.length || 1,
      complexity,
      reasoning,
    }
  }

  // ── Listeners ──────────────────────────────────────────────

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

export const agentHierarchy = new AgentHierarchyManager()
export default agentHierarchy
