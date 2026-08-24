import { create } from 'zustand'

export interface Tab {
  id: string
  name: string
  path: string
  content: string
  language: string
  modified: boolean
}

export interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  splitView: boolean
  splitTabs: string[]
  
  // Actions
  openTab: (tab: Omit<Tab, 'id' | 'modified'>) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  updateTabName: (id: string, name: string) => void
  toggleSplitView: () => void
  moveToSplit: (id: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  splitView: false,
  splitTabs: [],
  
  openTab: (tab) => {
    const existingTab = get().tabs.find(t => t.path === tab.path)
    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }
    
    const newTab: Tab = {
      ...tab,
      id: `tab-${Date.now()}`,
      modified: false,
    }
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }))
  },
  
  closeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter(t => t.id !== id)
      const newSplitTabs = state.splitTabs.filter(t => t !== id)
      
      let newActiveTabId = state.activeTabId
      if (state.activeTabId === id) {
        newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
      }
      
      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
        splitTabs: newSplitTabs,
        splitView: newSplitTabs.length > 0,
      }
    })
  },
  
  setActiveTab: (id) => set({ activeTabId: id }),
  
  updateTabContent: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map(t => 
        t.id === id ? { ...t, content, modified: true } : t
      ),
    }))
  },
  
  updateTabName: (id, name) => {
    set((state) => ({
      tabs: state.tabs.map(t => 
        t.id === id ? { ...t, name } : t
      ),
    }))
  },
  
  toggleSplitView: () => {
    set((state) => ({
      splitView: !state.splitView,
      splitTabs: !state.splitView ? [] : [],
    }))
  },
  
  moveToSplit: (id) => {
    set((state) => {
      if (state.splitTabs.includes(id)) {
        return { splitTabs: state.splitTabs.filter(t => t !== id) }
      }
      return { splitTabs: [...state.splitTabs, id] }
    })
  },
}))
