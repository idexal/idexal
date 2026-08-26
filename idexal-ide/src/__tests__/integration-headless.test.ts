/**
 * Headless integration test — exercises the real memory, embedding,
 * search, and skill services through their actual code paths.
 * Run with: npx vitest run src/__tests__/integration-headless.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { longTermMemory } from '../services/longTermMemoryService'
import { projectMemory } from '../services/projectMemoryService'
import { conversationMemory } from '../services/conversationMemoryService'


beforeEach(async () => {
  await longTermMemory.clearAll()
  projectMemory.clearCache()
  conversationMemory.clearCache()
})

describe('Integration: Long-Term Memory lifecycle', () => {
  it('full set → get → search → delete lifecycle with in-memory fallback', async () => {
    // Set
    const entry = await longTermMemory.set('agent', 'code', 'lifecycle-key', 'lifecycle-value', {
      importance: 'high',
      tags: ['lifecycle', 'test'],
      metadata: { foo: 'bar' },
    })
    expect(entry.key).toBe('lifecycle-key')
    expect(entry.importance).toBe('high')
    expect(entry.tags).toContain('lifecycle')
    expect(entry.version).toBe(1)

    // Get by ID
    const got = await longTermMemory.get(entry.id)
    expect(got).not.toBeNull()
    expect(got!.value).toBe('lifecycle-value')
    expect(got!.accessCount).toBe(1)

    // Get again — accessCount increments in-memory
    const got2 = await longTermMemory.get(entry.id)
    expect(got2!.accessCount).toBe(2)

    // Search by tag
    const results = await longTermMemory.search('lifecycle')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].entry.key).toBe('lifecycle-key')

    // Update
    const updated = await longTermMemory.update(entry.id, { value: 'updated-value', importance: 'critical' })
    expect(updated!.value).toBe('updated-value')
    expect(updated!.importance).toBe('critical')
    expect(updated!.version).toBe(2)

    // Delete
    const deleted = await longTermMemory.delete(entry.id)
    expect(deleted).toBe(true)
    const afterDelete = await longTermMemory.get(entry.id)
    expect(afterDelete).toBeNull()
  })

  it('records task outcomes and error patterns', async () => {
    await longTermMemory.recordTaskOutcome('code', 'fix-auth', 'Fix login bug', 'Fixed', true, 3000)
    await longTermMemory.recordErrorPattern('debug', 'TypeError', 'null reference', 'Added null check')

    const tasks = await longTermMemory.getByCategory('task')
    expect(tasks.length).toBe(1)
    expect(tasks[0].tags).toContain('success')

    const errors = await longTermMemory.getByCategory('error')
    expect(errors.length).toBe(1)
    expect(errors[0].importance).toBe('high')
  })

  it('agent visibility respects rules', async () => {
    // Memory WITHOUT projectId is global — visible to all agents by design
    await longTermMemory.set('agent', 'code', 'global-memory', 'global', { projectId: null })
    // Memory WITH projectId is scoped
    await longTermMemory.set('agent', 'code', 'project-scoped', 'scoped', { projectId: 'proj-A' })

    // Code agent sees its own + global
    const codeVisible = await longTermMemory.getVisible('code')
    expect(codeVisible.some(e => e.key === 'global-memory')).toBe(true)
    expect(codeVisible.some(e => e.key === 'project-scoped')).toBe(true)

    // Security agent sees global but NOT code's project-scoped memory
    const securityVisible = await longTermMemory.getVisible('security')
    expect(securityVisible.some(e => e.key === 'global-memory')).toBe(true)
    expect(securityVisible.some(e => e.key === 'project-scoped')).toBe(false)
  })

  it('export/import round-trips correctly', async () => {
    await longTermMemory.set('agent', 'code', 'export-me', 'value')
    const json = await longTermMemory.exportMemories()
    const parsed = JSON.parse(json)
    expect(parsed.entries.length).toBe(1)

    await longTermMemory.clearAll()
    const imported = await longTermMemory.importMemories(json)
    expect(imported).toBe(1)
    const got = await longTermMemory.search('export-me')
    expect(got.length).toBe(1)
    expect(got[0].entry.value).toBe('value')
  })

  it('getContextSummary builds readable context', async () => {
    await longTermMemory.set('agent', 'code', 'pattern-1', 'Use composition')
    await longTermMemory.set('agent', 'code', 'pattern-2', 'Prefer immutability')
    const summary = await longTermMemory.getContextSummary('code')
    expect(summary).toContain('pattern-1')
    expect(summary).toContain('pattern-2')
  })
})

describe('Integration: Project Memory lifecycle', () => {
  const pid = 'test-proj-001'

  it('tech stack, conventions, key files, patterns', async () => {
    // Record tech stack
    await projectMemory.recordTechStack(pid, [
      { name: 'React', version: '19', category: 'framework', confidence: 0.95, evidence: ['package.json'] },
      { name: 'Vite', category: 'tool', confidence: 0.9, evidence: [] },
    ])
    // Clear cache so initProject re-reads from longTermMemory
    projectMemory.clearCache()
    const stack = await projectMemory.getTechStack(pid)
    expect(stack.length).toBe(2)
    expect(stack.some(t => t.name === 'React')).toBe(true)

    // Record convention
    await projectMemory.recordConvention(pid, {
      name: 'Named exports', description: 'Use named exports', pattern: 'export', examples: [], importance: 'high',
    })
    projectMemory.clearCache()
    const conv = await projectMemory.getConventions(pid)
    expect(conv.length).toBe(1)

    // Record key file
    await projectMemory.recordKeyFile(pid, 'src/App.tsx', 'Root component', 0.9)
    projectMemory.clearCache()
    const files = await projectMemory.getKeyFiles(pid)
    expect(files[0].path).toBe('src/App.tsx')

    // Record pattern
    await projectMemory.recordPattern(pid, {
      name: 'Service Layer', description: 'All API calls go through services', files: ['src/services/'], confidence: 0.8,
    })
    projectMemory.clearCache()
    const patterns = await projectMemory.getPatterns(pid)
    expect(patterns[0].name).toBe('Service Layer')

    // Summary
    projectMemory.clearCache()
    const summary = await projectMemory.getProjectSummary(pid)
    expect(summary).toContain('React')
    expect(summary).toContain('Vite')
  })
})

describe('Integration: Conversation Memory lifecycle', () => {
  it('start → add messages → end → summary', async () => {
    const conv = await conversationMemory.startConversation('Test Chat', 'code', undefined, ['test'])
    expect(conv.isActive).toBe(true)

    await conversationMemory.addMessage(conv.id, 'user', 'Build a form', { files: ['src/Form.tsx'] })
    await conversationMemory.addMessage(conv.id, 'assistant', 'Here is the form', {
      agentType: 'code', tokens: 200, model: 'gpt-4o',
    })

    const msgs = conversationMemory.getMessages(conv.id)
    expect(msgs.length).toBe(2)
    expect(msgs[0].role).toBe('user')
    expect(msgs[1].tokens).toBe(200)

    await conversationMemory.endConversation(conv.id)
    const ended = conversationMemory.getConversation(conv.id)
    expect(ended!.isActive).toBe(false)
    expect(ended!.summary).toBeDefined()
    expect(ended!.summary!.length).toBeGreaterThan(0)
  })

  it('buildContext produces text from recent conversations', async () => {
    const conv = await conversationMemory.startConversation('Context Test', 'security')
    await conversationMemory.addMessage(conv.id, 'user', 'Run scan')
    await conversationMemory.addMessage(conv.id, 'assistant', 'Found 2 issues', { agentType: 'security' })

    const ctx = await conversationMemory.buildContext('security')
    expect(ctx).toContain('security')
  })
})


