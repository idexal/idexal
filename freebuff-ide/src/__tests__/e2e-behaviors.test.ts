import { describe, it, expect, beforeEach } from 'vitest'
import { fileSystemService, detectLanguage } from '../services/fileSystemService'
import { codeActionService } from '../services/codeActionService'
import { projectContextService } from '../services/projectContextService'
import { useEditorStore } from '../stores/editorStore'

// Reset editor store between tests
beforeEach(() => {
  useEditorStore.setState({ tabs: [], activeTabId: null })
})

describe('File System Service — readDir returns valid tree', () => {
  it('returns mock tree in browser mode', async () => {
    const tree = await fileSystemService.readDir('/mock/project')
    expect(tree.length).toBeGreaterThan(0)

    // Must have src directory
    const srcDir = tree.find(e => e.name === 'src' && e.type === 'directory')
    expect(srcDir).toBeDefined()
    expect(srcDir!.children!.length).toBeGreaterThan(0)
  })

  it('readFile returns content for known mock files', async () => {
    const result = await fileSystemService.readFile('src/App.tsx')
    expect(result.success).toBe(true)
    expect(result.content).toBeDefined()
    expect(result.content!.length).toBeGreaterThan(0)
  })

  it('getAllFiles flattens tree correctly', async () => {
    const files = await fileSystemService.getAllFiles()
    expect(files.length).toBeGreaterThan(10)

    // Must include App.tsx
    const appFile = files.find(f => f.name === 'App.tsx')
    expect(appFile).toBeDefined()
    expect(appFile!.language).toBe('typescript')

    // Must include package.json
    const pkgFile = files.find(f => f.name === 'package.json')
    expect(pkgFile).toBeDefined()
    expect(pkgFile!.language).toBe('json')
  })
})

describe('Language Detection — edge cases', () => {
  it('detects TypeScript files', () => {
    expect(detectLanguage('App.tsx')).toBe('typescript')
    expect(detectLanguage('utils.ts')).toBe('typescript')
  })

  it('detects Rust files', () => {
    expect(detectLanguage('lib.rs')).toBe('rust')
  })

  it('detects JSON files', () => {
    expect(detectLanguage('package.json')).toBe('json')
  })

  it('handles Dockerfile by basename', () => {
    expect(detectLanguage('Dockerfile')).toBe('dockerfile')
  })

  it('handles unknown extensions', () => {
    expect(detectLanguage('foo.xyz')).toBe('plaintext')
  })

  it('handles Windows backslash paths', () => {
    expect(detectLanguage('src\\App.tsx')).toBe('typescript')
  })
})

