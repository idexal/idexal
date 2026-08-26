import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  FaCode, FaPlay, FaSquare, FaSync, FaClock, FaChevronDown, FaChevronRight, FaChartLine, FaBolt
} from '../Icon'

interface ProfilerEntry {
  name: string
  startTime: number
  duration: number
  selfTime: number
  children: ProfilerEntry[]
  depth: number
}

interface MetricPoint {
  timestamp: number
  value: number
  label: string
}

interface ProfilerSession {
  id: string
  name: string
  date: Date
  duration: number
  entries: ProfilerEntry[]
  totalMemory: number
  peakMemory: number
  gcCount: number
}

const MOCK_ENTRIES: ProfilerEntry[] = [
  {
    name: 'main()',
    startTime: 0,
    duration: 1200,
    selfTime: 50,
    depth: 0,
    children: [
      {
        name: 'initializeApp()',
        startTime: 50,
        duration: 400,
        selfTime: 100,
        depth: 1,
        children: [
          { name: 'loadConfig()', startTime: 50, duration: 80, selfTime: 80, depth: 2, children: [] },
          { name: 'connectDB()', startTime: 130, duration: 150, selfTime: 150, depth: 2, children: [] },
          { name: 'loadModules()', startTime: 280, duration: 170, selfTime: 70, depth: 2, children: [
            { name: 'parseModule()', startTime: 280, duration: 80, selfTime: 80, depth: 3, children: [] },
            { name: 'compileModule()', startTime: 360, duration: 90, selfTime: 90, depth: 3, children: [] },
          ] },
        ]
      },
      {
        name: 'handleRequest()',
        startTime: 450,
        duration: 600,
        selfTime: 30,
        depth: 1,
        children: [
          { name: 'parseRoute()', startTime: 450, duration: 20, selfTime: 20, depth: 2, children: [] },
          { name: 'validateInput()', startTime: 470, duration: 40, selfTime: 40, depth: 2, children: [] },
          { name: 'queryDatabase()', startTime: 510, duration: 350, selfTime: 350, depth: 2, children: [
            { name: 'buildQuery()', startTime: 510, duration: 50, selfTime: 50, depth: 3, children: [] },
            { name: 'executeQuery()', startTime: 560, duration: 250, selfTime: 250, depth: 3, children: [] },
            { name: 'parseResults()', startTime: 810, duration: 50, selfTime: 50, depth: 3, children: [] },
          ] },
          { name: 'transformData()', startTime: 860, duration: 80, selfTime: 80, depth: 2, children: [] },
          { name: 'renderResponse()', startTime: 940, duration: 110, selfTime: 60, depth: 2, children: [
            { name: 'serializeJSON()', startTime: 940, duration: 40, selfTime: 40, depth: 3, children: [] },
            { name: 'compress()', startTime: 980, duration: 70, selfTime: 70, depth: 3, children: [] },
          ] },
        ]
      },
      {
        name: 'cleanup()',
        startTime: 1050,
        duration: 150,
        selfTime: 50,
        depth: 1,
        children: [
          { name: 'closeConnections()', startTime: 1050, duration: 80, selfTime: 80, depth: 2, children: [] },
          { name: 'logMetrics()', startTime: 1130, duration: 70, selfTime: 70, depth: 2, children: [] },
        ]
      },
    ]
  }
]

