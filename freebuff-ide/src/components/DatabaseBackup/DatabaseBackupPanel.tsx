import React, { useState, useMemo } from 'react'
import {
  Database, Download, Upload, Trash2, Clock, CheckCircle, XCircle,
  RefreshCw, ChevronDown, ChevronRight, HardDrive, Calendar,
  AlertTriangle, Play, Pause, Copy, Check
} from 'lucide-react'

interface Backup {
  id: string
  name: string
  database: string
  type: 'full' | 'incremental' | 'snapshot'
  status: 'completed' | 'running' | 'failed' | 'scheduled'
  size: string
  duration: number
  createdAt: Date
  retention: string
  checksum: string
  tables: number
  rows: number
}

interface Schedule {
  id: string
  name: string
  frequency: string
  time: string
  database: string
  enabled: boolean
  lastRun: Date
  nextRun: Date
  type: 'full' | 'incremental'
}

const MOCK_BACKUPS: Backup[] = [
  { id: 'b1', name: 'Production Full Backup', database: 'idexal_prod', type: 'full', status: 'completed', size: '2.4 GB', duration: 180, createdAt: new Date(Date.now() - 3600000), retention: '30 days', checksum: 'sha256:a1b2c3d4...', tables: 24, rows: 1250000 },
  { id: 'b2', name: 'Incremental Backup', database: 'idexal_prod', type: 'incremental', status: 'completed', size: '156 MB', duration: 35, createdAt: new Date(Date.now() - 1800000), retention: '7 days', checksum: 'sha256:e5f6g7h8...', tables: 8, rows: 45000 },
  { id: 'b3', name: 'Staging Snapshot', database: 'idexal_staging', type: 'snapshot', status: 'completed', size: '1.8 GB', duration: 120, createdAt: new Date(Date.now() - 86400000), retention: '7 days', checksum: 'sha256:i9j0k1l2...', tables: 24, rows: 980000 },
  { id: 'b4', name: 'Pre-deploy Backup', database: 'idexal_prod', type: 'full', status: 'completed', size: '2.3 GB', duration: 175, createdAt: new Date(Date.now() - 172800000), retention: '90 days', checksum: 'sha256:m3n4o5p6...', tables: 24, rows: 1200000 },
  { id: 'b5', name: 'Daily Incremental', database: 'idexal_prod', type: 'incremental', status: 'running', size: '0 MB', duration: 0, createdAt: new Date(), retention: '7 days', checksum: '-', tables: 0, rows: 0 },
  { id: 'b6', name: 'Test DB Backup', database: 'idexal_test', type: 'full', status: 'failed', size: '0 MB', duration: 5, createdAt: new Date(Date.now() - 259200000), retention: '3 days', checksum: '-', tables: 0, rows: 0 },
]

const MOCK_SCHEDULES: Schedule[] = [
  { id: 's1', name: 'Daily Full Backup', frequency: 'Daily', time: '02:00 UTC', database: 'idexal_prod', enabled: true, lastRun: new Date(Date.now() - 86400000), nextRun: new Date(Date.now() + 36000000), type: 'full' },
  { id: 's2', name: 'Hourly Incremental', frequency: 'Hourly', time: 'Every hour', database: 'idexal_prod', enabled: true, lastRun: new Date(Date.now() - 1800000), nextRun: new Date(Date.now() + 1800000), type: 'incremental' },
  { id: 's3', name: 'Weekly Staging Snapshot', frequency: 'Weekly (Sun)', time: '04:00 UTC', database: 'idexal_staging', enabled: true, lastRun: new Date(Date.now() - 604800000), nextRun: new Date(Date.now() + 86400000), type: 'full' },
  { id: 's4', name: 'Monthly Archival', frequency: 'Monthly (1st)', time: '01:00 UTC', database: 'idexal_prod', enabled: false, lastRun: new Date(Date.now() - 2592000000), nextRun: new Date(Date.now() + 2592000000), type: 'full' },
]

const STATUS_CONFIG = {
  completed: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
  running: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: RefreshCw },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
  scheduled: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  return `${hours}h ago`
}

