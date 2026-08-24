import React, { useState, useMemo, useEffect } from 'react'
import {
  Activity, Search, RefreshCw, X, ChevronDown, ChevronRight,
  Cpu, HardDrive, Clock, Zap, Terminal, AlertTriangle, StopCircle,
  Play, Pause, Copy, Check, Filter, ArrowUpDown
} from 'lucide-react'

interface ProcessInfo {
  pid: number
  name: string
  command: string
  cpu: number
  memory: number
  memoryMB: number
  status: 'running' | 'sleeping' | 'stopped' | 'zombie'
  user: string
  started: Date
  threads: number
  parentPid: number
  port?: number
}

const STATUS_COLORS = {
  running: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Running' },
  sleeping: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Sleeping' },
  stopped: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Stopped' },
  zombie: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Zombie' },
}

const MOCK_PROCESSES: ProcessInfo[] = [
  { pid: 1, name: 'systemd', command: '/sbin/init', cpu: 0.1, memory: 0.3, memoryMB: 24, status: 'sleeping', user: 'root', started: new Date(Date.now() - 864000000), threads: 1, parentPid: 0 },
  { pid: 423, name: 'node', command: '/usr/bin/node /app/dist/server.js', cpu: 2.4, memory: 3.2, memoryMB: 256, status: 'running', user: 'app', started: new Date(Date.now() - 86400000), threads: 12, parentPid: 1, port: 3000 },
  { pid: 567, name: 'postgres', command: '/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/data', cpu: 1.8, memory: 8.4, memoryMB: 672, status: 'sleeping', user: 'postgres', started: new Date(Date.now() - 86400000), threads: 8, parentPid: 1, port: 5432 },
  { pid: 789, name: 'nginx', command: 'nginx: worker process', cpu: 0.3, memory: 0.8, memoryMB: 64, status: 'running', user: 'www-data', started: new Date(Date.now() - 43200000), threads: 4, parentPid: 788, port: 80 },
  { pid: 1024, name: 'vite', command: '/app/node_modules/.bin/vite --port 5173', cpu: 4.2, memory: 2.1, memoryMB: 168, status: 'running', user: 'idexal', started: new Date(Date.now() - 3600000), threads: 6, parentPid: 423, port: 5173 },
  { pid: 1156, name: 'tsc', command: '/app/node_modules/.bin/tsc --noEmit', cpu: 12.6, memory: 4.8, memoryMB: 384, status: 'running', user: 'idexal', started: new Date(Date.now() - 120000), threads: 4, parentPid: 1024 },
  { pid: 1289, name: 'redis-server', command: '/usr/bin/redis-server 127.0.0.1:6379', cpu: 0.4, memory: 1.2, memoryMB: 96, status: 'sleeping', user: 'redis', started: new Date(Date.now() - 86400000), threads: 2, parentPid: 1, port: 6379 },
  { pid: 1432, name: 'docker-proxy', command: 'docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 8080', cpu: 0.2, memory: 0.5, memoryMB: 40, status: 'running', user: 'root', started: new Date(Date.now() - 172800000), threads: 2, parentPid: 1, port: 8080 },
  { pid: 1567, name: 'cron', command: '/usr/sbin/cron -f', cpu: 0.0, memory: 0.1, memoryMB: 8, status: 'sleeping', user: 'root', started: new Date(Date.now() - 864000000), threads: 1, parentPid: 1 },
  { pid: 1689, name: 'code-server', command: '/usr/lib/code-server/lib/node /usr/lib/code-server/out/node/entry.js', cpu: 3.1, memory: 5.6, memoryMB: 448, status: 'running', user: 'idexal', started: new Date(Date.now() - 7200000), threads: 16, parentPid: 1, port: 8443 },
  { pid: 1823, name: 'containerd', command: '/usr/bin/containerd', cpu: 0.8, memory: 2.0, memoryMB: 160, status: 'sleeping', user: 'root', started: new Date(Date.now() - 86400000), threads: 8, parentPid: 1 },
  { pid: 1956, name: 'node', command: 'node /app/worker.js', cpu: 0.6, memory: 1.4, memoryMB: 112, status: 'sleeping', user: 'app', started: new Date(Date.now() - 43200000), threads: 4, parentPid: 423 },
  { pid: 2078, name: 'sshd', command: '/usr/sbin/sshd -D', cpu: 0.1, memory: 0.4, memoryMB: 32, status: 'sleeping', user: 'root', started: new Date(Date.now() - 864000000), threads: 1, parentPid: 1, port: 22 },
  { pid: 2190, name: 'python3', command: 'python3 /app/scripts/monitor.py', cpu: 1.9, memory: 1.8, memoryMB: 144, status: 'running', user: 'idexal', started: new Date(Date.now() - 3600000), threads: 2, parentPid: 1 },
  { pid: 2312, name: 'zombie-process', command: '<defunct>', cpu: 0.0, memory: 0.0, memoryMB: 0, status: 'zombie', user: 'root', started: new Date(Date.now() - 60000), threads: 0, parentPid: 1567 },
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

export default function ProcessManagerPanel({ onClose }: { onClose: () => void }) {
  const [processes, setProcesses] = useState(MOCK_PROCESSES)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name' | 'pid'>('cpu')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedPid, setExpandedPid] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses(prev => prev.map(p => ({
        ...p,
        cpu: Math.max(0, p.cpu + (Math.random() - 0.5) * 0.8),
        memory: Math.max(0.1, p.memory + (Math.random() - 0.5) * 0.2),
      })))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => ({
    total: processes.length,
    running: processes.filter(p => p.status === 'running').length,
    sleeping: processes.filter(p => p.status === 'sleeping').length,
    zombie: processes.filter(p => p.status === 'zombie').length,
    totalCpu: processes.reduce((s, p) => s + p.cpu, 0),
    totalMemory: processes.reduce((s, p) => s + p.memoryMB, 0),
  }), [processes])

  const filtered = useMemo(() => {
    let list = [...processes]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.command.toLowerCase().includes(q) || String(p.pid).includes(q))
    }
    if (filterStatus !== 'all') {
      list = list.filter(p => p.status === filterStatus)
    }
    list.sort((a, b) => {
      const diff = sortBy === 'name' ? a.name.localeCompare(b.name) :
        sortBy === 'pid' ? a.pid - b.pid :
        a[sortBy] - b[sortBy]
      return sortAsc ? diff : -diff
    })
    return list
  }, [processes, searchQuery, sortBy, sortAsc, filterStatus])

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortAsc(!sortAsc)
    else { setSortBy(field); setSortAsc(false) }
  }

  const copyCommand = (pid: number, cmd: string) => {
    navigator.clipboard?.writeText(cmd)
    setCopied(pid)
    setTimeout(() => setCopied(null), 1500)
  }

  const killProcess = (pid: number) => {
    setProcesses(prev => prev.filter(p => p.pid !== pid))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-red-400" />
          <span className="text-sm font-semibold">Process Manager</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setProcesses(MOCK_PROCESSES)} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><RefreshCw size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        <div className="bg-ide-bg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-ide-text">{stats.total}</div>
          <div className="text-[10px] text-ide-text-secondary">Processes</div>
        </div>
        <div className="bg-ide-bg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-green-400">{stats.running}</div>
          <div className="text-[10px] text-ide-text-secondary">Running</div>
        </div>
        <div className="bg-ide-bg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-yellow-400">{stats.totalCpu.toFixed(1)}%</div>
          <div className="text-[10px] text-ide-text-secondary">CPU</div>
        </div>
        <div className="bg-ide-bg px-2 py-1.5 text-center">
          <div className="text-sm font-bold text-blue-400">{(stats.totalMemory / 1024).toFixed(1)} GB</div>
          <div className="text-[10px] text-ide-text-secondary">Memory</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-3 py-1.5 border-b border-ide-border flex items-center gap-2">
        <div className="flex items-center gap-2 bg-ide-bg-secondary/30 rounded px-2 py-1 flex-1">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter processes..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
        >
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="sleeping">Sleeping</option>
          <option value="stopped">Stopped</option>
          <option value="zombie">Zombie</option>
        </select>
      </div>

      {/* Table Header */}
      <div className="flex items-center px-3 py-1 bg-ide-bg-secondary/30 border-b border-ide-border text-[10px] text-ide-text-secondary">
        <button onClick={() => toggleSort('pid')} className="w-12 text-left flex items-center gap-0.5 hover:text-ide-text">
          PID {sortBy === 'pid' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('name')} className="flex-1 text-left flex items-center gap-0.5 hover:text-ide-text">
          Name {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('cpu')} className="w-16 text-right flex items-center gap-0.5 hover:text-ide-text justify-end">
          CPU {sortBy === 'cpu' && (sortAsc ? '↑' : '↓')}
        </button>
        <button onClick={() => toggleSort('memory')} className="w-16 text-right flex items-center gap-0.5 hover:text-ide-text justify-end">
          Mem {sortBy === 'memory' && (sortAsc ? '↑' : '↓')}
        </button>
        <span className="w-16 text-right">Status</span>
        <span className="w-12" />
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(proc => {
          const statusCfg = STATUS_COLORS[proc.status]
          const isExpanded = expandedPid === proc.pid
          return (
            <div key={proc.pid}>
              <div
                onClick={() => setExpandedPid(isExpanded ? null : proc.pid)}
                className="flex items-center px-3 py-1 border-b border-ide-border/20 hover:bg-ide-bg-secondary/10 cursor-pointer text-xs"
              >
                <div className="w-12 font-mono text-ide-text-secondary">{proc.pid}</div>
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span className="truncate font-mono">{proc.name}</span>
                  {proc.port && <span className="text-[9px] bg-ide-bg-secondary px-1 rounded text-ide-text-secondary">:{proc.port}</span>}
                </div>
                <div className="w-16 text-right">
                  <div className="w-12 h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden ml-auto">
                    <div
                      className={`h-full rounded-full ${proc.cpu > 10 ? 'bg-red-400' : proc.cpu > 5 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(100, proc.cpu * 5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ide-text-secondary">{proc.cpu.toFixed(1)}%</span>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] text-ide-text-secondary">{proc.memoryMB}MB</span>
                </div>
                <div className="w-16 text-right">
                  <span className={`px-1 py-0.5 rounded text-[9px] ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <div className="w-12 text-right flex items-center justify-end gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); copyCommand(proc.pid, proc.command) }}
                    className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"
                  >
                    {copied === proc.pid ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); killProcess(proc.pid) }}
                    className="p-0.5 hover:bg-red-500/20 rounded text-red-400/60 hover:text-red-400"
                  >
                    <StopCircle size={10} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-2 bg-ide-bg-secondary/10 border-b border-ide-border/30">
                  <div className="grid grid-cols-2 gap-1 text-[10px] mb-1">
                    <div><span className="text-ide-text-secondary">User:</span> {proc.user}</div>
                    <div><span className="text-ide-text-secondary">Threads:</span> {proc.threads}</div>
                    <div><span className="text-ide-text-secondary">Started:</span> {timeAgo(proc.started)}</div>
                    <div><span className="text-ide-text-secondary">Parent PID:</span> {proc.parentPid}</div>
                    {proc.port && <div><span className="text-ide-text-secondary">Port:</span> {proc.port}</div>}
                  </div>
                  <div className="text-[10px] bg-ide-bg-secondary/50 rounded p-1.5 font-mono text-ide-text-secondary break-all">
                    {proc.command}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                      <Terminal size={8} /> Attach
                    </button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] flex items-center gap-0.5">
                      <Pause size={8} /> Suspend
                    </button>
                    <button onClick={() => killProcess(proc.pid)} className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] flex items-center gap-0.5">
                      <StopCircle size={8} /> Kill
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-ide-border text-[10px] text-ide-text-secondary flex items-center justify-between">
        <span>{filtered.length} of {processes.length} processes</span>
        <span className="flex items-center gap-2">
          <span className="text-green-400">{stats.running} active</span>
          {stats.zombie > 0 && <span className="text-red-400">{stats.zombie} zombie</span>}
        </span>
      </div>
    </div>
  )
}
