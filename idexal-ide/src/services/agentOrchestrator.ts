/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                  AGENT ORCHESTRATOR v2.0                        ║
 * ║         Advanced Multi-Agent Coordination Engine                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - 8 specialized agent types with unique capabilities
 * - Sub-agent delegation and task decomposition
 * - Shared agent memory and context propagation
 * - Pub/sub inter-agent messaging system
 * - Task queue with priority and dependency DAG
 * - Real-time activity tracking
 * - Collaborative and pipeline workflow patterns
 */

import { aiService, AIMessage } from './aiService'
import { projectContextService } from './projectContextService'
import { longTermMemory } from './longTermMemoryService'
import { projectMemory } from './projectMemoryService'
import { conversationMemory } from './conversationMemoryService'
import { searchProviderService } from './searchProviderService'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type AgentType =
  | 'code' | 'review' | 'debug' | 'architect' | 'test'
  | 'devops' | 'security' | 'performance'
  | 'documentation' | 'migration' | 'refactoring' | 'database' | 'api'
  | 'data' | 'design'

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked'

export interface AgentTask {
  id: string
  type: AgentType
  title: string
  description: string
  input: string
  status: TaskStatus
  priority: TaskPriority
  output?: string
  error?: string
  parentId?: string
  subtaskIds?: string[]
  dependsOn?: string[]
  tags: string[]
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: TaskResult
  context?: Record<string, string>  // shared context from parent
}

export interface TaskResult {
  content: string
  filesChanged?: string[]
  issuesFound?: string[]
  suggestions?: string[]
  securityIssues?: string[]
  performanceIssues?: string[]
  confidence: number
  metadata?: Record<string, unknown>
}

// ── Inter-Agent Messaging ──────────────────────────────────

export interface AgentMessage {
  id: string
  from: AgentType | 'orchestrator'
  to: AgentType | 'orchestrator' | 'broadcast'
  type: 'request' | 'response' | 'delegation' | 'notification' | 'alert' | 'context'
  content: string
  taskId?: string
  priority: TaskPriority
  timestamp: number
  metadata?: Record<string, unknown>
}

export type MessageHandler = (msg: AgentMessage) => void

// ── Workflow ───────────────────────────────────────────────

export interface Workflow {
  id: string
  name: string
  description: string
  icon: string
  steps: WorkflowStep[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: number
  results: Map<string, TaskResult>
}

export interface WorkflowStep {
  agentType: AgentType
  taskType: string
  inputTemplate: string
  dependsOn?: number[]
}

// ── Agent Memory ───────────────────────────────────────────

export interface AgentMemoryEntry {
  id: string
  agentType: AgentType
  key: string
  value: string
  ttl?: number       // time-to-live in ms
  createdAt: number
  accessedAt: number
  accessCount: number
}

// ── Agent Capabilities ─────────────────────────────────────

export interface AgentCapabilities {
  canDelegate: boolean
  canReceiveDelegation: boolean
  maxConcurrentTasks: number
  specialties: string[]
  canAccessFiles: boolean
  canRunCommands: boolean
  canModifyCode: boolean
  /** Formal skill IDs from skillRegistry */
  skills: string[]
}

// ══════════════════════════════════════════════════════════════
// AGENT DEFINITIONS
// ══════════════════════════════════════════════════════════════

const AGENT_DEFINITIONS: Record<AgentType, {
  name: string
  icon: string
  color: string
  capabilities: AgentCapabilities
  systemPrompt: string
  subAgents?: AgentType[]  // agents this one can delegate to
}> = {
  code: {
    name: 'Code Agent',
    icon: '💻',
    color: 'text-blue-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 3,
      specialties: ['implementation', 'refactoring', 'bug-fixing'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['typescript', 'javascript', 'react', 'nodejs', 'html-css', 'python', 'sql', 'graphql', 'websocket', 'grpc'],
    },
    systemPrompt: `You are the Code Agent — an expert software engineer who writes clean, efficient, well-documented code.

Core principles:
- Write production-quality code with proper error handling
- Follow SOLID principles and clean architecture
- Use TypeScript type system effectively
- Prefer composition over inheritance
- Add meaningful comments for complex logic

When receiving a task:
1. Analyze the requirements carefully
2. Consider edge cases and error scenarios
3. Implement the solution with proper types
4. Explain your approach briefly

If the task is complex, break it into subtasks and delegate to specialized agents.
Use markdown code blocks with language tags for all code output.`,
    subAgents: ['review', 'debug', 'test'],
  },

  review: {
    name: 'Review Agent',
    icon: '🔍',
    color: 'text-green-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: false,
      maxConcurrentTasks: 2,
      specialties: ['code-review', 'quality-analysis', 'best-practices'],
      canAccessFiles: true,
      canRunCommands: false,
      canModifyCode: false,
      skills: ['code-review', 'design-review', 'accessibility-review', 'refactoring', 'debugging'],
    },
    systemPrompt: `You are the Review Agent — an expert code reviewer who ensures quality and catches issues before they reach production.

Review checklist:
- Type safety and type correctness
- Error handling completeness
- Performance implications
- Security vulnerabilities
- Code readability and maintainability
- Test coverage gaps
- API contract violations

When reviewing:
1. Read the code thoroughly
2. Classify issues: 🔴 Critical / 🟡 Warning / 💡 Suggestion
3. Provide specific line references when possible
4. Suggest concrete fixes, not just descriptions
5. Note positive aspects too

If you find critical bugs, delegate to the Debug Agent.
If you find security issues, delegate to the Security Agent.
If performance is a concern, delegate to the Performance Agent.`,
    subAgents: ['debug', 'security', 'performance'],
  },

