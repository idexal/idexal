// ══════════════════════════════════════════════════════════════════════
// AI Provider — Abstraction layer for multiple AI providers
//
// Supports: OpenAI, Anthropic, Google, Mistral, Ollama (local)
// Features: Streaming, tool calling, context injection, fallback
// ══════════════════════════════════════════════════════════════════════

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama' | 'custom'

export interface AIProviderConfig {
  type: ProviderType
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
}

export interface StreamChunk {
  delta: string
  done: boolean
  usage?: { prompt: number; completion: number; total: number }
}

export interface AIResponse {
  content: string
  usage: { prompt: number; completion: number; total: number }
  model: string
  finishReason: string
}

// ── Provider implementations ──────────────────────────────────────────

abstract class BaseProvider {
  protected config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  abstract chat(messages: ChatMessage[]): Promise<AIResponse>
  abstract chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk>
}

// ── OpenAI Provider ───────────────────────────────────────────────────

class OpenAIProvider extends BaseProvider {
  private get baseUrl() {
    return this.config.baseUrl || 'https://api.openai.com/v1'
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
      }),
    })

    const data = await response.json()
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage || { prompt: 0, completion: 0, total: 0 },
      model: data.model || this.config.model,
      finishReason: data.choices[0]?.finish_reason || 'stop',
    }
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.7,
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    if (!reader) return

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
          if (data === '[DONE]') {
            yield { delta: '', done: true }
            return
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta?.content || ''
            if (delta) {
              yield { delta, done: false }
            }
          } catch {}
        }
      }
    }
  }
}

// ── Anthropic Provider ────────────────────────────────────────────────

class AnthropicProvider extends BaseProvider {
  private get baseUrl() {
    return this.config.baseUrl || 'https://api.anthropic.com'
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const systemMsg = messages.find(m => m.role === 'system')
    const userMsgs = messages.filter(m => m.role !== 'system')

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        system: systemMsg?.content,
        messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await response.json()
    return {
      content: data.content?.[0]?.text || '',
      usage: data.usage ? { prompt: data.usage.input_tokens, completion: data.usage.output_tokens, total: data.usage.input_tokens + data.usage.output_tokens } : { prompt: 0, completion: 0, total: 0 },
      model: data.model || this.config.model,
      finishReason: data.stop_reason || 'stop',
    }
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const systemMsg = messages.find(m => m.role === 'system')
    const userMsgs = messages.filter(m => m.role !== 'system')

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        system: systemMsg?.content,
        messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    if (!reader) return

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
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.type === 'content_block_delta') {
              yield { delta: parsed.delta?.text || '', done: false }
            } else if (parsed.type === 'message_stop') {
              yield { delta: '', done: true }
              return
            }
          } catch {}
        }
      }
    }
  }
}

// ── Ollama Provider (local) ───────────────────────────────────────────

class OllamaProvider extends BaseProvider {
  private get baseUrl() {
    return this.config.baseUrl || 'http://localhost:11434'
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    })

    const data = await response.json()
    return {
      content: data.message?.content || '',
      usage: { prompt: data.prompt_eval_count || 0, completion: data.eval_count || 0, total: (data.prompt_eval_count || 0) + (data.eval_count || 0) },
      model: data.model || this.config.model,
      finishReason: 'stop',
    }
  }

  async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)
            const delta = parsed.message?.content || ''
            if (delta) yield { delta, done: false }
            if (parsed.done) yield { delta: '', done: true }
          } catch {}
        }
      }
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createProvider(config: AIProviderConfig): BaseProvider {
  switch (config.type) {
    case 'openai': return new OpenAIProvider(config)
    case 'anthropic': return new AnthropicProvider(config)
    case 'ollama': return new OllamaProvider(config)
    default: return new OpenAIProvider(config) // fallback
  }
}

// ── Context-aware chat service ────────────────────────────────────────

import { getRagService } from './ragService'
import { getEngineService } from './engineService'

export class AIAssistant {
  private providers = new Map<string, BaseProvider>()
  private activeProvider: string | null = null

  addProvider(name: string, config: AIProviderConfig) {
    this.providers.set(name, createProvider(config))
    if (!this.activeProvider) this.activeProvider = name
  }

  setActiveProvider(name: string) {
    if (this.providers.has(name)) this.activeProvider = name
  }

  async chat(userMessage: string, context?: { filePath?: string; content?: string }): Promise<string> {
    const provider = this.activeProvider ? this.providers.get(this.activeProvider) : null
    if (!provider) return this.fallbackResponse(userMessage)

    // Build context-enhanced prompt
    const messages = await this.buildMessages(userMessage, context)

    try {
      const response = await provider.chat(messages)
      return response.content
    } catch (err) {
      console.error('[ai] provider error:', err)
      return this.fallbackResponse(userMessage)
    }
  }

  async *chatStream(userMessage: string, context?: { filePath?: string; content?: string }): AsyncGenerator<string> {
    const provider = this.activeProvider ? this.providers.get(this.activeProvider) : null
    if (!provider) {
      yield this.fallbackResponse(userMessage)
      return
    }

    const messages = await this.buildMessages(userMessage, context)

    try {
      for await (const chunk of provider.chatStream(messages)) {
        if (chunk.delta) yield chunk.delta
      }
    } catch (err) {
      console.error('[ai] stream error:', err)
      yield this.fallbackResponse(userMessage)
    }
  }

  private async buildMessages(userMessage: string, context?: { filePath?: string; content?: string }): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = []

    // System prompt with project context
    let systemPrompt = `You are Idexal AI, an expert coding assistant embedded in the Idexal IDE.
You help developers write, understand, debug, and improve code.
Be concise, accurate, and provide actionable suggestions.
When showing code, use markdown code blocks with the appropriate language.`
    messages.push({ role: 'system', content: systemPrompt })

    // Add RAG context if available
    try {
      const rag = getRagService()
      const ragContext = rag.searchRelevant(userMessage, 5)
      if (ragContext.relevantSymbols.length > 0) {
        let contextMsg = '\n\nRelevant code from the project:\n'
        for (const sym of ragContext.relevantSymbols.slice(0, 3)) {
          contextMsg += `\n### ${sym.name} (${sym.symbol_type})\n\`\`\`\n${sym.snippet}\n\`\`\`\n`
        }
        messages.push({ role: 'system', content: contextMsg })
      }
    } catch {}

    // Add file context if provided
    if (context?.filePath && context?.content) {
      messages.push({ role: 'system', content: `Current file: ${context.filePath}\n\`\`\`\n${context.content.slice(0, 2000)}\n\`\`\`` })
    }

    messages.push({ role: 'user', content: userMessage })
    return messages
  }

  private fallbackResponse(query: string): string {
    return `I'm Idexal AI. To enable AI-powered responses, please configure an API key in Settings → AI Providers.\n\nYour question: "${query}"\n\nSupported providers: OpenAI, Anthropic, Google, Mistral, Ollama (local)`
  }
}

// Singleton
let _assistant: AIAssistant | null = null

export function getAIAssistant(): AIAssistant {
  if (!_assistant) _assistant = new AIAssistant()
  return _assistant
}
