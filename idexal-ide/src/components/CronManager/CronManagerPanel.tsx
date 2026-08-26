import React, { useState, useEffect } from 'react'
import {
  FaClock, FaPlus, FaTrash, FaPlay, FaPause, FaTimes, FaSync, FaCheck, FaCode
} from '../Icon'

interface CronManagerProps {
  onClose: () => void
}

interface CronJob {
  id: string
  name: string
  schedule: string
  command: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  status: 'idle' | 'running' | 'success' | 'failed'
  createdAt: string
}

const PRESET_SCHEDULES = [
  { name: 'Every minute', cron: '* * * * *' },
  { name: 'Every 5 minutes', cron: '*/5 * * * *' },
  { name: 'Every hour', cron: '0 * * * *' },
  { name: 'Every day at midnight', cron: '0 0 * * *' },
  { name: 'Every Monday', cron: '0 0 * * 1' },
  { name: 'Every 1st of month', cron: '0 0 1 * *' },
  { name: 'Weekdays at 9am', cron: '0 9 * * 1-5' },
]

function parseCronExpression(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return 'Invalid'

  const [min, hour, dom, month, dow] = parts
  if (min === '*' && hour === '*') return 'Every minute'
  if (min.startsWith('*/')) return `Every ${min.slice(2)} minutes`
  if (hour === '*' && min !== '*') return `Every hour at :${min.padStart(2, '0')}`
  if (hour !== '*' && dom === '*' && month === '*' && dow === '*') return `Daily at ${hour}:${min.padStart(2, '0')}`
  if (dom === '*' && month === '*' && dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `${days[parseInt(dow)] || dow} at ${hour}:${min.padStart(2, '0')}`
  }
  if (dom !== '*' && month === '*') return `Day ${dom} at ${hour}:${min.padStart(2, '0')}`
  return cron
}

function getNextRuns(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return 'Unknown'
  const [min, hour] = parts
  const now = new Date()
  const runs: Date[] = []

  for (let i = 0; i < 3 && runs.length < 3; i++) {
    const next = new Date(now)
    next.setMinutes(next.getMinutes() + (i + 1))
    if (min !== '*') next.setMinutes(parseInt(min) || 0)
    if (hour !== '*') next.setHours(parseInt(hour) || 0)
    if (next > now) runs.push(next)
  }

  return runs.slice(0, 3).map(d =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  ).join(', ') || 'Unknown'
}