  debug: {
    name: 'Debug Agent',
    icon: '🐛',
    color: 'text-yellow-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['bug-analysis', 'root-cause', 'fix-implementation'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['debugging', 'profiling', 'logging'],
    },
    systemPrompt: `You are the Debug Agent — an expert debugger who finds and fixes bugs methodically.

Debugging methodology:
1. **Reproduce** — Understand exactly what goes wrong
2. **Isolate** — Narrow down to the specific code causing the issue
3. **Analyze** — Identify the root cause (not just symptoms)
4. **Fix** — Implement the minimal correct fix
5. **Verify** — Ensure the fix works and doesn't break other things

For each bug:
- Explain the root cause clearly
- Show the before/after code
- Explain why the fix works
- Suggest preventive measures

If the fix requires architectural changes, delegate to the Architect Agent.
If the fix needs tests, request the Test Agent to write them.
If the issue involves deployment, delegate to the DevOps Agent.`,
    subAgents: ['architect', 'test', 'devops'],
  },

  architect: {
    name: 'Architect Agent',
    icon: '🏗️',
    color: 'text-purple-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: false,
      maxConcurrentTasks: 1,
      specialties: ['system-design', 'architecture', 'technology-decisions'],
      canAccessFiles: true,
      canRunCommands: false,
      canModifyCode: false,
      skills: ['architecture', 'design-patterns', 'microservices', 'database'],
    },
    systemPrompt: `You are the Architect Agent — a software architect who designs scalable, maintainable systems.

Architecture principles:
- Design for change — modules should be replaceable
- Separate concerns — each module has one reason to change
- Define clear boundaries — explicit interfaces between components
- Plan for failure — graceful degradation and recovery
- Optimize for readability — code is read more than written

When planning:
1. Analyze the requirements and constraints
2. Consider multiple approaches with trade-offs
3. Choose the simplest solution that works
4. Define the module structure and interfaces
5. Plan the implementation order

Provide concrete implementation guidance, not just abstract diagrams.
When the Code Agent needs guidance, give specific file and function suggestions.
When the Review Agent flags structural issues, propose refactoring plans.`,
    subAgents: ['code', 'review'],
  },

  test: {
    name: 'Test Agent',
    icon: '🧪',
    color: 'text-pink-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 3,
      specialties: ['unit-testing', 'integration-testing', 'e2e-testing'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['unit-testing', 'integration-testing', 'e2e-testing', 'vitest', 'performance-testing', 'security-testing'],
    },
    systemPrompt: `You are the Test Agent — a testing expert who writes comprehensive, maintainable tests.

Testing principles:
- Test behavior, not implementation
- Follow AAA pattern (Arrange, Act, Assert)
- Write descriptive test names that explain intent
- Cover happy paths, edge cases, and error scenarios
- Keep tests independent and idempotent
- Mock external dependencies, not internal logic

Test types:
- **Unit**: Individual functions/methods in isolation
- **Integration**: Multiple components working together
- **E2E**: Complete user workflows

For each test suite:
1. Identify the key behaviors to test
2. Write tests in order of importance
3. Add boundary and edge case tests
4. Include error scenario tests
5. Ensure tests are runnable and meaningful

If you need to understand the code structure, ask the Architect Agent.
If you need help with complex mocking, delegate to the Code Agent.`,
    subAgents: ['code', 'architect'],
  },

  devops: {
    name: 'DevOps Agent',
    icon: '🚀',
    color: 'text-orange-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['ci-cd', 'deployment', 'infrastructure', 'docker'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['docker', 'kubernetes', 'ci-cd', 'monitoring', 'cloud', 'terraform', 'electron'],
    },
    systemPrompt: `You are the DevOps Agent — an expert in CI/CD, deployment, and infrastructure.

DevOps expertise:
- Docker containerization and optimization
- CI/CD pipeline design (GitHub Actions, GitLab CI, etc.)
- Infrastructure as Code (Terraform, CloudFormation)
- Cloud services (AWS, GCP, Azure)
- Monitoring and observability
- Security in deployment

When handling tasks:
1. Assess the current infrastructure
2. Design the deployment pipeline
3. Write Dockerfiles, CI configs, and deployment scripts
4. Consider security and cost optimization
5. Provide rollback strategies

If the deployment has bugs, delegate to the Debug Agent.
If the infrastructure needs security review, delegate to the Security Agent.
If performance is critical, delegate to the Performance Agent.`,
    subAgents: ['debug', 'security', 'performance'],
  },

  security: {
    name: 'Security Agent',
    icon: '🛡️',
    color: 'text-red-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['vulnerability-analysis', 'security-audit', 'secure-coding'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['security-audit', 'secure-coding', 'vulnerability-scanning', 'auth'],
    },
    systemPrompt: `You are the Security Agent — an expert in application security and secure coding practices.

Security checklist:
- Input validation and sanitization
- Authentication and authorization
- SQL injection and XSS prevention
- CSRF protection
- Secure data storage and transmission
- Dependency vulnerability scanning
- Secrets management
- Rate limiting and DoS prevention

When analyzing:
1. Identify the attack surface
2. Check for OWASP Top 10 vulnerabilities
3. Review authentication/authorization logic
4. Validate input handling
5. Check for sensitive data exposure
6. Assess dependency security

Classify findings:
- 🔴 **Critical**: Immediate exploit risk
- 🟠 **High**: Significant security weakness
- 🟡 **Medium**: Security concern to address
- 💡 **Low**: Security best practice suggestion

If a vulnerability requires code changes, delegate to the Code Agent.
If the architecture has security design flaws, delegate to the Architect Agent.`,
    subAgents: ['code', 'architect', 'devops'],
  },

  performance: {
    name: 'Performance Agent',
    icon: '⚡',
    color: 'text-cyan-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['profiling', 'optimization', 'caching', 'scaling'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['profiling', 'caching', 'optimization', 'performance-testing'],
    },
    systemPrompt: `You are the Performance Agent — an expert in application performance optimization.

Performance areas:
- Algorithm complexity (time and space)
- Database query optimization
- Caching strategies (in-memory, Redis, CDN)
- Lazy loading and code splitting
- Memory leak detection
- Network optimization (batching, compression)
- Concurrent/parallel processing

When analyzing:
1. Profile the current performance
2. Identify bottlenecks with data
3. Prioritize optimizations by impact
4. Provide before/after comparisons
5. Consider trade-offs (readability vs speed)

Optimization levels:
- 🟢 **Quick wins**: Low effort, high impact
- 🟡 **Moderate**: Some effort, good impact
- 🟠 **Major refactor**: High effort, significant impact

If optimization requires architectural changes, delegate to the Architect Agent.
If optimization affects code quality, ensure the Review Agent checks the changes.
If optimization needs testing, delegate to the Test Agent.`,
    subAgents: ['architect', 'review', 'test'],
  },

  documentation: {
    name: 'Documentation Agent',
    icon: '📚',
    color: 'text-indigo-400',
    capabilities: {
      canDelegate: false,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['technical-writing', 'api-docs', 'readme'],
      canAccessFiles: true,
      canRunCommands: false,
      canModifyCode: false,
      skills: ['api-docs', 'technical-writing', 'readme'],
    },
    systemPrompt: `You are the Documentation Agent — an expert technical writer who creates clear, comprehensive documentation.

Documentation types:
- README files with clear setup instructions
- API documentation with examples
- Code comments for complex logic
- Architecture decision records
- User guides and tutorials
- Changelog and release notes

Writing principles:
1. Write for your audience (developers, users, ops)
2. Use clear, concise language
3. Include working code examples
4. Document both what and why
5. Keep documentation close to the code

Format: Use markdown with proper headings, code blocks, and links.`,
  },

  migration: {
    name: 'Migration Agent',
    icon: '🔄',
    color: 'text-teal-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 1,
      specialties: ['database-migration', 'api-migration', 'dependency-upgrade'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['migration', 'database', 'sql'],
    },
    systemPrompt: `You are the Migration Agent — an expert in safely migrating code, databases, and dependencies.

Migration types:
- Database schema migrations
- API version migrations
- Dependency upgrades
- Framework migrations
- Codebase restructuring

Migration principles:
1. Always create a rollback plan
2. Run migrations in small, reversible steps
3. Test each step before proceeding
4. Document all changes
5. Handle data transformation carefully

Process:
1. Analyze current state
2. Plan migration steps
3. Create migration scripts
4. Test in isolation
5. Execute with monitoring
6. Verify success
7. Document changes`,
    subAgents: ['code', 'test', 'review'],
  },

  refactoring: {
    name: 'Refactoring Agent',
    icon: '♻️',
    color: 'text-pink-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['code-smell', 'design-patterns', 'architecture'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['refactoring', 'design-patterns', 'code-review'],
    },
    systemPrompt: `You are the Refactoring Agent — an expert in improving code quality without changing behavior.

Refactoring techniques:
- Extract function/method/class
- Rename for clarity
- Move to correct module
- Simplify conditional logic
- Remove dead code
- Apply design patterns
- Improve naming

Refactoring principles:
1. Never change behavior (only structure)
2. Run tests before and after
3. Make small, incremental changes
4. Keep the code working at each step
5. Document why the refactoring helps

Code smells to detect:
- Long methods (>30 lines)
- Large classes (>300 lines)
- Duplicate code
- Long parameter lists
- Feature envy
- Data clumps
- Primitive obsession

If refactoring requires architectural changes, delegate to the Architect Agent.`,
    subAgents: ['architect', 'review', 'test'],
  },

  database: {
    name: 'Database Agent',
    icon: '🗄️',
    color: 'text-amber-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 1,
      specialties: ['schema-design', 'query-optimization', 'data-modeling'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['database', 'sql', 'migration', 'data-science', 'machine-learning'],
    },
    systemPrompt: `You are the Database Agent — an expert in database design, optimization, and management.

Database expertise:
- Schema design and normalization
- Query optimization and indexing
- Data modeling and relationships
- Migration strategies
- Backup and recovery
- Performance monitoring

Database types:
- PostgreSQL, MySQL, SQLite (relational)
- MongoDB, DynamoDB (document)
- Redis, Memcached (cache)
- Elasticsearch (search)

Optimization focus:
1. Proper indexing strategy
2. Query execution plans
3. Connection pooling
4. N+1 query detection
5. Batch operations
6. Caching layers

If schema changes are needed, create migration scripts.
If performance issues, analyze query patterns.`,
    subAgents: ['code', 'performance', 'migration'],
  },

  api: {
    name: 'API Agent',
    icon: '🔌',
    color: 'text-violet-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['rest', 'graphql', 'websocket', 'grpc'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['rest-api', 'graphql', 'websocket', 'grpc', 'auth'],
    },
    systemPrompt: `You are the API Agent — an expert in designing, building, and documenting APIs.

API types:
- RESTful APIs (JSON, OpenAPI)
- GraphQL APIs (schemas, resolvers)
- WebSocket APIs (real-time)
- gRPC APIs (protobuf)

API design principles:
1. Consistent naming conventions
2. Proper HTTP methods and status codes
3. Input validation and error handling
4. Pagination for lists
5. Rate limiting and throttling
6. Authentication and authorization
7. Versioning strategy
8. Comprehensive documentation

API security:
- Input sanitization
- CORS configuration
- Rate limiting
- API key management
- OAuth/JWT implementation

If API requires database changes, delegate to the Database Agent.
If API needs testing, delegate to the Test Agent.`,
    subAgents: ['database', 'test', 'security'],
  },

  data: {
    name: 'Data Agent',
    icon: '📊',
    color: 'text-emerald-400',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['data-analysis', 'machine-learning', 'embeddings', 'rag'],
      canAccessFiles: true,
      canRunCommands: true,
      canModifyCode: true,
      skills: ['data-science', 'machine-learning', 'rag', 'embeddings', 'python', 'sql'],
    },
    systemPrompt: `You are the Data Agent — an expert in data science, machine learning, and AI-powered data processing.

Data expertise:
- Data analysis and visualization
- Machine learning model training and deployment
- Vector embeddings and semantic search
- RAG pipeline design
- Data preprocessing and cleaning
- Statistical analysis and modeling

When handling tasks:
1. Understand the data structure and requirements
2. Choose appropriate analysis or modeling approach
3. Implement with proper error handling
4. Provide actionable insights
5. Document methodology and results

If the task requires database changes, delegate to the Database Agent.
If it needs code implementation, delegate to the Code Agent.`,
    subAgents: ['database', 'code', 'review'],
  },

  design: {
    name: 'Design Agent',
    icon: '🎨',
    color: 'text-pink-300',
    capabilities: {
      canDelegate: true,
      canReceiveDelegation: true,
      maxConcurrentTasks: 2,
      specialties: ['ui-design', 'ux-design', 'design-system', 'accessibility'],
      canAccessFiles: true,
      canRunCommands: false,
      canModifyCode: true,
      skills: ['ui-design', 'animation', 'html-css', 'accessibility-review'],
    },
    systemPrompt: `You are the Design Agent — an expert in UI/UX design, design systems, and frontend aesthetics.

Design expertise:
- User interface design principles
- Design system creation and maintenance
- Responsive and mobile-first design
- Accessibility (WCAG 2.1) compliance
- Animation and micro-interactions
- Color theory and typography

When handling tasks:
1. Understand the user needs and constraints
2. Create intuitive, accessible interfaces
3. Follow design system principles
4. Ensure responsive behavior
5. Provide CSS/Tailwind implementations

If implementation is needed, delegate to the Code Agent.
If accessibility review is needed, delegate to the Review Agent.`,
    subAgents: ['code', 'review'],
  },
}

