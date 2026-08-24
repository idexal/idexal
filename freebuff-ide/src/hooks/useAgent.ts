import { useCallback, useEffect } from 'react'
import { useAgentStore, AgentType } from '../stores/agentStore'
import { useMemoryStore } from '../stores/memoryStore'
import { AGENT_CONFIGS } from '../utils/agentUtils'
import { aiService } from '../services/aiService'
import { useSettingsStore } from '../stores/settingsStore'

export function useAgent() {
  const {
    agents,
    activeAgentId,
    messages,
    isProcessing,
    selectedAgentType,
    initializeAgents,
    setActiveAgent,
    setSelectedAgentType,
    updateAgentStatus,
    updateAgentThinking,
    setAgentResult,
    setAgentError,
    addMessage,
    setProcessing,
  } = useAgentStore()

  const { searchMemory, addMemory } = useMemoryStore()
  const settings = useSettingsStore()

  const activeAgent = agents.find(a => a.id === activeAgentId)

  // Sync settings with AI service
  useEffect(() => {
    aiService.setProvider(settings.activeProvider)
    if (settings.openaiApiKey) {
      aiService.updateProvider('openai', { apiKey: settings.openaiApiKey, model: settings.openaiModel })
    }
    if (settings.anthropicApiKey) {
      aiService.updateProvider('anthropic', { apiKey: settings.anthropicApiKey, model: settings.anthropicModel })
    }
    if (settings.localModelUrl) {
      aiService.updateProvider('local', { baseUrl: settings.localModelUrl, model: settings.localModelName })
    }
  }, [settings])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeAgent || isProcessing) return

    // Add user message
    addMessage({ role: 'user', content, agentType: selectedAgentType })

    // Start processing
    setProcessing(true)
    updateAgentStatus(activeAgent.id, 'thinking')

    try {
      // Search memory for relevant context
      const memoryResults = searchMemory(content)
      const context = memoryResults.map(m => `${m.key}: ${m.value}`).join('\n')

      // Build system prompt from agent config
      const config = AGENT_CONFIGS[selectedAgentType]
      let systemPrompt = config.systemPrompt

      // Add project context if available
      const projectContext = useMemoryStore.getState().projectContext
      if (projectContext) {
        systemPrompt += `\n\nProject: ${projectContext.name}\nLanguages: ${projectContext.languages.join(', ')}\nFrameworks: ${projectContext.frameworks.join(', ')}`
      }

      // Try real AI if configured
      if (aiService.isConfigured()) {
        updateAgentThinking(activeAgent.id, 'Connecting to AI provider...')
        const response = await aiService.agentChat(
          selectedAgentType,
          systemPrompt,
          content,
          context || undefined
        )

        setAgentResult(activeAgent.id, response)
        addMessage({ role: 'agent', content: response, agentType: selectedAgentType, metadata: { agentId: activeAgent.id } })

        addMemory({ type: 'conversation', key: content.substring(0, 100), value: response, metadata: { agentType: selectedAgentType } })
      } else {
        // Simulate agent thinking
        updateAgentThinking(activeAgent.id, 'Analyzing request...')
        await new Promise(resolve => setTimeout(resolve, 500))

        updateAgentThinking(activeAgent.id, 'Searching codebase...')
        await new Promise(resolve => setTimeout(resolve, 500))

        updateAgentThinking(activeAgent.id, 'Generating response...')
        await new Promise(resolve => setTimeout(resolve, 500))

        // Simulated response
        const response = generateSimulatedResponse(selectedAgentType, content, context)
        setAgentResult(activeAgent.id, response)

        addMessage({ role: 'agent', content: response, agentType: selectedAgentType, metadata: { agentId: activeAgent.id } })
        addMemory({ type: 'conversation', key: content.substring(0, 100), value: response, metadata: { agentType: selectedAgentType } })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setAgentError(activeAgent.id, errorMsg)
      addMessage({ role: 'system', content: `Error: ${errorMsg}\n\nTip: Configure your AI provider in Settings (⌘,) to enable real AI responses.` })
    } finally {
      setProcessing(false)
    }
  }, [activeAgent, isProcessing, selectedAgentType, addMessage, setProcessing,
      updateAgentStatus, updateAgentThinking, setAgentResult, setAgentError,
      searchMemory, addMemory])

  const selectAgent = useCallback((type: AgentType) => {
    setSelectedAgentType(type)
    const agent = agents.find(a => a.type === type)
    if (agent) setActiveAgent(agent.id)
  }, [agents, setSelectedAgentType, setActiveAgent])

  return {
    agents,
    activeAgent,
    messages,
    isProcessing,
    selectedAgentType,
    sendMessage,
    selectAgent,
    initializeAgents,
  }
}