export default function CronManagerPanel({ onClose }: CronManagerProps) {
  const [jobs, setJobs] = useState<CronJob[]>([
    {
      id: '1', name: 'Backup Database', schedule: '0 2 * * *',
      command: 'pg_dump mydb > backup.sql', enabled: true,
      lastRun: '2026-08-25 02:00:00', nextRun: '2026-08-26 02:00:00',
      status: 'success', createdAt: '2026-01-15',
    },
    {
      id: '2', name: 'Clear Cache', schedule: '0 */6 * * *',
      command: 'redis-cli FLUSHALL', enabled: true,
      lastRun: '2026-08-25 18:00:00', nextRun: '2026-08-26 00:00:00',
      status: 'success', createdAt: '2026-02-10',
    },
    {
      id: '3', name: 'Health Check', schedule: '*/5 * * * *',
      command: 'curl -s https://api.example.com/health', enabled: false,
      lastRun: '2026-08-24 23:55:00', nextRun: undefined,
      status: 'failed', createdAt: '2026-03-01',
    },
    {
      id: '4', name: 'Generate Report', schedule: '0 9 * * 1-5',
      command: 'node scripts/generate-report.js', enabled: true,
      lastRun: '2026-08-25 09:00:00', nextRun: '2026-08-26 09:00:00',
      status: 'success', createdAt: '2026-04-20',
    },
  ])

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSchedule, setNewSchedule] = useState('')
  const [newCommand, setNewCommand] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const addJob = () => {
    if (!newName.trim() || !newSchedule.trim() || !newCommand.trim()) return
    const job: CronJob = {
      id: Date.now().toString(),
      name: newName,
      schedule: newSchedule,
      command: newCommand,
      enabled: true,
      status: 'idle',
      createdAt: new Date().toISOString(),
      nextRun: getNextRuns(newSchedule),
    }
    setJobs(prev => [job, ...prev])
    setNewName('')
    setNewSchedule('')
    setNewCommand('')
    setShowAdd(false)
  }

  const toggleJob = (id: string) => {
    setJobs(prev => prev.map(j =>
      j.id === id ? { ...j, enabled: !j.enabled } : j
    ))
  }

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const runJob = (id: string) => {
    setJobs(prev => prev.map(j =>
      j.id === id ? { ...j, status: 'running' as const } : j
    ))
    setTimeout(() => {
      setJobs(prev => prev.map(j =>
        j.id === id ? { ...j, status: 'success' as const, lastRun: new Date().toISOString() } : j
      ))
    }, 1500)
  }

  const enabledCount = jobs.filter(j => j.enabled).length
  const successCount = jobs.filter(j => j.status === 'success').length
  const failedCount = jobs.filter(j => j.status === 'failed').length

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaClock className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Cron Manager</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ide-surface rounded text-ide-text-muted">
            {enabledCount} active
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAdd(p => !p)} className="p-1 rounded hover:bg-ide-border" title="Add job">
            <FaPlus className="w-3.5 h-3.5 text-ide-accent" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-b border-ide-border grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-400">{successCount}</div>
          <div className="text-[10px] text-ide-text-muted">Success</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">{failedCount}</div>
          <div className="text-[10px] text-ide-text-muted">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-400">{enabledCount}</div>
          <div className="text-[10px] text-ide-text-muted">Active</div>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-ide-border space-y-2 bg-ide-surface/30">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Job name"
            className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs text-ide-text outline-none focus:border-ide-accent"
          />
          <div className="flex gap-2">
            <input
              value={newSchedule}
              onChange={e => setNewSchedule(e.target.value)}
              placeholder="* * * * *"
              className="flex-1 px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
            />
            <select
              onChange={e => { setNewSchedule(e.target.value); setSelectedPreset(e.target.value) }}
              className="px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text outline-none"
            >
              <option value="">Presets</option>
              {PRESET_SCHEDULES.map(p => (
                <option key={p.cron} value={p.cron}>{p.name}</option>
              ))}
            </select>
          </div>
          <input
            value={newCommand}
            onChange={e => setNewCommand(e.target.value)}
            placeholder="Command to run"
            className="w-full px-3 py-1.5 bg-ide-bg border border-ide-border rounded text-xs font-mono text-ide-text outline-none focus:border-ide-accent"
          />
          <div className="flex gap-2">
            <button onClick={addJob} className="px-3 py-1.5 bg-ide-accent text-white rounded text-xs hover:bg-ide-accent/80">
              Add Job
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 border border-ide-border rounded text-xs text-ide-text-muted hover:bg-ide-border">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ide-text-muted text-xs">
            <div className="text-center">
              <FaClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No cron jobs</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-ide-border">
            {jobs.map(job => (
              <div key={job.id} className="px-4 py-3 hover:bg-ide-surface/30 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        job.status === 'success' ? 'bg-green-400' :
                        job.status === 'failed' ? 'bg-red-400' :
                        job.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                        job.enabled ? 'bg-blue-400' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium text-ide-text">{job.name}</span>
                    </div>
                    <div className="text-xs font-mono text-ide-text-muted mt-1 ml-4">{job.schedule}</div>
                    <div className="text-[10px] text-ide-text-muted/60 mt-0.5 ml-4">
                      {parseCronExpression(job.schedule)}
                    </div>
                    <div className="text-xs font-mono text-ide-text-secondary mt-1 ml-4 truncate">{job.command}</div>
                    <div className="flex gap-3 mt-1.5 ml-4 text-[10px] text-ide-text-muted">
                      {job.lastRun && <span>Last: {new Date(job.lastRun).toLocaleString()}</span>}
                      {job.nextRun && <span>Next: {job.nextRun}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => runJob(job.id)} className="p-1 rounded hover:bg-ide-border" title="Run now">
                      <FaPlay className="w-3 h-3 text-green-400" />
                    </button>
                    <button onClick={() => toggleJob(job.id)} className="p-1 rounded hover:bg-ide-border" title={job.enabled ? 'Pause' : 'Enable'}>
                      {job.enabled ? <FaPause className="w-3 h-3 text-yellow-400" /> : <FaPlay className="w-3 h-3 text-ide-text-muted" />}
                    </button>
                    <button onClick={() => deleteJob(job.id)} className="p-1 rounded hover:bg-ide-border" title="Delete">
                      <FaTrash className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
