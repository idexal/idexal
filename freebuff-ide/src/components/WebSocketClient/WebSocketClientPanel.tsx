import React, { useState, useRef, useEffect } from 'react'
import {
  Wifi, WifiOff, Play, Square, Send, Trash2, Clock,
  ChevronDown, ArrowUp, ArrowDown, Circle, Copy, Check, Filter
} from 'lucide-react'

interface WSMessage {
  id: string
  direction: 'send' | 'receive'
  data: string
  timestamp: Date
  type: 'text' | 'json' | 'binary' | 'ping' | 'pong' | 'error'
}

interface WSConnection {
  url: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  protocols: string[]
  messageCount: number
  connectedAt: Date | null
}

const MOCK_MESSAGES: WSMessage[] = [
  { id: '1', direction: 'receive', data: '{"type":"welcome","message":"Connected to WebSocket server"}', timestamp: new Date(Date.now() - 60000), type: 'json' },
  { id: '2', direction: 'send', data: '{"type":"subscribe","channel":"updates"}', timestamp: new Date(Date.now() - 55000), type: 'json' },
  { id: '3', direction: 'receive', data: '{"type":"subscribed","channel":"updates","status":"ok"}', timestamp: new Date(Date.now() - 54000), type: 'json' },
  { id: '4', direction: 'receive', data: '{"type":"update","data":{"cpu":42,"memory":68,"users":1234}}', timestamp: new Date(Date.now() - 30000), type: 'json' },
  { id: '5', direction: 'send', data: '{"type":"ping"}', timestamp: new Date(Date.now() - 15000), type: 'ping' },
  { id: '6', direction: 'receive', data: '{"type":"pong","latency":12}', timestamp: new Date(Date.now() - 14900), type: 'pong' },
  { id: '7', direction: 'receive', data: '{"type":"notification","title":"New user registered","userId":"u-1234"}', timestamp: new Date(Date.now() - 5000), type: 'json' },
]

