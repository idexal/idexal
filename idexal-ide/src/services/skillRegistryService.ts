/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                    SKILL REGISTRY v1.0                         ║
 * ║        Agent Skills • Capabilities • Proficiency Levels        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - 40+ skills across 8 categories
 * - Proficiency levels per agent type
 * - Provider requirements for each skill
 * - Skill-based task routing
 * - Skill composition (combine skills for complex tasks)
 */

import { AgentType } from './agentOrchestrator'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type SkillCategory =
  | 'code' | 'review' | 'testing' | 'architecture'
  | 'devops' | 'security' | 'performance' | 'data'
  | 'documentation' | 'communication' | 'design' | 'integration'

export type ProficiencyLevel = 'expert' | 'advanced' | 'intermediate' | 'basic'

export interface SkillDefinition {
  id: string
  name: string
  icon: string
  category: SkillCategory
  description: string
  /** Agents that have this skill and their proficiency */
  agentProficiency: Partial<Record<AgentType, ProficiencyLevel>>
  /** Required providers/models for this skill (empty = no special provider needed) */
  requiredProviders?: string[]
  /** Related skills that complement this one */
  relatedSkills: string[]
  /** Keywords for search/routing */
  tags: string[]
}

export interface AgentSkillProfile {
  agentType: AgentType
  skills: string[]
  primarySkills: string[]  // top 3 expert-level skills
  combinedSkillPower: number  // 0-100 score
}

// ══════════════════════════════════════════════════════════════
// SKILL DEFINITIONS
// ══════════════════════════════════════════════════════════════

