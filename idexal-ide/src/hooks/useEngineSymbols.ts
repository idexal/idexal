// ══════════════════════════════════════════════════════════════════════
// useEngineSymbols — React hook for real-time symbol extraction
//
// Watches the editor content and extracts symbols using the Rust engine.
// Provides symbol outlines, go-to-definition, and project stats.
// ══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import { getEngineService, type ParsedSymbol, type ProjectStats } from '../services/engineService'
import { useEditorStore } from '../stores/editorStore'

export interface SymbolOutlineItem {
  name: string
  kind: string
  line: number
  column: number
  snippet: string
  parent: string | null
}

export function useEngineSymbols() {
  const [symbols, setSymbols] = useState<ParsedSymbol[]>([])
  const [outline, setOutline] = useState<SymbolOutlineItem[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const engine = getEngineService()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const { tabs, activeTabId } = useEditorStore()

  // ── Parse current file ───────────────────────────────────────

  const parseCurrentFile = useCallback(async () => {
    if (!activeTabId) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || !tab.content) return

    setIsAnalyzing(true)
    try {
      const language = await engine.detectLanguage(tab.path || tab.name)
      const parsed = await engine.parseFile(tab.path || tab.name, tab.content, language)
      setSymbols(parsed)

      // Build outline
      const outlineItems: SymbolOutlineItem[] = parsed.map(s => ({
        name: s.name,
        kind: s.symbol_type,
        line: s.start_line,
        column: s.start_column,
        snippet: s.snippet,
        parent: s.parent,
      }))
      setOutline(outlineItems)
    } catch (err) {
      console.error('[engine] parse error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [activeTabId, tabs, engine])

  // ── Debounced parse on content change ─────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      parseCurrentFile()
    }, 500) // 500ms debounce
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [    tabs.find(t => t.id === activeTabId)?.content, parseCurrentFile])

  // ── Index file on save ───────────────────────────────────────

  const indexCurrentFile = useCallback(async () => {
    if (!activeTabId) return
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || !tab.content) return

    try {
      const language = await engine.detectLanguage(tab.path || tab.name)
      await engine.indexFile(tab.path || tab.name, tab.content, language)
    } catch (err) {
      console.error('[engine] index error:', err)
    }
  }, [activeTabId, tabs, engine])

  // ── Search symbols ───────────────────────────────────────────

  const searchSymbols = useCallback(async (query: string) => {
    if (!query) return []
    return engine.searchSymbols(query)
  }, [engine])

  // ── Go to definition ─────────────────────────────────────────

  const goToDefinition = useCallback((symbolName: string) => {
    // Find the symbol in the current outline
    const sym = outline.find(s => s.name === symbolName)
    if (sym) {
      // Return line number for the editor to navigate to
      return { line: sym.line, column: sym.column }
    }
    return null
  }, [outline])

  // ── Get project stats ────────────────────────────────────────

  const refreshStats = useCallback(async () => {
    try {
      const s = await engine.getProjectStats()
      setStats(s)
    } catch (err) {
      console.error('[engine] stats error:', err)
    }
  }, [engine])

  // ── Supported languages ──────────────────────────────────────

  const getSupportedLanguages = useCallback(async () => {
    return engine.supportedLanguages()
  }, [engine])

  return {
    symbols,
    outline,
    stats,
    isAnalyzing,
    parseCurrentFile,
    indexCurrentFile,
    searchSymbols,
    goToDefinition,
    refreshStats,
    getSupportedLanguages,
  }
}
