import { fallbackService, FallbackEvent } from './fallbackService'
import { aiProviderService, AIProviderConfig, ProviderFamily } from './aiProviders'

export type AIProvider = 'openai' | 'anthropic' | 'demo' | 'custom'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIStreamChunk {
  content: string
  done: boolean
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  error?: string
  providerId?: string
  modelId?: string
}

export interface AIResponse {
  content: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  model: string
  provider: string
}

class AISStreamingService {
  private config: AIConfig = { provider: 'demo', apiKey: '', model: 'gpt-4o' }
  private activeControllers: Map<string, AbortController> = new Map()
  private totalTokensUsed = 0
  private requestCount = 0
  private fallbackListeners: Array<(event: FallbackEvent) => void> = []

  configure(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config }
  }

  getConfig(): AIConfig { return { ...this.config } }

  isConfigured(): boolean {
    return this.config.provider !== 'demo' && this.config.apiKey.length > 0
  }

  getTotalTokensUsed(): number { return this.totalTokensUsed }
  getRequestCount(): number { return this.requestCount }

  // ── Non-streaming helper (collects a full response) ───────

  async sendMessage(
    prompt: string,
    options?: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }
  ): Promise<string> {
    const messages: AIMessage[] = []
    if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt })
    messages.push({ role: 'user', content: prompt })

    let result = ''
    for await (const chunk of this.chatStream(messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      systemPrompt: options?.systemPrompt,
    })) {
      if (chunk.error && !chunk.content) throw new Error(chunk.error)
      result += chunk.content
    }
    return result
  }

  // ── Streaming Chat with Fallback ──────────────────────────

  async *chatStream(
    messages: AIMessage[],
    options?: { temperature?: number; maxTokens?: number; systemPrompt?: string; purpose?: 'chat' | 'code' }
  ): AsyncGenerator<AIStreamChunk> {
    const purpose = options?.purpose || 'chat'

    if (!this.isConfigured()) {
      // Try fallback chain first, then demo
      const result = await this.tryFallback(messages, options, purpose)
      if (result) {
        yield* result
        return
      }
      yield* this.demoStream(messages)
      return
    }

    // Direct call with current config
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const controller = new AbortController()
    this.activeControllers.set(requestId, controller)

    try {
      yield* this.streamByProvider(messages, options, controller.signal, this.config.provider, this.config)
      this.recordSuccessForConfig()
    } catch (error: any) {
      if (error.name === 'AbortError') {
        yield { content: '', done: true, error: 'Cancelled' }
        return
      }

      // Attempt fallback
      this.recordFailureForConfig(error.message)
      const fallbackResult = await this.tryFallback(messages, options, purpose)
      if (fallbackResult) {
        yield* fallbackResult
        return
      }

      yield { content: '', done: true, error: error.message || 'All providers failed' }
    } finally {
      this.activeControllers.delete(requestId)
    }
  }

  private async *tryFallback(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number; systemPrompt?: string } | undefined,
    purpose: 'chat' | 'code'
  ): AsyncGenerator<AIStreamChunk> | null {
    const chain = fallbackService.getChain(purpose)

    for (const entry of chain) {
      if (!fallbackService.isHealthy(entry.providerId)) continue

      const provider = aiProviderService.getProvider(entry.providerId)
      if (!provider || !provider.apiKey) continue

      const model = provider.models.find(m => m.id === entry.modelId)
      if (!model) continue

      fallbackService.emitEvent({
        type: 'attempt',
        providerId: entry.providerId,
        modelId: entry.modelId,
        purpose,
        attemptNumber: 0,
      })

      const requestId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const controller = new AbortController()
      this.activeControllers.set(requestId, controller)

      try {
        const familyConfig = this.buildConfigFromProvider(provider, entry.modelId)
        const providerType = this.mapFamilyToProviderType(provider.family)
        yield* this.streamByProvider(messages, options, controller.signal, providerType, familyConfig, entry.providerId, entry.modelId)

        fallbackService.recordSuccess(entry.providerId)
        fallbackService.emitEvent({
          type: 'success',
          providerId: entry.providerId,
          modelId: entry.modelId,
          purpose,
          attemptNumber: 0,
        })
        return
      } catch (error: any) {
        fallbackService.recordFailure(entry.providerId, error.message)
        fallbackService.emitEvent({
          type: 'fallback',
          providerId: entry.providerId,
          modelId: entry.modelId,
          purpose,
          error: error.message,
          attemptNumber: 0,
        })
      } finally {
        this.activeControllers.delete(requestId)
      }
    }

    return null
  }

  private buildConfigFromProvider(provider: AIProviderConfig, modelId: string): AIConfig {
    const familyType = this.mapFamilyToProviderType(provider.family)
    return {
      provider: familyType,
      apiKey: provider.apiKey,
      model: modelId,
      baseUrl: provider.baseUrl,
      maxTokens: 4096,
      temperature: 0.7,
    }
  }

  private mapFamilyToProviderType(family: ProviderFamily): AIProvider {
    if (family === 'anthropic') return 'anthropic'
    return 'openai'
  }

  private async *streamByProvider(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number; systemPrompt?: string } | undefined,
    signal: AbortSignal,
    providerType: AIProvider,
    config: AIConfig,
    providerId?: string,
    modelId?: string
  ): AsyncGenerator<AIStreamChunk> {
    if (providerType === 'anthropic') {
      yield* this.streamAnthropic(messages, options, signal, config, providerId, modelId)
    } else {
      // OpenAI-compatible: covers openai, custom, and all OpenAI-compatible gateways
      yield* this.streamOpenAI(messages, options, signal, config, providerId, modelId)
    }
  }

  private recordSuccessForConfig() {
    if (this.config.provider !== 'demo') {
      const provider = aiProviderService.getEnabledProviders().find(p =>
        p.models.some(m => m.id === this.config.model)
      )
      if (provider) fallbackService.recordSuccess(provider.id)
    }
  }

  private recordFailureForConfig(error: string) {
    if (this.config.provider !== 'demo') {
      const provider = aiProviderService.getEnabledProviders().find(p =>
        p.models.some(m => m.id === this.config.model)
      )
      if (provider) fallbackService.recordFailure(provider.id, error)
    }
  }

  // ── Non-streaming Chat ─────────────────────────────────────

  async chat(
    messages: AIMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    let fullContent = ''
    let usage = undefined
    let providerId: string = this.config.provider
    let modelId: string = this.config.model

    for await (const chunk of this.chatStream(messages, options)) {
      fullContent += chunk.content
      if (chunk.usage) usage = chunk.usage
      if (chunk.providerId) providerId = chunk.providerId
      if (chunk.modelId) modelId = chunk.modelId
      if (chunk.error) throw new Error(chunk.error)
    }

    return { content: fullContent, usage, model: modelId, provider: providerId }
  }

  // ── Cancel ─────────────────────────────────────────────────

  cancelRequest(requestId: string) {
    const controller = this.activeControllers.get(requestId)
    if (controller) {
      controller.abort()
      this.activeControllers.delete(requestId)
    }
  }

  cancelAll() {
    for (const [, controller] of this.activeControllers) controller.abort()
    this.activeControllers.clear()
  }

  // ── OpenAI-compatible Streaming ────────────────────────────

  private async *streamOpenAI(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number } | undefined,
    signal: AbortSignal,
    config: AIConfig,
    providerId?: string,
    modelId?: string
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
    const body = {
      model: config.model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST', headers, body: JSON.stringify(body), signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error ${response.status}: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          this.requestCount++
          yield { content: '', done: true, providerId, modelId }
          return
        }

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield { content: delta, done: false, providerId, modelId }
        } catch {}
      }
    }

    this.requestCount++
    yield { content: '', done: true, providerId, modelId }
  }

  // ── Anthropic Streaming ────────────────────────────────────

  private async *streamAnthropic(
    messages: AIMessage[],
    options: { temperature?: number; maxTokens?: number } | undefined,
    signal: AbortSignal,
    config: AIConfig,
    providerId?: string,
    modelId?: string
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1'
    const systemMsg = messages.find(m => m.role === 'system')
    const nonSystemMsgs = messages.filter(m => m.role !== 'system')

    const body: any = {
      model: config.model,
      messages: nonSystemMsgs,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    }
    if (systemMsg) body.system = systemMsg.content
    if (options?.temperature !== undefined) body.temperature = options.temperature

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error ${response.status}: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text
            if (text) yield { content: text, done: false, providerId, modelId }
          } else if (parsed.type === 'message_delta') {
            this.requestCount++
            yield { content: '', done: true, providerId, modelId, usage: parsed.usage ? { promptTokens: 0, completionTokens: parsed.usage.output_tokens || 0, totalTokens: parsed.usage.output_tokens || 0 } : undefined }
            return
          } else if (parsed.type === 'message_stop') {
            this.requestCount++
            yield { content: '', done: true, providerId, modelId }
            return
          }
        } catch {}
      }
    }

    this.requestCount++
    yield { content: '', done: true, providerId, modelId }
  }

  // ── Demo Stream ────────────────────────────────────────────

  private async *demoStream(messages: AIMessage[]): AsyncGenerator<AIStreamChunk> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    const prompt = lastUserMsg?.content || ''
    const response = this.generateDemoResponse(prompt)
    const words = response.split(' ')

    for (let i = 0; i < words.length; i++) {
      yield { content: (i > 0 ? ' ' : '') + words[i], done: false }
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25))
    }
    yield { content: '', done: true }
  }

  private generateDemoResponse(prompt: string): string {
    const lower = prompt.toLowerCase()
    if (lower.includes('component') || lower.includes('react')) {
      return `Here's a React component based on your request:\n\n\`\`\`tsx\nimport { useState, useCallback } from 'react'\n\nexport function DataForm({ title, onSubmit }: Props) {\n  const [loading, setLoading] = useState(false)\n  const [error, setError] = useState<string | null>(null)\n\n  const handleSubmit = useCallback(async (e: React.FormEvent) => {\n    e.preventDefault()\n    setLoading(true)\n    try {\n      const formData = new FormData(e.target as HTMLFormForm)\n      await onSubmit(formData)\n    } catch (err) {\n      setError(err instanceof Error ? err.message : 'Failed')\n    } finally {\n      setLoading(false)\n    }\n  }, [onSubmit])\n\n  return (\n    <form onSubmit={handleSubmit} className=\"space-y-4\">\n      <h2>{title}</h2>\n      {error && <div className=\"text-red-500\">{error}</div>}\n      <button type=\"submit\" disabled={loading}>\n        {loading ? 'Submitting...' : 'Submit'}\n      </button>\n    </form>\n  )\n}\n\`\`\`\n\nKey features: Type-safe props, loading/error states, memoized handler.`
    }
    return `I can help with that! Here's my analysis:\n\n1. **Start with the data model** — Define your types first\n2. **Build the core logic** — Implement business rules\n3. **Add error handling** — Graceful failure modes\n4. **Write tests** — Cover key scenarios\n\nWould you like me to expand on any part?`
  }
}

export const aiStreamingService = new AISStreamingService()
export default aiStreamingService
