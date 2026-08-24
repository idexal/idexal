import { describe, it, expect, beforeEach } from 'vitest'
import { fileSystemService, detectLanguage } from '../services/fileSystemService'
import { codeActionService, ParsedCodeBlock } from '../services/codeActionService'
import { contextWindowManager } from '../services/contextWindowManager'
import { snippetService } from '../services/snippetService'
import { useEditorStore } from '../stores/editorStore'

import { projectContextService } from '../services/projectContextService'

beforeEach(() => {
  useEditorStore.setState({ tabs: [], activeTabId: null, splitView: false, splitTabs: [] })
  projectContextService.clearCache()
})

// ── FileSystemService ──────────────────────────────────────────

describe('FileSystemService', () => {
  it('readDir returns tree with src directory', async () => {
    const result = await fileSystemService.readDir('/mock/project')
    expect(result.success).toBe(true)
    const tree = result.tree || []
    const src = tree.find((e: any) => e.name === 'src' && e.type === 'directory')
    expect(src?.children!.length).toBeGreaterThan(0)
  })

  it('readFile returns content for known files', async () => {
    const r = await fileSystemService.readFile('/mock/project/src/App.tsx')
    expect(r.success).toBe(true)
    expect(r.content!.length).toBeGreaterThan(0)
  })

  it('getAllFiles flattens with correct language detection', async () => {
    const result = await fileSystemService.readDir('/mock/project')
    const files = fileSystemService.getAllFiles(result.tree || [])
    expect(files.find((f: any) => f.name === 'App.tsx')).toBeDefined()
    expect(files.find((f: any) => f.name === 'package.json')).toBeDefined()
    expect(files.length).toBeGreaterThan(5)
  })
})

describe('detectLanguage', () => {
  const cases: [string, string][] = [
    ['App.tsx', 'typescript'], ['utils.ts', 'typescript'], ['lib.rs', 'rust'],
    ['package.json', 'json'], ['Dockerfile', 'dockerfile'], ['foo.xyz', 'plaintext'],
    ['src\\App.tsx', 'typescript'],
  ]
  it.each(cases)('%s → %s', (input, expected) => {
    expect(detectLanguage(input)).toBe(expected)
  })
})

// ── EditorStore ────────────────────────────────────────────────

describe('EditorStore', () => {
  const tab = (name: string) => ({ name, path: `src/${name}`, content: '', language: 'typescript' as const })

  it('deduplicates by path', () => {
    const { openTab } = useEditorStore.getState()
    openTab(tab('a.ts'))
    openTab(tab('a.ts'))
    expect(useEditorStore.getState().tabs).toHaveLength(1)
  })

  it('closes to previous tab or null', () => {
    const { openTab, closeTab } = useEditorStore.getState()
    openTab(tab('a.ts'))
    openTab(tab('b.ts'))
    const bId = useEditorStore.getState().tabs[1].id
    closeTab(bId)
    expect(useEditorStore.getState().tabs).toHaveLength(1)
    expect(useEditorStore.getState().activeTabId).toBe(useEditorStore.getState().tabs[0].id)
    closeTab(useEditorStore.getState().tabs[0].id)
    expect(useEditorStore.getState().activeTabId).toBeNull()
  })

  it('updateTabContent marks modified', () => {
    const { openTab, updateTabContent } = useEditorStore.getState()
    openTab(tab('a.ts'))
    const id = useEditorStore.getState().tabs[0].id
    updateTabContent(id, 'new')
    expect(useEditorStore.getState().tabs[0]).toMatchObject({ content: 'new', modified: true })
  })

  it('toggleSplitView and moveToSplit work', () => {
    const { openTab, toggleSplitView, moveToSplit } = useEditorStore.getState()
    openTab(tab('a.ts'))
    toggleSplitView()
    expect(useEditorStore.getState().splitView).toBe(true)
    const id = useEditorStore.getState().tabs[0].id
    moveToSplit(id)
    expect(useEditorStore.getState().splitTabs).toContain(id)
    moveToSplit(id) // toggle off
    expect(useEditorStore.getState().splitTabs).not.toContain(id)
  })
})