const SKILLS: SkillDefinition[] = [
  // ── CODE SKILLS ──────────────────────────────────────────
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: '📘',
    category: 'code',
    description: 'TypeScript development with type safety, generics, and advanced patterns',
    agentProficiency: { code: 'expert', review: 'advanced', architect: 'advanced' },
    relatedSkills: ['javascript', 'react', 'nodejs'],
    tags: ['typescript', 'types', 'generics', 'interface', 'type-safe'],
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '📒',
    category: 'code',
    description: 'JavaScript/ES2024+ development, async patterns, and runtime optimization',
    agentProficiency: { code: 'expert', review: 'advanced', debug: 'advanced' },
    relatedSkills: ['typescript', 'nodejs', 'browser-api'],
    tags: ['javascript', 'es2024', 'async', 'promise', 'module'],
  },
  {
    id: 'react',
    name: 'React',
    icon: '⚛️',
    category: 'code',
    description: 'React 19 development with hooks, server components, and concurrent features',
    agentProficiency: { code: 'expert', architect: 'advanced', review: 'intermediate' },
    relatedSkills: ['typescript', 'nextjs', 'css'],
    tags: ['react', 'hooks', 'jsx', 'tsx', 'components', 'state'],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    icon: '▲',
    category: 'code',
    description: 'Next.js 15 with App Router, Server Actions, and ISR',
    agentProficiency: { code: 'advanced', architect: 'advanced' },
    relatedSkills: ['react', 'typescript', 'vercel'],
    tags: ['nextjs', 'app-router', 'server-components', 'ssr', 'ssg'],
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    icon: '🟢',
    category: 'code',
    description: 'Node.js backend development with Express, Fastify, and streaming',
    agentProficiency: { code: 'expert', devops: 'advanced', api: 'expert' },
    relatedSkills: ['typescript', 'express', 'database'],
    tags: ['nodejs', 'express', 'fastify', 'backend', 'server'],
  },
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    category: 'code',
    description: 'Python 3.12+ development with type hints, async, and data science',
    agentProficiency: { code: 'advanced', data: 'expert' },
    relatedSkills: ['data-science', 'machine-learning', 'fastapi'],
    tags: ['python', 'django', 'flask', 'fastapi', 'pip'],
  },
  {
    id: 'rust',
    name: 'Rust',
    icon: '🦀',
    category: 'code',
    description: 'Rust systems programming with ownership, async, and zero-cost abstractions',
    agentProficiency: { code: 'advanced', performance: 'expert' },
    relatedSkills: ['memory-safety', 'concurrency'],
    tags: ['rust', 'cargo', 'ownership', 'lifetime', 'async'],
  },
  {
    id: 'go',
    name: 'Go',
    icon: '🔵',
    category: 'code',
    description: 'Go backend development with goroutines, channels, and microservices',
    agentProficiency: { code: 'advanced', devops: 'advanced' },
    relatedSkills: ['docker', 'kubernetes'],
    tags: ['go', 'golang', 'goroutine', 'concurrency', 'microservice'],
  },
  {
    id: 'sql',
    name: 'SQL',
    icon: '🗃️',
    category: 'code',
    description: 'SQL queries, optimization, schema design, and migrations',
    agentProficiency: { database: 'expert', code: 'advanced', performance: 'advanced' },
    relatedSkills: ['database', 'migration'],
    tags: ['sql', 'postgresql', 'mysql', 'sqlite', 'query', 'index'],
  },
  {
    id: 'html-css',
    name: 'HTML & CSS',
    icon: '🎨',
    category: 'code',
    description: 'HTML5, CSS3, Tailwind CSS, responsive design, and animations',
    agentProficiency: { code: 'expert', design: 'expert', review: 'intermediate' },
    relatedSkills: ['react', 'accessibility', 'design'],
    tags: ['html', 'css', 'tailwind', 'responsive', 'flexbox', 'grid'],
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    icon: '◈',
    category: 'code',
    description: 'GraphQL schema design, resolvers, subscriptions, and federation',
    agentProficiency: { api: 'expert', architect: 'advanced' },
    relatedSkills: ['rest-api', 'typescript'],
    tags: ['graphql', 'apollo', 'schema', 'resolver', 'federation'],
  },
  {
    id: 'websocket',
    name: 'WebSocket',
    icon: '🔌',
    category: 'code',
    description: 'Real-time WebSocket communication, Socket.IO, and SSE',
    agentProficiency: { api: 'advanced', code: 'intermediate' },
    relatedSkills: ['rest-api', 'nodejs'],
    tags: ['websocket', 'socketio', 'sse', 'realtime', 'push'],
  },
  {
    id: 'grpc',
    name: 'gRPC',
    icon: '📡',
    category: 'code',
    description: 'gRPC service definition, protobuf, and streaming',
    agentProficiency: { api: 'advanced', performance: 'advanced' },
    relatedSkills: ['protobuf', 'rest-api'],
    tags: ['grpc', 'protobuf', 'rpc', 'streaming', 'microservice'],
  },

  // ── REVIEW SKILLS ────────────────────────────────────────
  {
    id: 'code-review',
    name: 'Code Review',
    icon: '🔍',
    category: 'review',
    description: 'Comprehensive code review with quality analysis and best practices',
    agentProficiency: { review: 'expert', architect: 'advanced', code: 'intermediate' },
    relatedSkills: ['refactoring', 'security-audit'],
    tags: ['review', 'quality', 'best-practices', 'pr', 'merge-request'],
  },
  {
    id: 'design-review',
    name: 'Design Review',
    icon: '🎯',
    category: 'review',
    description: 'Architecture and design pattern review with trade-off analysis',
    agentProficiency: { architect: 'expert', review: 'advanced' },
    relatedSkills: ['architecture', 'code-review'],
    tags: ['design', 'architecture', 'pattern', 'trade-off'],
  },
  {
    id: 'accessibility-review',
    name: 'Accessibility Review',
    icon: '♿',
    category: 'review',
    description: 'WCAG 2.1 compliance, ARIA attributes, and screen reader support',
    agentProficiency: { review: 'advanced', code: 'intermediate' },
    relatedSkills: ['html-css', 'react'],
    tags: ['a11y', 'accessibility', 'wcag', 'aria', 'screen-reader'],
  },

  // ── TESTING SKILLS ───────────────────────────────────────
  {
    id: 'unit-testing',
    name: 'Unit Testing',
    icon: '🧪',
    category: 'testing',
    description: 'Unit test design with mocking, fixtures, and coverage analysis',
    agentProficiency: { test: 'expert', code: 'advanced', review: 'intermediate' },
    relatedSkills: ['integration-testing', 'vitest'],
    tags: ['unit-test', 'mocking', 'coverage', 'vitest', 'jest'],
  },
  {
    id: 'integration-testing',
    name: 'Integration Testing',
    icon: '🔗',
    category: 'testing',
    description: 'Integration and end-to-end testing with real dependencies',
    agentProficiency: { test: 'expert', devops: 'advanced' },
    relatedSkills: ['unit-testing', 'e2e-testing'],
    tags: ['integration-test', 'e2e', 'playwright', 'cypress'],
  },
  {
    id: 'e2e-testing',
    name: 'E2E Testing',
    icon: '🌐',
    category: 'testing',
    description: 'End-to-end testing with browser automation and visual regression',
    agentProficiency: { test: 'advanced', devops: 'intermediate' },
    relatedSkills: ['integration-testing', 'playwright'],
    tags: ['e2e', 'playwright', 'cypress', 'browser', 'screenshot'],
  },
  {
    id: 'performance-testing',
    name: 'Performance Testing',
    icon: '⚡',
    category: 'testing',
    description: 'Load testing, benchmarking, and profiling',
    agentProficiency: { performance: 'expert', test: 'advanced' },
    relatedSkills: ['profiling', 'load-testing'],
    tags: ['benchmark', 'load-test', 'profiling', 'k6', 'artillery'],
  },
  {
    id: 'security-testing',
    name: 'Security Testing',
    icon: '🛡️',
    category: 'testing',
    description: 'Penetration testing, vulnerability scanning, and OWASP checks',
    agentProficiency: { security: 'expert', test: 'advanced' },
    relatedSkills: ['security-audit', 'vulnerability-scanning'],
    tags: ['pentest', 'owasp', 'vulnerability', 'scan', 'security'],
  },
  {
    id: 'vitest',
    name: 'Vitest',
    icon: '⚡',
    category: 'testing',
    description: 'Vitest test runner with snapshot testing and UI mode',
    agentProficiency: { test: 'expert', code: 'advanced' },
    relatedSkills: ['unit-testing', 'integration-testing'],
    tags: ['vitest', 'vite', 'snapshot', 'test-runner'],
  },

  // ── ARCHITECTURE SKILLS ──────────────────────────────────
  {
    id: 'architecture',
    name: 'System Architecture',
    icon: '🏗️',
    category: 'architecture',
    description: 'System design, scalability patterns, and architectural decisions',
    agentProficiency: { architect: 'expert', code: 'intermediate', review: 'advanced' },
    relatedSkills: ['design-patterns', 'microservices'],
    tags: ['architecture', 'design', 'scalability', 'system-design'],
  },
  {
    id: 'design-patterns',
    name: 'Design Patterns',
    icon: '🧩',
    category: 'architecture',
    description: 'GoF patterns, SOLID principles, and clean architecture',
    agentProficiency: { architect: 'expert', review: 'advanced', refactoring: 'expert' },
    relatedSkills: ['architecture', 'refactoring'],
    tags: ['pattern', 'solid', 'clean-architecture', 'gof', 'dry'],
  },
  {
    id: 'microservices',
    name: 'Microservices',
    icon: '🔷',
    category: 'architecture',
    description: 'Microservice architecture, service mesh, and distributed systems',
    agentProficiency: { architect: 'advanced', devops: 'advanced', api: 'advanced' },
    relatedSkills: ['docker', 'kubernetes', 'grpc'],
    tags: ['microservice', 'service-mesh', 'distributed', 'event-driven'],
  },
  {
    id: 'database',
    name: 'Database Design',
    icon: '🗄️',
    category: 'architecture',
    description: 'Schema design, normalization, indexing, and query optimization',
    agentProficiency: { database: 'expert', architect: 'advanced', performance: 'advanced' },
    relatedSkills: ['sql', 'migration'],
    tags: ['database', 'schema', 'normalization', 'index', 'erd'],
  },

  // ── DEVOPS SKILLS ────────────────────────────────────────
  {
    id: 'docker',
    name: 'Docker',
    icon: '🐳',
    category: 'devops',
    description: 'Docker containerization, multi-stage builds, and optimization',
    agentProficiency: { devops: 'expert', security: 'advanced' },
    relatedSkills: ['kubernetes', 'ci-cd'],
    tags: ['docker', 'container', 'dockerfile', 'compose'],
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    icon: '☸️',
    category: 'devops',
    description: 'Kubernetes orchestration, Helm charts, and cluster management',
    agentProficiency: { devops: 'expert' },
    relatedSkills: ['docker', 'ci-cd'],
    tags: ['kubernetes', 'k8s', 'helm', 'pod', 'deployment'],
  },
  {
    id: 'ci-cd',
    name: 'CI/CD',
    icon: '🔄',
    category: 'devops',
    description: 'Continuous integration and deployment with GitHub Actions, GitLab CI',
    agentProficiency: { devops: 'expert', security: 'intermediate' },
    relatedSkills: ['docker', 'testing'],
    tags: ['ci-cd', 'github-actions', 'gitlab-ci', 'pipeline', 'automation'],
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Observability',
    icon: '📊',
    category: 'devops',
    description: 'Application monitoring, logging, tracing, and alerting',
    agentProficiency: { devops: 'advanced', performance: 'advanced' },
    relatedSkills: ['logging', 'tracing'],
    tags: ['monitoring', 'grafana', 'prometheus', 'datadog', 'tracing'],
  },
  {
    id: 'cloud',
    name: 'Cloud Services',
    icon: '☁️',
    category: 'devops',
    description: 'AWS, GCP, Azure services and cloud-native architecture',
    agentProficiency: { devops: 'expert', architect: 'advanced' },
    relatedSkills: ['serverless', 'terraform'],
    tags: ['aws', 'gcp', 'azure', 'cloud', 'serverless', 'iac'],
  },
  {
    id: 'terraform',
    name: 'Infrastructure as Code',
    icon: '📜',
    category: 'devops',
    description: 'Terraform, Pulumi, and CloudFormation infrastructure management',
    agentProficiency: { devops: 'expert' },
    relatedSkills: ['cloud', 'ci-cd'],
    tags: ['terraform', 'pulumi', 'cloudformation', 'iac', 'infrastructure'],
  },
  {
    id: 'electron',
    name: 'Electron',
    icon: '⚡',
    category: 'devops',
    description: 'Electron desktop app development, IPC, and packaging',
    agentProficiency: { code: 'expert', devops: 'advanced' },
    relatedSkills: ['react', 'nodejs'],
    tags: ['electron', 'desktop', 'ipc', 'native', 'cross-platform'],
  },

  // ── SECURITY SKILLS ──────────────────────────────────────
  {
    id: 'security-audit',
    name: 'Security Audit',
    icon: '🔒',
    category: 'security',
    description: 'Comprehensive security audit with OWASP Top 10 analysis',
    agentProficiency: { security: 'expert', review: 'advanced' },
    relatedSkills: ['vulnerability-scanning', 'secure-coding'],
    tags: ['security', 'audit', 'owasp', 'penetration', 'compliance'],
  },
  {
    id: 'secure-coding',
    name: 'Secure Coding',
    icon: '🛡️',
    category: 'security',
    description: 'Secure coding practices, input validation, and secrets management',
    agentProficiency: { security: 'expert', code: 'advanced', review: 'advanced' },
    relatedSkills: ['security-audit', 'code-review'],
    tags: ['secure', 'input-validation', 'xss', 'sql-injection', 'csrf'],
  },
  {
    id: 'vulnerability-scanning',
    name: 'Vulnerability Scanning',
    icon: '🔍',
    category: 'security',
    description: 'Automated vulnerability scanning and dependency auditing',
    agentProficiency: { security: 'expert', devops: 'intermediate' },
    relatedSkills: ['security-audit', 'dependency-audit'],
    tags: ['vulnerability', 'cve', 'snyk', 'dependabot', 'audit'],
  },
  {
    id: 'auth',
    name: 'Authentication & Authorization',
    icon: '🔑',
    category: 'security',
    description: 'OAuth, JWT, RBAC, and session management',
    agentProficiency: { security: 'expert', api: 'advanced', code: 'intermediate' },
    relatedSkills: ['secure-coding', 'rest-api'],
    tags: ['auth', 'oauth', 'jwt', 'rbac', 'session', 'sso'],
  },

  // ── PERFORMANCE SKILLS ───────────────────────────────────
  {
    id: 'profiling',
    name: 'Profiling & Optimization',
    icon: '📈',
    category: 'performance',
    description: 'Performance profiling, memory analysis, and CPU optimization',
    agentProficiency: { performance: 'expert', code: 'advanced' },
    relatedSkills: ['caching', 'optimization'],
    tags: ['profiling', 'cpu', 'memory', 'flame-graph', 'optimization'],
  },
  {
    id: 'caching',
    name: 'Caching Strategies',
    icon: '💨',
    category: 'performance',
    description: 'In-memory, Redis, CDN, and browser caching optimization',
    agentProficiency: { performance: 'expert', devops: 'advanced' },
    relatedSkills: ['profiling', 'database'],
    tags: ['cache', 'redis', 'cdn', 'browser-cache', 'memoization'],
  },
  {
    id: 'optimization',
    name: 'Code Optimization',
    icon: '⚡',
    category: 'performance',
    description: 'Algorithm optimization, bundle size reduction, and lazy loading',
    agentProficiency: { performance: 'expert', code: 'advanced', review: 'advanced' },
    relatedSkills: ['profiling', 'refactoring'],
    tags: ['optimize', 'bundle', 'lazy-load', 'code-split', 'tree-shake'],
  },

  // ── DATA SKILLS ──────────────────────────────────────────
  {
    id: 'data-science',
    name: 'Data Science',
    icon: '📊',
    category: 'data',
    description: 'Data analysis, visualization, and statistical modeling',
    agentProficiency: { database: 'advanced', code: 'intermediate' },
    relatedSkills: ['python', 'sql'],
    tags: ['data', 'analysis', 'visualization', 'pandas', 'numpy'],
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    icon: '🤖',
    category: 'data',
    description: 'ML model training, deployment, and inference optimization',
    agentProficiency: { data: 'advanced' },
    relatedSkills: ['python', 'data-science'],
    tags: ['ml', 'pytorch', 'tensorflow', 'model', 'training'],
  },
  {
    id: 'rag',
    name: 'RAG Pipelines',
    icon: '🧠',
    category: 'data',
    description: 'Retrieval-Augmented Generation with embeddings and vector search',
    agentProficiency: { code: 'advanced', data: 'advanced' },
    requiredProviders: ['embedding'],
    relatedSkills: ['embeddings', 'vector-search'],
    tags: ['rag', 'retrieval', 'augmented', 'generation', 'knowledge-base'],
  },
  {
    id: 'embeddings',
    name: 'Vector Embeddings',
    icon: '🧬',
    category: 'data',
    description: 'Vector embedding generation, similarity search, and reranking',
    agentProficiency: { code: 'advanced', data: 'expert' },
    requiredProviders: ['embedding', 'rerank'],
    relatedSkills: ['rag', 'semantic-search'],
    tags: ['embedding', 'vector', 'similarity', 'cosine', 'rerank'],
  },
  {
    id: 'migration',
    name: 'Data Migration',
    icon: '🔄',
    category: 'data',
    description: 'Database migration, schema evolution, and data transformation',
    agentProficiency: { migration: 'expert', database: 'advanced', devops: 'intermediate' },
    relatedSkills: ['database', 'sql'],
    tags: ['migration', 'schema', 'transform', 'etl', 'upgrade'],
  },

  // ── DOCUMENTATION SKILLS ─────────────────────────────────
  {
    id: 'api-docs',
    name: 'API Documentation',
    icon: '📖',
    category: 'documentation',
    description: 'OpenAPI/Swagger specs, API reference docs, and SDK documentation',
    agentProficiency: { documentation: 'expert', api: 'advanced' },
    relatedSkills: ['rest-api', 'graphql'],
    tags: ['openapi', 'swagger', 'api-docs', 'reference', 'sdk'],
  },
  {
    id: 'technical-writing',
    name: 'Technical Writing',
    icon: '✍️',
    category: 'documentation',
    description: 'Technical documentation, tutorials, and architecture decision records',
    agentProficiency: { documentation: 'expert', architect: 'intermediate' },
    relatedSkills: ['api-docs', 'readme'],
    tags: ['writing', 'tutorial', 'guide', 'adr', 'documentation'],
  },
  {
    id: 'readme',
    name: 'README & Guides',
    icon: '📋',
    category: 'documentation',
    description: 'Project README, contributing guides, and setup documentation',
    agentProficiency: { documentation: 'expert', code: 'intermediate' },
    relatedSkills: ['technical-writing'],
    tags: ['readme', 'contributing', 'setup', 'guide', 'onboarding'],
  },

  // ── COMMUNICATION SKILLS ─────────────────────────────────
  {
    id: 'rest-api',
    name: 'REST API Design',
    icon: '🌐',
    category: 'communication',
    description: 'RESTful API design, versioning, pagination, and HATEOAS',
    agentProficiency: { api: 'expert', architect: 'advanced', code: 'advanced' },
    relatedSkills: ['graphql', 'websocket'],
    tags: ['rest', 'api', 'http', 'json', 'openapi'],
  },
  {
    id: 'messaging',
    name: 'Message Queues',
    icon: '📨',
    category: 'communication',
    description: 'RabbitMQ, Kafka, and event-driven messaging patterns',
    agentProficiency: { architect: 'advanced', devops: 'advanced' },
    relatedSkills: ['microservices', 'event-driven'],
    tags: ['kafka', 'rabbitmq', 'queue', 'event', 'message'],
  },

  // ── DESIGN SKILLS ────────────────────────────────────────
  {
    id: 'ui-design',
    name: 'UI/UX Design',
    icon: '🎨',
    category: 'design',
    description: 'User interface design, interaction patterns, and design systems',
    agentProficiency: { code: 'advanced', design: 'expert' },
    relatedSkills: ['html-css', 'accessibility-review'],
    tags: ['ui', 'ux', 'design-system', 'figma', 'wireframe'],
  },
  {
    id: 'animation',
    name: 'Animations & Transitions',
    icon: '✨',
    category: 'design',
    description: 'CSS animations, Framer Motion, and micro-interactions',
    agentProficiency: { code: 'intermediate', design: 'advanced' },
    relatedSkills: ['html-css', 'react'],
    tags: ['animation', 'transition', 'framer-motion', 'css', 'micro-interaction'],
  },

  // ── INTEGRATION SKILLS ───────────────────────────────────
  {
    id: 'git',
    name: 'Git Operations',
    icon: '🌿',
    category: 'integration',
    description: 'Git workflows, branching strategies, and conflict resolution',
    agentProficiency: { code: 'expert', devops: 'expert', review: 'advanced' },
    relatedSkills: ['ci-cd', 'code-review'],
    tags: ['git', 'branch', 'merge', 'rebase', 'conflict'],
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    icon: '♻️',
    category: 'integration',
    description: 'Code refactoring techniques, tech debt reduction, and cleanup',
    agentProficiency: { refactoring: 'expert', code: 'advanced', review: 'advanced' },
    relatedSkills: ['design-patterns', 'code-review'],
    tags: ['refactor', 'cleanup', 'tech-debt', 'smell', 'extract'],
  },
  {
    id: 'debugging',
    name: 'Debugging',
    icon: '🐛',
    category: 'integration',
    description: 'Systematic debugging, root cause analysis, and fix implementation',
    agentProficiency: { debug: 'expert', code: 'advanced', review: 'intermediate' },
    relatedSkills: ['profiling', 'logging'],
    tags: ['debug', 'breakpoint', 'stack-trace', 'root-cause', 'fix'],
  },
  {
    id: 'logging',
    name: 'Logging & Tracing',
    icon: '📝',
    category: 'integration',
    description: 'Structured logging, distributed tracing, and log aggregation',
    agentProficiency: { devops: 'advanced', performance: 'advanced', code: 'intermediate' },
    relatedSkills: ['monitoring', 'observability'],
    tags: ['logging', 'tracing', 'structured', 'opentelemetry', 'jaeger'],
  },
]