// ══════════════════════════════════════════════════════════════
// AGENT MEMORY SYSTEM
// ══════════════════════════════════════════════════════════════

class AgentMemory {
  private store: Map<string, AgentMemoryEntry> = new Map()
  private counter = 0

  set(agentType: AgentType, key: string, value: string, ttl?: number): AgentMemoryEntry {
    const id = `mem-${++this.counter}`
    const entry: AgentMemoryEntry = {
      id, agentType, key, value, ttl,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 0,
    }
    this.store.set(`${agentType}:${key}`, entry)
    return entry
  }

  get(agentType: AgentType, key: string): string | null {
    const entry = this.store.get(`${agentType}:${key}`)
    if (!entry) return null

    // Check TTL
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.store.delete(`${agentType}:${key}`)
      return null
    }

    entry.accessedAt = Date.now()
    entry.accessCount++
    return entry.value
  }

  /** Get all memory entries visible to an agent (its own + shared) */
  getVisible(agentType: AgentType): AgentMemoryEntry[] {
    const result: AgentMemoryEntry[] = []
    for (const entry of this.store.values()) {
      // Agent sees its own entries and entries with key starting with 'shared:'
      if (entry.agentType === agentType || entry.key.startsWith('shared:')) {
        // Check TTL
        if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) continue
        result.push(entry)
      }
    }
    return result.sort((a, b) => b.createdAt - a.createdAt)
  }

  /** Store shared context that all agents can see */
  setShared(key: string, value: string, ttl?: number): AgentMemoryEntry {
    return this.set('orchestrator' as AgentType, `shared:${key}`, value, ttl)
  }

  /** Get context summary for an agent */
  getContextSummary(agentType: AgentType): string {
    const entries = this.getVisible(agentType)
    if (entries.length === 0) return ''

    return entries.slice(0, 10).map(e =>
      `[${e.agentType}] ${e.key}: ${e.value.slice(0, 200)}`
    ).join('\n')
  }

  clear() { this.store.clear() }

  size() { return this.store.size }
}

