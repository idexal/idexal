import { create } from 'zustand'

export type AgentType = 'code' | 'review' | 'debug' | 'architect' | 'test'

export interface Agent {
  id: string
  type: AgentType
  name: string
  status: 'idle' | 'thinking' | 'executing' | 'error' | 'completed'
  currentTask: string | null
  thinkingProcess: string[]
  result: string | null
  error: string | null
  lastActive: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  agentType?: AgentType
  timestamp: number
  metadata?: Record<string, any>
}

export interface AgentState {
  agents: Agent[]
  activeAgentId: string | null
  messages: ChatMessage[]
  isProcessing: boolean
  selectedAgentType: AgentType
  
  // Actions
  initializeAgents: () => void
  setActiveAgent: (id: string) => void
  setSelectedAgentType: (type: AgentType) => void
  updateAgentStatus: (id: string, status: Agent['status']) => void
  updateAgentThinking: (id: string, thinking: string) => void
  setAgentResult: (id: string, result: string) => void
  setAgentError: (id: string, error: string) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  setProcessing: (processing: boolean) => void
}

const AGENT_TYPES: { type: AgentType; name: string }[] = [
  { type: 'code', name: 'Code Agent' },
  { type: 'review', name: 'Review Agent' },
  { type: 'debug', name: 'Debug Agent' },
  { type: 'architect', name: 'Architect Agent' },
  { type: 'test', name: 'Test Agent' },
]

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  activeAgentId: null,
  messages: [],
  isProcessing: false,
  selectedAgentType: 'code',
  
  initializeAgents: () => {
    const agents: Agent[] = AGENT_TYPES.map((agt, index) => ({
      id: `agent-${agt.type}-${index}`,
      type: agt.type,
      name: agt.name,
      status: 'idle',
      currentTask: null,
      thinkingProcess: [],
      result: null,
      error: null,
      lastActive: Date.now(),
    }))
    
    set({ agents, activeAgentId: agents[0]?.id })
  },
  
  setActiveAgent: (id) => set({ activeAgentId: id }),
  
  setSelectedAgentType: (type) => set({ selectedAgentType: type }),
  
  updateAgentStatus: (id, status) => {
    set((state) => ({
      agents: state.agents.map(a => 
        a.id === id ? { ...a, status, lastActive: Date.now() } : a
      ),
    }))
  },
  
  updateAgentThinking: (id, thinking) => {
    set((state) => ({
      agents: state.agents.map(a => 
        a.id === id ? { 
          ...a, 
          thinkingProcess: [...a.thinkingProcess, thinking],
          lastActive: Date.now(),
        } : a
      ),
    }))
  },
  
  setAgentResult: (id, result) => {
    set((state) => ({
      agents: state.agents.map(a => 
        a.id === id ? { 
          ...a, 
          result, 
          status: 'completed',
          lastActive: Date.now(),
        } : a
      ),
    }))
  },
  
  setAgentError: (id, error) => {
    set((state) => ({
      agents: state.agents.map(a => 
        a.id === id ? { 
          ...a, 
          error, 
          status: 'error',
          lastActive: Date.now(),
        } : a
      ),
    }))
  },
  
  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
    }
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }))
  },
  
  clearMessages: () => set({ messages: [] }),
  
  setProcessing: (processing) => set({ isProcessing: processing }),
}))
