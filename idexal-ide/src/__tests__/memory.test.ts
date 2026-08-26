import { describe, it, expect, beforeEach } from 'vitest'
import { longTermMemory } from '../services/longTermMemoryService'
import { projectMemory } from '../services/projectMemoryService'
import { conversationMemory } from '../services/conversationMemoryService'

beforeEach(async () => {
  await longTermMemory.clearAll()
  projectMemory.clearCache()
  conversationMemory.clearCache()
})

// ── LongTermMemoryService ─────────────────────────────────────

describe('LongTermMemoryService', () => {
  it('stores and retrieves a memory entry', async () => {
    const entry = await longTermMemory.set('agent', 'code', 'test-key', 'test-value', {
      importance: 'high',
      tags: ['test'],
    })
    expect(entry.id).toContain('agent')
    expect(entry.key).toBe('test-key')
    expect(entry.value).toBe('test-value')
    expect(entry.importance).toBe('high')
  })

  it('retrieves by category', async () => {
    await longTermMemory.set('project', 'code', 'proj-1', 'Project info', { tags: ['project'] })
    await longTermMemory.set('agent', 'code', 'agent-1', 'Agent info', { tags: ['agent'] })
    const projects = await longTermMemory.getByCategory('project')
    expect(projects.length).toBeGreaterThanOrEqual(1)
    expect(projects[0].category).toBe('project')
  })

  it('retrieves by agent type', async () => {
    await longTermMemory.set('task', 'security', 'sec-task', 'Security scan done')
    await longTermMemory.set('task', 'code', 'code-task', 'Code task done')
    const security = await longTermMemory.getByAgent('security')
    expect(security.some(e => e.key === 'sec-task')).toBe(true)
  })

  it('search finds matching entries', async () => {
    await longTermMemory.set('error', 'debug', 'error:null-ref', 'Fixed null reference', {
      tags: ['error-pattern'],
    })
    const results = await longTermMemory.search('null-ref')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].entry.key).toContain('null-ref')
  })

  it('records task outcomes', async () => {
    await longTermMemory.recordTaskOutcome('code', 'implement-feature', 'Build auth', 'Auth built', true, 5000)
    const tasks = await longTermMemory.getByCategory('task')
    expect(tasks.length).toBe(1)
    expect(tasks[0].tags).toContain('success')
  })

  it('records error patterns', async () => {
    await longTermMemory.recordErrorPattern('debug', 'TypeError', 'Cannot read property', 'Added null check')
    const errors = await longTermMemory.getByCategory('error')
    expect(errors.length).toBe(1)
    expect(errors[0].importance).toBe('high')
  })

  it('records user preferences', async () => {
    await longTermMemory.recordPreference('theme', 'dark')
    const prefs = await longTermMemory.getPreferences()
    expect(prefs.length).toBe(1)
    expect(prefs[0].value).toBe('dark')
  })

  it('deletes a memory entry', async () => {
    const entry = await longTermMemory.set('agent', 'code', 'delete-me', 'temporary')
    const deleted = await longTermMemory.delete(entry.id)
    expect(deleted).toBe(true)
    const retrieved = await longTermMemory.get(entry.id)
    expect(retrieved).toBeNull()
  })

  it('getStats returns accurate counts', async () => {
    await longTermMemory.set('agent', 'code', 'a1', 'v1')
    await longTermMemory.set('project', 'system', 'p1', 'v2')
    const stats = await longTermMemory.getStats()
    expect(stats.totalEntries).toBeGreaterThanOrEqual(2)
    expect(stats.byCategory.agent).toBeGreaterThanOrEqual(1)
    expect(stats.byCategory.project).toBeGreaterThanOrEqual(1)
  })

  it('export and import works', async () => {
    await longTermMemory.set('agent', 'code', 'export-test', 'exported value')
    const json = await longTermMemory.exportMemories()
    expect(json).toContain('export-test')

    await longTermMemory.clearAll()
    const imported = await longTermMemory.importMemories(json)
    expect(imported).toBeGreaterThanOrEqual(1)
  })

  it('getContextSummary builds agent context', async () => {
    await longTermMemory.set('agent', 'code', 'learned-pattern', 'Use composition over inheritance')
    const summary = await longTermMemory.getContextSummary('code')
    expect(summary).toContain('learned-pattern')
  })
})

// ── ProjectMemoryService ──────────────────────────────────────

