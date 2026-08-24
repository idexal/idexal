import { create } from 'zustand'
import { AIProviderType } from '../services/aiService'

export interface SettingsState {
  // AI Settings
  activeProvider: AIProviderType
  openaiApiKey: string
  openaiModel: string
  anthropicApiKey: string
  anthropicModel: string
  localModelUrl: string
  localModelName: string
  
  // Editor Settings
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: 'on' | 'off' | 'wordWrapColumn'
  minimap: boolean
  lineNumbers: boolean
  autoSave: boolean
  
  // UI Settings
  theme: 'dark' | 'light' | 'system'
  sidebarPosition: 'left' | 'right'
  
  // Actions
  setActiveProvider: (provider: AIProviderType) => void
  setOpenAIKey: (key: string) => void
  setOpenAIModel: (model: string) => void
  setAnthropicKey: (key: string) => void
  setAnthropicModel: (model: string) => void
  setLocalModelUrl: (url: string) => void
  setLocalModelName: (name: string) => void
  setFontSize: (size: number) => void
  setTabSize: (size: number) => void
  setWordWrap: (wrap: 'on' | 'off' | 'wordWrapColumn') => void
  setMinimap: (enabled: boolean) => void
  setLineNumbers: (enabled: boolean) => void
  setAutoSave: (enabled: boolean) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  loadSettings: () => void
  saveSettings: () => void
}

const DEFAULT_SETTINGS = {
  activeProvider: 'openai' as AIProviderType,
  openaiApiKey: '',
  openaiModel: 'gpt-4',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-opus-20240229',
  localModelUrl: 'http://localhost:11434/api',
  localModelName: 'llama2',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  tabSize: 2,
  wordWrap: 'off' as const,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  theme: 'dark' as const,
  sidebarPosition: 'left' as const,
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setActiveProvider: (provider) => set({ activeProvider: provider }),
  setOpenAIKey: (key) => set({ openaiApiKey: key }),
  setOpenAIModel: (model) => set({ openaiModel: model }),
  setAnthropicKey: (key) => set({ anthropicApiKey: key }),
  setAnthropicModel: (model) => set({ anthropicModel: model }),
  setLocalModelUrl: (url) => set({ localModelUrl: url }),
  setLocalModelName: (name) => set({ localModelName: name }),
  setFontSize: (size) => set({ fontSize: size }),
  setTabSize: (size) => set({ tabSize: size }),
  setWordWrap: (wrap) => set({ wordWrap: wrap }),
  setMinimap: (enabled) => set({ minimap: enabled }),
  setLineNumbers: (enabled) => set({ lineNumbers: enabled }),
  setAutoSave: (enabled) => set({ autoSave: enabled }),
  setTheme: (theme) => set({ theme }),

  loadSettings: () => {
    try {
      const saved = localStorage.getItem('freebuff-settings')
      if (saved) {
        set({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      }
    } catch (e) {
      set(DEFAULT_SETTINGS)
    }
  },

  saveSettings: () => {
    const state = get()
    const settings = {
      activeProvider: state.activeProvider,
      openaiApiKey: state.openaiApiKey,
      openaiModel: state.openaiModel,
      anthropicApiKey: state.anthropicApiKey,
      anthropicModel: state.anthropicModel,
      localModelUrl: state.localModelUrl,
      localModelName: state.localModelName,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      tabSize: state.tabSize,
      wordWrap: state.wordWrap,
      minimap: state.minimap,
      lineNumbers: state.lineNumbers,
      autoSave: state.autoSave,
      theme: state.theme,
      sidebarPosition: state.sidebarPosition,
    }
    localStorage.setItem('freebuff-settings', JSON.stringify(settings))
  },
}))
