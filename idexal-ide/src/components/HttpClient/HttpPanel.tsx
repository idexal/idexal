import React, { useState, useCallback } from 'react'
import {
  FaPaperPlane, FaTimes, FaCopy, FaCheck, FaChevronDown, FaClock, FaGlobe, FaPlus, FaTrash, FaSave, FaUndo, FaCode, FaFileAlt
} from '../Icon'

interface HttpPanelProps {
  onClose: () => void
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
type ResponseTab = 'body' | 'headers' | 'timing'

interface SavedRequest {
  id: string
  name: string
  method: HttpMethod
  url: string
  headers: Record<string, string>
  body: string
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400 bg-green-500/10',
  POST: 'text-blue-400 bg-blue-500/10',
  PUT: 'text-yellow-400 bg-yellow-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
  PATCH: 'text-purple-400 bg-purple-500/10',
  HEAD: 'text-cyan-400 bg-cyan-500/10',
  OPTIONS: 'text-gray-400 bg-gray-500/10',
}

export default function HttpPanel({ onClose }: HttpPanelProps) {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [headers, setHeaders] = useState<Record<string, string>>({
    'Content-Type': 'application/json',
  })
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [responseTab, setResponseTab] = useState<ResponseTab>('body')
  const [history, setHistory] = useState<any[]>([])
  const [saved, setSaved] = useState<SavedRequest[]>([])
  const [showHeaders, setShowHeaders] = useState(true)
  const [showBody, setShowBody] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newHeaderKey, setNewHeaderKey] = useState('')
  const [newHeaderValue, setNewHeaderValue] = useState('')

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return
    setLoading(true)
    setResponse(null)

    const startTime = performance.now()

    try {
      const fetchHeaders: Record<string, string> = { ...headers }
      const fetchOptions: RequestInit = { method, headers: fetchHeaders }

      if (method !== 'GET' && method !== 'HEAD' && body) {
        fetchOptions.body = body
      }

      const res = await fetch(url, fetchOptions)
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      let responseBody: any
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        responseBody = await res.json()
      } else {
        responseBody = await res.text()
      }

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const result = {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration,
        size: JSON.stringify(responseBody).length,
        timestamp: new Date().toISOString(),
      }

