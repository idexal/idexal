/**
 * Streaming AI Response Service
 * Supports OpenAI, Anthropic, Google, Mistral, Ollama, and custom OpenAI-compatible APIs.
 * Provides true streaming via fetch + ReadableStream.
 */

export interface StreamingCallbacks {
  onToken: (token: string) => void
  onComplete: (fullText: string) => void
  onError: (error: string) => void
}

interface ProviderConfig {
  baseUrl: string
  model: string
  apiKey: string
  headers?: Record<string, string>
}

/**
 * Stream a chat completion from any OpenAI-compatible provider.
 */
export async function streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  config: ProviderConfig,
  callbacks: StreamingCallbacks
): Promise<void> {
  const { baseUrl, model, apiKey, headers = {} } = config

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      callbacks.onError(`API error ${response.status}: ${errorText}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          callbacks.onComplete(fullText)
          return
        }

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullText += delta
            callbacks.onToken(delta)
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    callbacks.onComplete(fullText)
  } catch (error) {
    callbacks.onError((error as Error).message)
  }
}

/**
 * Stream from Anthropic's Messages API (different format from OpenAI).
 */
export async function streamAnthropicCompletion(
  messages: Array<{ role: string; content: string }>,
  config: ProviderConfig,
  callbacks: StreamingCallbacks
): Promise<void> {
  const { model, apiKey } = config

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      callbacks.onError(`Anthropic error ${response.status}: ${errorText}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('No response body')
      return
    }

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          callbacks.onComplete(fullText)
          return
        }

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text
            callbacks.onToken(parsed.delta.text)
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    callbacks.onComplete(fullText)
  } catch (error) {
    callbacks.onError((error as Error).message)
  }
}

/**
 * Create a streaming provider function based on the provider name.
 */
export function createStreamingProvider(
  provider: string,
  config: ProviderConfig
): (messages: Array<{ role: string; content: string }>, callbacks: StreamingCallbacks) => Promise<void> {
  if (provider === 'anthropic') {
    return (msgs, cbs) => streamAnthropicCompletion(msgs, config, cbs)
  }
  // All others use OpenAI-compatible API
  return (msgs, cbs) => streamChatCompletion(msgs, config, cbs)
}
