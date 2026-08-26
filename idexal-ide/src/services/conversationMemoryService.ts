/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║            CONVERSATION MEMORY SERVICE v1.0                    ║
 * ║     Chat History • Summaries • Learning • Context              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Conversation history with full message storage
 * - Auto-summarization of long conversations
 * - Cross-conversation context linking
 * - Learning extraction from conversations
 * - Project-scoped conversation history
 * - Agent-specific conversation tracking
 */

import { AgentType } from './agentOrchestrator'
import { longTermMemory, MemoryEntry } from './longTermMemoryService'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  agentType?: AgentType
  timestamp: number
  /** Tokens used (for cost tracking) */
  tokens?: number
  /** Model used */
  model?: string
  /** Provider used */
  provider?: string
  /** Duration in ms */
  duration?: number
  /** Files referenced */
  files?: string[]
  /** Tools used */
  tools?: string[]
  /** Whether this message was successful */
  success?: boolean
  /** Error if failed */
  error?: string
}

export interface Conversation {
  id: string
  /** Human-readable title */
  title: string
  /** Project this conversation belongs to */
  projectId: string | null
  /** Agent type leading this conversation */
  leadAgent: AgentType | 'user'
  /** All messages */
  messages: ConversationMessage[]
  /** Auto-generated summary */
  summary?: string
  /** Topics covered */
  topics: string[]
  /** Key decisions made */
  decisions: string[]
  /** Files modified */
  filesModified: string[]
  /** Total tokens used */
  totalTokens: number
  /** Total cost in USD */
  totalCost: number
  /** Start timestamp */
  startedAt: number
  /** Last activity timestamp */
  lastActivity: number
  /** Whether conversation is active */
  isActive: boolean
  /** Tags for organization */
  tags: string[]
}

export interface ConversationSummary {
  conversationId: string
  title: string
  summary: string
  keyPoints: string[]
  decisions: string[]
  filesChanged: string[]
  agentTypes: AgentType[]
  messageCount: number
  totalTokens: number
  startedAt: number
  lastActivity: number
}

export interface LearningExtraction {
  id: string
  conversationId: string
  agentType: AgentType
  category: 'convention' | 'preference' | 'pattern' | 'error' | 'technique'
  key: string
  value: string
  confidence: number
  extractedAt: number
}

// ══════════════════════════════════════════════════════════════
// CONVERSATION MEMORY SERVICE
// ══════════════════════════════════════════════════════════════

class ConversationMemoryService {
  private conversations: Map<string, Conversation> = new Map()
  private activeConversationId: string | null = null
  private listeners: Set<() => void> = new Set()

  // ── Conversation Lifecycle ────────────────────────────────

  /** Start a new conversation */
  async startConversation(
    title: string,
    leadAgent: AgentType | 'user',
    projectId?: string,
    tags?: string[]
  ): Promise<Conversation> {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const conversation: Conversation = {
      id,
      title,
      projectId: projectId ?? null,
      leadAgent,
      messages: [],
      topics: [],
      decisions: [],
      filesModified: [],
      totalTokens: 0,
      totalCost: 0,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      tags: tags ?? [],
    }

    this.conversations.set(id, conversation)
    this.activeConversationId = id

    // Persist to long-term memory
    await longTermMemory.set('conversation', leadAgent, `conv:${id}`, title, {
      projectId: projectId ?? null,
      importance: 'medium',
      tags: ['conversation', leadAgent, ...(tags ?? [])],
      metadata: {
        conversationId: id,
        leadAgent,
        projectId: projectId ?? null,
      },
    })

    this.notify()
    return conversation
  }

