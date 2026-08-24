import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Activity, Cpu, HardDrive, Wifi, Thermometer, MemoryStick,
  Pause, Play, RefreshCw, Maximize2, Clock, TrendingUp, Zap
} from 'lucide-react'

interface MetricPoint {
  timestamp: number
  value: number
}

interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  memory: number
  threads: number
  status: string
}

const MAX_POINTS = 60

function generateMetric(prev: number, min: number, max: number, volatility: number): number {
  const delta = (Math.random() - 0.5) * volatility
  return Math.max(min, Math.min(max, prev + delta))
}

export default function SystemMonitorPanel({ onClose }: { onClose: () => void }) {
  const [isPaused, setIsPaused] = useState(false)
  const [cpuHistory, setCpuHistory] = useState<MetricPoint[]>([])
  const [memHistory, setMemHistory] = useState<MetricPoint[]>([])
  const [netHistory, setNetHistory] = useState<MetricPoint[]>([])
  const [diskIO, setDiskIO] = useState<MetricPoint[]>([])
  const [cpuCurrent, setCpuCurrent] = useState(42)
  const [memCurrent, setMemCurrent] = useState(68)
  const [netCurrent, setNetCurrent] = useState(125)
  const [diskCurrent, setDiskCurrent] = useState(45)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'processes' | 'network'>('overview')
  const canvasRefs = {
    cpu: useRef<HTMLCanvasElement>(null),
    mem: useRef<HTMLCanvasElement>(null),
    net: useRef<HTMLCanvasElement>(null),
    disk: useRef<HTMLCanvasElement>(null),
  }

  const processes: ProcessInfo[] = useMemo(() => [
    { pid: 1234, name: 'idexal-electron', cpu: 15.2, memory: 450, threads: 12, status: 'running' },
    { pid: 2345, name: 'vite-dev-server', cpu: 8.5, memory: 180, threads: 6, status: 'running' },
    { pid: 3456, name: 'typescript-tsserver', cpu: 12.3, memory: 220, threads: 4, status: 'running' },
    { pid: 4567, name: 'node (test runner)', cpu: 5.1, memory: 95, threads: 3, status: 'running' },
    { pid: 5678, name: 'git (background)', cpu: 1.2, memory: 32, threads: 2, status: 'sleeping' },
    { pid: 6789, name: 'terminal (zsh)', cpu: 0.5, memory: 28, threads: 1, status: 'running' },
    { pid: 7890, name: 'chrome (preview)', cpu: 22.8, memory: 680, threads: 18, status: 'running' },
    { pid: 8901, name: 'prettier (format)', cpu: 3.4, memory: 45, threads: 2, status: 'running' },
  ], [])

  const systemInfo = useMemo(() => ({
    platform: 'Windows 11',
    arch: 'x64',
    cpus: 'Intel Core i7-12700K (12 cores)',
    totalMemory: '32 GB',
    usedMemory: '21.8 GB',
    freeMemory: '10.2 GB',
    diskTotal: '1 TB NVMe SSD',
    diskUsed: '456 GB',
    diskFree: '544 GB',
    uptime: '3d 14h 22m',
    loadAvg: [1.42, 1.28, 1.15],
  }), [])

  // Real-time updates
  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      const now = Date.now()
      setCpuCurrent(prev => {
        const next = generateMetric(prev, 5, 95, 8)
        setCpuHistory(h => [...h.slice(-MAX_POINTS), { timestamp: now, value: next }])
        return next
      })
      setMemCurrent(prev => {
        const next = generateMetric(prev, 40, 85, 3)
        setMemHistory(h => [...h.slice(-MAX_POINTS), { timestamp: now, value: next }])
        return next
      })
      setNetCurrent(prev => {
        const next = generateMetric(prev, 10, 500, 50)
        setNetHistory(h => [...h.slice(-MAX_POINTS), { timestamp: now, value: next }])
        return next
      })
      setDiskCurrent(prev => {
        const next = generateMetric(prev, 10, 200, 30)
        setDiskIO(h => [...h.slice(-MAX_POINTS), { timestamp: now, value: next }])
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPaused])

  // Draw chart
  useEffect(() => {
    const drawChart = (canvas: HTMLCanvasElement | null, data: MetricPoint[], color: string, maxVal: number) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = canvas.width = canvas.parentElement?.clientWidth || 400
      const h = canvas.height = 60

      ctx.clearRect(0, 0, w, h)

      if (data.length < 2) return

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 15) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Area fill
      ctx.beginPath()
      ctx.moveTo(0, h)
      data.forEach((point, i) => {
        const x = (i / (MAX_POINTS - 1)) * w
        const y = h - (point.value / maxVal) * h
        if (i === 0) ctx.lineTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = color + '20'
      ctx.fill()

      // Line
      ctx.beginPath()
      data.forEach((point, i) => {
        const x = (i / (MAX_POINTS - 1)) * w
        const y = h - (point.value / maxVal) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    drawChart(canvasRefs.cpu.current, cpuHistory, '#3b82f6', 100)
    drawChart(canvasRefs.mem.current, memHistory, '#10b981', 100)
    drawChart(canvasRefs.net.current, netHistory, '#f59e0b', 500)
    drawChart(canvasRefs.disk.current, diskIO, '#ef4444', 200)
  }, [cpuHistory, memHistory, netHistory, diskIO])

  const getBarColor = (value: number) => {
    if (value > 80) return 'bg-red-500'
    if (value > 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-green-400" />
          <span className="text-sm font-semibold">System Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1 rounded ${isPaused ? 'bg-yellow-600/20 text-yellow-400' : 'hover:bg-ide-bg-secondary text-ide-text-secondary'}`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'processes' as const, label: 'Processes' },
          { key: 'network' as const, label: 'Network' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 ${
              selectedTab === tab.key
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedTab === 'overview' && (
          <>
            {/* CPU */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Cpu size={12} className="text-blue-400" />
                  <span className="text-xs font-semibold">CPU</span>
                </div>
                <span className="text-xs text-blue-400">{cpuCurrent.toFixed(1)}%</span>
              </div>
              <canvas ref={canvasRefs.cpu} className="w-full" style={{ height: 60 }} />
              <div className="mt-1 text-xs text-ide-text-secondary">{systemInfo.cpus}</div>
            </div>

            {/* Memory */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <MemoryStick size={12} className="text-green-400" />
                  <span className="text-xs font-semibold">Memory</span>
                </div>
                <span className="text-xs text-green-400">{memCurrent.toFixed(1)}%</span>
              </div>
              <canvas ref={canvasRefs.mem} className="w-full" style={{ height: 60 }} />
              <div className="mt-1 text-xs text-ide-text-secondary">{systemInfo.usedMemory} / {systemInfo.totalMemory}</div>
            </div>

            {/* Network */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Wifi size={12} className="text-yellow-400" />
                  <span className="text-xs font-semibold">Network I/O</span>
                </div>
                <span className="text-xs text-yellow-400">{netCurrent.toFixed(0)} MB/s</span>
              </div>
              <canvas ref={canvasRefs.net} className="w-full" style={{ height: 60 }} />
            </div>

            {/* Disk */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <HardDrive size={12} className="text-red-400" />
                  <span className="text-xs font-semibold">Disk I/O</span>
                </div>
                <span className="text-xs text-red-400">{diskCurrent.toFixed(0)} MB/s</span>
              </div>
              <canvas ref={canvasRefs.disk} className="w-full" style={{ height: 60 }} />
              <div className="mt-1 text-xs text-ide-text-secondary">{systemInfo.diskUsed} / {systemInfo.diskTotal}</div>
            </div>

            {/* System Info Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Platform', value: systemInfo.platform },
                { label: 'Architecture', value: systemInfo.arch },
                { label: 'Uptime', value: systemInfo.uptime },
                { label: 'Load Average', value: systemInfo.loadAvg.map(l => l.toFixed(2)).join(', ') },
                { label: 'Free Memory', value: systemInfo.freeMemory },
                { label: 'Disk Free', value: systemInfo.diskFree },
              ].map(item => (
                <div key={item.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="text-xs text-ide-text-secondary">{item.label}</div>
                  <div className="text-xs font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedTab === 'processes' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-ide-text-secondary font-semibold">
              <span className="w-12">PID</span>
              <span className="flex-1">Name</span>
              <span className="w-16 text-right">CPU</span>
              <span className="w-16 text-right">Memory</span>
              <span className="w-12 text-right">Threads</span>
              <span className="w-16 text-right">Status</span>
            </div>
            {processes.sort((a, b) => b.cpu - a.cpu).map(proc => (
              <div key={proc.pid} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-ide-bg-secondary/30 border-b border-ide-border/30">
                <span className="w-12 font-mono text-ide-text-secondary">{proc.pid}</span>
                <span className="flex-1 truncate">{proc.name}</span>
                <div className="w-16 text-right flex items-center gap-1 justify-end">
                  <div className="w-10 h-1 bg-ide-bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${getBarColor(proc.cpu)}`} style={{ width: `${proc.cpu}%` }} />
                  </div>
                  <span className="w-8 text-right">{proc.cpu.toFixed(1)}%</span>
                </div>
                <span className="w-16 text-right">{proc.memory}MB</span>
                <span className="w-12 text-right text-ide-text-secondary">{proc.threads}</span>
                <span className={`w-16 text-right ${proc.status === 'running' ? 'text-green-400' : 'text-ide-text-secondary'}`}>{proc.status}</span>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'network' && (
          <div className="space-y-3">
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="text-xs font-semibold mb-2">Active Connections</div>
              {[
                { remote: '127.0.0.1:5173', type: 'TCP', state: 'ESTABLISHED', bytes: '2.4 MB' },
                { remote: '127.0.0.1:3000', type: 'TCP', state: 'ESTABLISHED', bytes: '156 KB' },
                { remote: '127.0.0.1:4000', type: 'WebSocket', state: 'ESTABLISHED', bytes: '89 KB' },
                { remote: '34.120.x.x:443', type: 'TLS', state: 'CLOSE_WAIT', bytes: '12 KB' },
              ].map((conn, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-ide-border/30 last:border-0">
                  <span className="font-mono text-cyan-400 flex-1 truncate">{conn.remote}</span>
                  <span className="text-ide-text-secondary">{conn.type}</span>
                  <span className={conn.state === 'ESTABLISHED' ? 'text-green-400' : 'text-yellow-400'}>{conn.state}</span>
                  <span className="text-ide-text-secondary">{conn.bytes}</span>
                </div>
              ))}
            </div>
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="text-xs font-semibold mb-2">Port Listeners</div>
              {[
                { port: 5173, process: 'vite', protocol: 'TCP', address: '0.0.0.0' },
                { port: 3000, process: 'node', protocol: 'TCP', address: '127.0.0.1' },
                { port: 4000, process: 'node', protocol: 'TCP', address: '127.0.0.1' },
                { port: 8080, process: 'electron', protocol: 'TCP', address: '127.0.0.1' },
              ].map((listener, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-ide-border/30 last:border-0">
                  <span className="w-12 font-mono text-green-400">{listener.port}</span>
                  <span className="flex-1">{listener.process}</span>
                  <span className="text-ide-text-secondary">{listener.protocol}</span>
                  <span className="text-ide-text-secondary">{listener.address}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
