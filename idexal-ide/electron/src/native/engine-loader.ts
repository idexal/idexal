// ══════════════════════════════════════════════════════════════════════
// Native Engine Loader
//
// Loads the compiled Rust N-API module (.node file) and provides a
// typed interface for the Electron main process.
//
// The .node file is built by `cargo build --release` in rust-engine/
// and copied to electron/native/ during the build step.
// ══════════════════════════════════════════════════════════════════════

import path from 'path'
import fs from 'fs'

// Types matching the Rust N-API exports
export interface NativeEngine {
  initEngine(): string
  getVersion(): string
  supportedLanguages(): string
  detectLanguage(filePath: string): string
  processFile(filePath: string, content: string, language: string): string
  parseFileStructured(filePath: string, content: string, language: string): string
  searchCodebase(query: string, files: string[]): string
  getParseErrors(content: string, language: string): string
  initProjectMemory(rootPath: string, name: string): string
  addProjectSymbol(
    name: string,
    symbolType: string,
    filePath: string,
    line: number,
    column: number,
    snippet: string,
  ): string
  searchProjectSymbols(query: string): string
  getProjectSummary(): string
  clearProjectMemory(): string
  createAgentTask(agentType: string, description: string, priority: number): string
  getAgentPrompt(agentType: string): string
  listAgentTypes(): string
}

let _engine: NativeEngine | null = null

/**
 * Get the platform-specific .node file name.
 */
function getNodeFileName(): string {
  const platform = process.platform
  const arch = process.arch

  const ext = platform === 'win32' ? '.dll' : platform === 'darwin' ? '.dylib' : '.so'
  const prefix = platform === 'win32' ? '' : 'lib'

  // N-API naming convention: idexal_engine.{platform}-{arch}.node
  return `idexal_engine.${platform}-${arch}${ext}`
}

/**
 * Resolve the path to the .node binary.
 *
 * Search order:
 * 1. IDEXAL_ENGINE_PATH env var (development override)
 * 2. electron/native/ (build output)
 * 3. rust-engine/target/release/ (local cargo build)
 * 4. resources/ (packaged app)
 */
function resolveEnginePath(): string | null {
  // 1. Environment override
  if (process.env.IDEXAL_ENGINE_PATH) {
    if (fs.existsSync(process.env.IDEXAL_ENGINE_PATH)) {
      return process.env.IDEXAL_ENGINE_PATH
    }
  }

  const candidates = [
    // 2. Built and copied to electron/native/
    path.join(__dirname, '..', 'native', getNodeFileName()),
    path.join(__dirname, 'native', getNodeFileName()),

    // 3. Local cargo build (development)
    path.join(__dirname, '..', '..', 'rust-engine', 'target', 'release', getNodeFileName()),
    path.join(__dirname, '..', '..', '..', 'rust-engine', 'target', 'release', getNodeFileName()),

    // 4. Packaged app resources
    path.join(process.resourcesPath || '', 'engine', getNodeFileName()),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Load and initialize the native Rust engine.
 *
 * Falls back to a mock implementation if the .node file is not found,
 * so the app can still run in development without a compiled engine.
 */
export function loadEngine(): NativeEngine {
  if (_engine) return _engine

  const enginePath = resolveEnginePath()

  if (enginePath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _engine = require(enginePath) as NativeEngine
      console.log(`[engine] Loaded native module from ${enginePath}`)
      const version = _engine!.getVersion()
      console.log(`[engine] Version: ${version}`)
      return _engine!
    } catch (err) {
      console.error(`[engine] Failed to load native module:`, err)
    }
  }

  // Fallback: mock engine for development without compiled Rust
  console.warn('[engine] Native module not found — using mock engine')
  _engine = createMockEngine()
  return _engine
}

/**
 * Get the loaded engine (or null if not yet loaded).
 */
export function getEngine(): NativeEngine | null {
  return _engine
}

/**
 * Create a mock engine that returns sensible defaults.
 * Used when the .node file is not available (e.g., during development).
 */
function createMockEngine(): NativeEngine {
  const mockResult = (data: Record<string, unknown>) => JSON.stringify(data)

  return {
    initEngine: () => mockResult({ success: true, message: 'Mock engine initialized' }),
    getVersion: () => '0.0.0-mock',
    supportedLanguages: () => '["rust","typescript","javascript","python","go","c","cpp"]',
    detectLanguage: (filePath: string) => {
      const ext = filePath.split('.').pop() || ''
      const map: Record<string, string> = {
        rs: 'rust', ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript',
        py: 'python', go: 'go', c: 'c', cpp: 'cpp',
      }
      return map[ext] || 'unknown'
    },
    processFile: (_fp: string, _content: string, _lang: string) =>
      mockResult({ success: true, symbols: [], symbol_count: 0 }),
    parseFileStructured: (_fp: string, _content: string, _lang: string) =>
      mockResult({ success: true, symbols: [], stats: { total: 0, functions: 0, classes: 0, enums: 0, traits: 0 } }),
    searchCodebase: (_query: string, _files: string[]) =>
      mockResult({ query: '', results: [], total_matches: 0 }),
    getParseErrors: (_content: string, _language: string) => '[]',
    initProjectMemory: (_root: string, _name: string) =>
      mockResult({ success: true }),
    addProjectSymbol: () => mockResult({ success: true }),
    searchProjectSymbols: (_query: string) =>
      mockResult({ success: true, results: [], total: 0 }),
    getProjectSummary: () =>
      mockResult({ success: true, summary: 'No project loaded (mock)' }),
    clearProjectMemory: () => mockResult({ success: true }),
    createAgentTask: (_type: string, _desc: string, _pri: number) =>
      mockResult({ success: true, task_id: `mock-${Date.now()}`, status: 'idle' }),
    getAgentPrompt: (_type: string) =>
      mockResult({ success: true, prompt: 'You are a helpful assistant.' }),
    listAgentTypes: () => mockResult({
      success: true,
      agents: [
        { type: 'code', name: 'Code Agent', description: 'Writing code' },
        { type: 'review', name: 'Review Agent', description: 'Code review' },
        { type: 'debug', name: 'Debug Agent', description: 'Debugging' },
        { type: 'architect', name: 'Architect Agent', description: 'Architecture' },
        { type: 'test', name: 'Test Agent', description: 'Testing' },
        { type: 'orchestrator', name: 'Orchestrator', description: 'Coordination' },
      ],
    }),
  }
}
