/**
 * Test Contract
 *
 * Compact, behavior-focused tests. Each `describe` block tests one service
 * with the smallest set of cases that prove it works. Tables replace
 * repetitive `it.each` when the assertion is the same shape.
 *
 * Integration tests for memory/embedding/skill lifecycle live in
 * integration-headless.test.ts — those are NOT duplicated here.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useEditorStore } from '../stores/editorStore'
import { detectLanguage, fileSystemService } from '../services/fileSystemService'
import { codeActionService } from '../services/codeActionService'
import { contextWindowManager } from '../services/contextWindowManager'
import { snippetService } from '../services/snippetService'
import { projectContextService } from '../services/projectContextService'
import { aiProviderService, PROVIDER_INFO } from '../services/aiProviders'
import { embeddingService, EMBEDDING_PROVIDERS, RERANK_PROVIDERS, EMBEDDING_PURPOSES } from '../services/embeddingService'
import { searchProviderService, WEB_SEARCH_PROVIDERS, DOC_SEARCH_PROVIDERS, SEARCH_PURPOSES } from '../services/searchProviderService'
import { fallbackService } from '../services/fallbackService'
import { t, getCurrentLanguage, setLanguage, isRTL, getAvailableLanguages } from '../services/i18nService'
import { themeService } from '../services/themeService'
import { keyboardService } from '../services/keyboardService'
import { workspaceService } from '../services/workspaceService'
import { exportImportService } from '../services/exportImportService'
import { extensionService } from '../services/extensionService'
import { skillRegistry } from '../services/skillRegistryService'
import { expandEmmet, getAbbreviations, isEmmetAbbreviation } from '../services/emmetService'

beforeEach(() => {
  useEditorStore.setState({ tabs: [], activeTabId: null, splitView: false, splitTabs: [] })
  projectContextService.clearCache()
})

// ══════════════════════════════════════════════════════════════
// BEHAVIOR CONTRACT — one `it` per observable behavior
// ══════════════════════════════════════════════════════════════

describe('Language Detection', () => {
  const cases: [string, string][] = [
    ['App.tsx', 'typescript'], ['utils.ts', 'typescript'], ['lib.rs', 'rust'],
    ['package.json', 'json'], ['Dockerfile', 'dockerfile'], ['foo.xyz', 'plaintext'],
    ['src\\App.tsx', 'typescript'],
  ]
  it.each(cases)('%s → %s', (input, expected) => {
    expect(detectLanguage(input)).toBe(expected)
  })
})

describe('FileSystemService', () => {
  it('readDir returns tree, getAllFiles flattens it', async () => {
    const { tree } = await fileSystemService.readDir('/mock/project')
    const files = fileSystemService.getAllFiles(tree || [])
    expect(files.find(f => f.name === 'App.tsx')).toBeDefined()
    expect(files.length).toBeGreaterThan(5)
  })
})

describe('Editor Store', () => {
  const tab = (name: string) => ({ name, path: `src/${name}`, content: '', language: 'typescript' as const })

  it('deduplicates by path', () => {
    const { openTab } = useEditorStore.getState()
    openTab(tab('a.ts')); openTab(tab('a.ts'))
    expect(useEditorStore.getState().tabs).toHaveLength(1)
  })

  it('closeTab → previous tab or null', () => {
    const { openTab, closeTab } = useEditorStore.getState()
    openTab(tab('a.ts')); openTab(tab('b.ts'))
    const bId = useEditorStore.getState().tabs[1].id
    closeTab(bId)
    expect(useEditorStore.getState().activeTabId).toBe(useEditorStore.getState().tabs[0].id)
    closeTab(useEditorStore.getState().tabs[0].id)
    expect(useEditorStore.getState().activeTabId).toBeNull()
  })

  it('updateTabContent marks modified', () => {
    const { openTab, updateTabContent } = useEditorStore.getState()
    openTab(tab('a.ts'))
    updateTabContent(useEditorStore.getState().tabs[0].id, 'new')
    expect(useEditorStore.getState().tabs[0].modified).toBe(true)
  })

  it('split view toggle and moveToSplit', () => {
    const { openTab, toggleSplitView, moveToSplit } = useEditorStore.getState()
    openTab(tab('a.ts'))
    toggleSplitView(); expect(useEditorStore.getState().splitView).toBe(true)
    const id = useEditorStore.getState().tabs[0].id
    moveToSplit(id); expect(useEditorStore.getState().splitTabs).toContain(id)
    moveToSplit(id); expect(useEditorStore.getState().splitTabs).not.toContain(id)
  })
})

describe('Code Actions', () => {
  it('parse → create → apply → cleanup lifecycle', async () => {
    const blocks = codeActionService.parseCodeBlocks('```typescript filename=src/app.ts\nconst x = 1\n```')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ language: 'typescript', filePath: 'src/app.ts' })

    const action = codeActionService.createAction(blocks, 'test')
    expect(codeActionService.getPendingActions()).toContainEqual(action)
    expect(await codeActionService.applyAction(action.id)).toBe(true)
    expect(codeActionService.getPendingActions().find(a => a.id === action.id)).toBeUndefined()
  })

  it('apply nonexistent → false, cancel removes', async () => {
    expect(await codeActionService.applyAction('nope')).toBe(false)
    const action = codeActionService.createAction([], 'cancel')
    expect(codeActionService.cancelAction(action.id)).toBe(true)
  })
})

describe('Context Window', () => {
  it('builds context with system, history, and current', () => {
    const history = [
      { role: 'user', content: 'first' }, { role: 'assistant', content: 'reply' },
    ]
    const msgs = contextWindowManager.buildContext('sys', 'current', new Map(), history)
    expect(msgs.some(m => m.content.includes('sys'))).toBe(true)
    expect(msgs.some(m => m.content.includes('current'))).toBe(true)
    expect(msgs.some(m => m.content.includes('first'))).toBe(true)
  })

  it('handles long history without blowing up', () => {
    const longHistory = Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: `msg ${i}`.repeat(100) }))
    const msgs = contextWindowManager.buildContext('sys', 'q', new Map(), longHistory)
    expect(msgs.length).toBeGreaterThan(0)
  })

  it('estimateTokens is positive and proportional', () => {
    expect(contextWindowManager.estimateTokens('x')).toBeGreaterThan(0)
    expect(contextWindowManager.estimateTokens('x'.repeat(100)))
      .toBeGreaterThan(contextWindowManager.estimateTokens('x'.repeat(10)))
  })
})

describe('Snippets', () => {
  it('getByLanguage filters, search finds by tag', () => {
    expect(snippetService.getByLanguage('rust').every(s => s.language === 'rust')).toBe(true)
    expect(snippetService.search('react').some(s => s.tags.includes('react'))).toBe(true)
  })

  it('expand replaces placeholders', () => {
    const s = snippetService.getAll()[0]
    expect(snippetService.expand(s, { Name: 'Foo' })).toContain('Foo')
  })
})

describe('Project Context', () => {
  it('getProjectSummary and getAgentContext', async () => {
    const s = await projectContextService.getProjectSummary()
    expect(s).toContain('Project:'); expect(s).toContain('Files:')
    const ctx = await projectContextService.getAgentContext('App')
    expect(ctx.relevantFiles.some(f => f.includes('App'))).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// STRUCTURE CONTRACT — tables for provider/feature counts
// ══════════════════════════════════════════════════════════════

describe('Provider Structure', () => {
  const tables = [
    ['AI provider families', Object.keys(PROVIDER_INFO), 27],
    ['Embedding providers', Object.keys(EMBEDDING_PROVIDERS), 8],
    ['Rerank providers', Object.keys(RERANK_PROVIDERS), 4],
    ['Web search providers', Object.keys(WEB_SEARCH_PROVIDERS), 8],
    ['Doc search providers', Object.keys(DOC_SEARCH_PROVIDERS), 7],
  ] as const

  it.each(tables)('%s has ≥%i', (_label, items, min) => {
    expect(items.length).toBeGreaterThanOrEqual(min)
  })

  it('all 9 purpose labels defined', () => {
    const labels = aiProviderService.getPurposeLabels()
    for (const key of ['chat', 'code', 'completion', 'embedding', 'vision', 'audio', 'reasoning', 'translation', 'summarization']) {
      expect(labels[key as keyof typeof labels]).toBeDefined()
    }
  })

  it('all embedding purposes include code-search and rag-pipeline', () => {
    const ids = EMBEDDING_PURPOSES.map(p => p.purpose)
    expect(ids).toContain('code-search')
    expect(ids).toContain('rag-pipeline')
  })

  it('all search purposes include code and real-time', () => {
    const ids = SEARCH_PURPOSES.map(p => p.purpose)
    expect(ids).toContain('code')
    expect(ids).toContain('real-time')
  })
})

describe('Purpose Config Round-Trips', () => {
  it('AI provider assign/get', () => {
    aiProviderService.assignModel('chat', 'openai', 'gpt-4o')
    expect(aiProviderService.getModelForPurpose('chat')?.model.id).toBe('gpt-4o')
  })

  it('embedding purpose config', () => {
    embeddingService.setPurposeConfig('code-search', 'voyage', 'voyage-3')
    expect(embeddingService.getPurposeConfig('code-search')).toMatchObject({
      embeddingProvider: 'voyage', embeddingModel: 'voyage-3',
    })
  })

  it('search purpose config', () => {
    searchProviderService.setPurposeConfig('code', 'brave', 'github')
    expect(searchProviderService.getPurposeConfig('code')).toMatchObject({
      webProvider: 'brave', docProvider: 'github',
    })
  })
})

// ══════════════════════════════════════════════════════════════
// SERVICE BEHAVIOR CONTRACT
// ══════════════════════════════════════════════════════════════

describe('AI Provider Service', () => {
  it('getAllProviders includes openai and anthropic', () => {
    const ids = aiProviderService.getAllProviders().map(p => p.id)
    expect(ids).toContain('openai'); expect(ids).toContain('anthropic')
  })

  it('addCustomProvider → getProvider → removeProvider', () => {
    const id = aiProviderService.addCustomProvider('Test', 'https://api.test.com', 'key')
    expect(id).toMatch(/^custom-\d+$/)
    expect(aiProviderService.getProvider(id)?.isCustom).toBe(true)
    aiProviderService.removeProvider(id)
    expect(aiProviderService.getProvider(id)).toBeUndefined()
  })

  it('subscribe fires on toggle', () => {
    let fired = false
    const unsub = aiProviderService.subscribe(() => { fired = true })
    aiProviderService.toggleProvider('openai')
    expect(fired).toBe(true)
    aiProviderService.toggleProvider('openai'); unsub()
  })
})

describe('Fallback Service', () => {
  it('health: success increments, failure sets cooldown', () => {
    fallbackService.resetHealth('test')
    fallbackService.recordSuccess('test'); fallbackService.recordSuccess('test')
    expect(fallbackService.getHealth('test').successCount).toBe(2)

    fallbackService.recordFailure('test', 'timeout')
    expect(fallbackService.getHealth('test').consecutiveFailures).toBe(1)
    expect(fallbackService.isHealthy('test')).toBe(false)
  })

  it('chain: set → get → add deduplicates → remove', () => {
    fallbackService.setChain('chat', [{ providerId: 'openai', modelId: 'gpt-4o' }])
    expect(fallbackService.getChain('chat')).toHaveLength(1)
    fallbackService.addToChain('chat', { providerId: 'openai', modelId: 'gpt-4o' })
    expect(fallbackService.getChain('chat')).toHaveLength(1) // dedup
    fallbackService.addToChain('chat', { providerId: 'anthropic', modelId: 'claude-3' })
    fallbackService.removeFromChain('chat', 'openai', 'gpt-4o')
    expect(fallbackService.getChain('chat')).toHaveLength(1)
    expect(fallbackService.getChain('chat')[0].providerId).toBe('anthropic')
  })

  it('executeWithFallback tries chain in order', async () => {
    fallbackService.setChain('chat', [
      { providerId: 'fail', modelId: 'm1' }, { providerId: 'ok', modelId: 'm2' },
    ])
    fallbackService.resetHealth()
    fallbackService.updateConfig({ maxRetriesPerProvider: 1 })

    const fn = (pid: string, mid: string) => pid === 'fail' ? Promise.reject('boom') : Promise.resolve(`ok-${mid}`)
    const { result, providerId } = await fallbackService.executeWithFallback('chat', fn)
    expect(result).toBe('ok-m2'); expect(providerId).toBe('ok')
    fallbackService.updateConfig({ maxRetriesPerProvider: 2 })
  })
})

describe('i18n', () => {
  const orig = getCurrentLanguage()
  afterEach(() => setLanguage(orig))

  const translations: [string, string, string][] = [
    ['en', 'app.name', 'Idexal IDE'],
    ['en', 'nav.files', 'Files'],
    ['ar', 'nav.files', 'الملفات'],
    ['ar', 'editor.save', 'حفظ'],
  ]

  it.each(translations)('%s: t("%s") = "%s"', (lang, key, expected) => {
    setLanguage(lang as any)
    expect(t(key)).toBe(expected)
  })

  it('RTL follows language', () => {
    setLanguage('ar'); expect(isRTL()).toBe(true)
    setLanguage('en'); expect(isRTL()).toBe(false)
  })

  it('t() returns fallback for unknown key', () => {
    expect(t('nonexistent', 'FB')).toBe('FB')
  })
})

describe('Themes', () => {
  it('has themes, switching works', () => {
    const themes = themeService.getAll()
    expect(themes.length).toBeGreaterThan(1)
    const orig = themeService.getCurrent().id
    themeService.setTheme(themes[0].id)
    expect(themeService.getCurrent().id).toBe(themes[0].id)
    themeService.setTheme(orig)
  })
})

describe('Keyboard Shortcuts', () => {
  it('has shortcuts, search works', () => {
    const all = keyboardService.getAll()
    expect(all.length).toBeGreaterThan(0)
    if (all.length > 0) {
      const q = all[0].name.slice(0, 3).toLowerCase()
      expect(keyboardService.search(q).length).toBeGreaterThan(0)
    }
  })
})

describe('Workspace', () => {
  it('recent files and bookmarks', () => {
    workspaceService.addRecentFile('/test.ts', 'typescript')
    expect(workspaceService.getRecentFiles().length).toBeGreaterThanOrEqual(1)
    workspaceService.addBookmark('/test.ts', 1, 'Test', '#fff')
    expect(workspaceService.getBookmarks().length).toBeGreaterThanOrEqual(1)
  })
})

describe('Export/Import', () => {
  it('export → import round-trip, invalid rejected', () => {
    const json = exportImportService.exportSettings()
    const data = JSON.parse(json)
    expect(data.version).toBeDefined()
    expect(exportImportService.importSettings(json)).toBe(true)
    expect(exportImportService.importSettings('not json')).toBe(false)
    expect(exportImportService.importSettings(JSON.stringify({ settings: {} }))).toBe(false)
  })
})

describe('Extensions', () => {
  it('has built-ins, getById works, core not uninstallable', () => {
    const all = extensionService.getAll()
    expect(all.length).toBeGreaterThan(0)
    expect(extensionService.getById(all[0].manifest.id)).toBeDefined()
    expect(extensionService.getById('nonexistent')).toBeUndefined()
    const core = all.find(e => e.manifest.id.startsWith('idexal-'))
    if (core) expect(extensionService.uninstall(core.manifest.id)).toBe(false)
  })

  it('install → uninstall lifecycle', () => {
    const manifest = { id: `test-${Date.now()}`, name: 'Test', version: '1.0.0', kind: ['language'] as any, description: 'T', author: 'T' }
    extensionService.install(manifest)
    expect(extensionService.getById(manifest.id)).toBeDefined()
    expect(extensionService.uninstall(manifest.id)).toBe(true)
  })
})

describe('Emmet', () => {
  it('expands known, returns null for unknown', () => {
    expect(expandEmmet('div', 'html')).toContain('div')
    expect(expandEmmet('div.container', 'html')).toContain('class')
    expect(expandEmmet('xyz123unknown', 'html')).toBeNull()
  })

  it('isEmmetAbbreviation validates', () => {
    expect(isEmmetAbbreviation('div')).toBe(true)
    expect(isEmmetAbbreviation('#main')).toBe(true)
    expect(isEmmetAbbreviation('')).toBe(false)
  })
})

describe('Skill Registry', () => {
  it('has 50+ skills, 10+ categories, 15 agents', () => {
    const stats = skillRegistry.getStats()
    expect(stats.totalSkills).toBeGreaterThanOrEqual(50)
    expect(stats.categories).toBeGreaterThanOrEqual(10)
    expect(stats.agentsCovered).toBe(15)
  })

  it('findBestAgent routes correctly', () => {
    const routes: [string[], string][] = [
      [['security-audit'], 'security'],
      [['docker', 'kubernetes'], 'devops'],
    ]
    for (const [skills, expected] of routes) {
      expect(skillRegistry.findBestAgent(skills)?.agentType).toBe(expected)
    }
  })
})