const MOCK_SESSIONS: ProfilerSession[] = [
  { id: '1', name: 'Session 1', date: new Date(Date.now() - 300000), duration: 1200, entries: MOCK_ENTRIES, totalMemory: 45.2, peakMemory: 62.8, gcCount: 3 },
  { id: '2', name: 'Session 2', date: new Date(Date.now() - 600000), duration: 980, entries: MOCK_ENTRIES, totalMemory: 38.5, peakMemory: 55.1, gcCount: 2 },
  { id: '3', name: 'Session 3', date: new Date(Date.now() - 900000), duration: 1450, entries: MOCK_ENTRIES, totalMemory: 52.1, peakMemory: 71.3, gcCount: 5 },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

const FlameGraph: React.FC<{ entries: ProfilerEntry[]; maxDuration: number }> = ({ entries, maxDuration }) => {
  const [hoveredEntry, setHoveredEntry] = useState<ProfilerEntry | null>(null)

  const renderEntry = (entry: ProfilerEntry, totalWidth: number = 100) => {
    const width = (entry.duration / maxDuration) * 100
    const left = (entry.startTime / maxDuration) * 100
    const hue = entry.depth * 40 + 200
    const saturation = 60 + entry.selfTime / entry.duration * 40
    const lightness = 35 + entry.depth * 5

    return (
      <div key={`${entry.name}-${entry.startTime}`} className="relative">
        <div
          className="absolute rounded-sm cursor-pointer transition-all hover:brightness-125 flex items-center overflow-hidden"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 1)}%`,
            height: 24,
            top: entry.depth * 28,
            backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onMouseEnter={() => setHoveredEntry(entry)}
          onMouseLeave={() => setHoveredEntry(null)}
        >
          {width > 5 && (
            <span className="text-xs text-white/90 px-1 truncate">{entry.name}</span>
          )}
        </div>
        {entry.children.map(child => renderEntry(child))}
      </div>
    )
  }

  const maxDepth = Math.max(...entries.map(e => getMaxDepth(e)))
  const totalHeight = (maxDepth + 1) * 28 + 10

  return (
    <div className="relative" style={{ height: totalHeight }}>
      {entries.map(entry => renderEntry(entry))}
      {hoveredEntry && (
        <div className="absolute bottom-0 left-0 right-0 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs z-10">
          <span className="font-semibold">{hoveredEntry.name}</span>
          <span className="text-ide-text-secondary ml-2">
            Total: {hoveredEntry.duration}ms | Self: {hoveredEntry.selfTime}ms | 
            {((hoveredEntry.selfTime / hoveredEntry.duration) * 100).toFixed(0)}% self
          </span>
        </div>
      )}
    </div>
  )
}

function getMaxDepth(entry: ProfilerEntry): number {
  if (entry.children.length === 0) return entry.depth
  return Math.max(...entry.children.map(getMaxDepth))
}

export default function PerformanceProfilerPanel({ onClose }: { onClose: () => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [selectedSession, setSelectedSession] = useState<ProfilerSession>(MOCK_SESSIONS[0])
  const [sortBy, setSortBy] = useState<'total' | 'self'>('total')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const flatEntries = useMemo(() => {
    const flatten = (entries: ProfilerEntry[]): ProfilerEntry[] => {
      return entries.reduce<ProfilerEntry[]>((acc, entry) => [...acc, entry, ...flatten(entry.children)], [])
    }
    return flatten(selectedSession.entries)
      .sort((a, b) => sortBy === 'total' ? b.duration - a.duration : b.selfTime - a.selfTime)
  }, [selectedSession, sortBy])

  const maxDuration = selectedSession.duration

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    if (isRecording) {
      const newSession: ProfilerSession = {
        id: String(sessions.length + 1),
        name: `Session ${sessions.length + 1}`,
        date: new Date(),
        duration: 1200 + Math.random() * 500,
        entries: MOCK_ENTRIES,
        totalMemory: 40 + Math.random() * 20,
        peakMemory: 55 + Math.random() * 20,
        gcCount: Math.floor(2 + Math.random() * 5),
      }
      setSessions(prev => [newSession, ...prev])
      setSelectedSession(newSession)
    }
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-red-400" />
          <span className="text-sm font-semibold">Performance Profiler</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ide-border">
        <button
          onClick={toggleRecording}
          className={`flex items-center gap-1 px-3 py-1 rounded text-xs ${
            isRecording ? 'bg-red-600 animate-pulse' : 'bg-green-600 hover:bg-green-500'
          } text-white`}
        >
          {isRecording ? <FaSquare size={10} /> : <FaPlay size={10} />}
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <select
          value={selectedSession.id}
          onChange={e => setSelectedSession(sessions.find(s => s.id === e.target.value) || sessions[0])}
          className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
        >
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({timeAgo(s.date)})</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-1.5 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">Duration: <span className="text-ide-text">{selectedSession.duration}ms</span></span>
        <span className="text-ide-text-secondary">Memory: <span className="text-blue-400">{selectedSession.totalMemory}MB</span></span>
        <span className="text-ide-text-secondary">Peak: <span className="text-yellow-400">{selectedSession.peakMemory}MB</span></span>
        <span className="text-ide-text-secondary">GC: <span className="text-green-400">{selectedSession.gcCount}</span></span>
      </div>

      {/* Flame Graph */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="text-xs text-ide-text-secondary mb-2 flex items-center gap-1">
          <FaChartLine size={12} />
          Flame Graph
        </div>
        <div className="bg-ide-bg-secondary/30 rounded p-2 overflow-x-auto">
          <FlameGraph entries={selectedSession.entries} maxDuration={maxDuration} />
        </div>
      </div>

      {/* Top Functions */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border">
        <span className="text-xs text-ide-text-secondary">Top Functions:</span>
        <button
          onClick={() => setSortBy('total')}
          className={`px-2 py-0.5 text-xs rounded ${sortBy === 'total' ? 'bg-red-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
        >
          By Total Time
        </button>
        <button
          onClick={() => setSortBy('self')}
          className={`px-2 py-0.5 text-xs rounded ${sortBy === 'self' ? 'bg-red-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
        >
          By Self Time
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {flatEntries.slice(0, 20).map((entry, i) => (
          <div key={`${entry.name}-${i}`} className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border/30 hover:bg-ide-bg-secondary/30">
            <div className="flex items-center gap-1" style={{ paddingLeft: entry.depth * 16 }}>
              {entry.children.length > 0 && (
                <FaChevronRight size={10} className="text-ide-text-secondary" />
              )}
              <span className="text-xs font-mono">{entry.name}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3 text-xs">
              <div className="w-16 h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${(entry.duration / maxDuration) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right text-ide-text-secondary">{entry.duration}ms</span>
              <span className="w-16 text-right text-yellow-400">{entry.selfTime}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
