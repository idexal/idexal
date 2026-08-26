import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaShieldAlt, FaBolt, FaClock, FaExclamationTriangle, FaChartLine, FaCog, FaPause, FaPlay, FaUndo, FaEye, FaCode
} from '../Icon'

interface RateLimitRule {
  id: string
  name: string
  endpoint: string
  method: string
  limit: number
  window: number
  current: number
  blocked: number
  algorithm: 'fixed' | 'sliding' | 'token-bucket' | 'leaky-bucket'
  enabled: boolean
}

interface RequestLog {
  id: string
  endpoint: string
  method: string
  status: 'allowed' | 'blocked' | 'throttled'
  timestamp: Date
  responseTime: number
  ip: string
}

const MOCK_RULES: RateLimitRule[] = [
  { id: '1', name: 'API Global', endpoint: '/api/*', method: '*', limit: 1000, window: 60, current: 845, blocked: 12, algorithm: 'sliding', enabled: true },
  { id: '2', name: 'Auth Endpoints', endpoint: '/api/auth/*', method: '*', limit: 10, window: 60, current: 7, blocked: 45, algorithm: 'fixed', enabled: true },
  { id: '3', name: 'Search API', endpoint: '/api/search', method: 'GET', limit: 100, window: 60, current: 67, blocked: 3, algorithm: 'token-bucket', enabled: true },
  { id: '4', name: 'File Upload', endpoint: '/api/upload', method: 'POST', limit: 5, window: 300, current: 2, blocked: 0, algorithm: 'leaky-bucket', enabled: true },
  { id: '5', name: 'Webhook', endpoint: '/api/webhooks', method: 'POST', limit: 100, window: 1, current: 98, blocked: 120, algorithm: 'sliding', enabled: true },
  { id: '6', name: 'GraphQL', endpoint: '/graphql', method: 'POST', limit: 500, window: 60, current: 320, blocked: 8, algorithm: 'sliding', enabled: false },
]

const MOCK_LOGS: RequestLog[] = [
  { id: '1', endpoint: '/api/users', method: 'GET', status: 'allowed', timestamp: new Date(Date.now() - 1000), responseTime: 45, ip: '192.168.1.100' },
  { id: '2', endpoint: '/api/auth/login', method: 'POST', status: 'allowed', timestamp: new Date(Date.now() - 2000), responseTime: 120, ip: '10.0.0.50' },
  { id: '3', endpoint: '/api/auth/login', method: 'POST', status: 'blocked', timestamp: new Date(Date.now() - 3000), responseTime: 0, ip: '203.0.113.42' },
  { id: '4', endpoint: '/api/search', method: 'GET', status: 'allowed', timestamp: new Date(Date.now() - 4000), responseTime: 85, ip: '192.168.1.101' },
  { id: '5', endpoint: '/api/upload', method: 'POST', status: 'throttled', timestamp: new Date(Date.now() - 5000), responseTime: 350, ip: '10.0.0.51' },
  { id: '6', endpoint: '/api/users', method: 'GET', status: 'allowed', timestamp: new Date(Date.now() - 6000), responseTime: 32, ip: '192.168.1.102' },
  { id: '7', endpoint: '/api/webhooks', method: 'POST', status: 'blocked', timestamp: new Date(Date.now() - 7000), responseTime: 0, ip: '198.51.100.23' },
  { id: '8', endpoint: '/graphql', method: 'POST', status: 'allowed', timestamp: new Date(Date.now() - 8000), responseTime: 150, ip: '192.168.1.100' },
]

