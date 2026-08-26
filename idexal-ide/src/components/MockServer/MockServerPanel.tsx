import React, { useState } from 'react'
import {
  FaServer, FaPlus, FaTrash, FaPlay, FaSquare, FaCopy, FaCheck, FaCode, FaChevronDown, FaChevronRight, FaClock, FaHashtag, FaArrowRight
} from '../Icon'

interface MockEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  statusCode: number
  responseBody: string
  delay: number
  headers: Record<string, string>
  description: string
  hitCount: number
  enabled: boolean
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-600',
  POST: 'bg-blue-600',
  PUT: 'bg-yellow-600',
  DELETE: 'bg-red-600',
  PATCH: 'bg-purple-600',
}

const MOCK_ENDPOINTS: MockEndpoint[] = [
  { id: '1', method: 'GET', path: '/api/users', statusCode: 200, responseBody: '[\n  {"id": 1, "name": "Alice", "email": "alice@example.com"},\n  {"id": 2, "name": "Bob", "email": "bob@example.com"}\n]', delay: 100, headers: { 'Content-Type': 'application/json' }, description: 'Get all users', hitCount: 42, enabled: true },
  { id: '2', method: 'GET', path: '/api/users/:id', statusCode: 200, responseBody: '{"id": 1, "name": "Alice", "email": "alice@example.com"}', delay: 50, headers: { 'Content-Type': 'application/json' }, description: 'Get user by ID', hitCount: 28, enabled: true },
  { id: '3', method: 'POST', path: '/api/users', statusCode: 201, responseBody: '{"id": 3, "message": "User created"}', delay: 200, headers: { 'Content-Type': 'application/json' }, description: 'Create new user', hitCount: 15, enabled: true },
  { id: '4', method: 'PUT', path: '/api/users/:id', statusCode: 200, responseBody: '{"message": "User updated"}', delay: 100, headers: { 'Content-Type': 'application/json' }, description: 'Update user', hitCount: 8, enabled: true },
  { id: '5', method: 'DELETE', path: '/api/users/:id', statusCode: 204, responseBody: '', delay: 50, headers: {}, description: 'Delete user', hitCount: 3, enabled: true },
  { id: '6', method: 'GET', path: '/api/posts', statusCode: 200, responseBody: '[\n  {"id": 1, "title": "Hello World", "author": "Alice"}\n]', delay: 150, headers: { 'Content-Type': 'application/json' }, description: 'Get all posts', hitCount: 35, enabled: true },
  { id: '7', method: 'GET', path: '/api/health', statusCode: 200, responseBody: '{"status": "ok", "uptime": 86400}', delay: 10, headers: { 'Content-Type': 'application/json' }, description: 'Health check', hitCount: 156, enabled: true },
  { id: '8', method: 'POST', path: '/api/auth/login', statusCode: 200, responseBody: '{"token": "eyJhbGciOiJIUzI1NiJ9.mock", "user": {"id": 1, "name": "Alice"}}', delay: 300, headers: { 'Content-Type': 'application/json' }, description: 'Login endpoint', hitCount: 22, enabled: true },
]