// ══════════════════════════════════════════════════════════════
// TASK QUEUE (Priority Queue with DAG)
// ══════════════════════════════════════════════════════════════

class TaskQueue {
  private tasks: Map<string, AgentTask> = new Map()
  private listeners: Set<() => void> = new Set()

  add(task: AgentTask) {
    this.tasks.set(task.id, task)
    this.notify()
  }

  get(id: string): AgentTask | undefined {
    return this.tasks.get(id)
  }

  update(id: string, updates: Partial<AgentTask>) {
    const task = this.tasks.get(id)
    if (task) {
      Object.assign(task, updates)
      this.notify()
    }
  }

  /** Get all tasks ready to run (dependencies satisfied) */
  getReady(): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'queued' && this.areDependenciesMet(t))
      .sort((a, b) => {
        const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }

  private areDependenciesMet(task: AgentTask): boolean {
    if (!task.dependsOn?.length) return true
    return task.dependsOn.every(depId => {
      const dep = this.tasks.get(depId)
      return dep?.status === 'completed'
    })
  }

  getByStatus(status: TaskStatus): AgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status)
  }

  getByType(type: AgentType): AgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.type === type)
  }

  getSubtasks(parentId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.parentId === parentId)
  }

  getAll(): AgentTask[] {
    return Array.from(this.tasks.values())
  }

  remove(id: string) {
    this.tasks.delete(id)
    this.notify()
  }

  onChange(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }
}

// ══════════════════════════════════════════════════════════════
// PUB/SUB MESSAGING
// ══════════════════════════════════════════════════════════════

class MessageBus {
  private subscribers: Map<string, Set<MessageHandler>> = new Map()
  private history: AgentMessage[] = []
  private maxHistory = 200

  subscribe(agentType: AgentType | 'orchestrator' | 'broadcast', handler: MessageHandler): () => void {
    if (!this.subscribers.has(agentType)) {
      this.subscribers.set(agentType, new Set())
    }
    this.subscribers.get(agentType)!.add(handler)
    return () => this.subscribers.get(agentType)?.delete(handler)
  }

  publish(msg: AgentMessage) {
    this.history.push(msg)
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory)
    }

    // Deliver to target
    const targetHandlers = this.subscribers.get(msg.to)
    if (targetHandlers) {
      for (const handler of targetHandlers) handler(msg)
    }

    // Broadcast listeners get everything
    const broadcastHandlers = this.subscribers.get('broadcast')
    if (broadcastHandlers && msg.to !== 'broadcast') {
      for (const handler of broadcastHandlers) handler(msg)
    }
  }

  getHistory(filter?: { from?: string; to?: string; taskId?: string }): AgentMessage[] {
    let result = this.history
    if (filter?.from) result = result.filter(m => m.from === filter.from)
    if (filter?.to) result = result.filter(m => m.to === filter.to)
    if (filter?.taskId) result = result.filter(m => m.taskId === filter.taskId)
    return result
  }

  getRecent(count: number = 20): AgentMessage[] {
    return this.history.slice(-count)
  }

  clear() { this.history = [] }
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN WORKFLOWS
// ══════════════════════════════════════════════════════════════