// ── CodeActionService ──────────────────────────────────────────

describe('CodeActionService', () => {
  const blocks: ParsedCodeBlock[] = [{ language: 'typescript', filePath: 't.ts', content: 'const x = 1' }]

  it('parseCodeBlocks extracts language and filePath', () => {
    const md = '```typescript filename=src/app.ts\nconst x = 1\n```\n```rust\nfn main() {}```'
    const parsed = codeActionService.parseCodeBlocks(md)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toMatchObject({ language: 'typescript', filePath: 'src/app.ts' })
  })

  it('create → apply → pending removed', async () => {
    const action = codeActionService.createAction(blocks, 'test')
    expect(action.id).toMatch(/^action-/)
    expect(codeActionService.getPendingActions()).toContainEqual(action)
    expect(await codeActionService.applyAction(action.id)).toBe(true)
    expect(codeActionService.getPendingActions().find(a => a.id === action.id)).toBeUndefined()
  })

  it('apply nonexistent returns false', async () => {
    expect(await codeActionService.applyAction('nope')).toBe(false)
  })

  it('cancel removes from pending', () => {
    const action = codeActionService.createAction(blocks, 'cancel')
    expect(codeActionService.cancelAction(action.id)).toBe(true)
    expect(codeActionService.getPendingActions().find(a => a.id === action.id)).toBeUndefined()
  })
})

// ── ContextWindowManager ───────────────────────────────────────

describe('ContextWindowManager', () => {
  const history = [
    { role: 'user', content: 'first' },
    { role: 'assistant', content: 'reply1' },
    { role: 'user', content: 'second' },
    { role: 'assistant', content: 'reply2' },
  ]

  it('history is chronological; current message is last and high priority', () => {
    const ctx = contextWindowManager.buildContext('sys', 'current', new Map(), history)
    const low = ctx.filter(m => m.priority === 'low')
    expect(low.map(m => m.content)).toEqual(['first', 'reply1', 'second', 'reply2'])
    expect(ctx[ctx.length - 1]).toMatchObject({ role: 'user', content: 'current', priority: 'high' })
  })

  it('estimateTokens is positive and proportional', () => {
    expect(contextWindowManager.estimateTokens('x')).toBeGreaterThan(0)
    expect(contextWindowManager.estimateTokens('x'.repeat(100)))
      .toBeGreaterThan(contextWindowManager.estimateTokens('x'.repeat(10)))
  })

  it('setModel does not throw', () => {
    expect(() => contextWindowManager.setModel('gpt-4o')).not.toThrow()
    expect(() => contextWindowManager.setModel('claude-3-opus-20240229')).not.toThrow()
  })
})

// ── SnippetService ─────────────────────────────────────────────

describe('SnippetService', () => {
  it('getByLanguage filters correctly', () => {
    expect(snippetService.getByLanguage('rust').every(s => s.language === 'rust')).toBe(true)
    expect(snippetService.getByLanguage('typescript').length).toBeGreaterThan(0)
  })

  it('search finds by name/tag', () => {
    expect(snippetService.search('react').some(s => s.tags.includes('react'))).toBe(true)
  })

  it('getByPrefix matches', () => {
    const [s] = snippetService.getByPrefix('rfc')
    expect(s?.prefix).toBe('rfc')
  })

  it('expand replaces placeholders', () => {
    const s = snippetService.getAll()[0]
    const expanded = snippetService.expand(s, { Name: 'Foo' })
    expect(expanded).toContain('Foo')
  })
})

// ── ProjectContextService ──────────────────────────────────────

describe('ProjectContextService', () => {
  it('getProjectSummary includes project info', async () => {
    const s = await projectContextService.getProjectSummary()
    expect(s).toContain('Project:')
    expect(s).toContain('Files:')
    expect(s).toContain('Languages:')
  })

  it('getAgentContext finds relevant files', async () => {
    const ctx = await projectContextService.getAgentContext('App')
    expect(ctx.relevantFiles.some(f => f.includes('App'))).toBe(true)
  })
})
