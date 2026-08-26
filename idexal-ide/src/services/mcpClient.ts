/**
 * MCP Client — Connects to external Model Context Protocol servers.
 * Allows the IDE to use tools from external servers (databases, APIs, etc.).
 *
 * Supports:
 *  - stdio transport (spawn server process)
 *  - HTTP/SSE transport (connect to remote server)
 *  - Tool listing, calling, and result handling
 *  - Resource listing and reading
 *  - Prompt listing and getting
 */

// ── Types ──────────────────────────────────────────────

export interface MCPServerConfig {
  id: string
  name: string
  transport: 'stdio' | 'http' | 'sse'
  command?: string        // for stdio: the executable path
  args?: string[]         // for stdio: arguments
  url?: string            // for http/sse: server URL
  env?: Record<string, string> // for stdio: environment variables
  enabled: boolean
  lastConnected?: number
  error?: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  serverId: string
  serverName: string
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  serverId: string
  serverName: string
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: { name: string; description?: string; required?: boolean }[]
  serverId: string
  serverName: string
}

export interface MCPToolResult {
  content: Array<{ type: string; text?: string; data?: string }>
  isError?: boolean
}

export interface MCPServerStatus {
  id: string
  name: string
  connected: boolean
  tools: number
  resources: number
  prompts: number
  lastError?: string
}

// ── State ──────────────────────────────────────────────

const STORAGE_KEY = 'idexal-mcp-servers'
let servers: MCPServerConfig[] = []
let connectedServers = new Map<string, any>() // serverId -> connection
let allTools: MCPTool[] = []
let allResources: MCPResource[] = []
let allPrompts: MCPPrompt[] = []
const listeners = new Set<() => void>()

// ── Persistence ────────────────────────────────────────

function loadServers(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) servers = JSON.parse(saved)
  } catch {}
}

function saveServers(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
}

function emit() {
  listeners.forEach(fn => fn())
}

// ── Public API ─────────────────────────────────────────

export function onMCPChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getServers(): MCPServerConfig[] {
  return [...servers]
}

export function getServerStatuses(): MCPServerStatus[] {
  return servers.map(s => ({
    id: s.id,
    name: s.name,
    connected: connectedServers.has(s.id),
    tools: allTools.filter(t => t.serverId === s.id).length,
    resources: allResources.filter(r => r.serverId === s.id).length,
    prompts: allPrompts.filter(p => p.serverId === s.id).length,
    lastError: s.error,
  }))
}

export function getAllTools(): MCPTool[] {
  return [...allTools]
}

export function getAllResources(): MCPResource[] {
  return [...allResources]
}

export function getAllPrompts(): MCPPrompt[] {
  return [...allPrompts]
}

/**
 * Add a new MCP server configuration.
 */
export function addServer(config: Omit<MCPServerConfig, 'id'>): MCPServerConfig {
  loadServers()
  const server: MCPServerConfig = {
    ...config,
    id: `mcp-${Date.now().toString(36)}`,
  }
  servers.push(server)
  saveServers()
  emit()
  return server
}

/**
 * Remove an MCP server.
 */
export function removeServer(id: string): void {
  loadServers()
  disconnectServer(id)
  servers = servers.filter(s => s.id !== id)
  saveServers()
  refreshAll()
  emit()
}

/**
 * Update an MCP server configuration.
 */
export function updateServer(id: string, updates: Partial<MCPServerConfig>): void {
  loadServers()
  servers = servers.map(s => s.id === id ? { ...s, ...updates } : s)
  saveServers()
  emit()
}

/**
 * Connect to an MCP server.
 */