function formatWindow(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${seconds / 60}m`
}

export default function RateLimiterPanel({ onClose }: { onClose: () => void }) {
  const [rules, setRules] = useState(MOCK_RULES)
  const [logs, setLogs] = useState(MOCK_LOGS)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedRule, setSelectedRule] = useState<RateLimitRule | null>(null)
  const [activeTab, setActiveTab] = useState<'rules' | 'logs' | 'stats'>('rules')

  // Simulate requests
  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      const newLog: RequestLog = {
        id: String(Date.now()),
        endpoint: ['/api/users', '/api/auth/login', '/api/search', '/graphql'][Math.floor(Math.random() * 4)],
        method: 'GET',
        status: Math.random() > 0.15 ? 'allowed' : Math.random() > 0.5 ? 'blocked' : 'throttled',
        timestamp: new Date(),
        responseTime: Math.floor(20 + Math.random() * 200),
        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      }
      setLogs(prev => [newLog, ...prev].slice(0, 50))

      // Update rule counters
      setRules(prev => prev.map(r => {
        if (!r.enabled) return r
        if (Math.random() > 0.7) {
          const delta = Math.floor(Math.random() * 5)
          return { ...r, current: Math.min(r.limit, r.current + delta), blocked: r.blocked + (Math.random() > 0.8 ? 1 : 0) }
        }
        return r
      }))
    }, 1500)
    return () => clearInterval(interval)
  }, [isPaused])

  const stats = useMemo(() => ({
    totalRequests: logs.length,
    allowed: logs.filter(l => l.status === 'allowed').length,
    blocked: logs.filter(l => l.status === 'blocked').length,
    throttled: logs.filter(l => l.status === 'throttled').length,
    avgResponse: Math.round(logs.filter(l => l.status === 'allowed').reduce((s, l) => s + l.responseTime, 0) / Math.max(logs.filter(l => l.status === 'allowed').length, 1)),
    blockRate: logs.length > 0 ? ((logs.filter(l => l.status === 'blocked').length / logs.length) * 100).toFixed(1) : '0',
  }), [logs])

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaShieldAlt size={16} className="text-red-400" />
          <span className="text-sm font-semibold">Rate Limiter</span>
          {isPaused ? <span className="text-xs text-yellow-400">Paused</span> : <span className="text-xs text-green-400 animate-pulse">● Active</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsPaused(!isPaused)} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
            {isPaused ? <FaPlay size={14} /> : <FaPause size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-ide-border">
        {[
          { label: 'Allowed', value: stats.allowed, color: 'text-green-400' },
          { label: 'Blocked', value: stats.blocked, color: 'text-red-400' },
          { label: 'Throttled', value: stats.throttled, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-3 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'rules' as const, label: `Rules (${rules.length})` },
          { key: 'logs' as const, label: `Logs (${logs.length})` },
          { key: 'stats' as const, label: 'Stats' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
              activeTab === tab.key
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Rules Tab */}
        {activeTab === 'rules' && rules.map(rule => (
          <div
            key={rule.id}
            onClick={() => setSelectedRule(selectedRule?.id === rule.id ? null : rule)}
            className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${
              !rule.enabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold flex-1">{rule.name}</span>
              <span className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{rule.algorithm}</span>
              <button
                onClick={e => { e.stopPropagation(); toggleRule(rule.id) }}
                className={`w-8 h-4 rounded-full transition-colors ${rule.enabled ? 'bg-green-600' : 'bg-ide-bg-secondary'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full transform transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-ide-text-secondary">
              <span className="font-mono">{rule.method} {rule.endpoint}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${rule.current / rule.limit > 0.8 ? 'bg-red-500' : rule.current / rule.limit > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (rule.current / rule.limit) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-ide-text-secondary w-24 text-right">
                {rule.current}/{rule.limit} per {formatWindow(rule.window)}
              </span>
            </div>
            {rule.blocked > 0 && (
              <div className="text-xs text-red-400 mt-0.5 flex items-center gap-0.5">
                <FaCode size={8} /> {rule.blocked} blocked in window
              </div>
            )}
          </div>
        ))}

        {/* Logs Tab */}
        {activeTab === 'logs' && logs.map(log => (
          <div key={log.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border/30 text-xs">
            <span className={`w-14 text-center ${
              log.status === 'allowed' ? 'text-green-400' : log.status === 'blocked' ? 'text-red-400' : 'text-yellow-400'
            }`}>{log.status}</span>
            <span className="w-12 text-center text-ide-text-secondary">{log.method}</span>
            <span className="flex-1 font-mono truncate">{log.endpoint}</span>
            <span className="w-12 text-right text-ide-text-secondary">{log.responseTime}ms</span>
            <span className="w-28 text-right font-mono text-ide-text-secondary">{log.ip}</span>
          </div>
        ))}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total Requests', value: stats.totalRequests, color: 'text-ide-text' },
                { label: 'Block Rate', value: `${stats.blockRate}%`, color: 'text-red-400' },
                { label: 'Avg Response', value: `${stats.avgResponse}ms`, color: 'text-green-400' },
                { label: 'Active Rules', value: rules.filter(r => r.enabled).length, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="text-xs text-ide-text-secondary">{s.label}</div>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-ide-text-secondary font-semibold">Top Blocked Endpoints</div>
            {rules.filter(r => r.blocked > 0).sort((a, b) => b.blocked - a.blocked).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono flex-1 truncate">{r.endpoint}</span>
                <div className="w-20 h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, r.blocked)}%` }} />
                </div>
                <span className="text-red-400 w-8 text-right">{r.blocked}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