const BUILT_IN_WORKFLOWS: Omit<Workflow, 'status' | 'currentStep' | 'results'>[] = [
  {
    id: 'review-and-fix',
    name: 'Review & Fix',
    description: 'Review code quality, then fix any critical issues found',
    icon: '🔍',
    steps: [
      { agentType: 'review', taskType: 'review', inputTemplate: 'Review this code for quality issues:\n\n{input}' },
      { agentType: 'debug', taskType: 'fix', inputTemplate: 'Fix these critical issues:\n\n{input}\n\nReview results:\n{step:0}' },
      { agentType: 'review', taskType: 'verify', inputTemplate: 'Verify these fixes are correct:\n\n{input}\n\nFixes:\n{step:1}' },
    ],
  },
  {
    id: 'feature-pipeline',
    name: 'Feature Pipeline',
    description: 'Plan → implement → review → test a new feature',
    icon: '🚀',
    steps: [
      { agentType: 'architect', taskType: 'plan', inputTemplate: 'Plan the implementation:\n\n{input}' },
      { agentType: 'code', taskType: 'implement', inputTemplate: 'Implement this feature:\n\nPlan:\n{step:0}\n\nRequirements:\n{input}' },
      { agentType: 'review', taskType: 'review', inputTemplate: 'Review this implementation:\n\n{input}\n\nCode:\n{step:1}' },
      { agentType: 'test', taskType: 'test', inputTemplate: 'Write tests for this:\n\n{input}\n\nCode:\n{step:1}\n\nReview:\n{step:2}' },
    ],
  },
  {
    id: 'deep-debug',
    name: 'Deep Debug',
    description: 'Analyze → reproduce → fix → add regression tests',
    icon: '🐛',
    steps: [
      { agentType: 'debug', taskType: 'analyze', inputTemplate: 'Analyze this bug:\n\n{input}' },
      { agentType: 'code', taskType: 'fix', inputTemplate: 'Fix this bug:\n\nAnalysis:\n{step:0}\n\nIssue:\n{input}' },
      { agentType: 'test', taskType: 'regression', inputTemplate: 'Write regression tests:\n\nBug:\n{input}\n\nFix:\n{step:1}' },
      { agentType: 'review', taskType: 'verify', inputTemplate: 'Verify the fix and tests:\n\nFix:\n{step:1}\n\nTests:\n{step:2}' },
    ],
  },
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Comprehensive security analysis with fixes',
    icon: '🛡️',
    steps: [
      { agentType: 'security', taskType: 'scan', inputTemplate: 'Perform security analysis:\n\n{input}' },
      { agentType: 'code', taskType: 'fix', inputTemplate: 'Fix these security vulnerabilities:\n\nSecurity report:\n{step:0}\n\nOriginal code:\n{input}' },
      { agentType: 'security', taskType: 'verify', inputTemplate: 'Verify security fixes:\n\nFixes:\n{step:1}\n\nOriginal report:\n{step:0}' },
      { agentType: 'test', taskType: 'security-tests', inputTemplate: 'Write security tests:\n\nVulnerabilities found:\n{step:0}\n\nFixes:\n{step:1}' },
    ],
  },
  {
    id: 'performance-optimize',
    name: 'Performance Optimization',
    description: 'Profile → identify bottlenecks → optimize → verify',
    icon: '⚡',
    steps: [
      { agentType: 'performance', taskType: 'profile', inputTemplate: 'Analyze performance:\n\n{input}' },
      { agentType: 'code', taskType: 'optimize', inputTemplate: 'Apply these optimizations:\n\nPerformance analysis:\n{step:0}\n\nCode:\n{input}' },
      { agentType: 'test', taskType: 'benchmark', inputTemplate: 'Write performance tests:\n\nOptimizations:\n{step:1}\n\nOriginal analysis:\n{step:0}' },
      { agentType: 'review', taskType: 'verify', inputTemplate: 'Review the optimized code:\n\nOptimizations:\n{step:1}\n\nTests:\n{step:2}' },
    ],
  },
  {
    id: 'full-pipeline',
    name: 'Full Pipeline',
    description: 'Plan → build → secure → optimize → review → test',
    icon: '🏗️',
    steps: [
      { agentType: 'architect', taskType: 'plan', inputTemplate: 'Plan the architecture:\n\n{input}' },
      { agentType: 'code', taskType: 'implement', inputTemplate: 'Implement:\n\nPlan:\n{step:0}\n\nRequirements:\n{input}' },
      { agentType: 'security', taskType: 'scan', inputTemplate: 'Security review:\n\nCode:\n{step:1}' },
      { agentType: 'performance', taskType: 'optimize', inputTemplate: 'Optimize performance:\n\nCode:\n{step:1}\n\nSecurity:\n{step:2}' },
      { agentType: 'review', taskType: 'final-review', inputTemplate: 'Final review:\n\nCode:\n{step:1}\n\nSecurity:\n{step:2}\n\nPerformance:\n{step:3}' },
      { agentType: 'test', taskType: 'comprehensive', inputTemplate: 'Write comprehensive tests:\n\nCode:\n{step:1}\n\nReview:\n{step:4}' },
    ],
  },
  {
    id: 'code-to-deploy',
    name: 'Code to Deploy',
    description: 'Write code → review → containerize → deploy config',
    icon: '🚢',
    steps: [
      { agentType: 'code', taskType: 'implement', inputTemplate: 'Implement:\n\n{input}' },
      { agentType: 'review', taskType: 'review', inputTemplate: 'Review:\n\n{step:0}' },
      { agentType: 'security', taskType: 'scan', inputTemplate: 'Security check:\n\n{step:0}' },
      { agentType: 'devops', taskType: 'containerize', inputTemplate: 'Create Docker setup:\n\n{step:0}\n\nReview:\n{step:1}' },
      { agentType: 'devops', taskType: 'ci-cd', inputTemplate: 'Create CI/CD pipeline:\n\nProject:\n{step:0}\n\nDocker:\n{step:3}' },
    ],
  },
  {
    id: 'refactor-mega',
    name: 'Mega Refactor',
    description: 'Analyze → plan → refactor → review → test → deploy',
    icon: '♻️',
    steps: [
      { agentType: 'architect', taskType: 'analyze', inputTemplate: 'Analyze current architecture and plan refactoring:\n\n{input}' },
      { agentType: 'review', taskType: 'audit', inputTemplate: 'Audit the current codebase:\n\n{input}\n\nRefactoring plan:\n{step:0}' },
      { agentType: 'code', taskType: 'refactor', inputTemplate: 'Execute the refactoring:\n\nPlan:\n{step:0}\n\nAudit:\n{step:1}\n\nOriginal:\n{input}' },
      { agentType: 'test', taskType: 'verify', inputTemplate: 'Write tests for refactored code:\n\nRefactored code:\n{step:2}' },
      { agentType: 'review', taskType: 'verify', inputTemplate: 'Final review of refactored code:\n\n{step:2}\n\nTests:\n{step:3}' },
    ],
  },
]

// ══════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ══════════════════════════════════════════════════════════════

class AgentOrchestrator {
  readonly memory = new AgentMemory()
  readonly queue = new TaskQueue()
  readonly bus = new MessageBus()

  private taskCounter = 0
  private workflows: Map<string, Workflow> = new Map()

  constructor() {
    for (const wf of BUILT_IN_WORKFLOWS) {
      this.workflows.set(wf.id, {
        ...wf,
        status: 'pending',
        currentStep: 0,
        results: new Map(),
      })
    }
  }

  // ── Task Management ────────────────────────────────────────

