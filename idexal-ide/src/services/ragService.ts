// ══════════════════════════════════════════════════════════════════════
// RAG Service — Retrieval-Augmented Generation
//
// Provides codebase-aware context for AI prompts by:
// 1. Indexing project symbols and files
// 2. Searching relevant code for a query
// 3. Injecting context into AI prompts
// ══════════════════════════════════════════════════════════════════════

import { getEngineService, type ParsedSymbol } from './engineService'

export interface CodeContext {
  relevantSymbols: ParsedSymbol[]
  relevantFiles: string[]
  projectStats: { total: number; functions: number; classes: number }
  prompt: string
}

export interface IndexedFile {
  path: string
  language: string
  symbols: ParsedSymbol[]
  lastIndexed: number
}

class RagService {
  private indexedFiles = new Map<string, IndexedFile>()
  private projectRoot: string | null = null

  // ── Index a project ──────────────────────────────────────────

  async indexProject(
    rootPath: string,
    files: Array<{ path: string; content: string; language: string }>,
  ): Promise<number> {
    this.projectRoot = rootPath
    let totalSymbols = 0

    for (const file of files) {
      const engine = getEngineService()
      const symbols = await engine.parseFile(file.path, file.content, file.language)
      this.indexedFiles.set(file.path, {
        path: file.path,
        language: file.language,
        symbols,
        lastIndexed: Date.now(),
      })
      totalSymbols += symbols.length
    }

    return totalSymbols
  }

  // ── Search for relevant code ─────────────────────────────────

  searchRelevant(query: string, maxResults: number = 10): CodeContext {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)

    // Score each symbol by relevance
    const scored: Array<{ symbol: ParsedSymbol; file: string; score: number }> = []

    for (const [filePath, indexed] of this.indexedFiles) {
      for (const symbol of indexed.symbols) {
        let score = 0

        // Name match
        if (symbol.name.toLowerCase().includes(queryLower)) score += 10
        for (const word of queryWords) {
          if (symbol.name.toLowerCase().includes(word)) score += 5
          if (symbol.snippet.toLowerCase().includes(word)) score += 2
        }

        // Prefer functions and classes over other types
        if (symbol.symbol_type === 'function') score += 1
        if (symbol.symbol_type === 'class' || symbol.symbol_type === 'struct') score += 2

        if (score > 0) {
          scored.push({ symbol, file: filePath, score })
        }
      }
    }

    // Sort by score and take top results
    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, maxResults)

    // Build project stats
    let totalSymbols = 0, totalFunctions = 0, totalClasses = 0
    for (const indexed of this.indexedFiles.values()) {
      totalSymbols += indexed.symbols.length
      totalFunctions += indexed.symbols.filter(s => s.symbol_type === 'function').length
      totalClasses += indexed.symbols.filter(s =>
        s.symbol_type === 'class' || s.symbol_type === 'struct'
      ).length
    }

    return {
      relevantSymbols: top.map(t => t.symbol),
      relevantFiles: [...new Set(top.map(t => t.file))],
      projectStats: { total: totalSymbols, functions: totalFunctions, classes: totalClasses },
      prompt: this.buildContextPrompt(query, top),
    }
  }

  // ── Build context prompt ─────────────────────────────────────

  private buildContextPrompt(
    query: string,
    results: Array<{ symbol: ParsedSymbol; file: string; score: number }>,
  ): string {
    if (results.length === 0) {
      return `User query: ${query}\n\nNo relevant code found in the indexed project.`
    }

    let context = `User query: ${query}\n\nRelevant code context:\n\n`

    for (const { symbol, file } of results.slice(0, 5)) {
      context += `## ${symbol.name} (${symbol.symbol_type})\n`
      context += `File: ${file}:${symbol.start_line}\n`
      context += `\`\`\`\n${symbol.snippet}\n\`\`\`\n\n`
    }

    return context
  }

  // ── Get file context ─────────────────────────────────────────

  getFileContext(filePath: string): string {
    const indexed = this.indexedFiles.get(filePath)
    if (!indexed) return ''

    let context = `File: ${filePath}\nLanguage: ${indexed.language}\n`
    context += `Symbols: ${indexed.symbols.length}\n\n`

    for (const symbol of indexed.symbols) {
      context += `- ${symbol.symbol_type} ${symbol.name} (line ${symbol.start_line})\n`
    }

    return context
  }

  // ── Get all indexed files ────────────────────────────────────

  getIndexedFiles(): string[] {
    return Array.from(this.indexedFiles.keys())
  }

  // ── Clear index ──────────────────────────────────────────────

  clearIndex() {
    this.indexedFiles.clear()
    this.projectRoot = null
  }
}

// Singleton
let _instance: RagService | null = null

export function getRagService(): RagService {
  if (!_instance) _instance = new RagService()
  return _instance
}

export default RagService
