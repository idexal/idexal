/**
 * MCPClientPanel — Connect to external MCP servers, browse tools/resources,
 * and call tools directly from the IDE.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  FaPlug, FaPlus, FaTrash, FaSync, FaPlay, FaCheck, FaTimes,
  FaServer, FaTools, FaDatabase, FaBolt, FaCopy, FaChevronDown,
  FaChevronRight, FaCode, FaFileAlt, FaExclamationTriangle, FaLink,
} from '../Icon'
import {
  getServers, getServerStatuses, getAllTools, getAllResources,
  addServer, removeServer, connectServer, disconnectServer,
  callTool, onMCPChange,
  type MCPServerConfig, type MCPServerStatus, type MCPTool, type MCPResource,
} from '../../services/mcpClient'

type Tab = 'servers' | 'tools' | 'resources'

export default function MCPClientPanel({ onClose }: { onClose: () => void }) {
  const [servers, setServers] = useState<MCPServerConfig[]>([])
  const [statuses, setStatuses] = useState<MCPServerStatus[]>([])
  const [tools, setTools] = useState<MCPTool[]>([])
  const [resources, setResources] = useState<MCPResource[]>([])
  const [tab, setTab] = useState<Tab>('servers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({})
  const [toolResult, setToolResult] = useState<string>('')
  const [isCalling, setIsCalling] = useState(false)

  // New server form state
  const [formName, setFormName] = useState('')
  const [formTransport, setFormTransport] = useState<'stdio' | 'http'>('http')
  const [formUrl, setFormUrl] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formArgs, setFormArgs] = useState('')

  const refresh = useCallback(() => {
    setServers(getServers())
    setStatuses(getServerStatuses())
    setTools(getAllTools())
    setResources(getAllResources())
  }, [])

  useEffect(() => {
    refresh()
    const unsub = onMCPChange(refresh)
    return unsub
  }, [refresh])

  const handleAdd = () => {
    if (!formName.trim()) return
    addServer({
      name: formName.trim(),
      transport: formTransport,
      url: formTransport === 'http' ? formUrl.trim() : undefined,
      command: formTransport === 'stdio' ? formCommand.trim() : undefined,
      args: formTransport === 'stdio' ? formArgs.trim().split(/\s+/).filter(Boolean) : undefined,
      enabled: true,
    })
    setShowAddForm(false)
    setFormName('')
    setFormUrl('')
    setFormCommand('')
    setFormArgs('')
    refresh()
  }

  const handleConnect = async (id: string) => {
    await connectServer(id)
    refresh()
  }

  const handleCallTool = async (tool: MCPTool) => {
    setIsCalling(true)
    setToolResult('')
    try {
      const args: Record<string, any> = {}
      for (const [key, val] of Object.entries(toolArgs)) {
        if (val.trim()) {
          try { args[key] = JSON.parse(val) } catch { args[key] = val }
        }
      }
      const result = await callTool(tool.serverId, tool.name, args)
      setToolResult(JSON.stringify(result.content, null, 2))
    } catch (err: any) {
      setToolResult(`Error: ${err.message}`)
    }
    setIsCalling(false)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg text-ide-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaPlug size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">MCP Client</span>
          <span className="text-[10px] text-ide-text-dim bg-ide-surface px-1.5 py-0.5 rounded">
            {servers.length} server{servers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-surface-alt rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {(['servers', 'tools', 'resources'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center capitalize transition-colors ${
              tab === t ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-ide-text-dim hover:text-ide-text'
            }`}>
            {t} {t === 'tools' ? `(${tools.length})` : t === 'resources' ? `(${resources.length})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* ── Servers Tab ── */}
        {tab === 'servers' && (
          <div className="space-y-3">
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="w-full p-2.5 rounded-lg bg-ide-surface border border-dashed border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-1.5">
              <FaPlus size={12} /> Add MCP Server
            </button>

            {showAddForm && (
              <div className="p-3 rounded-lg bg-ide-surface border border-emerald-500/20 space-y-2.5">
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Server name" autoFocus
                  className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />

                <div className="flex gap-2">
                  {(['http', 'stdio'] as const).map(t => (
                    <button key={t} onClick={() => setFormTransport(t)}
                      className={`flex-1 py-1.5 rounded text-[10px] font-medium border transition-colors ${
                        formTransport === t
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'border-ide-border text-ide-text-dim hover:text-ide-text'
                      }`}>
                      {t === 'http' ? 'HTTP/SSE' : 'Stdio'}
                    </button>
                  ))}
                </div>

                {formTransport === 'http' ? (
                  <input value={formUrl} onChange={e => setFormUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />
                ) : (
                  <>
                    <input value={formCommand} onChange={e => setFormCommand(e.target.value)}
                      placeholder="npx -y @modelcontextprotocol/server-..."
                      className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />
                    <input value={formArgs} onChange={e => setFormArgs(e.target.value)}
                      placeholder="Args (space-separated)"
                      className="w-full px-2.5 py-1.5 bg-ide-bg border border-ide-border rounded text-xs outline-none focus:border-emerald-500/50" />
                  </>
                )}

                <div className="flex gap-2">
                  <button onClick={handleAdd} disabled={!formName.trim()}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded text-xs font-medium transition-colors">
                    Add
                  </button>
                  <button onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 border border-ide-border rounded text-xs text-ide-text-dim hover:text-ide-text transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {servers.length === 0 && !showAddForm && (
              <div className="text-center py-8">
                <FaPlug size={28} className="text-ide-text-dim/20 mx-auto mb-2" />
                <p className="text-xs text-ide-text-dim">No MCP servers configured</p>
                <p className="text-[10px] text-ide-text-dim mt-1">Add a server to use external tools</p>
              </div>
            )}

            {servers.map(server => {
              const status = statuses.find(s => s.id === server.id)
              const isConnected = status?.connected
              return (
                <div key={server.id}
                  className="p-3 rounded-lg bg-ide-surface border border-ide-border hover:border-emerald-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-ide-text-dim'}`} />
                    <span className="text-xs font-semibold text-ide-text flex-1">{server.name}</span>
                    <span className="text-[10px] text-ide-text-dim capitalize">{server.transport}</span>
                    <div className="flex items-center gap-1">
                      {isConnected ? (
                        <>
                          <span className="text-[10px] text-green-400">{status?.tools} tools</span>
                          <button onClick={() => disconnectServer(server.id)}
                            className="p-1 hover:bg-red-500/10 text-ide-text-dim hover:text-red-400 rounded transition-colors">
                            <FaTimes size={10} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleConnect(server.id)}
                          className="px-2 py-0.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] hover:bg-emerald-600/20 transition-colors">
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                  {server.error && (
                    <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                      <FaExclamationTriangle size={10} /> {server.error}
                    </div>
                  )}
                  <button onClick={() => { removeServer(server.id); refresh() }}
                    className="mt-2 text-[10px] text-ide-text-dim hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Tools Tab ── */}
        {tab === 'tools' && (
          <div className="space-y-2">
            {tools.length === 0 ? (
              <div className="text-center py-8">
                <FaTools size={28} className="text-ide-text-dim/20 mx-auto mb-2" />
                <p className="text-xs text-ide-text-dim">No tools available</p>
                <p className="text-[10px] text-ide-text-dim mt-1">Connect to an MCP server to see its tools</p>
              </div>
            ) : tools.map(tool => {
              const isExpanded = expandedTool === `${tool.serverId}:${tool.name}`
              return (
                <div key={`${tool.serverId}:${tool.name}`}
                  className="rounded-lg bg-ide-surface border border-ide-border overflow-hidden">
                  <button onClick={() => {
                    setExpandedTool(isExpanded ? null : `${tool.serverId}:${tool.name}`)
                    setToolArgs({})
                    setToolResult('')
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-alt/30 transition-colors text-left">
                    {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    <FaBolt size={12} className="text-yellow-400" />
                    <span className="text-xs font-mono font-semibold text-ide-text flex-1">{tool.name}</span>
                    <span className="text-[10px] text-ide-text-dim">{tool.serverName}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-ide-border/50 space-y-2 pt-2">
                      <p className="text-[10px] text-ide-text-dim">{tool.description}</p>
                      {Object.keys(tool.inputSchema?.properties || {}).length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-ide-text-dim font-semibold uppercase">Arguments</div>
                          {Object.entries(tool.inputSchema.properties || {}).map(([key, schema]: [string, any]) => (
                            <input key={key} value={toolArgs[key] || ''}
                              onChange={e => setToolArgs(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`${key} (${schema.type || 'string'})`}
                              className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-[10px] font-mono outline-none focus:border-emerald-500/50" />
                          ))}
                        </div>
                      )}
                      <button onClick={() => handleCallTool(tool)} disabled={isCalling}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1">
                        {isCalling ? <span className="animate-spin w-2.5 h-2.5 border border-white border-t-transparent rounded-full" /> : <FaPlay size={8} />}
                        {isCalling ? 'Calling...' : 'Call Tool'}
                      </button>
                      {toolResult && (
                        <pre className="p-2 bg-ide-bg border border-ide-border rounded text-[10px] font-mono text-ide-text-dim overflow-x-auto max-h-40 whitespace-pre-wrap">
                          {toolResult}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Resources Tab ── */}
        {tab === 'resources' && (
          <div className="space-y-2">
            {resources.length === 0 ? (
              <div className="text-center py-8">
                <FaDatabase size={28} className="text-ide-text-dim/20 mx-auto mb-2" />
                <p className="text-xs text-ide-text-dim">No resources available</p>
                <p className="text-[10px] text-ide-text-dim mt-1">Connect to an MCP server to see its resources</p>
              </div>
            ) : resources.map(res => (
              <div key={`${res.serverId}:${res.uri}`}
                className="p-3 rounded-lg bg-ide-surface border border-ide-border">
                <div className="flex items-center gap-2">
                  <FaFileAlt size={12} className="text-blue-400" />
                  <span className="text-xs font-mono text-ide-text flex-1 truncate">{res.name}</span>
                  <span className="text-[10px] text-ide-text-dim">{res.serverName}</span>
                </div>
                {res.description && (
                  <p className="text-[10px] text-ide-text-dim mt-1 ml-5">{res.description}</p>
                )}
                <div className="text-[10px] text-ide-text-dim mt-1 ml-5 font-mono truncate">{res.uri}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
