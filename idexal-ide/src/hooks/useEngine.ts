// ══════════════════════════════════════════════════════════════════════
// useEngine — React hook for the Rust N-API engine
//
// Provides typed access to all engine functions via the preload bridge.
// All calls go through IPC to the main process, which calls the native
// Rust module synchronously (N-API calls are fast enough to block).
// ══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────

interface EngineResult<T = unknown> {
  success: boolean
  error?: string
  [key: string]: unknown
}

export interface ParsedSymbol {
  name: string
  symbol_type: string
  start_line: number
  start_column: number
  end_line: number
  end_column: number
  snippet: string
  parent: string | null
  children: string[]
}

export interface ParseStats {
  total: number
  functions: number
  classes: number
  enums: number
  traits: number
}

export interface ParseStructuredResult extends EngineResult {
  file_path?: string
  language?: string
  symbols?: ParsedSymbol[]
  stats?: ParseStats
}

export interface ProjectSymbol {
  name: string
  symbol_type: string
  file_path: string
  line: number
  column: number
  snippet: string
}

export interface AgentTypeInfo {
  type: string
  name: string
  description: string
}

// ── Window electronAPI type ───────────────────────────────────────────

interface ElectronAPI {
  engineInit: () => Promise<EngineResult>
  engineVersion: () => Promise<{ success: boolean; version?: string; error?: string }>
  engineSupportedLanguages: () => Promise<{ success: boolean; languages?: string[]; error?: string }>
  engineDetectLanguage: (filePath: string) => Promise<{ success: boolean; language?: string; error?: string }>
  engineProcessFile: (filePath: string, content: string, language: string) => Promise<EngineResult>
  engineParseStructured: (filePath: string, content: string, language: string) => Promise<ParseStructuredResult>
  engineSearchCodebase: (query: string, files: string[]) => Promise<EngineResult>
  engineInitProjectMemory: (rootPath: string, name: string) => Promise<EngineResult>
  engineAddSymbol: (name: string, symbolType: string, filePath: string, line: number, column: number, snippet: string) => Promise<EngineResult>
  engineSearchSymbols: (query: string) => Promise<{ success: boolean; results?: ProjectSymbol[]; total?: number; error?: string }>
  engineProjectSummary: () => Promise<{ success: boolean; summary?: string; error?: string }>
  engineClearProjectMemory: () => Promise<EngineResult>
  engineCreateTask: (agentType: string, description: string, priority: number) => Promise<{ success: boolean; task_id?: string; error?: string }>
  engineAgentPrompt: (agentType: string) => Promise<{ success: boolean; prompt?: string; error?: string }>
  engineListAgents: () => Promise<{ success: boolean; agents?: AgentTypeInfo[]; error?: string }>
}

function getElectronAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI as ElectronAPI
  }
  return null
}

// ── Hook ──────────────────────────────────────────────────────────────

export interface EngineState {
  version: string | null
  supportedLanguages: string[]
  isInitialized: boolean
  error: string | null
}

export function useEngine() {
  const [state, setState] = useState<EngineState>({
    version: null,
    supportedLanguages: [],
    isInitialized: false,
    error: null,
  })
  const initRef = useRef(false)

  const api = getElectronAPI()

  // ── Core ───────────────────────────────────────────────────────

  const initialize = useCallback(async () => {
    if (initRef.current || !api) return
    initRef.current = true

    try {
      const initResult = await api.engineInit()
      if (!initResult.success) {
        setState(s => ({ ...s, error: initResult.error || 'Failed to init engine' }))
        return
      }

      const [versionResult, langResult] = await Promise.all([
        api.engineVersion(),
        api.engineSupportedLanguages(),
      ])

      setState({
        version: versionResult.version || null,
        supportedLanguages: langResult.languages || [],
        isInitialized: true,
        error: null,
      })
    } catch (err) {
      setState(s => ({ ...s, error: (err as Error).message }))
    }
  }, [api])

  // ── Parser ─────────────────────────────────────────────────────

  const detectLanguage = useCallback(async (filePath: string): Promise<string> => {
    if (!api) return 'unknown'
    const result = await api.engineDetectLanguage(filePath)
    return result.language || 'unknown'
  }, [api])

  const processFile = useCallback(async (
    filePath: string, content: string, language: string,
  ): Promise<ParsedSymbol[]> => {
    if (!api) return []
    const result = await api.engineProcessFile(filePath, content, language)
    return (result as any).symbols || []
  }, [api])

  const parseFileStructured = useCallback(async (
    filePath: string, content: string, language: string,
  ): Promise<ParseStructuredResult> => {
    if (!api) return { success: false }
    return api.engineParseStructured(filePath, content, language)
  }, [api])

  const searchCodebase = useCallback(async (
    query: string, files: string[],
  ): Promise<EngineResult> => {
    if (!api) return { success: false }
    return api.engineSearchCodebase(query, files)
  }, [api])

  // ── Memory ─────────────────────────────────────────────────────

  const initProjectMemory = useCallback(async (rootPath: string, name: string) => {
    if (!api) return { success: false }
    return api.engineInitProjectMemory(rootPath, name)
  }, [api])

  const addSymbol = useCallback(async (
    name: string, symbolType: string, filePath: string,
    line: number, column: number, snippet: string,
  ) => {
    if (!api) return { success: false }
    return api.engineAddSymbol(name, symbolType, filePath, line, column, snippet)
  }, [api])

  const searchSymbols = useCallback(async (query: string) => {
    if (!api) return { success: true, results: [], total: 0 }
    return api.engineSearchSymbols(query)
  }, [api])

  const getProjectSummary = useCallback(async () => {
    if (!api) return { success: true, summary: '' }
    return api.engineProjectSummary()
  }, [api])

  const clearProjectMemory = useCallback(async () => {
    if (!api) return { success: false }
    return api.engineClearProjectMemory()
  }, [api])

  // ── Agents ─────────────────────────────────────────────────────

  const createTask = useCallback(async (
    agentType: string, description: string, priority: number,
  ) => {
    if (!api) return { success: false }
    return api.engineCreateTask(agentType, description, priority)
  }, [api])

  const getAgentPrompt = useCallback(async (agentType: string) => {
    if (!api) return { success: false }
    return api.engineAgentPrompt(agentType)
  }, [api])

  const listAgents = useCallback(async () => {
    if (!api) return { success: true, agents: [] }
    return api.engineListAgents()
  }, [api])

  return {
    // State
    ...state,

    // Actions
    initialize,
    detectLanguage,
    processFile,
    parseFileStructured,
    searchCodebase,
    initProjectMemory,
    addSymbol,
    searchSymbols,
    getProjectSummary,
    clearProjectMemory,
    createTask,
    getAgentPrompt,
    listAgents,
  }
}
