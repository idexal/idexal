import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../stores/editorStore'

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      tabs: [],
      activeTabId: null,
      splitView: false,
      splitTabs: [],
    })
  })

  it('should open a new tab', () => {
    const { openTab } = useEditorStore.getState()
    openTab({
      name: 'test.ts',
      path: '/src/test.ts',
      content: 'const x = 1',
      language: 'typescript',
    })

    const state = useEditorStore.getState()
    expect(state.tabs.length).toBe(1)
    expect(state.tabs[0].name).toBe('test.ts')
    expect(state.tabs[0].language).toBe('typescript')
    expect(state.tabs[0].modified).toBe(false)
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('should not duplicate tabs for same path', () => {
    const { openTab } = useEditorStore.getState()
    openTab({ name: 'test.ts', path: '/src/test.ts', content: '', language: 'typescript' })
    openTab({ name: 'test.ts', path: '/src/test.ts', content: '', language: 'typescript' })

    expect(useEditorStore.getState().tabs.length).toBe(1)
  })

  it('should close a tab', () => {
    const { openTab, closeTab } = useEditorStore.getState()
    openTab({ name: 'test.ts', path: '/src/test.ts', content: '', language: 'typescript' })
    const tabId = useEditorStore.getState().tabs[0].id

    closeTab(tabId)
    expect(useEditorStore.getState().tabs.length).toBe(0)
    expect(useEditorStore.getState().activeTabId).toBeNull()
  })

  it('should update tab content', () => {
    const { openTab, updateTabContent } = useEditorStore.getState()
    openTab({ name: 'test.ts', path: '/src/test.ts', content: 'initial', language: 'typescript' })
    const tabId = useEditorStore.getState().tabs[0].id

    updateTabContent(tabId, 'updated content')
    const tab = useEditorStore.getState().tabs[0]
    expect(tab.content).toBe('updated content')
    expect(tab.modified).toBe(true)
  })

  it('should toggle split view', () => {
    const { toggleSplitView } = useEditorStore.getState()
    expect(useEditorStore.getState().splitView).toBe(false)

    toggleSplitView()
    expect(useEditorStore.getState().splitView).toBe(true)

    toggleSplitView()
    expect(useEditorStore.getState().splitView).toBe(false)
  })

  it('should move tab to split', () => {
    const { openTab, moveToSplit } = useEditorStore.getState()
    openTab({ name: 'test.ts', path: '/src/test.ts', content: '', language: 'typescript' })
    const tabId = useEditorStore.getState().tabs[0].id

    moveToSplit(tabId)
    expect(useEditorStore.getState().splitTabs).toContain(tabId)

    moveToSplit(tabId)
    expect(useEditorStore.getState().splitTabs).not.toContain(tabId)
  })
})
