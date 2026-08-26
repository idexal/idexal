import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  FaCode, FaChartLine, FaUsers, FaClock, FaCodeBranch, FaFileAlt, FaBolt, FaCalendar, FaChevronDown
} from '../Icon'

interface MetricData {
  label: string
  value: number
  change: number
  icon: React.ElementType
  color: string
}

interface DailyStat {
  date: string
  commits: number
  linesAdded: number
  linesRemoved: number
  filesChanged: number
}

const MOCK_DAILY: DailyStat[] = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
  commits: Math.floor(3 + Math.random() * 12),
  linesAdded: Math.floor(50 + Math.random() * 500),
  linesRemoved: Math.floor(10 + Math.random() * 200),
  filesChanged: Math.floor(2 + Math.random() * 15),
}))

const FILE_TYPES = [
  { ext: '.tsx', count: 51, lines: 8500, color: '#61dafb' },
  { ext: '.ts', count: 22, lines: 5200, color: '#3178c6' },
  { ext: '.css', count: 3, lines: 1200, color: '#264de4' },
  { ext: '.json', count: 8, lines: 450, color: '#f7df1e' },
  { ext: '.md', count: 2, lines: 180, color: '#ffffff' },
  { ext: '.html', count: 1, lines: 15, color: '#e34f26' },
]

const TOP_CONTRIBUTORS = [
  { name: 'Developer', commits: 247, lines: 18500, avatar: '👤' },
  { name: 'AI Agent (FaCode)', commits: 89, lines: 6200, avatar: '🤖' },
  { name: 'AI Agent (Review)', commits: 34, lines: 1800, avatar: '🔍' },
]

export default function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('14d')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'files' | 'contributors'>('overview')

  const stats: MetricData[] = useMemo(() => [
    { label: 'Total Commits', value: MOCK_DAILY.reduce((s, d) => s + d.commits, 0), change: 12.5, icon: FaCodeBranch, color: 'text-green-400' },
    { label: 'Lines Added', value: MOCK_DAILY.reduce((s, d) => s + d.linesAdded, 0), change: 8.3, icon: FaCode, color: 'text-blue-400' },
    { label: 'Files Changed', value: MOCK_DAILY.reduce((s, d) => s + d.filesChanged, 0), change: -2.1, icon: FaFileAlt, color: 'text-yellow-400' },
    { label: 'Active Hours', value: 86, change: 5.7, icon: FaClock, color: 'text-purple-400' },
  ], [])

  // Draw commit chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width = canvas.parentElement?.clientWidth || 600
    const h = canvas.height = 120

    ctx.clearRect(0, 0, w, h)

    const data = MOCK_DAILY
    const maxCommits = Math.max(...data.map(d => d.commits))
    const barWidth = (w - 40) / data.length
    const barGap = 4

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    for (let y = 0; y < h - 20; y += 20) {
      ctx.beginPath()
      ctx.moveTo(30, y + 5)
      ctx.lineTo(w, y + 5)
      ctx.stroke()
    }

    // Bars
    data.forEach((d, i) => {
      const x = 35 + i * barWidth
      const barH = (d.commits / maxCommits) * (h - 30)
      const y = h - 15 - barH

      // Commits bar
      const gradient = ctx.createLinearGradient(x, y, x, h - 15)
      gradient.addColorStop(0, '#22c55e')
      gradient.addColorStop(1, '#22c55e40')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth - barGap, barH, [3, 3, 0, 0])
      ctx.fill()

      // Lines added line
      const linesH = (d.linesAdded / (Math.max(...data.map(dd => dd.linesAdded)))) * (h - 30)
      const linesY = h - 15 - linesH
      if (i > 0) {
        const prevX = 35 + (i - 1) * barWidth + (barWidth - barGap) / 2
        const prevLinesH = (data[i - 1].linesAdded / (Math.max(...data.map(dd => dd.linesAdded)))) * (h - 30)
        const prevY = h - 15 - prevLinesH
        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(x + (barWidth - barGap) / 2, linesY)
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Date label
      ctx.fillStyle = '#6c7086'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(d.date, x + (barWidth - barGap) / 2, h - 3)
    })
  }, [timeRange])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-violet-400" />
          <span className="text-sm font-semibold">Analytics</span>
        </div>
        <div className="flex items-center gap-1">
          <select value={timeRange} onChange={e => setTimeRange(e.target.value as typeof timeRange)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-0.5 text-xs">
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'commits' as const, label: 'Commits' },
          { key: 'files' as const, label: 'Files' },
          { key: 'contributors' as const, label: 'Contributors' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-violet-400 text-violet-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Overview Stats */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {stats.map(s => (
                <div key={s.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <s.icon size={12} className={s.color} />
                    <span className="text-xs text-ide-text-secondary">{s.label}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()}</span>
                    <span className={`text-xs mb-0.5 ${s.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.change > 0 ? '+' : ''}{s.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-ide-text-secondary mb-2">Commit FaChartLine</div>
              <canvas ref={canvasRef} className="w-full" style={{ height: 120 }} />
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500" />Commits</span>
                <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-500" />Lines Added</span>
              </div>
            </div>
          </>
        )}

        {/* Commits Tab */}
        {activeTab === 'commits' && (
          <div className="space-y-1">
            {MOCK_DAILY.reverse().map(d => (
              <div key={d.date} className="flex items-center gap-2 px-2 py-1.5 hover:bg-ide-bg-secondary/30 text-xs">
                <span className="w-8 text-ide-text-secondary">{d.date}</span>
                <div className="flex-1 h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden flex gap-px">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(d.commits / 15) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-green-400">{d.commits}</span>
                <span className="w-16 text-right text-blue-400">+{d.linesAdded}</span>
                <span className="w-16 text-right text-red-400">-{d.linesRemoved}</span>
                <span className="w-8 text-right text-ide-text-secondary">{d.filesChanged}f</span>
              </div>
            ))}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-ide-text-secondary mb-2">File Types Distribution</div>
              {FILE_TYPES.map(ft => (
                <div key={ft.ext} className="flex items-center gap-2 mb-1.5">
                  <span className="w-10 text-xs font-mono" style={{ color: ft.color }}>{ft.ext}</span>
                  <div className="flex-1 h-2 bg-ide-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(ft.count / 55) * 100}%`, backgroundColor: ft.color }} />
                  </div>
                  <span className="w-8 text-xs text-right">{ft.count}</span>
                  <span className="w-14 text-xs text-right text-ide-text-secondary">{ft.lines.toLocaleString()}L</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                <div className="text-xs text-ide-text-secondary">Total Files</div>
                <div className="text-lg font-bold text-violet-400">{FILE_TYPES.reduce((s, f) => s + f.count, 0)}</div>
              </div>
              <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                <div className="text-xs text-ide-text-secondary">Total Lines</div>
                <div className="text-lg font-bold text-blue-400">{FILE_TYPES.reduce((s, f) => s + f.lines, 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Contributors Tab */}
        {activeTab === 'contributors' && (
          <div className="space-y-2">
            {TOP_CONTRIBUTORS.map(c => (
              <div key={c.name} className="flex items-center gap-3 p-2 bg-ide-bg-secondary/30 border border-ide-border/50 rounded">
                <span className="text-2xl">{c.avatar}</span>
                <div className="flex-1">
                  <span className="text-xs font-semibold">{c.name}</span>
                  <div className="text-xs text-ide-text-secondary">{c.commits} commits · {c.lines.toLocaleString()} lines</div>
                </div>
                <div className="w-20">
                  <div className="h-2 bg-ide-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(c.lines / 20000) * 100}%` }} />
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