export default function WebSocketClientPanel({ onClose }: { onClose: () => void }) {
  const [connection, setConnection] = useState<WSConnection>({
    url: 'ws://localhost:8080',
    status: 'disconnected',
    protocols: [],
    messageCount: 0,
    connectedAt: null,
  })
  const [messages, setMessages] = useState<WSMessage[]>(MOCK_MESSAGES)
  const [inputUrl, setInputUrl] = useState('ws://localhost:8080')
  const [messageInput, setMessageInput] = useState('{"type":"ping"}')
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [filterDirection, setFilterDirection] = useState<'all' | 'send' | 'receive'>('all')
  const [showRaw, setShowRaw] = useState(false)
  const [messageFormat, setMessageFormat] = useState<'json' | 'text'>('json')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connect = async () => {
    setConnection(prev => ({ ...prev, status: 'connecting' }))
    await new Promise(r => setTimeout(r, 800))

    if (inputUrl.includes('error')) {
      setConnection(prev => ({ ...prev, status: 'error' }))
      return
    }

    setConnection({
      url: inputUrl,
      status: 'connected',
      protocols: [],
      messageCount: 0,
      connectedAt: new Date(),
    })

    const welcomeMsg: WSMessage = {
      id: String(Date.now()),
      direction: 'receive',
      data: JSON.stringify({ type: 'welcome', message: `Connected to ${inputUrl}` }),
      timestamp: new Date(),
      type: 'json',
    }
    setMessages(prev => [...prev, welcomeMsg])
  }

  const disconnect = () => {
    setConnection(prev => ({
      ...prev,
      status: 'disconnected',
      messageCount: 0,
      connectedAt: null,
    }))
    const disconnectMsg: WSMessage = {
      id: String(Date.now()),
      direction: 'receive',
      data: JSON.stringify({ type: 'system', message: 'Connection closed' }),
      timestamp: new Date(),
      type: 'json',
    }
    setMessages(prev => [...prev, disconnectMsg])
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || connection.status !== 'connected') return

    const msg: WSMessage = {
      id: String(Date.now()),
      direction: 'send',
      data: messageInput,
      timestamp: new Date(),
      type: messageFormat,
    }
    setMessages(prev => [...prev, msg])
    setConnection(prev => ({ ...prev, messageCount: prev.messageCount + 1 }))
    setMessageInput('')

    // Simulate response
    await new Promise(r => setTimeout(r, 100 + Math.random() * 300))
    const response: WSMessage = {
      id: String(Date.now()),
      direction: 'receive',
      data: JSON.stringify({ type: 'response', ok: true, echo: messageInput }),
      timestamp: new Date(),
      type: 'json',
    }
    setMessages(prev => [...prev, response])
    setConnection(prev => ({ ...prev, messageCount: prev.messageCount + 1 }))
  }

  const clearMessages = () => {
    setMessages([])
    setConnection(prev => ({ ...prev, messageCount: 0 }))
  }

  const copyMessage = (data: string) => {
    navigator.clipboard?.writeText(data)
  }

  const filteredMessages = messages.filter(m =>
    filterDirection === 'all' || m.direction === filterDirection
  )

  const statusColors = {
    disconnected: 'text-ide-text-secondary',
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    error: 'text-red-400',
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">WebSocket Client</span>
          <span className={`text-xs ${statusColors[connection.status]}`}>
            {connection.status === 'connected' ? '● Connected' : connection.status}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Connection */}
      <div className="px-3 py-2 border-b border-ide-border space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="ws://localhost:8080"
            className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
            disabled={connection.status === 'connected'}
          />
          {connection.status === 'connected' ? (
            <button onClick={disconnect} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center gap-1">
              <Square size={10} />
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connection.status === 'connecting'}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center gap-1"
            >
              {connection.status === 'connecting' ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <Play size={10} />
                  Connect
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
          <span>Messages: {connection.messageCount}</span>
          {connection.connectedAt && <span>Since: {connection.connectedAt.toLocaleTimeString()}</span>}
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={autoReconnect} onChange={e => setAutoReconnect(e.target.checked)} className="accent-cyan-500" />
            Auto-reconnect
          </label>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-ide-border">
        {(['all', 'send', 'receive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterDirection(f)}
            className={`px-2 py-0.5 text-xs rounded ${filterDirection === f ? 'bg-cyan-600 text-white' : 'text-ide-text-secondary hover:text-ide-text'}`}
          >
            {f === 'all' ? 'All' : f === 'send' ? '↑ Sent' : '↓ Received'}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={clearMessages} className="text-xs text-ide-text-secondary hover:text-red-400">Clear</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-secondary text-xs">
            No messages yet
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`px-3 py-1.5 border-b border-ide-border/30 ${
                msg.direction === 'send' ? 'bg-blue-500/5' : 'bg-green-500/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {msg.direction === 'send' ? (
                  <ArrowUp size={10} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <ArrowDown size={10} className="text-green-400 flex-shrink-0" />
                )}
                <span className={`text-xs font-semibold ${msg.direction === 'send' ? 'text-blue-400' : 'text-green-400'}`}>
                  {msg.direction === 'send' ? 'Sent' : 'Received'}
                </span>
                <span className="text-xs text-ide-text-secondary">{msg.timestamp.toLocaleTimeString()}</span>
                <div className="flex-1" />
                <button onClick={() => copyMessage(msg.data)} className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
                  <Copy size={10} />
                </button>
              </div>
              <pre className="text-xs font-mono mt-1 text-ide-text whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {showRaw ? msg.data : (
                  (() => {
                    try {
                      return JSON.stringify(JSON.parse(msg.data), null, 2)
                    } catch {
                      return msg.data
                    }
                  })()
                )}
              </pre>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-ide-border">
        <div className="flex items-center gap-1 px-2 py-1">
          <select
            value={messageFormat}
            onChange={e => setMessageFormat(e.target.value as 'json' | 'text')}
            className="bg-ide-bg-secondary border border-ide-border rounded px-1.5 py-0.5 text-xs"
          >
            <option value="json">JSON</option>
            <option value="text">Text</option>
          </select>
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Enter message..."
            className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
            disabled={connection.status !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={connection.status !== 'connected' || !messageInput.trim()}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
          >
            <Send size={10} />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pb-1">
          <label className="flex items-center gap-1 text-xs text-ide-text-secondary">
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)} className="accent-cyan-500" />
            Raw mode
          </label>
        </div>
      </div>
    </div>
  )
}