export async function connectServer(id: string): Promise<boolean> {
  loadServers()
  const config = servers.find(s => s.id === id)
  if (!config) return false

  try {
    if (config.transport === 'stdio' && config.command) {
      // stdio transport — spawn process via Electron IPC
      const result = await (window as any).electronAPI?.mcpConnect?.({
        id: config.id,
        command: config.command,
        args: config.args || [],
        env: config.env || {},
      })

      if (result?.success) {
        connectedServers.set(id, result.connection)
        updateServer(id, { lastConnected: Date.now(), error: undefined })
        await refreshServerTools(id)
        emit()
        return true
      } else {
        updateServer(id, { error: result?.error || 'Connection failed' })
        emit()
        return false
      }
    } else if (config.transport === 'http' && config.url) {
      // HTTP transport — direct fetch
      const response = await fetch(`${config.url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'Idexal IDE', version: '1.0.0' },
        }}),
      })

      if (response.ok) {
        connectedServers.set(id, { url: config.url })
        updateServer(id, { lastConnected: Date.now(), error: undefined })
        await refreshServerTools(id)
        emit()
        return true
      }
    }

    updateServer(id, { error: 'Unsupported transport or missing config' })
    emit()
    return false
  } catch (err: any) {
    updateServer(id, { error: err.message || 'Connection failed' })
    emit()
    return false
  }
}

/**
 * Disconnect from an MCP server.
 */
export function disconnectServer(id: string): void {
  const conn = connectedServers.get(id)
  if (conn?.process) {
    try { conn.process.kill() } catch {}
  }
  connectedServers.delete(id)
  // Remove tools/resources/prompts from this server
  allTools = allTools.filter(t => t.serverId !== id)
  allResources = allResources.filter(r => r.serverId !== id)
  allPrompts = allPrompts.filter(p => p.serverId !== id)
  emit()
}

/**
 * Call an MCP tool.
 */
export async function callTool(
  serverId: string,
  toolName: string,
  args: Record<string, any>,
): Promise<MCPToolResult> {
  const conn = connectedServers.get(serverId)
  if (!conn) {
    return { content: [{ type: 'text', text: 'Server not connected' }], isError: true }
  }

  try {
    if (conn.url) {
      // HTTP transport
      const response = await fetch(`${conn.url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name: toolName, arguments: args },
        }),
      })
      const result = await response.json()
      return result.result || { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }

    // stdio transport — send via Electron IPC
    const result = await (window as any).electronAPI?.mcpCallTool?.({
      serverId,
      toolName,
      args,
    })
    return result || { content: [{ type: 'text', text: 'No response' }] }
  } catch (err: any) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
  }
}

/**
 * Read an MCP resource.
 */
export async function readResource(
  serverId: string,
  uri: string,
): Promise<{ contents: Array<{ uri: string; text?: string; mimeType?: string }> }> {
  const conn = connectedServers.get(serverId)
  if (!conn) return { contents: [] }

  try {
    if (conn.url) {
      const response = await fetch(`${conn.url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'resources/read',
          params: { uri },
        }),
      })
      const result = await response.json()
      return result.result || { contents: [] }
    }

    const result = await (window as any).electronAPI?.mcpReadResource?.({ serverId, uri })
    return result || { contents: [] }
  } catch {
    return { contents: [] }
  }
}

/**
 * Refresh tools/resources/prompts for a specific server.
 */
async function refreshServerTools(serverId: string): Promise<void> {
  const conn = connectedServers.get(serverId)
  if (!conn) return

  const server = servers.find(s => s.id === serverId)
  const serverName = server?.name || 'Unknown'

  try {
    let tools: MCPTool[] = []
    let resources: MCPResource[] = []
    let prompts: MCPPrompt[] = []

    if (conn.url) {
      // HTTP — list tools
      const toolsResp = await fetch(`${conn.url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: {} }),
      })
      const toolsResult = await toolsResp.json()
      tools = (toolsResult.result?.tools || []).map((t: any) => ({
        ...t,
        serverId,
        serverName,
      }))

      // List resources
      const resResp = await fetch(`${conn.url}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'resources/list', params: {} }),
      })
      const resResult = await resResp.json()
      resources = (resResult.result?.resources || []).map((r: any) => ({
        ...r,
        serverId,
        serverName,
      }))
    } else {
      // stdio — use Electron IPC
      const result = await (window as any).electronAPI?.mcpListTools?.({ serverId })
      tools = (result?.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema || {},
        serverId,
        serverName,
      }))

      const resResult = await (window as any).electronAPI?.mcpListResources?.({ serverId })
      resources = (resResult?.resources || []).map((r: any) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        serverId,
        serverName,
      }))
    }

    // Remove old entries from this server and add new ones
    allTools = [...allTools.filter(t => t.serverId !== serverId), ...tools]
    allResources = [...allResources.filter(r => r.serverId !== serverId), ...resources]
    allPrompts = [...allPrompts.filter(p => p.serverId !== serverId), ...prompts]
  } catch {
    // Silent fail — server may not support all methods
  }
}

/**
 * Refresh all connected servers.
 */
export async function refreshAll(): Promise<void> {
  for (const [id] of connectedServers) {
    await refreshServerTools(id)
  }
  emit()
}

// ── Initialize ─────────────────────────────────────────
loadServers()
