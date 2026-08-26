/**
 * LSP Client Service
 *
 * Connects to TypeScript Language Server (tsserver) via WebSocket
 * to provide real-time diagnostics, completions, and hover info.
 */

export interface LSPDiagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  severity: 1 | 2 | 3 | 4 // Error | Warning | Info | Hint
  source: string
  message: string
  code?: string | number
}

export interface LSPCompletionItem {
  label: string
  kind: number
  detail?: string
  documentation?: string
  insertText?: string
  sortText?: string
}

export interface LSPHover {
  contents: string
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export interface LSPLocation {
  uri: string
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

type LSPRequestHandler = (result: any) => void

class LSPClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pending = new Map<number, LSPRequestHandler>()
  private diagnosticsListener: ((uri: string, diags: LSPDiagnostic[]) => void) | null = null
  private serverCapabilities: any = null
  private initialized = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private serverUrl = 'ws://localhost:8092'

  /**
   * Connect to the TypeScript language server.
   * Falls back gracefully if tsserver is not running.
   */
  async connect(url?: string): Promise<boolean> {
    if (url) this.serverUrl = url

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          console.log('[LSP] Connected to language server')
          this.sendInitialize()
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string)
            this.handleMessage(msg)
          } catch {}
        }

        this.ws.onclose = () => {
          console.log('[LSP] Disconnected from language server')
          this.initialized = false
          this.scheduleReconnect()
        }

        this.ws.onerror = () => {
          console.warn('[LSP] Language server not available — falling back to tree-sitter diagnostics')
          resolve(false)
        }
      } catch {
        resolve(false)
      }
    })
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  private sendInitialize() {
    this.send('initialize', {
      processId: process?.pid ?? null,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          definition: { linkSupport: true },
          references: {},
          publishDiagnostics: {},
        },
      },
      rootUri: 'file:///',
    })
  }

  private send(method: string, params: any): number {
    const id = ++this.requestId
    const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params })
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg)
    }
    return id
  }

  private handleMessage(msg: any) {
    // Response to a request
    if (msg.id !== undefined && msg.result !== undefined) {
      if (msg.id === 1) {
        // Initialize response
        this.serverCapabilities = msg.result?.capabilities
        this.initialized = true
        this.send('initialized', {})
        console.log('[LSP] Initialized:', Object.keys(this.serverCapabilities || {}).join(', '))
      }
      const handler = this.pending.get(msg.id)
      if (handler) {
        this.pending.delete(msg.id)
        handler(msg.result)
      }
      return
    }

    // Notification (e.g., publishDiagnostics)
    if (msg.method === 'textDocument/publishDiagnostics' && this.diagnosticsListener) {
      this.diagnosticsListener(msg.params.uri, msg.params.diagnostics)
    }
  }

  // ── Public API ──────────────────────────────────────────────

  onDiagnostics(callback: (uri: string, diagnostics: LSPDiagnostic[]) => void) {
    this.diagnosticsListener = callback
  }

  didOpen(uri: string, languageId: string, content: string, version = 1) {
    this.send('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text: content },
    })
  }

  didChange(uri: string, content: string, version: number) {
    this.send('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text: content }],
    })
  }

  didClose(uri: string) {
    this.send('textDocument/didClose', { textDocument: { uri } })
  }

  async getDiagnostics(uri: string): Promise<LSPDiagnostic[]> {
    return new Promise((resolve) => {
      const id = this.send('textDocument/diagnostic', { textDocument: { uri } })
      this.pending.set(id, (result) => resolve(result?.items || []))
      setTimeout(() => resolve([]), 2000)
    })
  }

  async getCompletions(uri: string, line: number, character: number): Promise<LSPCompletionItem[]> {
    return new Promise((resolve) => {
      const id = this.send('textDocument/completion', {
        textDocument: { uri },
        position: { line, character },
      })
      this.pending.set(id, (result) => resolve(result?.items || []))
      setTimeout(() => resolve([]), 2000)
    })
  }

  async getHover(uri: string, line: number, character: number): Promise<LSPHover | null> {
    return new Promise((resolve) => {
      const id = this.send('textDocument/hover', {
        textDocument: { uri },
        position: { line, character },
      })
      this.pending.set(id, (result) => {
        if (!result) return resolve(null)
        const contents = typeof result.contents === 'string'
          ? result.contents
          : result.contents?.value || result.contents?.[0]?.value || ''
        resolve({ contents, range: result.range })
      })
      setTimeout(() => resolve(null), 2000)
    })
  }

  async getDefinition(uri: string, line: number, character: number): Promise<LSPLocation[]> {
    return new Promise((resolve) => {
      const id = this.send('textDocument/definition', {
        textDocument: { uri },
        position: { line, character },
      })
      this.pending.set(id, (result) => resolve(Array.isArray(result) ? result : result ? [result] : []))
      setTimeout(() => resolve([]), 2000)
    })
  }

  async getReferences(uri: string, line: number, character: number): Promise<LSPLocation[]> {
    return new Promise((resolve) => {
      const id = this.send('textDocument/references', {
        textDocument: { uri },
        position: { line, character },
        context: { includeDeclaration: true },
      })
      this.pending.set(id, (result) => resolve(result || []))
      setTimeout(() => resolve([]), 2000)
    })
  }

  isConnected(): boolean {
    return this.initialized && this.ws?.readyState === WebSocket.OPEN
  }

  dispose() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.pending.clear()
  }
}

// Singleton
export const lspClient = new LSPClient()
