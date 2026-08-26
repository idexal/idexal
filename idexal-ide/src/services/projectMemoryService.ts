/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               PROJECT MEMORY SERVICE v1.0                      ║
 * ║     Per-Project Knowledge • Conventions • Tech Stack           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Per-project persistent knowledge store
 * - Tech stack detection and memory
 * - Code conventions and patterns learned
 * - File structure understanding
 * - Dependency relationship tracking
 * - Project-specific agent learning
 */

import { AgentType } from './agentOrchestrator'
import { longTermMemory, MemoryEntry } from './longTermMemoryService'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface ProjectKnowledge {
  projectId: string
  /** Detected tech stack */
  techStack: TechStackEntry[]
  /** Learned code conventions */
  conventions: Convention[]
  /** Key files and their roles */
  keyFiles: KeyFile[]
  /** Dependency relationships */
  dependencies: Dependency[]
  /** Architecture patterns detected */
  patterns: ArchitecturePattern[]
  /** Project-specific learned behaviors */
  learnings: ProjectLearning[]
  /** Common error patterns in this project */
  errorPatterns: ErrorPattern[]
  /** Performance hotspots */
  performanceNotes: PerformanceNote[]
  /** Last analysis timestamp */
  lastAnalyzed: number
}

export interface TechStackEntry {
  name: string
  version?: string
  category: 'language' | 'framework' | 'library' | 'tool' | 'database' | 'deployment'
  confidence: number // 0-1
  evidence: string[]
}

export interface Convention {
  id: string
  name: string
  description: string
  pattern: string // regex or description
  examples: string[]
  importance: 'critical' | 'high' | 'medium' | 'low'
}

export interface KeyFile {
  path: string
  role: string
  importance: number // 0-1
  lastModified: number
}

export interface Dependency {
  from: string
  to: string
  type: 'import' | 'require' | 'dynamic'
  strength: number // 0-1 (how tightly coupled)
}

export interface ArchitecturePattern {
  name: string
  description: string
  files: string[]
  confidence: number
}

export interface ProjectLearning {
  id: string
  agentType: AgentType
  key: string
  value: string
  learnedAt: number
  timesApplied: number
  successRate: number // 0-1
}

export interface ErrorPattern {
  pattern: string
  frequency: number
  lastSeen: number
  fix: string
  agentType: AgentType
}

export interface PerformanceNote {
  file: string
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  suggestion: string
  agentType: AgentType
}

// ══════════════════════════════════════════════════════════════
// PROJECT MEMORY SERVICE
// ══════════════════════════════════════════════════════════════

class ProjectMemoryService {
  private projects: Map<string, ProjectKnowledge> = new Map()
  private listeners: Set<() => void> = new Set()

  // ── Initialization ───────────────────────────────────────

  async initProject(projectId: string): Promise<ProjectKnowledge> {
    if (this.projects.has(projectId)) {
      return this.projects.get(projectId)!
    }

    // Load from long-term memory
    const memories = await longTermMemory.getByProject(projectId)
    const knowledge = this.buildKnowledgeFromMemories(projectId, memories)
    this.projects.set(projectId, knowledge)
    return knowledge
  }

