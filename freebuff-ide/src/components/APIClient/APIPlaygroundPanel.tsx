import React, { useState, useMemo } from 'react'
import {
  Globe, Search, Plus, Copy, Check, Send, Clock, Save,
  ChevronDown, ChevronRight, Trash2, Download, Upload,
  FileText, Code, Eye, EyeOff, Lock, Unlock, Zap
} from 'lucide-react'

interface APIRequest {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  url: string
  headers: Record<string, string>
  body?: string
  params?: Record<string, string>
}

interface APIResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
}

interface Environment {
  name: string
  variables: Record<string, string>
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400',
  POST: 'bg-yellow-500/20 text-yellow-400',
  PUT: 'bg-blue-500/20 text-blue-400',
  PATCH: 'bg-purple-500/20 text-purple-400',
  DELETE: 'bg-red-500/20 text-red-400',
  HEAD: 'bg-gray-500/20 text-gray-400',
  OPTIONS: 'bg-gray-500/20 text-gray-400',
}

const MOCK_REQUESTS: APIRequest[] = [
  { id: 'r1', name: 'Get Users', method: 'GET', url: '{{baseUrl}}/api/users', headers: { 'Authorization': 'Bearer {{token}}' } },
  { id: 'r2', name: 'Create User', method: 'POST', url: '{{baseUrl}}/api/users', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{token}}' }, body: JSON.stringify({ name: 'Ahmed', email: 'ahmed@example.com', role: 'admin' }, null, 2) },
  { id: 'r3', name: 'Update User', method: 'PUT', url: '{{baseUrl}}/api/users/1', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{token}}' }, body: JSON.stringify({ name: 'Ahmed Updated' }, null, 2) },
  { id: 'r4', name: 'Delete User', method: 'DELETE', url: '{{baseUrl}}/api/users/1', headers: { 'Authorization': 'Bearer {{token}}' } },
  { id: 'r5', name: 'Get Posts', method: 'GET', url: '{{baseUrl}}/api/posts?page=1&limit=10', headers: { 'Authorization': 'Bearer {{token}}' } },
]

const MOCK_ENVIRONMENTS: Environment[] = [
  { name: 'Development', variables: { baseUrl: 'http://localhost:3000', token: 'dev-token-123', apiKey: 'dev-key-456' } },
  { name: 'Staging', variables: { baseUrl: 'https://staging.idexal.dev', token: 'staging-token-789', apiKey: 'staging-key-012' } },
  { name: 'Production', variables: { baseUrl: 'https://api.idexal.dev', token: 'prod-token-345', apiKey: 'prod-key-678' } },
]

const MOCK_RESPONSE: APIResponse = {
  status: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req_123456', 'X-RateLimit-Remaining': '99' },
  body: JSON.stringify({
    success: true,
    data: [
      { id: 1, name: 'Ahmed Hassan', email: 'ahmed@example.com', role: 'admin', createdAt: '2024-01-15T10:30:00Z' },
      { id: 2, name: 'Sara Khan', email: 'sara@example.com', role: 'user', createdAt: '2024-02-20T14:45:00Z' },
      { id: 3, name: 'Omar Ali', email: 'omar@example.com', role: 'moderator', createdAt: '2024-03-10T09:15:00Z' },
    ],
    pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
  }, null, 2),
  time: 145,
  size: 512,
}