  createTask(
    type: AgentType,
    title: string,
    description: string,
    input: string,
    options?: {
      priority?: TaskPriority
      parentId?: string
      dependsOn?: string[]
      tags?: string[]
      context?: Record<string, string>
    }
  ): AgentTask {
    const id = `task-${++this.taskCounter}-${Date.now()}`
    const task: AgentTask = {
      id, type, title, description, input,
      status: 'queued',
      priority: options?.priority || 'normal',
      parentId: options?.parentId,
      dependsOn: options?.dependsOn,
      tags: options?.tags || [],
      createdAt: Date.now(),
      context: options?.context,
    }
    this.queue.add(task)

    // Track parent's subtasks
    if (options?.parentId) {
      const parent = this.queue.get(options.parentId)
      if (parent) {
        parent.subtaskIds = [...(parent.subtaskIds || []), id]
      }
    }

    return task
  }

  async executeTask(taskId: string): Promise<TaskResult | null> {
    const task = this.queue.get(taskId)
    if (!task) return null

    // Check dependencies
    if (task.dependsOn?.length) {
      const allResolved = task.dependsOn.every(depId => {
        const dep = this.queue.get(depId)
        return dep?.status === 'completed'
      })
      if (!allResolved) {
        this.queue.update(taskId, { status: 'blocked', error: 'Dependencies not satisfied' })
        return null
      }
    }

    this.queue.update(taskId, { status: 'running', startedAt: Date.now() })

    // Publish task started
    this.bus.publish({
      id: `msg-${Date.now()}`,
      from: task.type,
      to: 'orchestrator',
      type: 'notification',
      content: `Starting: ${task.title}`,
      taskId: task.id,
      priority: task.priority,
      timestamp: Date.now(),
    })

    try {
      // Build context from memory and parent
      const memoryContext = this.memory.getContextSummary(task.type)
      const longTermContext = await longTermMemory.getContextSummary(task.type)
      const parentContext = task.context ? Object.entries(task.context).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
      const projectContext = await projectContextService.getProjectSummary()
      const conversationContext = await conversationMemory.buildContext(task.type, undefined, 2000)

      // RAG: Search for relevant context based on task
      let ragContext = ''
      try {
        const rag = await searchProviderService.ragSearch(task.input.slice(0, 500), 3, 5)
        if (rag.sources.length > 0) {
          ragContext = rag.sources.slice(0, 5).map((s, i) => `[${i + 1}] ${s.source}: ${s.content.slice(0, 300)}`).join('\n')
        }
      } catch {}

      const systemPrompt = AGENT_DEFINITIONS[task.type].systemPrompt
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Project:\n${projectContext}` },
      ]

      if (memoryContext) {
        messages.push({ role: 'system', content: `Agent memory:\n${memoryContext}` })
      }
      if (longTermContext) {
        messages.push({ role: 'system', content: `Long-term memory:\n${longTermContext}` })
      }
      if (conversationContext) {
        messages.push({ role: 'system', content: `Recent conversations:\n${conversationContext}` })
      }
      if (ragContext) {
        messages.push({ role: 'system', content: `Search context (RAG):\n${ragContext}` })
      }
      if (parentContext) {
        messages.push({ role: 'system', content: `Task context:\n${parentContext}` })
      }

      messages.push({ role: 'user', content: task.input })

      let output: string

      if (aiService.isConfigured()) {
        const response = await aiService.chat(messages)
        output = response.content
      } else {
        output = this.generateResponse(task)
      }

      const result: TaskResult = {
        content: output,
        confidence: 0.85,
        filesChanged: this.extractFilesChanged(output),
        issuesFound: this.extractIssues(output),
        suggestions: this.extractSuggestions(output),
        securityIssues: this.extractSecurityIssues(output),
        performanceIssues: this.extractPerformanceIssues(output),
      }

      this.queue.update(taskId, {
        status: 'completed',
        output,
        completedAt: Date.now(),
        result,
      })

      // Store in memory (in-memory + persistent)
      this.memory.set(task.type, `result:${task.title}`, output.slice(0, 1000))
      this.memory.setShared(`last:${task.type}`, `${task.title}: ${output.slice(0, 200)}`)

      // Persist to long-term memory
      await longTermMemory.recordTaskOutcome(
        task.type,
        task.title,
        task.input,
        output.slice(0, 2000),
        true,
        Date.now() - (task.startedAt || Date.now())
      )

      // Publish completion
      this.bus.publish({
        id: `msg-${Date.now()}`,
        from: task.type,
        to: 'orchestrator',
        type: 'response',
        content: `Completed: ${task.title}`,
        taskId: task.id,
        priority: task.priority,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.queue.update(taskId, { status: 'failed', error: errorMsg, completedAt: Date.now() })

      // Record error pattern in long-term memory
      await longTermMemory.recordErrorPattern(
        task.type,
        task.title,
        errorMsg,
        'Task failed — needs investigation'
      )

      this.bus.publish({
        id: `msg-${Date.now()}`,
        from: task.type,
        to: 'orchestrator',
        type: 'alert',
        content: `Failed: ${task.title} — ${errorMsg}`,
        taskId: task.id,
        priority: 'critical',
        timestamp: Date.now(),
      })

      return null
    }
  }

  // ── Delegation ─────────────────────────────────────────────

  async delegateToSubAgent(
    parentTaskId: string,
    subAgentType: AgentType,
    title: string,
    input: string
  ): Promise<TaskResult | null> {
    const parentTask = this.queue.get(parentTaskId)
    if (!parentTask) return null

    // Check if the parent agent can delegate to this sub-agent
    const parentDef = AGENT_DEFINITIONS[parentTask.type]
    if (!parentDef.subAgents?.includes(subAgentType)) {
      return null
    }

    const subtask = this.createTask(
      subAgentType,
      title,
      `Delegated by ${parentTask.type} agent`,
      input,
      {
        priority: parentTask.priority,
        parentId: parentTaskId,
        context: {
          parentTask: parentTask.title,
          parentAgent: parentTask.type,
          ...parentTask.context,
        },
      }
    )

    // Publish delegation
    this.bus.publish({
      id: `msg-${Date.now()}`,
      from: parentTask.type,
      to: subAgentType,
      type: 'delegation',
      content: `Delegated: ${title}`,
      taskId: subtask.id,
      priority: parentTask.priority,
      timestamp: Date.now(),
    })

    return this.executeTask(subtask.id)
  }

  // ── Workflow Execution ─────────────────────────────────────

  async executeWorkflow(workflowId: string, initialInput: string): Promise<Workflow | null> {
    const template = this.workflows.get(workflowId)
    if (!template) return null

    const workflow: Workflow = {
      ...template,
      id: `${workflowId}-${Date.now()}`,
      status: 'running',
      currentStep: 0,
      results: new Map(),
    }

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      workflow.currentStep = i

      // Build input from template
      let input = (step as any).inputTemplate || (step as any).inputContainerize || ''
      input = input.replace('{input}', initialInput)

      for (let j = 0; j < i; j++) {
        const prevResult = workflow.results.get(`step:${j}`)
        input = input.replace(`{step:${j}}`, prevResult?.content || '(no output)')
      }

      const task = this.createTask(
        step.agentType,
        `${workflow.name} — Step ${i + 1}: ${step.taskType}`,
        `Step ${i + 1} of ${workflow.steps.length}`,
        input,
        { priority: 'high' }
      )

      // Publish step start
      this.bus.publish({
        id: `msg-${Date.now()}`,
        from: step.agentType,
        to: 'orchestrator',
        type: 'notification',
        content: `Workflow "${workflow.name}" step ${i + 1}/${workflow.steps.length}`,
        taskId: task.id,
        priority: 'high',
        timestamp: Date.now(),
      })

      const result = await this.executeTask(task.id)
      if (!result) {
        workflow.status = 'failed'
        return workflow
      }

      workflow.results.set(`step:${i}`, result)
    }

    workflow.status = 'completed'
    return workflow
  }

  // ── Collaborative Review ───────────────────────────────────

  async collaborativeReview(
    primaryType: AgentType,
    task: string,
    onStep?: (step: string, agent: AgentType) => void
  ): Promise<string> {
    // Step 1: Primary agent
    onStep?.('working', primaryType)
    const primaryTask = this.createTask(primaryType, 'Primary task', 'Primary implementation', task, { priority: 'high' })
    const primaryResult = await this.executeTask(primaryTask.id)
    if (!primaryResult) return 'Primary agent failed.'

    // Step 2: Review
    onStep?.('reviewing', 'review')
    const reviewTask = this.createTask('review', 'Review work', 'Review output', primaryResult.content, { priority: 'high' })
    const reviewResult = await this.executeTask(reviewTask.id)
    if (!reviewResult) return primaryResult.content

    // Step 3: Check for critical issues → delegate
    const hasCritical = reviewResult.issuesFound?.some(i =>
      i.toLowerCase().includes('critical') || i.toLowerCase().includes('bug')
    )
    const hasSecurity = reviewResult.securityIssues?.length
    const hasPerformance = reviewResult.performanceIssues?.length

    let finalOutput = primaryResult.content
    let fixOutput = ''

    if (hasCritical) {
      onStep?.('fixing bugs', 'debug')
      const fixTask = this.createTask('debug', 'Fix critical issues', 'Fix bugs found in review',
        `Issues:\n${reviewResult.issuesFound?.join('\n')}\n\nOriginal:\n${primaryResult.content}`,
        { priority: 'critical' }
      )
      const fixResult = await this.executeTask(fixTask.id)
      if (fixResult) fixOutput += `### Bug Fixes\n${fixResult.content}\n\n`
    }

    if (hasSecurity) {
      onStep?.('fixing security', 'security')
      const secTask = this.createTask('security', 'Fix security issues', 'Address security vulnerabilities',
        `Security issues:\n${reviewResult.securityIssues?.join('\n')}\n\nCode:\n${primaryResult.content}`,
        { priority: 'critical' }
      )
      const secResult = await this.executeTask(secTask.id)
      if (secResult) fixOutput += `### Security Fixes\n${secResult.content}\n\n`
    }

    if (hasPerformance) {
      onStep?.('optimizing', 'performance')
      const perfTask = this.createTask('performance', 'Optimize performance', 'Address performance issues',
        `Performance issues:\n${reviewResult.performanceIssues?.join('\n')}\n\nCode:\n${primaryResult.content}`,
        { priority: 'high' }
      )
      const perfResult = await this.executeTask(perfTask.id)
      if (perfResult) fixOutput += `### Performance Optimizations\n${perfResult.content}\n\n`
    }

    if (fixOutput) {
      return `## Final Output\n\n${fixOutput}\n---\n\n## Review\n\n${reviewResult.content}`
    }

    return `## Output\n\n${finalOutput}\n\n---\n\n## Review\n\n${reviewResult.content}`
  }