  /** Add a message to a conversation */
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    options?: {
      agentType?: AgentType
      tokens?: number
      model?: string
      provider?: string
      duration?: number
      files?: string[]
      tools?: string[]
      success?: boolean
      error?: string
    }
  ): Promise<ConversationMessage | null> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) return null

    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      agentType: options?.agentType,
      timestamp: Date.now(),
      tokens: options?.tokens,
      model: options?.model,
      provider: options?.provider,
      duration: options?.duration,
      files: options?.files,
      tools: options?.tools,
      success: options?.success,
      error: options?.error,
    }

    conversation.messages.push(message)
    conversation.lastActivity = Date.now()
    conversation.totalTokens += options?.tokens ?? 0

    // Track files modified
    if (options?.files) {
      conversation.filesModified = [...new Set([...conversation.filesModified, ...options.files])]
    }

    // Track agent types used
    if (options?.agentType && !conversation.tags.includes(options.agentType)) {
      conversation.tags.push(options.agentType)
    }

    this.notify()
    return message
  }

  /** End a conversation */
  async endConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) return

    conversation.isActive = false
    conversation.lastActivity = Date.now()

    // Generate summary
    conversation.summary = this.generateSummary(conversation)

    // Extract learnings
    await this.extractLearnings(conversation)

    // Persist summary
    await longTermMemory.update(
      `conversation:${conversation.leadAgent}:conv:${conversationId}:${conversation.startedAt}`,
      {
        value: conversation.summary,
        metadata: {
          conversationId,
          summary: conversation.summary,
          topics: conversation.topics,
          decisions: conversation.decisions,
          filesModified: conversation.filesModified,
          messageCount: conversation.messages.length,
          totalTokens: conversation.totalTokens,
        },
      }
    )

    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null
    }

    this.notify()
  }

  // ── Message Queries ──────────────────────────────────────

  /** Get a conversation by ID */
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id)
  }

  /** Get the active conversation */
  getActiveConversation(): Conversation | undefined {
    if (!this.activeConversationId) return undefined
    return this.conversations.get(this.activeConversationId)
  }

  /** Get all conversations */
  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
  }

  /** Get conversations for a project */
  getProjectConversations(projectId: string): Conversation[] {
    return this.getAllConversations()
      .filter(c => c.projectId === projectId)
  }

  /** Get conversations for an agent */
  getAgentConversations(agentType: AgentType): Conversation[] {
    return this.getAllConversations()
      .filter(c => c.leadAgent === agentType || c.tags.includes(agentType))
  }

  /** Get recent messages across all conversations */
  getRecentMessages(limit: number = 50): ConversationMessage[] {
    const allMessages: ConversationMessage[] = []
    for (const conv of this.conversations.values()) {
      allMessages.push(...conv.messages)
    }
    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /** Get messages from a specific conversation */
  getMessages(conversationId: string, limit?: number): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId)
    if (!conversation) return []

    const messages = conversation.messages
    if (limit) return messages.slice(-limit)
    return messages
  }

  // ── Context Building ─────────────────────────────────────

  /** Build context from recent conversations for an agent */
  async buildContext(agentType: AgentType, projectId?: string, maxTokens: number = 4000): Promise<string> {
    const lines: string[] = []
    let tokenEstimate = 0

    // Get recent conversations
    const conversations = this.getAllConversations()
      .filter(c => {
        if (c.leadAgent === agentType || c.tags.includes(agentType)) return true
        if (projectId && c.projectId === projectId) return true
        return false
      })
      .slice(0, 5)

    for (const conv of conversations) {
      const convLines: string[] = []

      // Add summary
      if (conv.summary) {
        convLines.push(`## ${conv.title}`)
        convLines.push(conv.summary)
      }

      // Add recent messages
      const recentMessages = conv.messages.slice(-5)
      for (const msg of recentMessages) {
        const prefix = msg.role === 'user' ? 'User' : msg.agentType || 'Assistant'
        convLines.push(`[${prefix}]: ${msg.content.slice(0, 200)}`)
      }

      const convText = convLines.join('\n')
      const estTokens = Math.ceil(convText.length / 4)

      if (tokenEstimate + estTokens > maxTokens) break
      lines.push(convText)
      tokenEstimate += estTokens
    }

    return lines.join('\n\n---\n\n')
  }

  /** Get topic history for an agent */
  async getTopicHistory(agentType: AgentType): Promise<string[]> {
    const topics: Set<string> = new Set()
    for (const conv of this.conversations.values()) {
      if (conv.leadAgent === agentType || conv.tags.includes(agentType)) {
        for (const topic of conv.topics) {
          topics.add(topic)
        }
      }
    }
    return Array.from(topics)
  }

  // ── Learning Extraction ──────────────────────────────────

  /** Extract learnings from a conversation */
  private async extractLearnings(conversation: Conversation): Promise<void> {
    const learnings: LearningExtraction[] = []

    // Extract file patterns
    if (conversation.filesModified.length > 2) {
      const commonDirs = this.findCommonDirs(conversation.filesModified)
      for (const dir of commonDirs) {
        learnings.push({
          id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conversationId: conversation.id,
          agentType: conversation.leadAgent as AgentType,
          category: 'pattern',
          key: `common-dir:${dir}`,
          value: `Frequently modified: ${dir}`,
          confidence: 0.7,
          extractedAt: Date.now(),
        })
      }
    }

    // Extract decision patterns
    for (const decision of conversation.decisions) {
      learnings.push({
        id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conversationId: conversation.id,
        agentType: conversation.leadAgent as AgentType,
        category: 'pattern',
        key: `decision:${decision.slice(0, 100)}`,
        value: decision,
        confidence: 0.8,
        extractedAt: Date.now(),
      })
    }

    // Persist learnings
    for (const learning of learnings) {
      await longTermMemory.set('skill', learning.agentType, learning.key, learning.value, {
        projectId: conversation.projectId,
        importance: 'medium',
        tags: ['conversation-learning', learning.category],
        metadata: {
          conversationId: learning.conversationId,
          category: learning.category,
          confidence: learning.confidence,
        },
      })
    }
  }

  private findCommonDirs(files: string[]): string[] {
    const dirCounts: Map<string, number> = new Map()
    for (const file of files) {
      const parts = file.split('/')
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/')
        dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1)
      }
    }
    return Array.from(dirCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dir]) => dir)
  }

  private generateSummary(conversation: Conversation): string {
    const lines: string[] = []
    lines.push(`Conversation: ${conversation.title}`)
    lines.push(`Duration: ${this.formatDuration(conversation.lastActivity - conversation.startedAt)}`)
    lines.push(`Messages: ${conversation.messages.length}`)
    lines.push(`Tokens: ${conversation.totalTokens}`)

    if (conversation.topics.length > 0) {
      lines.push(`Topics: ${conversation.topics.join(', ')}`)
    }
    if (conversation.decisions.length > 0) {
      lines.push(`Decisions: ${conversation.decisions.join('; ')}`)
    }
    if (conversation.filesModified.length > 0) {
      lines.push(`Files: ${conversation.filesModified.join(', ')}`)
    }

    // Extract key exchanges
    const userMessages = conversation.messages.filter(m => m.role === 'user')
    if (userMessages.length > 0) {
      lines.push('')
      lines.push('Key requests:')
      for (const msg of userMessages.slice(0, 5)) {
        lines.push(`- ${msg.content.slice(0, 100)}`)
      }
    }

    return lines.join('\n')
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  // ── Stats ────────────────────────────────────────────────

  getStats() {
    const conversations = Array.from(this.conversations.values())
    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0)
    const totalTokens = conversations.reduce((sum, c) => sum + c.totalTokens, 0)
    const activeCount = conversations.filter(c => c.isActive).length

    return {
      totalConversations: conversations.length,
      activeConversations: activeCount,
      totalMessages,
      totalTokens,
      averageMessagesPerConversation: conversations.length > 0 ? totalMessages / conversations.length : 0,
      agentBreakdown: this.getAgentBreakdown(),
    }
  }

  private getAgentBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {}
    for (const conv of this.conversations.values()) {
      breakdown[conv.leadAgent] = (breakdown[conv.leadAgent] || 0) + 1
    }
    return breakdown
  }

  // ── Subscription ─────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  /** Clear all cached conversations (for testing) */
  clearCache(): void {
    this.conversations.clear()
    this.activeConversationId = null
  }
}

export const conversationMemory = new ConversationMemoryService()
export default conversationMemory
