// ══════════════════════════════════════════════════════════════════════
// TypeScript types for the Rust N-API engine (idexal-engine)
//
// These types mirror the Rust structs exported via #[napi].
// The native module returns JSON strings — these types describe the
// parsed shapes.
// ══════════════════════════════════════════════════════════════════════

// ── Parser types ──────────────────────────────────────────────────────

export type SymbolKind =
  | 'function'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'impl'
  | 'type_alias'
  | 'class'
  | 'interface'
  | 'const'
  | 'module'
  | 'decorator'

export interface ParsedSymbol {
  name: string
  symbol_type: SymbolKind
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

export interface ParseResult {
  success: boolean
  file_path?: string
  language?: string
  symbols?: ParsedSymbol[]
  stats?: ParseStats
  error?: string
}

export interface TreeSitterError {
  line: number
  column: number
  end_line: number
  end_column: number
  message: string
  severity: string
}

export interface SearchResult {
  file_path: string
  line: number
  column: number
  content: string
  context: string
}

export interface SearchCodebaseResult {
  query: string
  results: SearchResult[]
  total_matches: number
}

// ── Memory types ──────────────────────────────────────────────────────

export type MemorySymbolType =
  | 'function'
  | 'class'
  | 'interface'
  | 'variable'
  | 'module'
  | 'struct'
  | 'enum'
  | 'trait'

export interface ProjectSymbol {
  name: string
  symbol_type: MemorySymbolType
  file_path: string
  line: number
  column: number
  snippet: string
}

export interface ProjectSummary {
  success: boolean
  summary?: string
  error?: string
}

export interface SymbolSearchResult {
  success: boolean
  results?: ProjectSymbol[]
  total?: number
  error?: string
}

// ── Agent types ───────────────────────────────────────────────────────

export type AgentTypeString =
  | 'code'
  | 'review'
  | 'debug'
  | 'architect'
  | 'test'
  | 'orchestrator'

export interface AgentTaskResult {
  success: boolean
  task_id?: string
  agent_type?: string
  description?: string
  priority?: number
  status?: string
  error?: string
}

export interface AgentPromptResult {
  success: boolean
  prompt?: string
  error?: string
}

export interface AgentTypeInfo {
  type: string
  name: string
  description: string
}

export interface AgentListResult {
  success: boolean
  agents?: AgentTypeInfo[]
  error?: string
}

// ── Engine API ────────────────────────────────────────────────────────

export interface EngineAPI {
  // Core
  initEngine(): string
  getVersion(): string
  supportedLanguages(): string[]
  detectLanguage(filePath: string): string

  // Parser
  processFile(filePath: string, content: string, language: string): string
  parseFileStructured(filePath: string, content: string, language: string): ParseResult
  getParseErrors(content: string, language: string): TreeSitterError[]
  searchCodebase(query: string, files: string[]): string

  // Memory
  initProjectMemory(rootPath: string, name: string): string
  addProjectSymbol(
    name: string,
    symbolType: string,
    filePath: string,
    line: number,
    column: number,
    snippet: string,
  ): string
  searchProjectSymbols(query: string): SymbolSearchResult
  getProjectSummary(): ProjectSummary
  clearProjectMemory(): string

  // Agents
  createAgentTask(agentType: string, description: string, priority: number): AgentTaskResult
  getAgentPrompt(agentType: string): AgentPromptResult
  listAgentTypes(): AgentListResult
}