describe('Editor Store — openTab deduplication', () => {
  it('does not create duplicate tabs for same path', () => {
    const { openTab, tabs } = useEditorStore.getState()
    openTab({ name: 'test.ts', path: 'src/test.ts', content: 'const x = 1', language: 'typescript' })
    openTab({ name: 'test.ts', path: 'src/test.ts', content: 'const x = 2', language: 'typescript' })

    const state = useEditorStore.getState()
    const testTabs = state.tabs.filter(t => t.path === 'src/test.ts')
    expect(testTabs).toHaveLength(1)
    // Should switch to existing tab, not create new one
    expect(state.activeTabId).toBe(testTabs[0].id)
  })

  it('creates separate tabs for different paths', () => {
    const { openTab } = useEditorStore.getState()
    openTab({ name: 'a.ts', path: 'src/a.ts', content: 'a', language: 'typescript' })
    openTab({ name: 'b.ts', path: 'src/b.ts', content: 'b', language: 'typescript' })

    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(2)
  })

  it('closeTab sets activeTabId to previous tab', () => {
    const { openTab, closeTab } = useEditorStore.getState()
    openTab({ name: 'a.ts', path: 'src/a.ts', content: 'a', language: 'typescript' })
    openTab({ name: 'b.ts', path: 'src/b.ts', content: 'b', language: 'typescript' })

    const tabB = useEditorStore.getState().tabs[1]
    closeTab(tabB.id)

    const state = useEditorStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('closing last tab sets activeTabId to null', () => {
    const { openTab, closeTab } = useEditorStore.getState()
    openTab({ name: 'a.ts', path: 'src/a.ts', content: 'a', language: 'typescript' })

    const tabA = useEditorStore.getState().tabs[0]
    closeTab(tabA.id)

    expect(useEditorStore.getState().tabs).toHaveLength(0)
    expect(useEditorStore.getState().activeTabId).toBeNull()
  })

  it('updateTabContent marks tab as modified', () => {
    const { openTab, updateTabContent } = useEditorStore.getState()
    openTab({ name: 'a.ts', path: 'src/a.ts', content: 'original', language: 'typescript' })

    const tabA = useEditorStore.getState().tabs[0]
    expect(tabA.modified).toBe(false)

    updateTabContent(tabA.id, 'modified')

    const updated = useEditorStore.getState().tabs.find(t => t.id === tabA.id)!
    expect(updated.modified).toBe(true)
    expect(updated.content).toBe('modified')
  })
})

describe('Code Action Service — create → apply lifecycle', () => {
  it('creates action with correct change structure', () => {
    const action = codeActionService.createAction(
      [{ language: 'typescript', filePath: 'test.ts', content: 'const x = 1' }],
      'Test action'
    )
    expect(action.id).toMatch(/^action-/)
    expect(action.changes).toHaveLength(1)
    expect(action.changes[0].type).toBe('edit')
    expect(action.changes[0].content).toBe('const x = 1')
    expect(action.applied).toBe(false)
  })

  it('applyAction returns true and moves to history', async () => {
    const action = codeActionService.createAction(
      [{ language: 'typescript', filePath: 'test.ts', content: 'const x = 1' }],
      'Test'
    )
    const result = await codeActionService.applyAction(action.id)
    expect(result).toBe(true)

    // Should be removed from pending
    expect(codeActionService.getPendingActions().find(a => a.id === action.id)).toBeUndefined()
  })

  it('applyAction returns false for nonexistent ID', async () => {
    const result = await codeActionService.applyAction('nonexistent')
    expect(result).toBe(false)
  })

  it('cancelAction removes from pending', () => {
    const action = codeActionService.createAction(
      [{ language: 'typescript', filePath: 'x.ts', content: '' }],
      'Cancel me'
    )
    const removed = codeActionService.cancelAction(action.id)
    expect(removed).toBe(true)
    expect(codeActionService.getPendingActions().find(a => a.id === action.id)).toBeUndefined()
  })
})

describe('Project Context Service — analysis and summary', () => {
  it('getProjectSummary returns string with project info', async () => {
    const summary = await projectContextService.getProjectSummary()
    expect(typeof summary).toBe('string')
    expect(summary).toContain('Project:')
    expect(summary).toContain('Files:')
    expect(summary).toContain('Languages:')
  })

  it('analyzeProject produces correct file count', async () => {
    const analysis = await projectContextService.analyzeProject('/mock/project')
    expect(analysis.totalFiles).toBeGreaterThan(0)
    expect(analysis.languages.size).toBeGreaterThan(0)
    expect(analysis.keyFiles.length).toBeGreaterThan(0)
  })

  it('getAgentContext returns relevant files for a query', async () => {
    const ctx = await projectContextService.getAgentContext('ChatPanel')
    expect(ctx.relevantFiles.length).toBeGreaterThan(0)
    expect(ctx.relevantFiles.some(f => f.includes('ChatPanel'))).toBe(true)
  })

  it('clearCache resets analysis', async () => {
    await projectContextService.analyzeProject('/mock/project')
    projectContextService.clearCache()
    // Next call should re-analyze
    const summary = await projectContextService.getProjectSummary()
    expect(summary).toContain('Project:')
  })
})