describe('ProjectMemoryService', () => {
  const testProject = 'test-project-001'

  it('initializes a project', async () => {
    const knowledge = await projectMemory.initProject(testProject)
    expect(knowledge.projectId).toBe(testProject)
    expect(Array.isArray(knowledge.techStack)).toBe(true)
  })

  it('records and retrieves tech stack', async () => {
    await projectMemory.recordTechStack(testProject, [
      { name: 'React', version: '19', category: 'framework', confidence: 0.95, evidence: ['package.json'] },
      { name: 'TypeScript', version: '5.4', category: 'language', confidence: 1.0, evidence: ['tsconfig.json'] },
    ])
    const stack = await projectMemory.getTechStack(testProject)
    expect(stack.length).toBe(2)
    expect(stack.some(t => t.name === 'React')).toBe(true)
  })

  it('records and retrieves conventions', async () => {
    await projectMemory.recordConvention(testProject, {
      name: 'Use named exports',
      description: 'Prefer named exports over default exports',
      pattern: 'export (const|function|class)',
      examples: ['export const foo = ...'],
      importance: 'high',
    })
    const conventions = await projectMemory.getConventions(testProject)
    expect(conventions.length).toBe(1)
    expect(conventions[0].name).toBe('Use named exports')
  })

  it('records and retrieves key files', async () => {
    await projectMemory.recordKeyFile(testProject, 'src/App.tsx', 'Root component', 0.9)
    const files = await projectMemory.getKeyFiles(testProject)
    expect(files.length).toBe(1)
    expect(files[0].path).toBe('src/App.tsx')
  })

  it('records and retrieves patterns', async () => {
    await projectMemory.recordPattern(testProject, {
      name: 'Service Layer',
      description: 'All API calls go through service layer',
      files: ['src/services/*.ts'],
      confidence: 0.85,
    })
    const patterns = await projectMemory.getPatterns(testProject)
    expect(patterns.length).toBe(1)
    expect(patterns[0].name).toBe('Service Layer')
  })

  it('records error patterns', async () => {
    await projectMemory.recordErrorPattern(testProject, 'debug', 'hydration-mismatch', 'Add suppressHydrationWarning')
    const errors = await projectMemory.getErrorPatterns(testProject)
    expect(errors.length).toBe(1)
    expect(errors[0].fix).toContain('suppressHydrationWarning')
  })

  it('generates project summary', async () => {
    await projectMemory.recordTechStack(testProject, [
      { name: 'Vite', category: 'tool', confidence: 0.9, evidence: [] },
    ])
    const summary = await projectMemory.getProjectSummary(testProject)
    expect(summary).toContain('Vite')
  })
})

// ── ConversationMemoryService ─────────────────────────────────

describe('ConversationMemoryService', () => {
  it('starts a conversation', async () => {
    const conv = await conversationMemory.startConversation('Test Chat', 'code', undefined, ['test'])
    expect(conv.id).toContain('conv-')
    expect(conv.title).toBe('Test Chat')
    expect(conv.leadAgent).toBe('code')
    expect(conv.isActive).toBe(true)
  })

  it('adds messages to conversation', async () => {
    const conv = await conversationMemory.startConversation('Msg Test', 'code')
    const msg1 = await conversationMemory.addMessage(conv.id, 'user', 'Build a login form', {
      files: ['src/Login.tsx'],
    })
    const msg2 = await conversationMemory.addMessage(conv.id, 'assistant', 'Here is the login form', {
      agentType: 'code',
      tokens: 500,
      model: 'gpt-4o',
    })
    expect(msg1).not.toBeNull()
    expect(msg2).not.toBeNull()

    const messages = conversationMemory.getMessages(conv.id)
    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
  })

  it('ends a conversation and generates summary', async () => {
    const conv = await conversationMemory.startConversation('Summary Test', 'code')
    await conversationMemory.addMessage(conv.id, 'user', 'Add dark mode')
    await conversationMemory.addMessage(conv.id, 'assistant', 'Dark mode added', {
      agentType: 'code',
      files: ['src/theme.ts'],
    })
    await conversationMemory.endConversation(conv.id)

    const ended = conversationMemory.getConversation(conv.id)
    expect(ended?.isActive).toBe(false)
    expect(ended?.summary).toBeDefined()
  })

  it('builds context from conversations', async () => {
    const conv = await conversationMemory.startConversation('Context Test', 'security')
    await conversationMemory.addMessage(conv.id, 'user', 'Run security scan')
    await conversationMemory.addMessage(conv.id, 'assistant', 'Found 2 vulnerabilities', {
      agentType: 'security',
    })

    const context = await conversationMemory.buildContext('security')
    expect(context).toContain('security')
  })

  it('gets conversations by project', async () => {
    await conversationMemory.startConversation('Project A', 'code', 'project-a')
    await conversationMemory.startConversation('Project B', 'code', 'project-b')
    await conversationMemory.startConversation('Project A again', 'code', 'project-a')

    const projectA = conversationMemory.getProjectConversations('project-a')
    expect(projectA.length).toBe(2)
  })

  it('gets conversations by agent', async () => {
    await conversationMemory.startConversation('Code work', 'code')
    await conversationMemory.startConversation('Security work', 'security')

    const codeConvs = conversationMemory.getAgentConversations('code')
    expect(codeConvs.length).toBe(1)
    expect(codeConvs[0].leadAgent).toBe('code')
  })

  it('tracks stats', async () => {
    await conversationMemory.startConversation('Stats Test 1', 'code')
    await conversationMemory.startConversation('Stats Test 2', 'security')

    const stats = conversationMemory.getStats()
    expect(stats.totalConversations).toBeGreaterThanOrEqual(2)
    expect(stats.agentBreakdown['code']).toBeGreaterThanOrEqual(1)
  })
})