  // ── Orchestrate (High-Level Entry Point) ───────────────────

  async orchestrate(
    request: string,
    onStep?: (step: string, agent: AgentType) => void
  ): Promise<string> {
    // Auto-detect the best approach
    const lower = request.toLowerCase()

    if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('exploit')) {
      return this.collaborativeReview('security', request, onStep)
    }
    if (lower.includes('performance') || lower.includes('slow') || lower.includes('optimize')) {
      return this.collaborativeReview('performance', request, onStep)
    }
    if (lower.includes('bug') || lower.includes('fix') || lower.includes('error') || lower.includes('crash')) {
      return this.collaborativeReview('debug', request, onStep)
    }
    if (lower.includes('test') || lower.includes('spec')) {
      return this.collaborativeReview('test', request, onStep)
    }
    if (lower.includes('plan') || lower.includes('architect') || lower.includes('design')) {
      return this.collaborativeReview('architect', request, onStep)
    }
    if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci/cd')) {
      return this.collaborativeReview('devops', request, onStep)
    }
    if (lower.includes('review') || lower.includes('audit') || lower.includes('check')) {
      return this.collaborativeReview('review', request, onStep)
    }
    if (lower.includes('implement') || lower.includes('build') || lower.includes('create') || lower.includes('write')) {
      return this.collaborativeReview('code', request, onStep)
    }

    // Default: code agent with review
    return this.collaborativeReview('code', request, onStep)
  }


  // ── Accessors ──────────────────────────────────────────────

  getAgentDefinition(type: AgentType) { return AGENT_DEFINITIONS[type] }
  getAllAgentTypes(): AgentType[] { return Object.keys(AGENT_DEFINITIONS) as AgentType[] }
  getWorkflows(): Workflow[] { return Array.from(this.workflows.values()) }
  getWorkflow(id: string): Workflow | undefined { return this.workflows.get(id) }
  getTask(id: string): AgentTask | undefined { return this.queue.get(id) }

  // ── Response Generators (demo mode) ────────────────────────

  private generateResponse(task: AgentTask): string {
    switch (task.type) {
      case 'code': return this.demoCode(task.input)
      case 'review': return this.demoReview(task.input)
      case 'debug': return this.demoDebug(task.input)
      case 'architect': return this.demoArchitect(task.input)
      case 'test': return this.demoTest(task.input)
      case 'devops': return this.demoDevOps(task.input)
      case 'security': return this.demoSecurity(task.input)
      case 'performance': return this.demoPerformance(task.input)
      default: return `Task processed. (Demo mode — configure AI provider for real responses.)`
    }
  }

  private demoCode(input: string): string {
    if (input.includes('fix') || input.includes('bug')) {
      return `## Fix Applied\n\n\`\`\`typescript\nfunction processData(input: DataInput): Result {\n  if (!input) return { success: false, error: 'Invalid input' }\n  try {\n    const result = transform(input)\n    return { success: true, data: result }\n  } catch (error) {\n    return { success: false, error: error.message }\n  }\n}\n\`\`\`\n\n**Changes:** Added null check, try-catch, structured error returns.`
    }
    return `## Implementation\n\n\`\`\`typescript\nexport function Component({ data, onAction }: Props) {\n  const [state, setState] = useState(null)\n  useEffect(() => {\n    if (data) setState(transform(data))\n  }, [data])\n  return (\n    <div className="p-4">\n      {state ? <ContentView data={state} /> : <Loading />}\n      <button onClick={() => onAction?.(state)}>Submit</button>\n    </div>\n  )\n}\n\`\`\`\n\nImplemented with proper error handling and type safety.`
  }

  private demoReview(input: string): string {
    return `## Code Review\n\n**Overall:** ⚠️ Needs minor improvements\n\n### Issues\n1. 🔴 **Critical** — Missing error boundary\n2. 🟡 **Warning** — Potential memory leak in useEffect cleanup\n3. 💡 **Suggestion** — Memoize expensive computations\n\n### Security\n- No SQL injection vectors found\n- Input validation looks solid\n\n### Performance\n- Consider lazy loading for heavy components\n- Add React.memo() for static children\n\n### Positive\n✅ Clean naming ✅ Proper types ✅ Good separation`
  }

  private demoDebug(input: string): string {
    return `## Root Cause\n\nThe issue occurs because state updates asynchronously but render expects synchronous data.\n\n### Fix\n\`\`\`typescript\nconst data = state.data ?? defaultValue\n\`\`\`\n\n### Verification\nNull-check prevents crash. Fallback ensures correct initial render.`
  }

  private demoArchitect(input: string): string {
    return `## Architecture Plan\n\n\`\`\`\nsrc/\n├── core/        # Business logic\n├── adapters/    # External integrations\n├── ports/       # Interfaces\n└── utils/       # Shared utilities\n\`\`\`\n\n### Decisions\n1. Hexagonal architecture for testability\n2. Zustand for state management\n3. REST with optional GraphQL\n\n### Trade-offs\nSimpler than microservices but still modular.`
  }

  private demoTest(input: string): string {
    return `## Test Suite\n\n\`\`\`typescript\ndescribe('Feature', () => {\n  it('handles valid input', () => {\n    expect(process(validInput).success).toBe(true)\n  })\n  it('returns error for null', () => {\n    expect(process(null).success).toBe(false)\n  })\n  it('handles timeout', async () => {\n    mockTimeout()\n    expect(await fetch(url, { timeout: 1000 })).toContain('timeout')\n  })\n})\n\`\`\`\n\n**Coverage:** Happy path + null + timeout.`
  }

  private demoDevOps(input: string): string {
    return `## Deployment Setup\n\n\`\`\`dockerfile\nFROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]\n\`\`\`\n\n### CI/CD Pipeline\n- Build → Test → Lint → Docker Build → Deploy\n- Auto-deploy to staging on PR merge\n- Manual approval for production`
  }

  private demoSecurity(input: string): string {
    return `## Security Report\n\n### Vulnerabilities Found\n1. 🔴 **Critical** — No rate limiting on auth endpoints\n2. 🟠 **High** — XSS possible in user input rendering\n3. 🟡 **Medium** — Missing CSP headers\n\n### Recommendations\n- Add rate limiting middleware\n- Sanitize all user inputs\n- Implement Content-Security-Policy\n- Enable HTTPS-only cookies`
  }

  private demoPerformance(input: string): string {
    return `## Performance Analysis\n\n### Bottlenecks\n1. Database N+1 queries in user listing\n2. Unoptimized image loading (no lazy loading)\n3. Missing React.memo on expensive renders\n\n### Optimizations\n\`\`\`typescript\n// Before: N+1 queries\nconst users = await User.findAll()\nfor (const user of users) {\n  user.posts = await Post.findByUserId(user.id)\n}\n\n// After: Single query with join\nconst users = await User.findAll({ include: ['posts'] })\n\`\`\`\n\n### Impact\n- Query time: 500ms → 50ms (10x improvement)\n- Bundle size: -15% with code splitting`
  }

  // ── Output Parsers ─────────────────────────────────────────

  private extractFilesChanged(output: string): string[] {
    const matches = output.match(/(?:File|Create|Edit):\s*`([^`]+)`/g) || []
    return matches.map(m => m.replace(/(?:File|Create|Edit):\s*`([^`]+)`/, '$1'))
  }

  private extractIssues(output: string): string[] {
    const issues: string[] = []
    for (const line of output.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.match(/^\d+\.\s+🔴\s+\*\*(Critical|Warning|Bug)/i) ||
          trimmed.match(/^\d+\.\s+\*\*(Critical|Warning|Bug)/i)) {
        issues.push(trimmed)
      }
    }
    return issues
  }

  private extractSuggestions(output: string): string[] {
    const suggestions: string[] = []
    for (const line of output.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.match(/^\d+\.\s+💡\s+\*\*Suggestion/i) ||
          trimmed.match(/^\d+\.\s+\*\*Suggestion/i)) {
        suggestions.push(trimmed)
      }
    }
    return suggestions
  }

  private extractSecurityIssues(output: string): string[] {
    const issues: string[] = []
    for (const line of output.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.match(/🔴|🟠|SQL injection|XSS|CSRF|vulnerability/i)) {
        issues.push(trimmed)
      }
    }
    return issues
  }

  private extractPerformanceIssues(output: string): string[] {
    const issues: string[] = []
    for (const line of output.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.match(/N\+1|slow|bottleneck|optimize|performance/i)) {
        issues.push(trimmed)
      }
    }
    return issues
  }
}

export const agentOrchestrator = new AgentOrchestrator()
export default agentOrchestrator


