import React, { useState, useEffect, useMemo } from 'react'
import {
  FaCode, FaFileAlt, FaCodeBranch, FaClock, FaBolt, FaBrain, FaChartLine
} from '../Icon'
import { workspaceStatsService, ProjectMetrics } from '../../services/workspaceStatsService'

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: 'bg-blue-500',
  javascript: 'bg-yellow-500',
  react: 'bg-cyan-500',
  html: 'bg-orange-500',
  css: 'bg-purple-500',
  rust: 'bg-red-500',
  python: 'bg-green-500',
  json: 'bg-gray-500',
  markdown: 'bg-indigo-500',
  other: 'bg-gray-400',
}

export default function WorkspaceStatsPanel({ onClose }: { onClose?: () => void }) {
  const [metrics, setMetrics] = useState<ProjectMetrics>(workspaceStatsService.getMetrics())

  useEffect(() => {
    const unsub = workspaceStatsService.subscribe(() => {
      setMetrics(workspaceStatsService.getMetrics())
    })
    return unsub
  }, [])

  const languages = useMemo(() => workspaceStatsService.getLanguageBreakdown(), [metrics])
  const activity = workspaceStatsService.getActivity()

  const maxLines = Math.max(...languages.map(l => l.lines), 1)

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={14} className="text-green-400" />
          <span className="text-xs font-semibold">Workspace Statistics</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-ide-border text-ide-text-muted">
          <FaChartLine size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Overview Cards */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={<FaFileAlt size={12} />} label="Files" value={metrics.files.totalFiles} color="text-blue-400" />
          <StatCard icon={<FaFileAlt size={12} />} label="Lines" value={metrics.files.totalLines.toLocaleString()} color="text-green-400" />
          <StatCard icon={<FaCodeBranch size={12} />} label="Commits" value={metrics.git.totalCommits} color="text-orange-400" />
          <StatCard icon={<FaBolt size={12} />} label="Commands" value={activity.commandsRun} color="text-yellow-400" />
        </div>

        {/* Language Breakdown */}
        <div className="border border-ide-border/30 rounded-lg p-3">
          <h3 className="text-[10px] font-medium text-ide-text mb-2">Language Breakdown</h3>
          {languages.length === 0 ? (
            <p className="text-[9px] text-ide-text-secondary">No files scanned yet</p>
          ) : (
            <div className="space-y-2">
              {languages.slice(0, 8).map(lang => (
                <div key={lang.language} className="flex items-center gap-2">
                  <span className="w-20 text-[9px] text-ide-text-secondary truncate">{lang.language}</span>
                  <div className="flex-1 h-2 bg-ide-bg-secondary rounded overflow-hidden">
                    <div
                      className={`h-full ${LANGUAGE_COLORS[lang.language] || LANGUAGE_COLORS.other} rounded`}
                      style={{ width: `${(lang.lines / maxLines) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-[9px] text-ide-text-secondary text-right">{lang.lines.toLocaleString()}</span>
                  <span className="w-8 text-[8px] text-ide-text-muted text-right">{lang.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FaChartLine Summary */}
        <div className="border border-ide-border/30 rounded-lg p-3">
          <h3 className="text-[10px] font-medium text-ide-text mb-2">Session FaChartLine</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-cyan-400">{activity.commandsRun}</div>
              <div className="text-[8px] text-ide-text-secondary">Commands Run</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-400">{activity.aiRequests}</div>
              <div className="text-[8px] text-ide-text-secondary">AI Requests</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">{activity.filesOpened}</div>
              <div className="text-[8px] text-ide-text-secondary">Files Opened</div>
            </div>
          </div>
          <div className="mt-2 text-center text-[9px] text-ide-text-secondary">
            Session duration: {formatDuration(activity.sessionDuration)}
          </div>
        </div>

        {/* Largest Files */}
        {metrics.files.largestFiles.length > 0 && (
          <div className="border border-ide-border/30 rounded-lg p-3">
            <h3 className="text-[10px] font-medium text-ide-text mb-2">Largest Files</h3>
            <div className="space-y-1">
              {metrics.files.largestFiles.slice(0, 5).map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className="text-ide-text-secondary w-4">{i + 1}.</span>
                  <span className="flex-1 truncate text-ide-text font-mono">{file.path}</span>
                  <span className="text-ide-text-secondary">{file.lines.toLocaleString()} lines</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Git Stats */}
        {metrics.git.contributors.length > 0 && (
          <div className="border border-ide-border/30 rounded-lg p-3">
            <h3 className="text-[10px] font-medium text-ide-text mb-2">Top Contributors</h3>
            <div className="space-y-1">
              {metrics.git.contributors.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className="text-ide-text-secondary w-4">{i + 1}.</span>
                  <span className="flex-1 text-ide-text">{c.name}</span>
                  <span className="text-ide-text-secondary">{c.commits} commits</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string
}) {
  return (
    <div className="border border-ide-border/30 rounded-lg p-2 text-center">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <div className="text-sm font-bold text-ide-text">{value}</div>
      <div className="text-[8px] text-ide-text-secondary">{label}</div>
    </div>
  )
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