export default function APIPlaygroundPanel({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState(MOCK_REQUESTS)
  const [selectedRequest, setSelectedRequest] = useState(MOCK_REQUESTS[0])
  const [environments, setEnvironments] = useState(MOCK_ENVIRONMENTS)
  const [activeEnv, setActiveEnv] = useState(MOCK_ENVIRONMENTS[0])
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('headers')
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'timing'>('body')
  const [response, setResponse] = useState<APIResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ request: APIRequest; response: APIResponse; time: Date }>>([])
  const [copied, setCopied] = useState(false)
  const [showEnv, setShowEnv] = useState(false)

  const resolveVariables = (text: string) => {
    let resolved = text
    Object.entries(activeEnv.variables).forEach(([key, value]) => {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
    return resolved
  }

  const handleSend = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))
    setResponse(MOCK_RESPONSE)
    setHistory(prev => [{ request: selectedRequest, response: MOCK_RESPONSE, time: new Date() }, ...prev].slice(0, 20))
    setIsLoading(false)
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard?.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">API Playground</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEnv(!showEnv)}
            className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${
              showEnv ? 'bg-blue-500/20 text-blue-400' : 'bg-ide-bg-secondary text-ide-text-secondary'
            }`}
          >
            <Lock size={8} /> {activeEnv.name}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Environment Variables */}
      {showEnv && (
        <div className="px-3 py-2 border-b border-ide-border bg-ide-bg-secondary/20">
          <div className="text-[10px] text-ide-text-secondary mb-1">Environment Variables</div>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(activeEnv.variables).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1 text-[10px]">
                <span className="text-ide-text-secondary">{key}:</span>
                <span className="font-mono text-ide-text truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Builder */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <select
            value={selectedRequest.method}
            onChange={e => setSelectedRequest(prev => ({ ...prev, method: e.target.value as any }))}
            className={`px-2 py-1.5 rounded text-xs font-bold ${METHOD_COLORS[selectedRequest.method]}`}
          >
            {Object.keys(METHOD_COLORS).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            value={resolveVariables(selectedRequest.url)}
            onChange={e => setSelectedRequest(prev => ({ ...prev, url: e.target.value }))}
            className="flex-1 bg-ide-bg-secondary/30 text-xs px-2 py-1.5 rounded border border-ide-border font-mono text-ide-text"
            placeholder="https://api.example.com/endpoint"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
          >
            {isLoading ? <Zap size={10} className="animate-spin" /> : <Send size={10} />}
            Send
          </button>
        </div>
      </div>

      {/* Request Tabs */}
      <div className="flex border-b border-ide-border">
        {(['params', 'headers', 'body', 'auth'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 text-[10px] border-b-2 text-center capitalize ${
              activeTab === tab ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Request Content */}
      <div className="h-[120px] border-b border-ide-border overflow-y-auto">
        {activeTab === 'headers' && (
          <div className="p-2 space-y-1">
            {Object.entries(selectedRequest.headers).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-[10px]">
                <input
                  value={key}
                  className="w-32 bg-ide-bg-secondary/30 px-2 py-1 rounded border border-ide-border font-mono text-ide-text"
                  readOnly
                />
                <input
                  value={resolveVariables(value)}
                  className="flex-1 bg-ide-bg-secondary/30 px-2 py-1 rounded border border-ide-border font-mono text-ide-text"
                  readOnly
                />
              </div>
            ))}
          </div>
        )}
        {activeTab === 'body' && (
          <textarea
            value={selectedRequest.body || ''}
            onChange={e => setSelectedRequest(prev => ({ ...prev, body: e.target.value }))}
            className="w-full h-full bg-transparent text-[11px] font-mono p-2 outline-none text-ide-text resize-none"
            placeholder="Request body (JSON)"
          />
        )}
        {activeTab === 'params' && (
          <div className="p-2 text-[10px] text-ide-text-secondary">
            No query parameters defined
          </div>
        )}
        {activeTab === 'auth' && (
          <div className="p-2 text-[10px] text-ide-text-secondary">
            Bearer Token: {resolveVariables('{{token}}')}
          </div>
        )}
      </div>

      {/* Response */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 border-b border-ide-border bg-ide-bg-secondary/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ide-text-secondary">Response</span>
            {response && (
              <>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                  response.status < 300 ? 'bg-green-500/20 text-green-400' :
                  response.status < 400 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-[9px] text-ide-text-secondary">{response.time}ms</span>
                <span className="text-[9px] text-ide-text-secondary">{response.size}B</span>
              </>
            )}
          </div>
          {response && (
            <button
              onClick={copyResponse}
              className="text-[10px] text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"
            >
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>

        <div className="flex border-b border-ide-border">
          {(['body', 'headers', 'timing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setResponseTab(tab)}
              className={`flex-1 px-3 py-1 text-[10px] border-b-2 text-center capitalize ${
                responseTab === tab ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {response ? (
            responseTab === 'body' && (
              <pre className="p-2 text-[11px] font-mono text-ide-text overflow-auto whitespace-pre-wrap">
                {response.body}
              </pre>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ide-text-secondary">
              <Send size={32} className="mb-2 opacity-20" />
              <span className="text-xs">Send a request to see the response</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
