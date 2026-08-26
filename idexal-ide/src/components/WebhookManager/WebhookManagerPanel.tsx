import React, { useState, useMemo } from 'react'
import {
  FaCode, FaPlus, FaTrash, FaCheckCircle, FaTimesCircle, FaClock, FaSync, FaChevronDown, FaChevronRight, FaCopy, FaCheck, FaExternalLinkAlt, FaPaperPlane, FaExclamationTriangle, FaEye, FaBolt
} from '../Icon'

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  enabled: boolean
  lastTriggered: Date | null
  lastStatus: number | null
  failureCount: number
  successCount: number
  createdAt: Date
}

interface WebhookDelivery {
  id: string
  endpointId: string
  event: string
  status: number
  duration: number
  timestamp: Date
  requestPayload: string
  responsePayload: string
}

const EVENTS = ['push', 'pull_request', 'deployment', 'issue', 'release', 'ping']

const MOCK_ENDPOINTS: WebhookEndpoint[] = [
  { id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/T00/B00/xxx', events: ['push', 'pull_request', 'deployment'], secret: 'whsec_abc123...', enabled: true, lastTriggered: new Date(Date.now() - 300000), lastStatus: 200, failureCount: 2, successCount: 1245, createdAt: new Date(Date.now() - 604800000) },
  { id: 'wh-2', name: 'GitHub Sync', url: 'https://api.github.com/repos/idexal/webhooks', events: ['push'], secret: 'whsec_def456...', enabled: true, lastTriggered: new Date(Date.now() - 600000), lastStatus: 200, failureCount: 0, successCount: 892, createdAt: new Date(Date.now() - 2592000000) },
  { id: 'wh-3', name: 'Analytics Pipeline', url: 'https://analytics.idexal.dev/ingest', events: ['push', 'deployment', 'release'], secret: 'whsec_ghi789...', enabled: true, lastTriggered: new Date(Date.now() - 1200000), lastStatus: 200, failureCount: 5, successCount: 3456, createdAt: new Date(Date.now() - 1209600000) },
  { id: 'wh-4', name: 'Backup Trigger', url: 'https://backup.idexal.dev/trigger', events: ['deployment'], secret: 'whsec_jkl012...', enabled: false, lastTriggered: new Date(Date.now() - 86400000), lastStatus: 500, failureCount: 12, successCount: 89, createdAt: new Date(Date.now() - 2592000000) },
  { id: 'wh-5', name: 'Monitoring Webhook', url: 'https://monitor.idexal.dev/alerts', events: ['deployment', 'release'], secret: 'whsec_mno345...', enabled: true, lastTriggered: new Date(Date.now() - 900000), lastStatus: 202, failureCount: 1, successCount: 567, createdAt: new Date(Date.now() - 1728000000) },
]

const MOCK_DELIVERIES: WebhookDelivery[] = [
  { id: 'd-1', endpointId: 'wh-1', event: 'push', status: 200, duration: 145, timestamp: new Date(Date.now() - 300000), requestPayload: '{"ref":"refs/heads/main","commits":3}', responsePayload: '{"ok":true}' },
  { id: 'd-2', endpointId: 'wh-2', event: 'push', status: 200, duration: 89, timestamp: new Date(Date.now() - 600000), requestPayload: '{"action":"synchronize"}', responsePayload: '{"status":"ok"}' },
  { id: 'd-3', endpointId: 'wh-3', event: 'deployment', status: 200, duration: 234, timestamp: new Date(Date.now() - 1200000), requestPayload: '{"environment":"production"}', responsePayload: '{"received":true}' },
  { id: 'd-4', endpointId: 'wh-4', event: 'deployment', status: 500, duration: 5000, timestamp: new Date(Date.now() - 86400000), requestPayload: '{"environment":"production"}', responsePayload: '{"error":"Service unavailable"}' },
  { id: 'd-5', endpointId: 'wh-1', event: 'deployment', status: 200, duration: 167, timestamp: new Date(Date.now() - 1800000), requestPayload: '{"status":"completed"}', responsePayload: '{"ok":true}' },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  return `${hours}h ago`
}

export default function WebhookManagerPanel({ onClose }: { onClose: () => void }) {
  const [endpoints, setEndpoints] = useState(MOCK_ENDPOINTS)
  const [deliveries] = useState(MOCK_DELIVERIES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'endpoints' | 'deliveries' | 'events'>('endpoints')
  const [copied, setCopied] = useState<string | null>(null)

  const toggleEndpoint = (id: string) => {
    setEndpoints(prev => prev.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e))
  }

  const totalSuccess = endpoints.reduce((s, e) => s + e.successCount, 0)
  const totalFailures = endpoints.reduce((s, e) => s + e.failureCount, 0)

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-orange-400" />
          <span className="text-sm font-semibold">Webhooks</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 bg-orange-600/20 text-orange-400 rounded hover:bg-orange-600/30"><FaPlus size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-ide-border">
        {[
          { label: 'Endpoints', value: endpoints.length, color: 'text-orange-400' },
          { label: 'Deliveries', value: totalSuccess.toLocaleString(), color: 'text-green-400' },
          { label: 'Failures', value: totalFailures, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'endpoints' as const, label: `Endpoints (${endpoints.length})` }, { key: 'deliveries' as const, label: 'Recent Deliveries' }, { key: 'events' as const, label: 'Events' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-orange-400 text-orange-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'endpoints' && endpoints.map(wh => (
          <div key={wh.id}>
            <div onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                {expandedId === wh.id ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                <button onClick={e => { e.stopPropagation(); toggleEndpoint(wh.id) }}>
                  {wh.enabled ? <FaCode size={18} className="text-green-400" /> : <FaCode size={18} className="text-ide-text-secondary" />}
                </button>
                <span className="text-xs font-semibold flex-1">{wh.name}</span>
                {wh.lastStatus && (
                  <span className={`text-xs ${wh.lastStatus < 300 ? 'text-green-400' : 'text-red-400'}`}>{wh.lastStatus}</span>
                )}
              </div>
              <div className="text-[10px] text-ide-text-secondary ml-8 font-mono truncate">{wh.url}</div>
              <div className="flex items-center gap-2 ml-8 mt-0.5">
                {wh.events.map(e => <span key={e} className="px-1 py-0 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{e}</span>)}
              </div>
              {expandedId === wh.id && (
                <div className="mt-2 ml-8 space-y-2 bg-ide-bg-secondary/20 rounded p-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-ide-text-secondary">Success:</span> <span className="text-green-400">{wh.successCount}</span></div>
                    <div><span className="text-ide-text-secondary">Failures:</span> <span className="text-red-400">{wh.failureCount}</span></div>
                    <div><span className="text-ide-text-secondary">Last triggered:</span> {wh.lastTriggered ? timeAgo(wh.lastTriggered) : 'Never'}</div>
                    <div><span className="text-ide-text-secondary">Created:</span> {timeAgo(wh.createdAt)}</div>
                  </div>
                  <div className="text-[10px]">
                    <span className="text-ide-text-secondary">Secret:</span>
                    <span className="ml-1 font-mono text-ide-text-secondary">{wh.secret}</span>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(wh.secret); setCopied(wh.id); setTimeout(() => setCopied(null), 1500) }} className="ml-1">
                      {copied === wh.id ? <FaCheck size={8} className="text-green-400 inline" /> : <FaCopy size={8} className="inline" />}
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><FaPaperPlane size={8} /> Test</button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><FaEye size={8} /> View</button>
                    <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] flex items-center gap-0.5"><FaTrash size={8} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'deliveries' && deliveries.map(d => {
          const endpoint = endpoints.find(e => e.id === d.endpointId)
          return (
            <div key={d.id} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20">
              <div className="flex items-center gap-2 mb-0.5">
                {d.status < 300 ? <FaCheckCircle size={10} className="text-green-400" /> : <FaTimesCircle size={10} className="text-red-400" />}
                <span className="text-xs font-semibold">{endpoint?.name || d.endpointId}</span>
                <span className="px-1 py-0 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary">{d.event}</span>
                <span className="text-[10px] text-ide-text-secondary ml-auto">{timeAgo(d.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                <span className={d.status < 300 ? 'text-green-400' : 'text-red-400'}>HTTP {d.status}</span>
                <span>{d.duration}ms</span>
              </div>
            </div>
          )
        })}

        {activeTab === 'events' && (
          <div className="p-3 space-y-2">
            {EVENTS.map(evt => {
              const count = endpoints.filter(e => e.events.includes(evt)).length
              return (
                <div key={evt} className="flex items-center gap-2 px-2 py-1.5 bg-ide-bg-secondary/30 border border-ide-border/30 rounded">
                  <FaBolt size={12} className="text-orange-400" />
                  <span className="text-xs font-semibold flex-1">{evt}</span>
                  <span className="text-xs text-ide-text-secondary">{count} subscribers</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
