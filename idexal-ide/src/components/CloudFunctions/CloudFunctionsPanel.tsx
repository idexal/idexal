import React, { useState } from 'react'
import {
  FaBolt, FaPlay, FaPause, FaTrash, FaClock, FaCheckCircle, FaTimesCircle, FaSync, FaChevronDown, FaChevronRight, FaCopy, FaCheck, FaExternalLinkAlt, FaTerminal, FaCode, FaCog, FaChartLine, FaGlobe
} from '../Icon'

interface CloudFunction {
  id: string
  name: string
  runtime: string
  status: 'active' | 'inactive' | 'error' | 'deploying'
  invocations: number
  avgDuration: number
  errorRate: number
  memory: string
  timeout: string
  lastDeployed: Date
  region: string
  envVars: Record<string, string>
}

const MOCK_FUNCTIONS: CloudFunction[] = [
  { id: 'f1', name: 'api-handler', runtime: 'Node.js 20', status: 'active', invocations: 125000, avgDuration: 45, errorRate: 0.02, memory: '256MB', timeout: '30s', lastDeployed: new Date(Date.now() - 3600000), region: 'us-east-1', envVars: { NODE_ENV: 'production', DB_URL: '***' } },
  { id: 'f2', name: 'auth-middleware', runtime: 'Node.js 20', status: 'active', invocations: 89000, avgDuration: 12, errorRate: 0.01, memory: '128MB', timeout: '10s', lastDeployed: new Date(Date.now() - 86400000), region: 'us-east-1', envVars: { JWT_SECRET: '***' } },
  { id: 'f3', name: 'image-resizer', runtime: 'Node.js 20', status: 'active', invocations: 34000, avgDuration: 180, errorRate: 0.05, memory: '512MB', timeout: '60s', lastDeployed: new Date(Date.now() - 172800000), region: 'us-west-2', envVars: { S3_BUCKET: 'images-prod' } },
  { id: 'f4', name: 'email-sender', runtime: 'Python 3.12', status: 'inactive', invocations: 5600, avgDuration: 320, errorRate: 0.08, memory: '256MB', timeout: '30s', lastDeployed: new Date(Date.now() - 604800000), region: 'eu-west-1', envVars: { SMTP_HOST: '***', SMTP_PASS: '***' } },
  { id: 'f5', name: 'cron-scheduler', runtime: 'Node.js 20', status: 'active', invocations: 8760, avgDuration: 25, errorRate: 0.005, memory: '128MB', timeout: '60s', lastDeployed: new Date(Date.now() - 259200000), region: 'us-east-1', envVars: {} },
  { id: 'f6', name: 'webhook-relay', runtime: 'Go 1.21', status: 'error', invocations: 22000, avgDuration: 8, errorRate: 0.15, memory: '128MB', timeout: '5s', lastDeployed: new Date(Date.now() - 432000000), region: 'us-east-1', envVars: { RELAY_URL: '***' } },
]

const STATUS_CONFIG = {
  active: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Active' },
  inactive: { color: 'text-ide-text-secondary', bg: 'bg-ide-bg-secondary', label: 'Inactive' },
  error: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Error' },
  deploying: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Deploying' },
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function CloudFunctionsPanel({ onClose }: { onClose: () => void }) {
  const [functions, setFunctions] = useState(MOCK_FUNCTIONS)
  const [selectedFn, setSelectedFn] = useState<CloudFunction | null>(null)
  const [expandedFn, setExpandedFn] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'invocations' | 'duration' | 'errors'>('invocations')

  const sorted = [...functions].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'invocations') return b.invocations - a.invocations
    if (sortBy === 'duration') return b.avgDuration - a.avgDuration
    return b.errorRate - a.errorRate
  })

  const totalInvocations = functions.reduce((s, f) => s + f.invocations, 0)
  const avgErrorRate = (functions.reduce((s, f) => s + f.errorRate, 0) / functions.length * 100).toFixed(2)

  const toggleFunction = (id: string) => {
    setFunctions(prev => prev.map(f => f.id === id ? { ...f, status: f.status === 'active' ? 'inactive' : 'active' } : f))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBolt size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold">Cloud Functions</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-ide-border">
        {[
          { label: 'Functions', value: functions.length, color: 'text-yellow-400' },
          { label: 'Invocations', value: formatNumber(totalInvocations), color: 'text-blue-400' },
          { label: 'Error Rate', value: `${avgErrorRate}%`, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-3 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div className="px-3 py-1.5 border-b border-ide-border flex items-center gap-2">
        <span className="text-xs text-ide-text-secondary">Sort:</span>
        {(['invocations', 'duration', 'errors', 'name'] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)} className={`px-2 py-0.5 text-xs rounded ${sortBy === s ? 'bg-yellow-600 text-white' : 'text-ide-text-secondary'}`}>
            {s === 'invocations' ? 'Usage' : s === 'duration' ? 'Duration' : s === 'errors' ? 'Errors' : 'Name'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map(fn => {
          const config = STATUS_CONFIG[fn.status]
          return (
            <div key={fn.id}>
              <div onClick={() => setExpandedFn(expandedFn === fn.id ? null : fn.id)} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  {expandedFn === fn.id ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  <FaBolt size={12} className={config.color} />
                  <span className="text-xs font-semibold flex-1">{fn.name}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bg} ${config.color}`}>{config.label}</span>
                  <button onClick={e => { e.stopPropagation(); toggleFunction(fn.id) }} className={`w-7 h-3.5 rounded-full transition-colors ${fn.status === 'active' ? 'bg-green-600' : 'bg-ide-bg-secondary'}`}>
                    <div className={`w-2.5 h-2.5 bg-white rounded-full transform transition-transform ${fn.status === 'active' ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                  <span>{fn.runtime}</span>
                  <span>{fn.region}</span>
                  <span>{formatNumber(fn.invocations)} invocations</span>
                  <span>{fn.avgDuration}ms avg</span>
                  <span className={fn.errorRate > 0.1 ? 'text-red-400' : ''}>{(fn.errorRate * 100).toFixed(1)}% errors</span>
                </div>
                {expandedFn === fn.id && (
                  <div className="mt-2 ml-5 space-y-2 bg-ide-bg-secondary/20 rounded p-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-ide-text-secondary">Memory:</span> {fn.memory}</div>
                      <div><span className="text-ide-text-secondary">Timeout:</span> {fn.timeout}</div>
                      <div><span className="text-ide-text-secondary">Deployed:</span> {timeAgo(fn.lastDeployed)}</div>
                      <div><span className="text-ide-text-secondary">Region:</span> {fn.region}</div>
                    </div>
                    {Object.keys(fn.envVars).length > 0 && (
                      <div className="text-xs">
                        <span className="text-ide-text-secondary">Environment:</span>
                        <div className="mt-0.5 space-y-0.5">
                          {Object.entries(fn.envVars).map(([k, v]) => (
                            <div key={k} className="flex gap-1 ml-2"><span className="text-yellow-400">{k}</span>=<span className="text-ide-text-secondary">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><FaTerminal size={8} /> Logs</button>
                      <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><FaCode size={8} /> Edit</button>
                      <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] hover:bg-red-600/30 flex items-center gap-0.5"><FaTrash size={8} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