// ══════════════════════════════════════════════════════════════
// SKILL REGISTRY SERVICE
// ══════════════════════════════════════════════════════════════

class SkillRegistryService {
  private skills: Map<string, SkillDefinition> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor() {
    for (const skill of SKILLS) {
      this.skills.set(skill.id, skill)
    }
  }

  // ── Queries ──────────────────────────────────────────────

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values())
  }

  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id)
  }

  getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
    return this.getAllSkills().filter(s => s.category === category)
  }

  getSkillsByAgent(agentType: AgentType): SkillDefinition[] {
    return this.getAllSkills().filter(s => agentType in s.agentProficiency)
  }

  getExpertSkills(agentType: AgentType): SkillDefinition[] {
    return this.getAllSkills().filter(s => s.agentProficiency[agentType] === 'expert')
  }

  searchSkills(query: string): SkillDefinition[] {
    const lower = query.toLowerCase()
    return this.getAllSkills().filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.tags.some(t => t.includes(lower))
    )
  }

  getCategories(): SkillCategory[] {
    const cats = new Set(this.getAllSkills().map(s => s.category))
    return Array.from(cats)
  }

  // ── Agent Profiles ───────────────────────────────────────

  getAgentProfile(agentType: AgentType): AgentSkillProfile {
    const skills = this.getSkillsByAgent(agentType)
    const primary = this.getExpertSkills(agentType).map(s => s.id)
    const score = this.calculateSkillPower(agentType)

    return {
      agentType,
      skills: skills.map(s => s.id),
      primarySkills: primary.slice(0, 3),
      combinedSkillPower: score,
    }
  }

  getAllAgentProfiles(): AgentSkillProfile[] {
    const allTypes: AgentType[] = [
      'code', 'review', 'debug', 'architect', 'test', 'devops',
      'security', 'performance', 'documentation', 'migration',
      'refactoring', 'database', 'api', 'data', 'design',
    ]
    return allTypes.map(t => this.getAgentProfile(t))
  }

  private calculateSkillPower(agentType: AgentType): number {
    const skills = this.getSkillsByAgent(agentType)
    if (skills.length === 0) return 0

    const levelScores: Record<ProficiencyLevel, number> = {
      expert: 10, advanced: 7, intermediate: 4, basic: 1,
    }

    const total = skills.reduce((sum, s) => {
      const level = s.agentProficiency[agentType] || 'basic'
      return sum + levelScores[level]
    }, 0)

    return Math.min(100, Math.round((total / (skills.length * 10)) * 100))
  }

  // ── Task Routing ─────────────────────────────────────────

  /** Find the best agent for a task based on required skills */
  findBestAgent(requiredSkills: string[]): { agentType: AgentType; score: number } | null {
    const profiles = this.getAllAgentProfiles()
    let best: { agentType: AgentType; score: number } | null = null

    for (const profile of profiles) {
      let score = 0
      for (const skillId of requiredSkills) {
        const skill = this.skills.get(skillId)
        if (!skill) continue
        const level = skill.agentProficiency[profile.agentType]
        if (level === 'expert') score += 10
        else if (level === 'advanced') score += 7
        else if (level === 'intermediate') score += 4
        else if (level === 'basic') score += 1
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { agentType: profile.agentType, score }
      }
    }

    return best
  }

  /** Get skill composition — which skills combine for a complex task */
  getSkillComposition(skillIds: string[]): {
    skill: SkillDefinition
    proficiency: Record<AgentType, ProficiencyLevel>
  }[] {
    return skillIds
      .map(id => this.skills.get(id))
      .filter((s): s is SkillDefinition => !!s)
      .map(s => ({ skill: s, proficiency: s.agentProficiency as Record<AgentType, ProficiencyLevel> }))
  }

  // ── Persistence ──────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  // ── Stats ────────────────────────────────────────────────

  getStats() {
    const all = this.getAllSkills()
    const categories = this.getCategories()
    const categoryCounts: Record<string, number> = {}
    for (const cat of categories) {
      categoryCounts[cat] = this.getSkillsByCategory(cat).length
    }
    return {
      totalSkills: all.length,
      categories: categories.length,
      categoryCounts,
      agentsCovered: 15,
    }
  }
}

export const skillRegistry = new SkillRegistryService()
export default skillRegistry