      setResponse(result)
      setHistory(prev => [{
        method, url, status: res.status, duration,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20))
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Error',
        body: { error: (error as Error).message },
        headers: {},
        duration: Math.round(performance.now() - startTime),
        size: 0,
        timestamp: new Date().toISOString(),
      })
    }

    setLoading(false)
  }, [method, url, headers, body])

  const addHeader = () => {
    if (newHeaderKey.trim()) {
      setHeaders(prev => ({ ...prev, [newHeaderKey]: newHeaderValue }))
      setNewHeaderKey('')
      setNewHeaderValue('')
    }
  }

  const removeHeader = (key: string) => {
    setHeaders(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.body, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const saveRequest = () => {
    const req: SavedRequest = {
      id: Date.now().toString(),
      name: url.split('/').pop() || 'Untitled',
      method, url, headers, body,
    }
    setSaved(prev => [req, ...prev])
  }

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400 && status < 500) return 'text-orange-400'
    if (status >= 500) return 'text-red-400'
    return 'text-ide-text-muted'
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaGlobe className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">HTTP Client</span>
          {response && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getStatusColor(response.status)}`}>
              {response.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={saveRequest} className="p-1 rounded hover:bg-ide-border" title="Save">
            <FaSave className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Request URL */}
      <div className="px-4 py-3 border-b border-ide-border">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={e => setMethod(e.target.value as HttpMethod)}
            className={`px-3 py-2 rounded text-xs font-mono font-bold border border-ide-border bg-ide-surface outline-none ${METHOD_COLORS[method]}`}
          >
            {Object.keys(METHOD_COLORS).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendRequest()}
            placeholder="Enter request URL..."
            className="flex-1 px-3 py-2 bg-ide-surface border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
          />
          <button
            onClick={sendRequest}
            disabled={loading || !url.trim()}
            className="px-4 py-2 bg-ide-accent text-white rounded text-xs font-medium hover:bg-ide-accent/80 disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <FaCode className="w-3.5 h-3.5 animate-spin" /> : <FaPaperPlane className="w-3.5 h-3.5" />}
            Send
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Request Config */}
        <div className="w-1/2 flex flex-col border-r border-ide-border">
          {/* Tabs */}
          <div className="flex border-b border-ide-border">
            <button
              onClick={() => { setShowHeaders(true); setShowBody(false) }}
              className={`px-3 py-2 text-xs font-medium ${showHeaders ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'}`}
            >
              Headers ({Object.keys(headers).length})
            </button>
            <button
              onClick={() => { setShowHeaders(false); setShowBody(true) }}
              className={`px-3 py-2 text-xs font-medium ${showBody ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'}`}
            >
              Body
            </button>
          </div>

          {/* Headers */}
          {showHeaders && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <input value={key} readOnly className="flex-1 px-2 py-1 bg-ide-surface border border-ide-border rounded text-xs font-mono text-ide-text outline-none" />
                  <input value={value} readOnly className="flex-1 px-2 py-1 bg-ide-surface border border-ide-border rounded text-xs font-mono text-ide-text outline-none" />
                  <button onClick={() => removeHeader(key)} className="p-1 rounded hover:bg-ide-border">
                    <FaTrash className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newHeaderKey}
                  onChange={e => setNewHeaderKey(e.target.value)}
                  placeholder="Key"
                  className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
                />
                <input
                  value={newHeaderValue}
                  onChange={e => setNewHeaderValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addHeader()}
                  placeholder="Value"
                  className="flex-1 px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
                />
                <button onClick={addHeader} className="p-1 rounded hover:bg-ide-border">
                  <FaPlus className="w-3 h-3 text-ide-accent" />
                </button>
              </div>
            </div>
          )}

          {/* Body */}
          {showBody && (
            <div className="flex-1 overflow-y-auto p-3">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full h-full p-3 bg-ide-bg border border-ide-border rounded text-xs font-mono text-ide-text resize-none outline-none focus:border-ide-accent"
                placeholder='{\n  "key": "value"\n}'
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Right: Response */}
        <div className="w-1/2 flex flex-col">
          {/* Response tabs */}
          <div className="flex items-center border-b border-ide-border">
            <div className="flex">
              <button
                onClick={() => setResponseTab('body')}
                className={`px-3 py-2 text-xs font-medium ${responseTab === 'body' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'}`}
              >
                Body
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={`px-3 py-2 text-xs font-medium ${responseTab === 'headers' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'}`}
              >
                Headers
              </button>
              <button
                onClick={() => setResponseTab('timing')}
                className={`px-3 py-2 text-xs font-medium ${responseTab === 'timing' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'}`}
              >
                Timing
              </button>
            </div>
            {response && (
              <div className="ml-auto flex items-center gap-2 pr-3">
                <button onClick={copyResponse} className="p-1 rounded hover:bg-ide-border" title="Copy">
                  {copied ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3 text-ide-text-muted" />}
                </button>
              </div>
            )}
          </div>

          {/* Response content */}
          <div className="flex-1 overflow-y-auto p-3">
            {!response && !loading && (
              <div className="h-full flex items-center justify-center text-ide-text-muted text-xs">
                <div className="text-center">
                  <FaPaperPlane className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Send a request to see the response</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center">
                <FaCode className="w-6 h-6 text-ide-accent animate-spin" />
              </div>
            )}

            {response && responseTab === 'body' && (
              <pre className="text-xs font-mono text-ide-text whitespace-pre-wrap break-words">
                {typeof response.body === 'object' ? formatJson(response.body) : response.body}
              </pre>
            )}

            {response && responseTab === 'headers' && (
              <div className="space-y-1">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-xs font-mono">
                    <span className="text-ide-accent">{key}:</span>
                    <span className="text-ide-text">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {response && responseTab === 'timing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FaClock className="w-4 h-4 text-ide-accent" />
                  <div>
                    <div className="text-xs text-ide-text-muted">Duration</div>
                    <div className="text-sm text-ide-text font-mono">{response.duration}ms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FaFileAlt className="w-4 h-4 text-ide-accent" />
                  <div>
                    <div className="text-xs text-ide-text-muted">Size</div>
                    <div className="text-sm text-ide-text font-mono">{response.size} bytes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FaCode className="w-4 h-4 text-ide-accent" />
                  <div>
                    <div className="text-xs text-ide-text-muted">Status</div>
                    <div className={`text-sm font-mono ${getStatusColor(response.status)}`}>
                      {response.status} {response.statusText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-ide-border">
          <div className="px-3 py-1.5 text-[10px] text-ide-text-muted bg-ide-surface/30 flex items-center justify-between">
            <span>Recent Requests</span>
            <span>{history.length}</span>
          </div>
          <div className="flex overflow-x-auto gap-1 p-2">
            {history.slice(0, 8).map((h, i) => (
              <button
                key={i}
                onClick={() => { setMethod(h.method); setUrl(h.url) }}
                className="flex items-center gap-1.5 px-2 py-1 bg-ide-surface rounded border border-ide-border text-[10px] hover:border-ide-accent/50 flex-shrink-0"
              >
                <span className={`font-mono font-bold ${METHOD_COLORS[h.method as HttpMethod]?.split(' ')[0] || ''}`}>{h.method}</span>
                <span className="text-ide-text-muted truncate max-w-[100px]">{h.url.split('/').pop()}</span>
                <span className={`${getStatusColor(h.status)} font-mono`}>{h.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
