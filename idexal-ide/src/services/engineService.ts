// ══════════════════════════════════════════════════════════════════════
// EngineService — connects to the Rust engine TCP server
//
// Provides a typed, promise-based API for all engine operations.
// Falls back to IPC handlers when the TCP server is unavailable.
// ══════════════════════════════════════════════════════════════════════

interface JsonRpcRequest {
  id: string
  method: string
  params: Record<string, unknown>
}

interface JsonRpcResponse {
  id: string
  result: unknown
  error: string | null
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

export interface ProjectStats {
  total: number
  functions: number
  classes: number
  enums: number
  traits: number
}

class EngineService {
  private ws: WebSocket | null = null
  private port: number | null = null
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private idCounter = 0
  private connected = false

  // ── Connection ───────────────────────────────────────────────

  async connect(port: number): Promise<boolean> {
    this.port = port
    try {
      this.ws = new WebSocket(`ws://127.0.0.1:${port}`)
      await new Promise<void>((resolve, reject) => {
        this.ws!.onopen = () => resolve()
        this.ws!.onerror = () => reject(new Error('connection failed'))
      })
      this.ws!.onmessage = (e) => this.handleMessage(e.data as string)
      this.ws!.onclose = () => { this.connected = false }
      this.connected = true
      return true
    } catch {
      this.connected = false
      return false
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.connected = false
  }

  get isConnected() {
    return this.connected
  }

  // ── JSON-RPC ─────────────────────────────────────────────────

  private async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.connected || !this.ws) {
      // Fallback to IPC if available
      return this.callIPC(method, params)
    }

    const id = `req-${++this.idCounter}`
    const request: JsonRpcRequest = { id, method, params }

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws!.send(JSON.stringify(request) + '\n')
      // Timeout after 5s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`timeout: ${method}`))
        }
      }, 5000)
    })
  }

  private handleMessage(data: string) {
    try {
      const response: JsonRpcResponse = JSON.parse(data)
      const pending = this.pending.get(response.id)
      if (pending) {
        this.pending.delete(response.id)
        if (response.error) {
          pending.reject(new Error(response.error))
        } else {
          pending.resolve(response.result)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // ── IPC fallback ─────────────────────────────────────────────

  private async callIPC(method: string, params: Record<string, unknown>): Promise<unknown> {
    const api = (window as any).electronAPI
    if (!api) return null

    switch (method) {
      case 'parse_file':
        return JSON.parse(await api.engineProcessFile(
          params.file_path as string,
          params.content as string,
          params.language as string,
        ))
      case 'detect_language':
        return JSON.parse(await api.engineDetectLanguage(params.file_path as string))
      case 'ping':
        return JSON.parse(await api.engineVersion())
      default:
        return null
    }
  }

  // ── Public API ───────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const result = await this.call('ping') as any
      return result?.pong === true
    } catch {
      return false
    }
  }

  async detectLanguage(filePath: string): Promise<string> {
    const result = await this.call('detect_language', { file_path: filePath }) as any
    return result?.language || 'unknown'
  }

  async parseFile(filePath: string, content: string, language: string): Promise<ParsedSymbol[]> {
    const result = await this.call('parse_file', {
      file_path: filePath,
      content,
      language,
    }) as any
    return result?.symbols || []
  }

  async indexFile(filePath: string, content: string, language: string): Promise<number> {
    const result = await this.call('index_file', {
      file_path: filePath,
      content,
      language,
    }) as any
    return result?.total_symbols || 0
  }

  async searchSymbols(query: string): Promise<ParsedSymbol[]> {
    const result = await this.call('search_symbols', { query }) as any
    return result?.results || []
  }

  async getSymbolsByFile(filePath: string): Promise<ParsedSymbol[]> {
    const result = await this.call('get_symbols_by_file', { file_path: filePath }) as any
    return result?.results || []
  }

  async getProjectStats(): Promise<ProjectStats> {
    const result = await this.call('get_project_stats', {}) as any
    return {
      total: result?.total || 0,
      functions: result?.functions || 0,
      classes: result?.classes || 0,
      enums: result?.enums || 0,
      traits: result?.traits || 0,
    }
  }

  async supportedLanguages(): Promise<string[]> {
    const result = await this.call('supported_languages', {}) as any
    return result || []
  }
}

// Singleton
let _instance: EngineService | null = null

export function getEngineService(): EngineService {
  if (!_instance) {
    _instance = new EngineService()
  }
  return _instance
}

export default EngineService
