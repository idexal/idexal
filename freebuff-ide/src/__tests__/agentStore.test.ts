import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentStore, AgentType } from '../stores/agentStore'

describe('AgentStore', () => {
  beforeEach(() => {
    // Reset the store
    useAgentStore.setState({
      agents: [],
      activeAgentId: null,
      messages: [],
      isProcessing: false,
      selectedAgentType: 'code',
    })
  })

  it('should initialize agents', () => {
    const { initializeAgents } = useAgentStore.getState()
    initializeAgents()

    const state = useAgentStore.getState()
    expect(state.agents.length).toBe(5)
    expect(state.agents[0].type).toBe('code')
    expect(state.agents[1].type).toBe('review')
    expect(state.agents[2].type).toBe('debug')
    expect(state.agents[3].type).toBe('architect')
    expect(state.agents[4].type).toBe('test')
  })

  it('should set active agent', () => {
    const { initializeAgents } = useAgentStore.getState()
    initializeAgents()

    const { setActiveAgent } = useAgentStore.getState()
    setActiveAgent('agent-review-1')

    expect(useAgentStore.getState().activeAgentId).toBe('agent-review-1')
  })

  it('should add messages', () => {
    const { addMessage } = useAgentStore.getState()
    addMessage({ role: 'user', content: 'Hello' })

    const state = useAgentStore.getState()
    expect(state.messages.length).toBe(1)
    expect(state.messages[0].role).toBe('user')
    expect(state.messages[0].content).toBe('Hello')
  })

  it('should update agent status', () => {
    const { initializeAgents } = useAgentStore.getState()
    initializeAgents()

    const agentId = useAgentStore.getState().agents[0].id
    const { updateAgentStatus } = useAgentStore.getState()
    updateAgentStatus(agentId, 'thinking')

    const agent = useAgentStore.getState().agents.find(a => a.id === agentId)
    expect(agent?.status).toBe('thinking')
  })

  it('should set processing state', () => {
    const { setProcessing } = useAgentStore.getState()
    setProcessing(true)
    expect(useAgentStore.getState().isProcessing).toBe(true)
    setProcessing(false)
    expect(useAgentStore.getState().isProcessing).toBe(false)
  })
})