  private buildKnowledgeFromMemories(projectId: string, memories: MemoryEntry[]): ProjectKnowledge {
    const knowledge: ProjectKnowledge = {
      projectId,
      techStack: [],
      conventions: [],
      keyFiles: [],
      dependencies: [],
      patterns: [],
      learnings: [],
      errorPatterns: [],
      performanceNotes: [],
      lastAnalyzed: 0,
    }

    for (const mem of memories) {
      switch (mem.category) {
        case 'project': {
          const meta = mem.metadata as Record<string, unknown> | undefined
          if (mem.tags.includes('tech-stack')) {
            knowledge.techStack.push({
              name: mem.key.replace('tech:', ''),
              version: meta?.version as string | undefined,
              category: (meta?.category as TechStackEntry['category']) || 'library',
              confidence: (meta?.confidence as number) || 0.5,
              evidence: (meta?.evidence as string[]) || [],
            })
          }
          if (mem.tags.includes('convention')) {
            knowledge.conventions.push({
              id: mem.id,
              name: mem.key.replace('convention:', ''),
              description: mem.value,
              pattern: (meta?.pattern as string) || '',
              examples: (meta?.examples as string[]) || [],
              importance: (meta?.importance as Convention['importance']) || 'medium',
            })
          }
          if (mem.tags.includes('key-file')) {
            knowledge.keyFiles.push({
              path: mem.key.replace('file:', ''),
              role: mem.value,
              importance: (meta?.importance as number) || 0.5,
              lastModified: mem.updatedAt,
            })
          }
          if (mem.tags.includes('pattern')) {
            knowledge.patterns.push({
              name: mem.key.replace('pattern:', ''),
              description: mem.value,
              files: (meta?.files as string[]) || [],
              confidence: (meta?.confidence as number) || 0.5,
            })
          }
          break
        }
        case 'skill': {
          const meta = mem.metadata as Record<string, unknown> | undefined
          knowledge.learnings.push({
            id: mem.id,
            agentType: mem.agentType as AgentType,
            key: mem.key,
            value: mem.value,
            learnedAt: mem.createdAt,
            timesApplied: (meta?.timesApplied as number) || 0,
            successRate: (meta?.successRate as number) || 1.0,
          })
          break
        }
        case 'error': {
          const meta = mem.metadata as Record<string, unknown> | undefined
          knowledge.errorPatterns.push({
            pattern: mem.key,
            frequency: mem.accessCount + 1,
            lastSeen: mem.createdAt,
            fix: mem.value,
            agentType: mem.agentType as AgentType,
          })
          break
        }
        case 'task': {
          const meta = mem.metadata as Record<string, unknown> | undefined
          if (meta?.performanceIssue) {
            knowledge.performanceNotes.push({
              file: (meta?.file as string) || '',
              issue: mem.value.slice(0, 200),
              severity: (meta?.severity as PerformanceNote['severity']) || 'medium',
              suggestion: (meta?.suggestion as string) || '',
              agentType: mem.agentType as AgentType,
            })
          }
          knowledge.lastAnalyzed = Math.max(knowledge.lastAnalyzed, mem.createdAt)
          break
        }
      }
    }

    return knowledge
  }

  // ── Tech Stack ───────────────────────────────────────────

  async recordTechStack(projectId: string, entries: TechStackEntry[]): Promise<void> {
    for (const entry of entries) {
      await longTermMemory.set('project', 'system', `tech:${entry.name}`, `${entry.name} (${entry.category})`, {
        projectId,
        importance: entry.confidence > 0.8 ? 'high' : 'medium',
        tags: ['tech-stack', entry.category],
        metadata: {
          version: entry.version,
          category: entry.category,
          confidence: entry.confidence,
          evidence: entry.evidence,
        },
      })
    }
  }

  async getTechStack(projectId: string): Promise<TechStackEntry[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.techStack
  }

  // ── Conventions ──────────────────────────────────────────

  async recordConvention(projectId: string, convention: Omit<Convention, 'id'>): Promise<void> {
    await longTermMemory.set('project', 'system', `convention:${convention.name}`, convention.description, {
      projectId,
      importance: convention.importance,
      tags: ['convention'],
      metadata: {
        pattern: convention.pattern,
        examples: convention.examples,
        importance: convention.importance,
      },
    })
  }

  async getConventions(projectId: string): Promise<Convention[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.conventions
  }

  // ── Key Files ────────────────────────────────────────────

  async recordKeyFile(projectId: string, path: string, role: string, importance: number): Promise<void> {
    await longTermMemory.set('project', 'system', `file:${path}`, role, {
      projectId,
      importance: importance > 0.7 ? 'high' : 'medium',
      tags: ['key-file'],
      metadata: { importance },
    })
  }

  async getKeyFiles(projectId: string): Promise<KeyFile[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.keyFiles.sort((a, b) => b.importance - a.importance)
  }

