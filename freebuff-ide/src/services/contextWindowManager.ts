/**
 * Context Window Manager - Manages token budget for AI context
 */

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  tokenCount?: number
  priority: 'high' | 'medium' | 'low'
}

export interface ContextBudget {
  totalTokens: number
  usedTokens: number
  availableTokens: number
}

class ContextWindowManager {
  private maxTokens: number = 128000 // GPT-4 default
  private reservedTokens: number = 4096 // For response

  constructor(maxTokens?: number) {
    if (maxTokens) this.maxTokens = maxTokens
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    // More accurate would use tiktoken, but this is good enough
    return Math.ceil(text.length / 4)
  }

  /**
   * Build optimized context window
   */
  buildContext(
    systemPrompt: string,
    userMessage: string,
    relevantFiles: Map<string, string>,
    conversationHistory: Array<{ role: string; content: string }>,
    projectContext?: string
  ): ContextMessage[] {
    const messages: ContextMessage[] = []
    let usedTokens = 0
    const availableTokens = this.maxTokens - this.reservedTokens

    // 1. System prompt (always included, high priority)
    const systemTokens = this.estimateTokens(systemPrompt)
    messages.push({
      role: 'system',
      content: systemPrompt,
      tokenCount: systemTokens,
      priority: 'high',
    })
    usedTokens += systemTokens

    // 2. Project context (medium priority, if fits)
    if (projectContext) {
      const contextTokens = this.estimateTokens(projectContext)
      if (usedTokens + contextTokens < availableTokens * 0.3) { // Max 30% for context
        messages.push({
          role: 'system',
          content: `Project Context:\n${projectContext}`,
          tokenCount: contextTokens,
          priority: 'medium',
        })
        usedTokens += contextTokens
      }
    }

    // 3. Relevant files (medium priority, sorted by relevance)
    const fileEntries = Array.from(relevantFiles.entries())
    for (const [filePath, content] of fileEntries) {
      const fileMessage = `File: ${filePath}\n\`\`\`\n${content}\n\`\`\``
      const fileTokens = this.estimateTokens(fileMessage)

      if (usedTokens + fileTokens < availableTokens * 0.6) { // Max 60% for files
        messages.push({
          role: 'system',
          content: fileMessage,
          tokenCount: fileTokens,
          priority: 'medium',
        })
        usedTokens += fileTokens
      }
    }

    // 4. Conversation history (low priority, fill remaining space)
    const historySpace = availableTokens - usedTokens
    let historyTokensUsed = 0

    // Take most recent messages, but build in chronological order
    // First, figure out which recent messages fit (newest first to prioritize recency)
    const recentHistory = [...conversationHistory].reverse()
    const selectedHistory: typeof conversationHistory = []
    for (const msg of recentHistory) {
      const msgTokens = this.estimateTokens(msg.content)
      if (historyTokensUsed + msgTokens < historySpace * 0.8) {
        selectedHistory.unshift(msg) // prepend to maintain chronological order
        historyTokensUsed += msgTokens
        usedTokens += msgTokens
      }
    }
    // Now push in chronological order (oldest first)
    for (const msg of selectedHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        tokenCount: this.estimateTokens(msg.content),
        priority: 'low',
      })
    }

    // 5. User message (always included, high priority)
    const userTokens = this.estimateTokens(userMessage)
    messages.push({
      role: 'user',
      content: userMessage,
      tokenCount: userTokens,
      priority: 'high',
    })
    usedTokens += userTokens

    return messages
  }

  /**
   * Get context budget info
   */
  getBudget(messages: ContextMessage[]): ContextBudget {
    const usedTokens = messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
    return {
      totalTokens: this.maxTokens,
      usedTokens,
      availableTokens: this.maxTokens - usedTokens,
    }
  }

  /**
   * Trim messages to fit within budget
   */
  trimToBudget(messages: ContextMessage[], maxTokens?: number): ContextMessage[] {
    const limit = maxTokens || this.maxTokens - this.reservedTokens
    const result: ContextMessage[] = []
    let usedTokens = 0

    // Always keep high priority messages
    const highPriority = messages.filter(m => m.priority === 'high')
    const others = messages.filter(m => m.priority !== 'high')

    for (const msg of highPriority) {
      const tokens = msg.tokenCount || this.estimateTokens(msg.content)
      if (usedTokens + tokens < limit) {
        result.push(msg)
        usedTokens += tokens
      }
    }

    // Add others by priority
    for (const msg of others) {
      const tokens = msg.tokenCount || this.estimateTokens(msg.content)
      if (usedTokens + tokens < limit) {
        result.push(msg)
        usedTokens += tokens
      }
    }

    return result
  }

  /**
   * Set model and update token limits
   */
  setModel(model: string) {
    const limits: Record<string, number> = {
      'gpt-4': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 16384,
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
    }
    this.maxTokens = limits[model] || 128000
  }
}

export const contextWindowManager = new ContextWindowManager()
export default contextWindowManager
