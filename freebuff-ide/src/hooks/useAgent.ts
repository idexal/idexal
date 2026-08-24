import { useCallback, useState, useEffect } from 'react'
import { useMemoryStore } from '../stores/memoryStore'
import { aiStreamingService, AIMessage } from '../services/aiStreamingService'
import {
  agentOrchestrator, AgentType, Workflow, AgentTask,
  AgentMessage as OrchestratorMessage
} from '../services/agentOrchestrator'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  agentType?: string
  isStreaming?: boolean
  taskId?: string
}

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  code: 'You are Idexal Code Agent — expert software engineer. Write clean, efficient, well-documented code. Use markdown code blocks. Be concise and actionable.',
  review: 'You are Idexal Review Agent — expert code reviewer. Analyze for bugs, security, performance, style. Provide specific, actionable feedback.',
  debug: 'You are Idexal Debug Agent — expert debugger. Diagnose and fix issues step by step. Explain root causes.',
  architect: 'You are Idexal Architect Agent — software architect. Design systems, plan features, make technology decisions.',
  test: 'You are Idexal Test Agent — testing expert. Write comprehensive tests following AAA pattern.',
  devops: 'You are Idexal DevOps Agent — CI/CD and infrastructure expert. Write Dockerfiles, CI configs, deployment scripts.',
  security: 'You are Idexal Security Agent — security expert. Analyze for vulnerabilities, classify by severity, suggest fixes.',
  performance: 'You are Idexal Performance Agent — performance expert. Profile, identify bottlenecks, optimize code.',
}