function generateSimulatedResponse(agentType: AgentType, userMessage: string, context: string): string {
  const config = AGENT_CONFIGS[agentType]

  switch (agentType) {
    case 'code':
      return `I'll help you with that code task. Based on my analysis:\n\n\`\`\`typescript\n// Here's my suggested implementation:\nfunction processData(input: DataInput): ProcessedData {\n  const validated = validateInput(input)\n  const transformed = transformData(validated)\n  return {\n    ...transformed,\n    timestamp: Date.now(),\n    status: 'processed'\n  }\n}\n\`\`\`\n\nThis implementation follows best practices:\n- Input validation for safety\n- Clear separation of concerns\n- Type safety with TypeScript\n- Error handling built-in\n\nWould you like me to explain any part of this solution?`

    case 'review':
      return `## Code Review Analysis\n\n### Overall Assessment\nThe code quality is good with some areas for improvement.\n\n### Issues Found:\n1. **Medium Priority**: Consider adding input validation\n2. **Low Priority**: Some variable names could be more descriptive\n\n### Security:\n✅ No obvious security vulnerabilities detected\n\n### Performance:\n⚠️ Consider using memoization for expensive calculations\n\n### Recommendations:\n- Add error boundaries\n- Include unit tests\n- Document public APIs`

    case 'debug':
      return `## Debug Analysis\n\n### Root Cause Identified\nThe issue appears to be related to:\n\n1. **Race condition** in the async handler\n2. **Missing null check** on line 42\n3. **Inconsistent state management**\n\n### Suggested Fix:\n\`\`\`typescript\nasync function handleData(data: unknown) {\n  if (!data) throw new Error('Data cannot be null')\n  const result = await processData(data)\n  return result\n}\n\`\`\`\n\n### Prevention:\n- Add TypeScript strict mode\n- Use ESLint rules for null checks`

    case 'architect':
      return `## Architecture Plan\n\n### Proposed Architecture:\n\`\`\`\n├── Core Layer (Business Logic)\n│   ├── Services\n│   ├── Models\n│   └── Validators\n├── Data Layer\n│   ├── Repositories\n│   └── DTOs\n└── Presentation Layer\n    ├── Controllers\n    └── Views\n\`\`\`\n\n### Design Patterns:\n- Repository Pattern for data access\n- Service Layer for business logic\n- Factory Pattern for object creation\n\n### Scalability:\n1. Implement caching layer\n2. Use message queue for async ops`

    case 'test':
      return `## Test Strategy\n\n\`\`\`typescript\ndescribe('DataProcessor', () => {\n  it('should handle valid input correctly', () => {\n    const input = createTestData()\n    const result = processData(input)\n    expect(result).toBeDefined()\n    expect(result.status).toBe('processed')\n  })\n\n  it('should throw error for invalid input', () => {\n    expect(() => processData(null)).toThrow()\n  })\n})\n\`\`\`\n\n### Test Coverage Plan:\n1. Unit tests (80%)\n2. Integration tests (15%)\n3. E2E tests (5%)`

    default:
      return `I've analyzed your request based on the ${config.name} capabilities.\n\n${context ? `Project context:\n${context}\n\n` : ''}I'm ready to help. Could you provide more details?`
  }
}
