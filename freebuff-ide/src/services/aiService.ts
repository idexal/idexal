/**
 * AI Service - Handles communication with OpenAI/Anthropic APIs
 * This is the real AI integration layer for the agents
 */

export interface AIProvider {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
}

export type AIProviderType = 'openai' | 'anthropic' | 'local'

class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map()
  private activeProvider: AIProviderType = 'openai'

  constructor() {
    this.providers.set('openai', {
      name: 'OpenAI',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
    })

    this.providers.set('anthropic', {
      name: 'Anthropic',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-opus-20240229',
    })

    this.providers.set('local', {
      name: 'Local Model',
      apiKey: '',
      baseUrl: 'http://localhost:11434/api',
      model: 'llama2',
    })

    this.loadConfig()
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('idexal-ai-config')
      if (saved) {
        const config = JSON.parse(saved)
        if (config.activeProvider) this.activeProvider = config.activeProvider
        if (config.providers) {
          for (const [key, value] of Object.entries(config.providers)) {
            this.providers.set(key as AIProviderType, value as AIProvider)
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  saveConfig() {
    const config = {
      activeProvider: this.activeProvider,
      providers: Object.fromEntries(this.providers),
    }
    localStorage.setItem('idexal-ai-config', JSON.stringify(config))
  }

  setProvider(type: AIProviderType) {
    this.activeProvider = type
    this.saveConfig()
  }

  getProvider(): AIProviderType {
    return this.activeProvider
  }

  getProviderConfig(type: AIProviderType): AIProvider | undefined {
    return this.providers.get(type)
  }

  updateProvider(type: AIProviderType, updates: Partial<AIProvider>) {
    const existing = this.providers.get(type)
    if (existing) {
      this.providers.set(type, { ...existing, ...updates })
      this.saveConfig()
    }
  }

  isConfigured(): boolean {
    const provider = this.providers.get(this.activeProvider)
    if (!provider) return false
    if (this.activeProvider === 'local') return true
    return !!provider.apiKey
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    const provider = this.providers.get(this.activeProvider)
    if (!provider) throw new Error('No AI provider configured')
    if (!provider.apiKey && this.activeProvider !== 'local') {
      throw new Error(`API key not configured for ${provider.name}. Go to Settings to configure.`)
    }

    switch (this.activeProvider) {
      case 'openai': return this.chatOpenAI(messages, provider)
      case 'anthropic': return this.chatAnthropic(messages, provider)
      case 'local': return this.chatLocal(messages, provider)
      default: throw new Error(`Unknown provider: ${this.activeProvider}`)
    }
  }

  private async chatOpenAI(messages: AIMessage[], provider: AIProvider): Promise<AIResponse> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      model: data.model,
    }
  }

  private async chatAnthropic(messages: AIMessage[], provider: AIProvider): Promise<AIResponse> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4096,
        system: systemMsg?.content || '',
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      content: data.content[0].text,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      model: data.model,
    }
  }

  private async chatLocal(messages: AIMessage[], provider: AIProvider): Promise<AIResponse> {
    const response = await fetch(`${provider.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: provider.model, messages, stream: false }),
    })

    if (!response.ok) throw new Error('Local model API error')
    const data = await response.json()
    return {
      content: data.message?.content || '',
      model: provider.model,
    }
  }

  async *chatStream(messages: AIMessage[]): AsyncGenerator<string, void, unknown> {
    const provider = this.providers.get(this.activeProvider)
    if (!provider) throw new Error('No AI provider configured')
    if (!provider.apiKey && this.activeProvider !== 'local') {
      throw new Error(`API key not configured for ${provider.name}`)
    }

    if (this.activeProvider === 'openai') {
      yield* this.streamOpenAI(messages, provider)
    } else {
      const response = await this.chat(messages)
      yield response.content
    }
  }

  private async *streamOpenAI(messages: AIMessage[], provider: AIProvider): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.7, max_tokens: 4096, stream: true }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || 'OpenAI API error')
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
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content
            if (content) yield content
          } catch (e) { /* ignore */ }
        }
      }
    }
  }

  async agentChat(agentType: string, systemPrompt: string, userMessage: string, context?: string): Promise<string> {
    const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }]
    if (context) {
      messages.push({ role: 'user', content: `Context:\n${context}\n\nTask: ${userMessage}` })
    } else {
      messages.push({ role: 'user', content: userMessage })
    }
    const response = await this.chat(messages)
    return response.content
  }
}

export const aiService = new AIService()
export default aiService
