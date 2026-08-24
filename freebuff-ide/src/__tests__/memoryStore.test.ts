import { describe, it, expect, beforeEach } from 'vitest'
import { useMemoryStore } from '../stores/memoryStore'

describe('MemoryStore', () => {
  beforeEach(() => {
    useMemoryStore.setState({
      entries: [],
      projectContext: null,
      searchResults: [],
    })
  })

  it('should add memory entries', () => {
    const { addMemory } = useMemoryStore.getState()
    addMemory({ type: 'conversation', key: 'test key', value: 'test value' })

    const state = useMemoryStore.getState()
    expect(state.entries.length).toBe(1)
    expect(state.entries[0].key).toBe('test key')
    expect(state.entries[0].value).toBe('test value')
    expect(state.entries[0].id).toBeDefined()
    expect(state.entries[0].timestamp).toBeDefined()
  })

  it('should remove memory entries', () => {
    const { addMemory } = useMemoryStore.getState()
    addMemory({ type: 'conversation', key: 'key1', value: 'value1' })

    const entryId = useMemoryStore.getState().entries[0].id
    const { removeMemory } = useMemoryStore.getState()
    removeMemory(entryId)

    expect(useMemoryStore.getState().entries.length).toBe(0)
  })

  it('should search memory entries', () => {
    const { addMemory } = useMemoryStore.getState()
    addMemory({ type: 'conversation', key: 'react hooks', value: 'React hooks guide' })
    addMemory({ type: 'conversation', key: 'rust ownership', value: 'Rust ownership rules' })
    addMemory({ type: 'conversation', key: 'typescript generics', value: 'TypeScript generics' })

    const { searchMemory } = useMemoryStore.getState()
    const results = searchMemory('react')

    expect(results.length).toBe(1)
    expect(results[0].key).toBe('react hooks')
  })

  it('should set project context', () => {
    const { setProjectContext } = useMemoryStore.getState()
    setProjectContext({
      rootPath: '/workspace/test',
      name: 'Test Project',
      description: 'A test project',
      languages: ['TypeScript', 'Rust'],
      frameworks: ['React', 'Electron'],
      structure: [],
      symbols: [],
      lastIndexed: Date.now(),
    })

    const state = useMemoryStore.getState()
    expect(state.projectContext?.name).toBe('Test Project')
    expect(state.projectContext?.languages).toContain('TypeScript')
  })

  it('should add and search symbols', () => {
    const { setProjectContext, addSymbol } = useMemoryStore.getState()
    setProjectContext({
      rootPath: '/workspace/test',
      name: 'Test Project',
      description: '',
      languages: [],
      frameworks: [],
      structure: [],
      symbols: [],
      lastIndexed: Date.now(),
    })

    addSymbol({
      name: 'processData',
      type: 'function',
      filePath: 'src/utils.ts',
      line: 10,
      column: 0,
      snippet: 'function processData() {}',
      references: [],
    })

    const { getSymbolsByName } = useMemoryStore.getState()
    const results = getSymbolsByName('processData')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('processData')
  })

  it('should clear all memory', () => {
    const { addMemory, clearMemory } = useMemoryStore.getState()
    addMemory({ type: 'conversation', key: 'key1', value: 'value1' })
    addMemory({ type: 'project', key: 'key2', value: 'value2' })

    clearMemory()
    expect(useMemoryStore.getState().entries.length).toBe(0)
  })
})