export default function MockServerPanel({ onClose }: { onClose: () => void }) {
  const [endpoints, setEndpoints] = useState(MOCK_ENDPOINTS)
  const [isRunning, setIsRunning] = useState(false)
  const [port, setPort] = useState(3001)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEndpoint, setNewEndpoint] = useState<Partial<MockEndpoint>>({
    method: 'GET',
    path: '/api/',
    statusCode: 200,
    responseBody: '{}',
    delay: 0,
    description: '',
    enabled: true,
  })
  const [copied, setCopied] = useState(false)

  const toggleServer = () => setIsRunning(!isRunning)

  const toggleEndpoint = (id: string) => {
    setEndpoints(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e))
  }

  const deleteEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(e => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const addEndpoint = () => {
    const ep: MockEndpoint = {
      id: String(Date.now()),
      method: newEndpoint.method || 'GET',
      path: newEndpoint.path || '/api/',
      statusCode: newEndpoint.statusCode || 200,
      responseBody: newEndpoint.responseBody || '{}',
      delay: newEndpoint.delay || 0,
      headers: { 'Content-Type': 'application/json' },
      description: newEndpoint.description || '',
      hitCount: 0,
      enabled: true,
    }
    setEndpoints(prev => [...prev, ep])
    setShowAddForm(false)
    setNewEndpoint({ method: 'GET', path: '/api/', statusCode: 200, responseBody: '{}', delay: 0, description: '', enabled: true })
  }

  const copyEndpoint = (ep: MockEndpoint) => {
    const text = `${ep.method} http://localhost:${port}${ep.path}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const totalHits = endpoints.reduce((s, e) => s + e.hitCount, 0)
  const enabledCount = endpoints.filter(e => e.enabled).length

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaServer size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold">Mock Server</span>
          {isRunning && <span className="text-xs text-green-400">● Running</span>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Server Controls */}
      <div className="px-3 py-2 border-b border-ide-border space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleServer}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs ${
              isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
            } text-white`}
          >
            {isRunning ? <FaSquare size={10} /> : <FaPlay size={10} />}
            {isRunning ? 'Stop Server' : 'Start Server'}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-ide-text-secondary">Port:</span>
            <input
              type="number"
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              className="w-16 bg-ide-bg-secondary border border-ide-border rounded px-2 py-0.5 text-xs font-mono outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
          <span>{enabledCount}/{endpoints.length} endpoints</span>
          <span>{totalHits} total hits</span>
          {isRunning && <span className="text-green-400">http://localhost:{port}</span>}
        </div>
      </div>

      {/* Endpoint List */}
      <div className="flex-1 overflow-y-auto">
        {endpoints.map(ep => (
          <div key={ep.id} className="border-b border-ide-border/30">
            <div
              className={`flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/30 cursor-pointer ${
                !ep.enabled ? 'opacity-50' : ''
              }`}
              onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
            >
              {expandedId === ep.id ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              <span className={`px-2 py-0.5 text-xs text-white rounded ${METHOD_COLORS[ep.method]}`}>
                {ep.method}
              </span>
              <span className="text-xs font-mono flex-1 truncate">{ep.path}</span>
              <span className="text-xs text-ide-text-secondary">{ep.statusCode}</span>
              <span className="text-xs text-ide-text-secondary flex items-center gap-0.5">
                <FaHashtag size={8} />
                {ep.hitCount}
              </span>
              <button
                onClick={e => { e.stopPropagation(); toggleEndpoint(ep.id) }}
                className={`w-8 h-4 rounded-full transition-colors ${ep.enabled ? 'bg-green-600' : 'bg-ide-bg-secondary'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transform transition-transform ${ep.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {expandedId === ep.id && (
              <div className="px-4 py-2 bg-ide-bg-secondary/20 space-y-2">
                <div className="text-xs text-ide-text-secondary">{ep.description}</div>
                <div className="text-xs">
                  <span className="text-ide-text-secondary">Response:</span>
                  <pre className="mt-1 bg-ide-bg border border-ide-border rounded p-2 text-xs font-mono overflow-x-auto max-h-32">
                    {ep.responseBody}
                  </pre>
                </div>
                <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
                  <span>Delay: {ep.delay}ms</span>
                  <span>Status: {ep.statusCode}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyEndpoint(ep)} className="px-2 py-0.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary hover:text-ide-text flex items-center gap-1">
                    {copied ? <FaCheck size={8} className="text-green-400" /> : <FaCopy size={8} />}
                    Copy URL
                  </button>
                  <button onClick={() => deleteEndpoint(ep.id)} className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30 flex items-center gap-1">
                    <FaTrash size={8} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <div className="border-t border-ide-border p-2">
        {showAddForm ? (
          <div className="space-y-2">
            <div className="flex gap-1">
              <select
                value={newEndpoint.method}
                onChange={e => setNewEndpoint(p => ({ ...p, method: e.target.value as MockEndpoint['method'] }))}
                className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
              >
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
              </select>
              <input
                type="text"
                value={newEndpoint.path}
                onChange={e => setNewEndpoint(p => ({ ...p, path: e.target.value }))}
                placeholder="/api/resource"
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
              />
            </div>
            <input
              type="text"
              value={newEndpoint.description}
              onChange={e => setNewEndpoint(p => ({ ...p, description: e.target.value }))}
              placeholder="Description..."
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs outline-none"
            />
            <div className="flex gap-1">
              <button onClick={addEndpoint} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs">Add</button>
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 rounded text-xs hover:bg-indigo-600/30"
          >
            <FaPlus size={12} />
            Add Endpoint
          </button>
        )}
      </div>
    </div>
  )
}
