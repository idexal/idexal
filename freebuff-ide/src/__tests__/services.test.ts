import { describe, it, expect } from 'vitest'
import { snippetService, Snippet } from '../services/snippetService'
import { keyboardService } from '../services/keyboardService'
import { contextWindowManager } from '../services/contextWindowManager'
import { codeActionService, ParsedCodeBlock } from '../services/codeActionService'

describe('SnippetService', () => {
  it('should return all snippets', () => {
    const snippets = snippetService.getAll()
    expect(snippets.length).toBeGreaterThan(0)
  })

  it('should filter snippets by language', () => {
    const tsSnippets = snippetService.getByLanguage('typescript')
    expect(tsSnippets.length).toBeGreaterThan(0)
    tsSnippets.forEach(s => expect(s.language).toBe('typescript'))

    const rustSnippets = snippetService.getByLanguage('rust')
    expect(rustSnippets.length).toBeGreaterThan(0)
    rustSnippets.forEach(s => expect(s.language).toBe('rust'))
  })

  it('should search snippets', () => {
    const results = snippetService.search('react')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(s => s.name.toLowerCase().includes('react'))).toBe(true)
  })

  it('should get snippet by prefix', () => {
    const results = snippetService.getByPrefix('rfc')
    expect(results.length).toBe(1)
    expect(results[0].prefix).toBe('rfc')
  })

  it('should expand snippet with params', () => {
    const snippet: Snippet = {
      id: 'test',
      name: 'Test',
      description: 'Test snippet',
      language: 'typescript',
      prefix: 'test',
      body: 'const {{name}} = {{value}}',
      tags: ['test'],
    }

    const expanded = snippetService.expand(snippet, { name: 'foo', value: '42' })
    expect(expanded).toBe('const foo = 42')
  })
})

describe('KeyboardService', () => {
  it('should return all shortcuts', () => {
    const shortcuts = keyboardService.getAll()
    expect(shortcuts.length).toBeGreaterThan(0)
  })

  it('should filter shortcuts by category', () => {
    const fileShortcuts = keyboardService.getByCategory('File')
    expect(fileShortcuts.length).toBeGreaterThan(0)
    fileShortcuts.forEach(s => expect(s.category).toBe('File'))
  })

  it('should search shortcuts', () => {
    const results = keyboardService.search('save')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(s => s.name.toLowerCase().includes('save'))).toBe(true)
  })

  it('should get shortcut by ID', () => {
    const shortcut = keyboardService.getById('file.save')
    expect(shortcut).toBeDefined()
    expect(shortcut?.name).toBe('Save')
  })

  it('should register and unregister handlers', () => {
    const handler = () => {}
    keyboardService.register('file.save', handler)
    keyboardService.unregister('file.save')
    // No error means success
  })
})

describe('ContextWindowManager', () => {
  it('should estimate tokens', () => {
    const tokens = contextWindowManager.estimateTokens('Hello world')
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(100)
  })

  it('should build context messages', () => {
    const messages = contextWindowManager.buildContext(
      'You are a helpful assistant',
      'Hello',
      new Map([['file.ts', 'const x = 1']]),
      [{ role: 'user', content: 'Hi' }]
    )

    expect(messages.length).toBeGreaterThan(0)
    expect(messages.some(m => m.role === 'system')).toBe(true)
    expect(messages.some(m => m.role === 'user')).toBe(true)
  })

  it('should get budget info', () => {
    const messages = [
      { role: 'system' as const, content: 'test', priority: 'high' as const },
    ]
    const budget = contextWindowManager.getBudget(messages)
    expect(budget.totalTokens).toBeGreaterThan(0)
    expect(budget.usedTokens).toBeGreaterThanOrEqual(0)
  })

  it('should set model and update limits', () => {
    contextWindowManager.setModel('gpt-4o')
    // No error means success
    contextWindowManager.setModel('claude-3-opus-20240229')
    // No error means success
  })
})

describe('CodeActionService', () => {
  it('should parse code blocks', () => {
    const response = `Here is the code:

\`\`\`typescript filename=src/app.ts
const x = 1
\`\`\`

And another:

\`\`\`rust
fn main() {}
\`\`\``

    const blocks = codeActionService.parseCodeBlocks(response)
    expect(blocks.length).toBe(2)
    expect(blocks[0].language).toBe('typescript')
    expect(blocks[0].filePath).toBe('src/app.ts')
    expect(blocks[1].language).toBe('rust')
  })

  it('should create action from blocks', () => {
    const blocks: ParsedCodeBlock[] = [
      { language: 'typescript', filePath: 'test.ts', content: 'const x = 1' },
    ]

    const action = codeActionService.createAction(blocks, 'Test action')
    expect(action.id).toBeDefined()
    expect(action.changes.length).toBe(1)
    expect(action.applied).toBe(false)
  })

  it('should cancel action', () => {
    const blocks: ParsedCodeBlock[] = [
      { language: 'typescript', filePath: 'test.ts', content: 'const x = 1' },
    ]

    const action = codeActionService.createAction(blocks, 'Test')
    const cancelled = codeActionService.cancelAction(action.id)
    expect(cancelled).toBe(true)

    const pending = codeActionService.getPendingActions()
    expect(pending.find(a => a.id === action.id)).toBeUndefined()
  })
})
