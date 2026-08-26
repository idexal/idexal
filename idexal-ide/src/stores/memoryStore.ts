import { create } from 'zustand'

export interface MemoryEntry {
  id: string
  type: 'project' | 'conversation' | 'code_index' | 'user_preference'
  key: string
  value: string
  metadata?: Record<string, any>
  timestamp: number
  relevance?: number
}

export interface CodeSymbol {
  name: string
  type: 'function' | 'class' | 'interface' | 'variable' | 'module'
  filePath: string
  line: number
  column: number
  snippet: string
  references: string[]
}

export interface ProjectContext {
  rootPath: string
  name: string
  description: string
  languages: string[]
  frameworks: string[]
  structure: FileNode[]
  symbols: CodeSymbol[]
  lastIndexed: number
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modified?: number
}

export interface MemoryState {
  entries: MemoryEntry[]
  projectContext: ProjectContext | null
  searchResults: MemoryEntry[]
  
  // Actions
  addMemory: (entry: Omit<MemoryEntry, 'id' | 'timestamp'>) => void
  removeMemory: (id: string) => void
  searchMemory: (query: string) => MemoryEntry[]
  clearMemory: () => void
  setProjectContext: (context: ProjectContext) => void
  updateProjectContext: (updates: Partial<ProjectContext>) => void
  addSymbol: (symbol: CodeSymbol) => void
  removeSymbol: (filePath: string) => void
  getSymbolsByFile: (filePath: string) => CodeSymbol[]
  getSymbolsByName: (name: string) => CodeSymbol[]
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  entries: [],
  projectContext: null,
  searchResults: [],
  
  addMemory: (entry) => {
    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }
    
    set((state) => ({
      entries: [...state.entries, newEntry],
    }))
  },
  
  removeMemory: (id) => {
    set((state) => ({
      entries: state.entries.filter(e => e.id !== id),
    }))
  },
  
  searchMemory: (query) => {
    const lowerQuery = query.toLowerCase()
    const results = get().entries.filter(entry => 
      entry.key.toLowerCase().includes(lowerQuery) ||
      entry.value.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
      // Simple relevance scoring
      const aScore = (a.key.toLowerCase().includes(lowerQuery) ? 2 : 0) + 
                     (a.value.toLowerCase().includes(lowerQuery) ? 1 : 0)
      const bScore = (b.key.toLowerCase().includes(lowerQuery) ? 2 : 0) + 
                     (b.value.toLowerCase().includes(lowerQuery) ? 1 : 0)
      return bScore - aScore
    }).slice(0, 10)
    
    set({ searchResults: results })
    return results
  },
  
  clearMemory: () => set({ entries: [], searchResults: [] }),
  
  setProjectContext: (context) => set({ projectContext: context }),
  
  updateProjectContext: (updates) => {
    set((state) => ({
      projectContext: state.projectContext 
        ? { ...state.projectContext, ...updates }
        : null,
    }))
  },
  
  addSymbol: (symbol) => {
    set((state) => ({
      projectContext: state.projectContext 
        ? {
            ...state.projectContext,
            symbols: [...state.projectContext.symbols, symbol],
          }
        : null,
    }))
  },
  
  removeSymbol: (filePath) => {
    set((state) => ({
      projectContext: state.projectContext 
        ? {
            ...state.projectContext,
            symbols: state.projectContext.symbols.filter(
              s => s.filePath !== filePath
            ),
          }
        : null,
    }))
  },
  
  getSymbolsByFile: (filePath) => {
    return get().projectContext?.symbols.filter(
      s => s.filePath === filePath
    ) || []
  },
  
  getSymbolsByName: (name) => {
    return get().projectContext?.symbols.filter(
      s => s.name.toLowerCase().includes(name.toLowerCase())
    ) || []
  },
}))
