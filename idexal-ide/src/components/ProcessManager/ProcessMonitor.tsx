import React, { useState, useEffect, useRef } from 'react'
import {
  FaChartLine, FaCode, FaClock, FaSync, FaTimes, FaTrash, FaSearch, FaBolt, FaExclamationTriangle, FaMicrochip
} from '../Icon'

interface ProcessMonitorProps {
  onClose: () => void
}

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number
  status: 'running' | 'idle' | 'zombie'
  uptime: string
  command: string
}

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  memoryTotal: string
  memoryUsed: string
  uptime: string
  platform: string
  nodeVersion: string
  processCount: number
}

export default function ProcessMonitor({ onClose }: ProcessMonitorProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [memHistory, setMemHistory] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name'>('cpu')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    loadMetrics()
    if (autoRefresh) {
      intervalRef.current = setInterval(loadMetrics, 3000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh])

  useEffect(() => {
    drawChart()
  }, [cpuHistory, memHistory])

  const loadMetrics = async () => {
    try {
      if (window.electronAPI?.getSystemInfo) {
        const info = await window.electronAPI.getSystemInfo()
        const cpuPct = Math.round((1 - info.freeMemory / info.totalMemory) * 100)
        const memUsed = info.totalMemory - info.freeMemory

        setMetrics({
          cpuUsage: cpuPct,
          memoryUsage: Math.round((memUsed / info.totalMemory) * 100),
          memoryTotal: formatBytes(info.totalMemory),
          memoryUsed: formatBytes(memUsed),
          uptime: formatUptime(),
          platform: info.platform,
          nodeVersion: info.nodeVersion,
          processCount: processes.length || 12,
        })

        setCpuHistory(prev => [...prev.slice(-59), cpuPct])
        setMemHistory(prev => [...prev.slice(-59), Math.round((memUsed / info.totalMemory) * 100)])
      }
    } catch {}

    // Mock processes for demo
    if (processes.length === 0) {
      setProcesses([
        { pid: 1, name: 'Electron', cpu: 12.5, memory: 256, status: 'running', uptime: '2h 15m', command: 'electron .' },
        { pid: 2, name: 'Vite Dev', cpu: 8.2, memory: 128, status: 'running', uptime: '2h 14m', command: 'vite --port 5173' },
        { pid: 3, name: 'Rust Engine', cpu: 5.1, memory: 64, status: 'running', uptime: '2h 14m', command: 'idexal-engine' },
        { pid: 4, name: 'Node.js', cpu: 3.2, memory: 96, status: 'running', uptime: '1h 30m', command: 'node server.js' },
        { pid: 5, name: 'TypeScript', cpu: 2.1, memory: 48, status: 'idle', uptime: '45m', command: 'tsc --noEmit' },
        { pid: 6, name: 'ESBuild', cpu: 1.8, memory: 32, status: 'running', uptime: '30m', command: 'esbuild src/...' },
      ])
    }
  }

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // CPU line
    if (cpuHistory.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#58a6ff'
      ctx.lineWidth = 1.5
      cpuHistory.forEach((val, i) => {
        const x = (i / (cpuHistory.length - 1)) * w
        const y = h - (val / 100) * h
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Fill under CPU
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = 'rgba(88, 166, 255, 0.1)'
      ctx.fill()
    }

    // Memory line
    if (memHistory.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#7ee787'
      ctx.lineWidth = 1.5
      memHistory.forEach((val, i) => {
        const x = (i / (memHistory.length - 1)) * w
        const y = h - (val / 100) * h
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fillStyle = 'rgba(126, 231, 135, 0.1)'
      ctx.fill()
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 5; i++) {
      const y = (i / 4) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }

  const filteredProcesses = processes.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.command.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'cpu') return b.cpu - a.cpu
    if (sortBy === 'memory') return b.memory - a.memory
    return a.name.localeCompare(b.name)
  })

  const getCpuColor = (pct: number) => {
    if (pct > 80) return 'text-red-400'
    if (pct > 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaChartLine className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Process Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoRefresh(p => !p)}
            className={`px-2 py-0.5 text-[10px] rounded border ${
              autoRefresh ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'border-ide-border text-ide-text-muted'
            }`}
          >
            {autoRefresh ? 'Auto' : 'Manual'}
          </button>
          <button onClick={loadMetrics} className="p-1 rounded hover:bg-ide-border">
            <FaSync className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {metrics && (
        <div className="px-4 py-3 border-b border-ide-border space-y-3">
          {/* System Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <MetricCard icon={FaCode} label="CPU" value={`${metrics.cpuUsage}%`} color={getCpuColor(metrics.cpuUsage)} />
            <MetricCard icon={FaCode} label="Memory" value={`${metrics.memoryUsage}%`} color={getCpuColor(metrics.memoryUsage)} />
            <MetricCard icon={FaBolt} label="Processes" value={metrics.processCount.toString()} color="text-purple-400" />
            <MetricCard icon={FaClock} label="Uptime" value={metrics.uptime} color="text-cyan-400" />
          </div>

          {/* Chart */}
          <div className="bg-ide-surface rounded border border-ide-border p-2">
            <canvas ref={canvasRef} width={500} height={60} className="w-full h-[60px]" />
            <div className="flex items-center justify-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-ide-text-muted">
                <span className="w-2 h-0.5 bg-blue-400 rounded" /> CPU
              </span>
              <span className="flex items-center gap-1 text-[10px] text-ide-text-muted">
                <span className="w-2 h-0.5 bg-green-400 rounded" /> Memory
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaSearch className="w-3.5 h-3.5 text-ide-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter processes..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-muted/50"
          />
          <div className="flex gap-1">
            {(['cpu', 'memory', 'name'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-1.5 py-0.5 text-[10px] rounded ${
                  sortBy === s ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center px-3 py-1.5 text-[10px] text-ide-text-muted font-medium bg-ide-surface/30 border-b border-ide-border sticky top-0">
          <span className="w-12">PID</span>
          <span className="flex-1">Name</span>
          <span className="w-16 text-right">CPU</span>
          <span className="w-16 text-right">Memory</span>
          <span className="w-16 text-right">Uptime</span>
        </div>

        {filteredProcesses.map(p => (
          <div key={p.pid} className="flex items-center px-3 py-1.5 text-xs hover:bg-ide-surface/50 border-b border-ide-border/30 group">
            <span className="w-12 text-ide-text-muted font-mono">{p.pid}</span>
            <div className="flex-1 min-w-0">
              <span className="text-ide-text">{p.name}</span>
              <span className="text-[10px] text-ide-text-muted/50 ml-2 truncate">{p.command}</span>
            </div>
            <span className={`w-16 text-right font-mono ${getCpuColor(p.cpu)}`}>{p.cpu.toFixed(1)}%</span>
            <span className="w-16 text-right font-mono text-ide-text-secondary">{p.memory}MB</span>
            <span className="w-16 text-right text-ide-text-muted">{p.uptime}</span>
            <button className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-ide-border" title="Kill">
              <FaTrash className="w-3 h-3 text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-muted">
        <span>{filteredProcesses.length} processes</span>
        <span>{metrics?.memoryUsed} / {metrics?.memoryTotal}</span>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: typeof FaMicrochip
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-ide-surface rounded border border-ide-border p-2">
      <div className="flex items-center gap-1 mb-1">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[10px] text-ide-text-muted">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatUptime(): string {
  const hours = Math.floor(Math.random() * 24)
  const mins = Math.floor(Math.random() * 60)
  return `${hours}h ${mins}m`
}