export function useAgent() {
  const { addMemory } = useMemoryStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null)
  const [agentActivity, setAgentActivity] = useState<OrchestratorMessage[]>([])
  const [pendingTasks, setPendingTasks] = useState<AgentTask[]>([])

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  // Subscribe to message bus for real-time activity
  useEffect(() => {
    const unsub = agentOrchestrator.bus.subscribe('broadcast', () => {
      setAgentActivity(agentOrchestrator.bus.getRecent(20))
    })
    return () => { unsub() }
  }, [])

  // Subscribe to task queue changes
  useEffect(() => {
    const unsub = agentOrchestrator.queue.onChange(() => {
      setPendingTasks(agentOrchestrator.queue.getReady())
    })
    return () => { unsub() }
  }, [])

  // ── Single Agent Message ──────────────────────────────────

  const sendMessage = useCallback(async (content: string, agentType: string = 'code') => {
    if (!content.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])

    setIsStreaming(true)

    const assistantId = `assistant-${Date.now()}`
    const assistantMsg: ChatMessage = {
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

      try {
        let fullContent = ''
        for await (const chunk of aiStreamingService.chatStream(aiMessages, {
          temperature: 0.7,
          maxTokens: 4096,
        })) {
          if (chunk.error) {
            fullContent += `\n\n⚠️ Error: ${chunk.error}`
            break
          }
          fullContent += chunk.content
          updateMessage(assistantId, { content: fullContent, isStreaming: true })
        }
        updateMessage(assistantId, { content: fullContent, isStreaming: false })
        addMemory({ type: 'conversation', key: `agent-${agentType}`, value: fullContent.slice(0, 500) })
      } catch (error) {
        const demo = generateDemoResponse(agentType, content)
        updateMessage(assistantId, { content: demo, isStreaming: false })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      updateMessage(assistantId, { content: `⚠️ Error: ${msg}`, isStreaming: false })
    } finally {
      setIsStreaming(false)
    }
  }, [addMemory, updateMessage])

  // ── Orchestrated Workflow ──────────────────────────────────

  const runWorkflow = useCallback(async (workflowId: string, input: string) => {
    if (!input.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const workflow = agentOrchestrator.getWorkflow(workflowId)
    const systemMsg: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'system',
      content: `🔄 Starting workflow: ${workflow?.name || workflowId}\n\n${workflow?.description || ''}`,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, systemMsg])

    try {
      const result = await agentOrchestrator.executeWorkflow(workflowId, input)

      if (result) {
        setActiveWorkflow(result)

        for (let i = 0; i < result.steps.length; i++) {
          const stepResult = result.results.get(`step:${i}`)
          if (stepResult) {
            const agentDef = agentOrchestrator.getAgentDefinition(result.steps[i].agentType)
            const stepMsg: ChatMessage = {
              id: `step-${i}-${Date.now()}`,
              role: 'assistant',
              content: `### Step ${i + 1}: ${agentDef.icon} ${agentDef.name}\n\n${stepResult.content}`,
              timestamp: Date.now() + i,
              agentType: result.steps[i].agentType,
              taskId: `workflow-${result.id}-step-${i}`,
            }
            setMessages(prev => [...prev, stepMsg])
          }
        }

        const completionMsg: ChatMessage = {
          id: `workflow-done-${Date.now()}`,
          role: 'system',
          content: result.status === 'completed'
            ? `✅ Workflow "${result.name}" completed successfully (${result.steps.length} steps)`
            : `❌ Workflow "${result.name}" failed at step ${result.currentStep + 1}`,
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, completionMsg])
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ Workflow error: ${msg}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Collaborative Review ───────────────────────────────────

  const collaborativeReview = useCallback(async (primaryAgent: string, task: string) => {
    if (!task.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: task,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const agentDef = agentOrchestrator.getAgentDefinition(primaryAgent as AgentType)
    const systemMsg: ChatMessage = {
      id: `system-collab-${Date.now()}`,
      role: 'system',
      content: `🤝 Starting collaborative review: ${agentDef.icon} ${agentDef.name} → Review → (Fix if needed)`,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, systemMsg])

    try {
      const result = await agentOrchestrator.collaborativeReview(
        primaryAgent as AgentType,
        task,
        (step, agent) => {
          setAgentActivity(agentOrchestrator.bus.getRecent(20))
        }
      )

      const resultMsg: ChatMessage = {
        id: `collab-result-${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
        agentType: primaryAgent,
      }
      setMessages(prev => [...prev, resultMsg])
      setAgentActivity(agentOrchestrator.bus.getRecent(20))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ Collaborative review error: ${msg}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Smart Orchestration (auto-selects best approach) ───────

  const orchestrate = useCallback(async (request: string) => {
    if (!request.trim()) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: request,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const systemMsg: ChatMessage = {
      id: `system-orch-${Date.now()}`,
      role: 'system',
      content: `🤖 Auto-orchestrating: analyzing request and selecting best agents...`,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, systemMsg])

    try {
      const result = await agentOrchestrator.orchestrate(request, (step, agent) => {
        setAgentActivity(agentOrchestrator.bus.getRecent(20))
      })

      const resultMsg: ChatMessage = {
        id: `orch-result-${Date.now()}`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, resultMsg])
      setAgentActivity(agentOrchestrator.bus.getRecent(20))
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ Orchestration error: ${msg}`,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Delegate to Sub-Agent ──────────────────────────────────

  const delegateToSubAgent = useCallback(async (
    parentTaskId: string,
    subAgentType: string,
    title: string,
    input: string
  ) => {
    setIsStreaming(true)
    try {
      const result = await agentOrchestrator.delegateToSubAgent(
        parentTaskId, subAgentType as AgentType, title, input
      )
      setAgentActivity(agentOrchestrator.bus.getRecent(20))
      return result
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Direct Task ────────────────────────────────────────────

  const runTask = useCallback(async (
    agentType: string,
    title: string,
    input: string,
    priority?: 'critical' | 'high' | 'normal' | 'low'
  ) => {
    setIsStreaming(true)
    try {
      const task = agentOrchestrator.createTask(
        agentType as AgentType, title, title, input, { priority }
      )
      setPendingTasks(prev => [...prev, task])
      const result = await agentOrchestrator.executeTask(task.id)
      setPendingTasks(agentOrchestrator.queue.getReady())
      setAgentActivity(agentOrchestrator.bus.getRecent(20))
      return result
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const cancelStream = useCallback(() => { setIsStreaming(false) }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setActiveWorkflow(null)
    setAgentActivity([])
  }, [])

  return {
    messages,
    sendMessage,
    runWorkflow,
    collaborativeReview,
    orchestrate,
    delegateToSubAgent,
    runTask,
    cancelStream,
    clearMessages,
    isStreaming,
    activeWorkflow,
    agentActivity,
    pendingTasks,
    workflows: agentOrchestrator.getWorkflows(),
    allTasks: agentOrchestrator.queue.getAll(),
    agentTypes: agentOrchestrator.getAllAgentTypes(),
    getAgentDef: (type: AgentType) => agentOrchestrator.getAgentDefinition(type),
  }
}

// Demo responses when no AI is configured
function generateDemoResponse(agentType: string, userMessage: string): string {
  const lower = userMessage.toLowerCase()

  if (agentType === 'code') {
    if (lower.includes('component') || lower.includes('react')) {
      return `Here's a React component:\n\n\`\`\`tsx\nimport React, { useState } from 'react'\n\ninterface Props {\n  title: string\n  onAction?: () => void\n}\n\nexport function CustomComponent({ title, onAction }: Props) {\n  const [isActive, setIsActive] = useState(false)\n\n  return (\n    <div className={\`p-4 rounded-lg border \${isActive ? 'border-ide-accent bg-ide-accent/10' : 'border-ide-border'}\`}>\n      <h3 className="text-lg font-medium">{title}</h3>\n      <button\n        onClick={() => { setIsActive(!isActive); onAction?.() }}\n        className="mt-2 px-3 py-1 text-sm bg-ide-accent text-white rounded"\n      >\n        {isActive ? 'Active' : 'Activate'}\n      </button>\n    </div>\n  )\n}\n\`\`\`\n\n> **Tip**: Connect your AI provider in Settings for real code generation.`
    }

    return `I understand you want: **${userMessage}**\n\nHere's my approach:\n\n\`\`\`typescript\ninterface Config {\n  apiKey: string\n  baseUrl: string\n  timeout?: number\n}\n\nasync function fetchData(config: Config): Promise<Response> {\n  const controller = new AbortController()\n  const timeout = setTimeout(() => controller.abort(), config.timeout || 30000)\n  try {\n    const response = await fetch(config.baseUrl, {\n      headers: { 'Authorization': \`Bearer \${config.apiKey}\` },\n      signal: controller.signal,\n    })\n    if (!response.ok) throw new Error(\`HTTP \${response.status}\`)\n    return response\n  } finally {\n    clearTimeout(timeout)\n  }\n}\n\`\`\`\n\n> Configure your AI provider in Settings for intelligent code generation.`
  }

  if (agentType === 'review') {
    return '## Code Review Analysis\n\n**Overall Assessment**: ⚠️ Needs attention\n\n### Issues Found:\n1. 🔴 **Critical** — Missing error boundary around async operations\n2. 🟡 **Warning** — Potential memory leak in useEffect cleanup\n3. 💡 **Suggestion** — Consider memoizing expensive computations\n\n### Security:\n- ✅ No SQL injection vectors found\n- ✅ Input validation looks solid\n\n### Positive Notes:\n✅ Good naming conventions ✅ Proper file organization ✅ Consistent formatting'
  }

  if (agentType === 'debug') {
    return '## Debug Analysis\n\n### Root Cause\nThe issue occurs because state updates asynchronously but render expects synchronous data.\n\n### Fix\n```typescript\nconst data = state.data ?? defaultValue\n```\n\n### Verification\nNull-check prevents crash. Fallback ensures correct initial render.'
  }

  if (agentType === 'architect') {
    return '## Architecture Plan\n\n### Structure\n```\nsrc/\n├── core/       # Business logic\n├── adapters/   # External integrations\n├── ports/      # Interfaces\n└── utils/      # Shared utilities\n```\n\n### Decisions\n1. Hexagonal architecture for testability\n2. Zustand for state management\n3. REST API with optional GraphQL'
  }

  if (agentType === 'test') {
    return '## Test Suite\n\n```typescript\ndescribe(\'Feature\', () => {\n  it(\'handles valid input\', () => {\n    const result = process(validInput)\n    expect(result.success).toBe(true)\n  })\n\n  it(\'returns error for null input\', () => {\n    const result = process(null)\n    expect(result.success).toBe(false)\n  })\n})\n```\n\n**Coverage:** Happy path + edge case.'
  }

  if (agentType === 'devops') {
    return '## Deployment Setup\n\n```dockerfile\nFROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]\n```\n\n### CI/CD\n- Build → Test → Lint → Docker → Deploy\n- Auto-deploy to staging on merge'
  }

  if (agentType === 'security') {
    return '## Security Report\n\n### Vulnerabilities\n1. 🔴 **Critical** — No rate limiting on auth endpoints\n2. 🟠 **High** — XSS possible in user input rendering\n3. 🟡 **Medium** — Missing CSP headers\n\n### Recommendations\n- Add rate limiting\n- Sanitize inputs\n- Enable CSP headers'
  }

  if (agentType === 'performance') {
    return '## Performance Analysis\n\n### Bottlenecks\n1. N+1 queries in user listing\n2. No lazy loading for images\n3. Missing React.memo on expensive renders\n\n### Optimizations\n```typescript\n// Before: N+1 queries\nfor (const user of users) {\n  user.posts = await Post.findByUserId(user.id)\n}\n\n// After: Single query\nconst users = await User.findAll({ include: ["posts"] })\n```\n\n**Impact:** 10x query improvement'
  }

  return `I'm here to help! You asked: "${userMessage}"\n\nNo AI provider configured. Click ⚙️ Settings to set up an API key.\n\nI can help with:\n- 📝 Code structure and patterns\n- 🔍 Code review tips\n- 🐛 Debugging guidance\n- 🏗️ Architecture decisions\n- 🧪 Testing strategies\n- 🚀 Deployment setup\n- 🛡️ Security analysis\n- ⚡ Performance optimization`
}
