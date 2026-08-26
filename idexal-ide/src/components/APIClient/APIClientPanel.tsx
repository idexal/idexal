import React, { useState, useCallback } from 'react'
import {
  FaPaperPlane, FaTimes, FaPlus, FaTrash, FaCopy, FaCheck, FaChevronDown, FaGlobe, FaClock, FaCode, FaEye
} from '../Icon'

interface APIClientProps {
  onClose?: () => void
}

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
type ResponseView = 'body' | 'headers' | 'raw'

interface RequestConfig {
  method: HTTPMethod
  url: string
  headers: Record<string, string>
  body: string
  params: Record<string, string>
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: string
}

const METHOD_COLORS: Record<HTTPMethod, string> = {
  GET: 'text-green-400 bg-green-400/10',
  POST: 'text-yellow-400 bg-yellow-400/10',
  PUT: 'text-blue-400 bg-blue-400/10',
  PATCH: 'text-purple-400 bg-purple-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
  HEAD: 'text-gray-400 bg-gray-400/10',
  OPTIONS: 'text-cyan-400 bg-cyan-400/10',
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

export default function APIClientPanel({ onClose }: APIClientProps) {
  const [request, setRequest] = useState<RequestConfig>({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: { ...DEFAULT_HEADERS },
    body: '{\n  "title": "Hello",\n  "body": "World"\n}',
    params: {},
  })
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [responseView, setResponseView] = useState<ResponseView>('body')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<{ method: HTTPMethod; url: string; status: number; time: number }[]>([])
  const [showHeaders, setShowHeaders] = useState(true)
  const [showParams, setShowParams] = useState(false)
  const [showBody, setShowBody] = useState(true)
  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')

  const sendRequest = useCallback(async () => {
    if (!request.url.trim()) return
    setLoading(true)
    const startTime = Date.now()

    try {
      // Build URL with params
      let url = request.url
      const paramEntries = Object.entries(request.params).filter(([k]) => k.trim())
      if (paramEntries.length > 0) {
        const separator = url.includes('?') ? '&' : '?'
        url += separator + paramEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      }

      const options: RequestInit = {
        method: request.method,
        headers: request.headers,
      }

      if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body.trim()) {
        options.body = request.body
      }

      const res = await fetch(url, options)
      const endTime = Date.now()
      const body = await res.text()

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const responseData: ResponseData = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body,
        time: endTime - startTime,
        size: formatSize(body.length),
      }

      setResponse(responseData)
      setHistory(prev => [{
        method: request.method,
        url: request.url,
        status: res.status,
        time: responseData.time,
      }, ...prev].slice(0, 20))
    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: err.message || 'Request failed',
        time: Date.now() - startTime,
        size: '0 B',
      })
    } finally {
      setLoading(false)
    }
  }, [request])

  const addHeader = () => {
    if (newHeaderKey.trim()) {
      setRequest(prev => ({
        ...prev,
        headers: { ...prev.headers, [newHeaderKey.trim()]: newHeaderValue },
      }))
      setNewHeaderKey('')
      setNewHeaderValue('')
    }
  }

  const removeHeader = (key: string) => {
    setRequest(prev => {
      const { [key]: _, ...rest } = prev.headers
      return { ...prev, headers: rest }
    })
  }

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatBody = (body: string) => {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400 bg-green-400/10'
    if (status >= 300 && status < 400) return 'text-yellow-400 bg-yellow-400/10'
    if (status >= 400 && status < 500) return 'text-orange-400 bg-orange-400/10'
    if (status >= 500) return 'text-red-400 bg-red-400/10'
    return 'text-ide-text-muted bg-ide-bg'
  }

  return (
    <div className="h-full flex flex-col bg-ide-surface">
      {/* Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaGlobe className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium">API Client</span>
          {response && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-ide-border text-ide-text-muted">
            <FaTimes className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Request Builder */}
      <div className="border-b border-ide-border">
        {/* URL Bar */}
        <div className="flex items-center gap-2 p-3">
          <select
            value={request.method}
            onChange={(e) => setRequest(prev => ({ ...prev, method: e.target.value as HTTPMethod }))}
            className={`px-2 py-1.5 rounded text-xs font-bold ${METHOD_COLORS[request.method]}`}
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as HTTPMethod[]).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={request.url}
            onChange={(e) => setRequest(prev => ({ ...prev, url: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
            placeholder="Enter request URL..."
            className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-sm text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
          />
          <button
            onClick={sendRequest}
            disabled={loading || !request.url.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-ide-accent text-white rounded text-sm font-medium hover:bg-ide-accent/80 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane className="w-4 h-4" />
            )}
            Send
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ide-border">
          <button
            onClick={() => setShowParams(!showParams)}
            className={`px-3 py-2 text-xs transition-colors ${showParams ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'}`}
          >
            Params {Object.keys(request.params).length > 0 && `(${Object.keys(request.params).length})`}
          </button>
          <button
            onClick={() => setShowHeaders(!showHeaders)}
            className={`px-3 py-2 text-xs transition-colors ${showHeaders ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'}`}
          >
            Headers {Object.keys(request.headers).length > 0 && `(${Object.keys(request.headers).length})`}
          </button>
          <button
            onClick={() => setShowBody(!showBody)}
            className={`px-3 py-2 text-xs transition-colors ${showBody ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted hover:text-ide-text'}`}
          >
            Body
          </button>
        </div>

        {/* Headers */}
        {showHeaders && (
          <div className="p-3 space-y-2 max-h-48 overflow-auto">
            {Object.entries(request.headers).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="text"
                  value={key}
                  readOnly
                  className="w-1/3 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text-muted font-mono"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setRequest(prev => ({ ...prev, headers: { ...prev.headers, [key]: e.target.value } }))}
                  className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
                />
                <button onClick={() => removeHeader(key)} className="p-1 hover:bg-ide-border rounded">
                  <FaTrash className="w-3 h-3 text-ide-text-muted" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHeader()}
                placeholder="Header name"
                className="w-1/3 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
              />
              <input
                type="text"
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHeader()}
                placeholder="Header value"
                className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent"
              />
              <button onClick={addHeader} className="p-1 hover:bg-ide-border rounded text-ide-accent">
                <FaPlus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        {showBody && ['POST', 'PUT', 'PATCH'].includes(request.method) && (
          <div className="p-3">
            <textarea
              value={request.body}
              onChange={(e) => setRequest(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Request body..."
              className="w-full h-32 px-3 py-2 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono focus:outline-none focus:ring-1 focus:ring-ide-accent resize-none"
            />
          </div>
        )}
      </div>

      {/* Response */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {response ? (
          <>
            {/* Response Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getStatusColor(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-[10px] text-ide-text-muted flex items-center gap-1">
                  <FaClock className="w-3 h-3" /> {response.time}ms
                </span>
                <span className="text-[10px] text-ide-text-muted">{response.size}</span>
              </div>
              <div className="flex items-center gap-1">
                {(['body', 'headers', 'raw'] as ResponseView[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setResponseView(v)}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      responseView === v ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted hover:text-ide-text'
                    }`}
                  >
                    {v}
                  </button>
                ))}
                <button onClick={copyResponse} className="p-1 rounded hover:bg-ide-border text-ide-text-muted">
                  {copied ? <FaCheck className="w-3.5 h-3.5 text-ide-success" /> : <FaCopy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Response Body */}
            <div className="flex-1 overflow-auto p-3">
              {responseView === 'body' ? (
                <pre className="text-xs font-mono text-ide-text whitespace-pre-wrap">
                  {formatBody(response.body)}
                </pre>
              ) : responseView === 'headers' ? (
                <div className="space-y-1">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-ide-accent">{key}:</span>
                      <span className="font-mono text-ide-text">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-xs font-mono text-ide-text whitespace-pre-wrap">
                  {response.body}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ide-text-muted">
            <div className="text-center">
              <FaGlobe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div className="text-sm">Send a request to see the response</div>
            </div>
          </div>
        )}
      </div>

      {/* History Bar */}
      {history.length > 0 && (
        <div className="border-t border-ide-border px-3 py-2 max-h-24 overflow-auto">
          <div className="text-[10px] text-ide-text-muted uppercase mb-1">History</div>
          <div className="flex gap-2 overflow-x-auto">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setRequest(prev => ({ ...prev, method: h.method, url: h.url }))}
                className="flex items-center gap-1.5 px-2 py-1 bg-ide-bg border border-ide-border rounded text-[10px] hover:border-ide-accent/50 flex-shrink-0"
              >
                <span className={`font-bold ${METHOD_COLORS[h.method]?.split(' ')[0]}`}>{h.method}</span>
                <span className="text-ide-text truncate max-w-[150px]">{h.url}</span>
                <span className={`font-mono ${getStatusColor(h.status)}`}>{h.status}</span>
                <span className="text-ide-text-muted">{h.time}ms</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