export default function DatabaseBackupPanel({ onClose }: { onClose: () => void }) {
  const [backups] = useState(MOCK_BACKUPS)
  const [schedules, setSchedules] = useState(MOCK_SCHEDULES)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'storage'>('backups')

  const stats = useMemo(() => ({
    totalBackups: backups.length,
    completed: backups.filter(b => b.status === 'completed').length,
    totalSize: '6.6 GB',
    databases: new Set(backups.map(b => b.database)).size,
  }), [backups])

  const toggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">Database Backups</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs flex items-center gap-1"><Download size={10} /> Backup Now</button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Backups', value: stats.totalBackups, color: 'text-emerald-400' },
          { label: 'Completed', value: stats.completed, color: 'text-green-400' },
          { label: 'Storage', value: stats.totalSize, color: 'text-blue-400' },
          { label: 'Databases', value: stats.databases, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'backups' as const, label: `Backups (${backups.length})` }, { key: 'schedules' as const, label: `Schedules (${schedules.length})` }, { key: 'storage' as const, label: 'Storage' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'backups' && backups.map(backup => {
          const config = STATUS_CONFIG[backup.status]
          const Icon = config.icon
          return (
            <div key={backup.id}>
              <div onClick={() => setExpandedId(expandedId === backup.id ? null : backup.id)} className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${config.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  {expandedId === backup.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Icon size={12} className={`${config.color} ${backup.status === 'running' ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-semibold flex-1">{backup.name}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bg} ${config.color}`}>{backup.status}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                  <span className="px-1 py-0 bg-ide-bg-secondary rounded">{backup.type}</span>
                  <span>{backup.database}</span>
                  {backup.size !== '0 MB' && <span>{backup.size}</span>}
                  <span>{timeAgo(backup.createdAt)}</span>
                </div>
              </div>
              {expandedId === backup.id && (
                <div className="px-6 pb-2 space-y-2 bg-ide-bg-secondary/10">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-ide-text-secondary">Duration:</span> {backup.duration}s</div>
                    <div><span className="text-ide-text-secondary">Retention:</span> {backup.retention}</div>
                    <div><span className="text-ide-text-secondary">Tables:</span> {backup.tables}</div>
                    <div><span className="text-ide-text-secondary">Rows:</span> {backup.rows.toLocaleString()}</div>
                    <div className="col-span-2"><span className="text-ide-text-secondary">Checksum:</span> <span className="font-mono">{backup.checksum}</span></div>
                  </div>
                  {backup.status === 'completed' && (
                    <div className="flex gap-1">
                      <button className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded text-[10px] flex items-center gap-0.5"><Upload size={8} /> Restore</button>
                      <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><Download size={8} /> Download</button>
                      <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary flex items-center gap-0.5"><Copy size={8} /> Copy</button>
                      <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] flex items-center gap-0.5"><Trash2 size={8} /> Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {activeTab === 'schedules' && schedules.map(s => (
          <div key={s.id} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => toggleSchedule(s.id)} className={`w-7 h-3.5 rounded-full transition-colors ${s.enabled ? 'bg-emerald-600' : 'bg-ide-bg-secondary'}`}>
                <div className={`w-2.5 h-2.5 bg-white rounded-full transform transition-transform ${s.enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs font-semibold flex-1">{s.name}</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${s.type === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{s.type}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-9">
              <span>{s.frequency} at {s.time}</span>
              <span>{s.database}</span>
              <span>Last: {timeAgo(s.lastRun)}</span>
            </div>
          </div>
        ))}

        {activeTab === 'storage' && (
          <div className="p-3 space-y-3">
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-3">
              <div className="text-xs font-semibold mb-2">Storage Usage</div>
              <div className="w-full h-4 bg-ide-bg-secondary rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: '45%' }} title="Full Backups" />
                <div className="h-full bg-green-500" style={{ width: '20%' }} title="Incremental" />
                <div className="h-full bg-purple-500" style={{ width: '15%' }} title="Snapshots" />
                <div className="h-full bg-gray-600 flex-1" title="Free" />
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px]">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500" /> Full (3.0 GB)</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" /> Incremental (1.3 GB)</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-purple-500" /> Snapshots (1.0 GB)</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-gray-600" /> Free (2.7 GB)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total Allocated', value: '10 GB', color: 'text-ide-text' },
                { label: 'Used', value: '6.6 GB', color: 'text-blue-400' },
                { label: 'Available', value: '3.4 GB', color: 'text-green-400' },
                { label: 'Utilization', value: '66%', color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
                  <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
