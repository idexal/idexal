import { useCallback, useState } from 'react'
import { useMemoryStore } from '../stores/memoryStore'
import { aiService, AIMessage } from '../services/aiService'

interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  agentType?: string
  isStreaming?: boolean
}

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  code: 'You are Idexal Code Agent, an expert software engineer. You write clean, efficient, well-documented code. When writing code, use proper formatting with markdown code blocks. Always explain your approach briefly before code. Be concise and actionable.',
  review: 'You are Idexal Review Agent, an expert code reviewer. Analyze code for bugs, security issues, performance problems, and style violations. Provide specific, actionable feedback with line references when possible.',
  debug: 'You are Idexal Debug Agent, an expert debugger. Help diagnose and fix code issues. Provide step-by-step debugging guidance, suggest breakpoints, and explain root causes.',
  architect: 'You are Idexal Architect Agent, a software architect expert. Help design system architecture, plan features, and make technology decisions.',
  test: 'You are Idexal Test Agent, a testing expert. Write comprehensive unit tests, integration tests, and e2e tests. Follow testing best practices and edge case coverage.',
}

export function useAgent() {
  const { addMemory } = useMemoryStore()

  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const updateMessage = useCallback((id: string, updates: Partial<AgentMessage>) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, ...updates } : m)
    )
  }, [])

  const sendMessage = useCallback(async (content: string, agentType: string = 'code') => {
    if (!content.trim()) return

    // Add user message
    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    // Start streaming
    setIsStreaming(true)

    const assistantId = `assistant-${Date.now()}`
    const assistantMsg: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      agentType,
      isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType] || AGENT_SYSTEM_PROMPTS.code

      const aiMessages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ]

      if (aiService.isConfigured()) {
        try {
          let fullContent = ''
          for await (const chunk of aiService.chatStream(aiMessages)) {
            fullContent += chunk
            updateMessage(assistantId, { content: fullContent, isStreaming: true })
          }
          updateMessage(assistantId, { content: fullContent, isStreaming: false })

          addMemory({
            type: 'conversation',
            key: `agent-${agentType}`,
            value: fullContent.slice(0, 500),
          })
        } catch {
          const response = await aiService.chat(aiMessages)
          updateMessage(assistantId, { content: response.content, isStreaming: false })
        }
      } else {
        const demoResponse = generateDemoResponse(agentType, content)
        updateMessage(assistantId, { content: demoResponse, isStreaming: false })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      updateMessage(assistantId, {
        content: `⚠️ Error: ${errorMessage}\n\nPlease check your AI provider settings.`,
        isStreaming: false,
      })
    } finally {
      setIsStreaming(false)
    }
  }, [addMemory, updateMessage])

  const cancelStream = useCallback(() => {
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    sendMessage,
    cancelStream,
    clearMessages,
    isStreaming,
  }
}

// Demo responses when no AI is configured
function generateDemoResponse(agentType: string, userMessage: string): string {
  const lower = userMessage.toLowerCase()

  if (agentType === 'code') {
    if (lower.includes('component') || lower.includes('react')) {
      return 'Here\'s a React component based on your request:\n\n```tsx\nimport React, { useState } from \'react\'\n\ninterface Props {\n  title: string\n  onAction?: () => void\n}\n\nexport function CustomComponent({ title, onAction }: Props) {\n  const [isActive, setIsActive] = useState(false)\n\n  return (\n    <div className={`p-4 rounded-lg border ${isActive ? \'border-ide-accent bg-ide-accent/10\' : \'border-ide-border\'}`}>\n      <h3 className="text-lg font-medium">{title}</h3>\n      <button\n        onClick={() => {\n          setIsActive(!isActive)\n          onAction?.()\n        }}\n        className="mt-2 px-3 py-1 text-sm bg-ide-accent text-white rounded"\n      >\n        {isActive ? \'Active\' : \'Activate\'}\n      </button>\n    </div>\n  )\n}\n```\n\nThis component:\n- Uses TypeScript for type safety\n- Includes `useState` for toggle behavior\n- Accepts `title` and optional `onAction` callback\n\n> **Tip**: Connect your AI provider in Settings to get real code generation from Claude or GPT-4.'
    }

    if (lower.includes('function') || lower.includes('helper')) {
      return 'Here\'s a utility function:\n\n```typescript\n/**\n * Debounce a function call\n * @param fn - Function to debounce\n * @param delay - Delay in milliseconds\n */\nexport function debounce<T extends (...args: any[]) => any>(\n  fn: T,\n  delay: number\n): (...args: Parameters<T>) => void {\n  let timeoutId: ReturnType<typeof setTimeout>\n  return (...args: Parameters<T>) => {\n    clearTimeout(timeoutId)\n    timeoutId = setTimeout(() => fn(...args), delay)\n  }\n}\n```\n\n**Usage:**\n```typescript\nconst debouncedSearch = debounce(async (query: string) => {\n  const results = await searchAPI(query)\n  setResults(results)\n}, 300)\n```'
    }

    return `I understand you want to: **${userMessage}**

Here's my approach:

\`\`\`typescript
interface Config {
  apiKey: string
  baseUrl: string
  timeout?: number
}

async function fetchData(config: Config): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeout || 30000)
  try {
    const response = await fetch(config.baseUrl, {
      headers: { 'Authorization': \`Bearer \${config.apiKey}\` },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`)
    return response
  } finally {
    clearTimeout(timeout)
  }
}
\`\`\`

> Configure your AI provider in Settings for intelligent code generation.`
  }

  if (agentType === 'review') {
    return '## Code Review Analysis\n\n**Overall Assessment**: ⚠️ Needs attention\n\n### Issues Found:\n1. **Type Safety** - Consider adding explicit return types\n2. **Error Handling** - Missing try-catch blocks\n3. **Performance** - Potential re-render issues\n\n### Suggestions:\n- Add `React.memo()` for expensive components\n- Use `useCallback` for event handlers passed as props\n- Consider adding loading states for async operations\n\n### Positive Notes:\n✅ Good naming conventions\n✅ Proper file organization\n✅ Consistent formatting'
  }

  if (agentType === 'debug') {
    return '## Debug Analysis\n\nBased on: "' + userMessage + '"\n\n### Possible Causes:\n1. **Race condition** - Async operations may complete out of order\n2. **Stale closure** - State not updating as expected\n3. **Null reference** - Object may be undefined before use\n\n### Debugging Steps:\n1. Add console.log() at key points\n2. Check React DevTools for state changes\n3. Verify all useEffect dependencies\n4. Use the debugger panel to set breakpoints\n\n### Quick Fix:\n```typescript\nconst data = response?.data ?? defaultValue\nconst value = obj?.nested?.property\n```'
  }

  return `I'm here to help! You asked about: "${userMessage}"\n\nNo AI provider is currently configured. To enable real AI responses:\n\n1. Click ⚙️ **Settings** in the title bar\n2. Select a provider (OpenAI, Anthropic, or Local)\n3. Enter your API key\n\nIn the meantime, I can help with:\n- 📝 Code structure and patterns\n- 🔍 Code review tips\n- 🐛 Debugging guidance\n- 🏗️ Architecture decisions`
}