  // ── Patterns ─────────────────────────────────────────────

  async recordPattern(projectId: string, pattern: ArchitecturePattern): Promise<void> {
    await longTermMemory.set('project', 'system', `pattern:${pattern.name}`, pattern.description, {
      projectId,
      importance: pattern.confidence > 0.7 ? 'high' : 'medium',
      tags: ['pattern', 'architecture'],
      metadata: { files: pattern.files, confidence: pattern.confidence },
    })
  }

  async getPatterns(projectId: string): Promise<ArchitecturePattern[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.patterns
  }

  // ── Agent Learning ───────────────────────────────────────

  async recordLearning(
    projectId: string,
    agentType: AgentType,
    key: string,
    value: string
  ): Promise<void> {
    await longTermMemory.set('skill', agentType, `learning:${key}`, value, {
      projectId,
      importance: 'medium',
      tags: ['project-learning', agentType],
      metadata: { timesApplied: 0, successRate: 1.0 },
    })
  }

  async getLearnings(projectId: string, agentType?: AgentType): Promise<ProjectLearning[]> {
    const knowledge = await this.initProject(projectId)
    if (agentType) {
      return knowledge.learnings.filter(l => l.agentType === agentType)
    }
    return knowledge.learnings
  }

  // ── Error Patterns ───────────────────────────────────────

  async recordErrorPattern(
    projectId: string,
    agentType: AgentType,
    pattern: string,
    fix: string
  ): Promise<void> {
    await longTermMemory.set('error', agentType, `error:${pattern}`, fix, {
      projectId,
      importance: 'high',
      tags: ['error-pattern'],
    })
  }

  async getErrorPatterns(projectId: string): Promise<ErrorPattern[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.errorPatterns.sort((a, b) => b.frequency - a.frequency)
  }

  // ── Performance Notes ────────────────────────────────────

  async recordPerformanceNote(
    projectId: string,
    agentType: AgentType,
    file: string,
    issue: string,
    severity: PerformanceNote['severity'],
    suggestion: string
  ): Promise<void> {
    await longTermMemory.set('task', agentType, `perf:${file}:${issue.slice(0, 50)}`, suggestion, {
      projectId,
      importance: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium',
      tags: ['performance'],
      metadata: { file, performanceIssue: true, severity, suggestion },
    })
  }

  async getPerformanceNotes(projectId: string): Promise<PerformanceNote[]> {
    const knowledge = await this.initProject(projectId)
    return knowledge.performanceNotes
  }

  // ── Query ────────────────────────────────────────────────

  async searchProject(projectId: string, query: string): Promise<MemoryEntry[]> {
    const results = await longTermMemory.search(query, { projectId, limit: 20 })
    return results.map(r => r.entry)
  }

  async getProjectSummary(projectId: string): Promise<string> {
    const knowledge = await this.initProject(projectId)
    const lines: string[] = []

    if (knowledge.techStack.length > 0) {
      lines.push(`Tech Stack: ${knowledge.techStack.map(t => t.name).join(', ')}`)
    }
    if (knowledge.conventions.length > 0) {
      lines.push(`Conventions: ${knowledge.conventions.length} documented`)
    }
    if (knowledge.patterns.length > 0) {
      lines.push(`Patterns: ${knowledge.patterns.map(p => p.name).join(', ')}`)
    }
    if (knowledge.learnings.length > 0) {
      lines.push(`Learnings: ${knowledge.learnings.length} across ${new Set(knowledge.learnings.map(l => l.agentType)).size} agents`)
    }
    if (knowledge.errorPatterns.length > 0) {
      lines.push(`Known Errors: ${knowledge.errorPatterns.length} patterns`)
    }

    return lines.join('\n') || 'No project knowledge yet'
  }

  // ── Subscription ─────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  /** Clear all cached project knowledge (for testing) */
  clearCache(): void {
    this.projects.clear()
  }
}

export const projectMemory = new ProjectMemoryService()
export default projectMemory
