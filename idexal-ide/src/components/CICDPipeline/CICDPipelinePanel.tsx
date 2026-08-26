import React, { useState, useMemo } from 'react'
import {
  FaPlay, FaSquare, FaCheckCircle, FaTimesCircle, FaClock, FaCode, FaUndo, FaChevronDown, FaChevronRight, FaArrowRight, FaCodeBranch, FaBox, FaShieldAlt, FaRocket, FaBell, FaEye, FaCopy, FaCheck, FaTerminal, FaSpinner
} from '../Icon'

interface PipelineStage {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration: number | null
  startedAt: Date | null
  jobs: PipelineJob[]
}

interface PipelineJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration: number | null
  log: string
}

interface PipelineRun {
  id: string
  branch: string
  commit: string
  commitMessage: string
  author: string
  status: 'running' | 'success' | 'failed' | 'pending'
  stages: PipelineStage[]
  startedAt: Date
  totalDuration: number | null
}

const MOCK_RUNS: PipelineRun[] = [
  {
    id: 'run-42',
    branch: 'feature/multi-agent',
    commit: 'a1b2c3d',
    commitMessage: 'feat: add agent orchestration system',
    author: 'Developer',
    status: 'running',
    startedAt: new Date(Date.now() - 180000),
    totalDuration: null,
    stages: [
      {
        id: 'build', name: 'Build', status: 'success', duration: 45000, startedAt: new Date(Date.now() - 180000),
        jobs: [
          { id: 'b1', name: 'Install Dependencies', status: 'success', duration: 12000, log: 'npm install\nAdded 847 packages in 12s' },
          { id: 'b2', name: 'Compile TypeScript', status: 'success', duration: 18000, log: 'tsc --noEmit\nFound 0 errors' },
          { id: 'b3', name: 'Bundle Production', status: 'success', duration: 15000, log: 'vite build\nBuilt 944KB in 4.12s' },
        ]
      },
      {
        id: 'test', name: 'Test', status: 'success', duration: 35000, startedAt: new Date(Date.now() - 135000),
        jobs: [
          { id: 't1', name: 'Unit Tests', status: 'success', duration: 8000, log: 'vitest run\n✓ 27/27 tests passed' },
          { id: 't2', name: 'Integration Tests', status: 'success', duration: 15000, log: 'Running integration tests...\n✓ 12/12 passed' },
          { id: 't3', name: 'E2E Tests', status: 'success', duration: 12000, log: 'playwright test\n✓ 8/8 tests passed' },
        ]
      },
      {
        id: 'security', name: 'Security Scan', status: 'running', duration: null, startedAt: new Date(Date.now() - 100000),
        jobs: [
          { id: 's1', name: 'Dependency Audit', status: 'success', duration: 5000, log: 'npm audit\n0 vulnerabilities found' },
          { id: 's2', name: 'SAST Scan', status: 'running', duration: null, log: 'Running static analysis...\nScanning 51 files...' },
          { id: 's3', name: 'Secret Detection', status: 'pending', duration: null, log: '' },
        ]
      },
      {
        id: 'deploy', name: 'Deploy', status: 'pending', duration: null, startedAt: null,
        jobs: [
          { id: 'd1', name: 'Build Docker Image', status: 'pending', duration: null, log: '' },
          { id: 'd2', name: 'Push to Registry', status: 'pending', duration: null, log: '' },
          { id: 'd3', name: 'Deploy to Staging', status: 'pending', duration: null, log: '' },
        ]
      },
    ],
  },
  {
    id: 'run-41',
    branch: 'main',
    commit: 'e4f5g6h',
    commitMessage: 'fix: resolve terminal rendering issue',
    author: 'Developer',
    status: 'success',
    startedAt: new Date(Date.now() - 3600000),
    totalDuration: 285000,
    stages: [
      { id: 'build', name: 'Build', status: 'success', duration: 42000, startedAt: new Date(Date.now() - 3600000), jobs: [] },
      { id: 'test', name: 'Test', status: 'success', duration: 33000, startedAt: new Date(Date.now() - 3558000), jobs: [] },
      { id: 'security', name: 'Security Scan', status: 'success', duration: 25000, startedAt: new Date(Date.now() - 3525000), jobs: [] },
      { id: 'deploy', name: 'Deploy', status: 'success', duration: 185000, startedAt: new Date(Date.now() - 3500000), jobs: [] },
    ],
  },
  {
    id: 'run-40',
    branch: 'hotfix/memory-leak',
    commit: 'i7j8k9l',
    commitMessage: 'fix: memory leak in agent orchestrator',
    author: 'Developer',
    status: 'failed',
    startedAt: new Date(Date.now() - 7200000),
    totalDuration: 120000,
    stages: [
      { id: 'build', name: 'Build', status: 'success', duration: 45000, startedAt: new Date(Date.now() - 7200000), jobs: [] },
      { id: 'test', name: 'Test', status: 'failed', duration: 35000, startedAt: new Date(Date.now() - 7155000), jobs: [] },
      { id: 'security', name: 'Security Scan', status: 'skipped', duration: null, startedAt: null, jobs: [] },
      { id: 'deploy', name: 'Deploy', status: 'skipped', duration: null, startedAt: null, jobs: [] },
    ],
  },
]

const STATUS_COLORS = {
  pending: 'text-ide-text-secondary',
  running: 'text-blue-400',
  success: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-ide-text-secondary',
}

const STATUS_ICONS = {
  pending: FaClock,
  running: FaSpinner,
  success: FaCheckCircle,
  failed: FaTimesCircle,
  skipped: FaChevronRight,
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '--'
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export default function CICDPipelinePanel({ onClose }: { onClose: () => void }) {
  const [runs] = useState(MOCK_RUNS)
  const [selectedRun, setSelectedRun] = useState<PipelineRun>(MOCK_RUNS[0])
  const [expandedStage, setExpandedStage] = useState<string | null>('security')
  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)
  const [copied, setCopied] = useState(false)

  const stageProgress = useMemo(() => {
    return selectedRun.stages.map(s => ({
      ...s,
      percent: s.status === 'success' ? 100 : s.status === 'failed' ? 100 : s.status === 'running' ? 65 : 0,
    }))
  }, [selectedRun])

  const copyLog = (log: string) => {
    navigator.clipboard?.writeText(log)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaRocket size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">CI/CD Pipeline</span>
          {selectedRun.status === 'running' && <span className="text-xs text-blue-400 animate-pulse">● Running</span>}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Re-run">
            <FaUndo size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Current Run Info */}
      <div className="px-3 py-2 border-b border-ide-border space-y-1">
        <div className="flex items-center gap-2">
          <FaCodeBranch size={12} className="text-emerald-400" />
          <span className="text-xs font-semibold">{selectedRun.branch}</span>
          <span className="text-xs font-mono text-ide-text-secondary">{selectedRun.commit}</span>
        </div>
        <div className="text-xs text-ide-text-secondary truncate">{selectedRun.commitMessage}</div>
        <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
          <span>{selectedRun.author}</span>
          <span>{timeAgo(selectedRun.startedAt)}</span>
          {selectedRun.totalDuration && <span>{formatDuration(selectedRun.totalDuration)}</span>}
        </div>
      </div>

      {/* Pipeline Stages Visual */}
      <div className="px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-1">
          {stageProgress.map((stage, i) => (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                className={`flex-1 px-2 py-1.5 rounded text-xs text-center border transition-all ${
                  expandedStage === stage.id ? 'border-emerald-400' : 'border-ide-border'
                } ${
                  stage.status === 'success' ? 'bg-green-500/10' :
                  stage.status === 'failed' ? 'bg-red-500/10' :
                  stage.status === 'running' ? 'bg-blue-500/10' :
                  'bg-ide-bg-secondary/30'
                }`}
              >
                <div className={`font-semibold ${STATUS_COLORS[stage.status]}`}>{stage.name}</div>
                <div className="text-ide-text-secondary mt-0.5">{formatDuration(stage.duration)}</div>
              </button>
              {i < stageProgress.length - 1 && (
                <FaArrowRight size={10} className="text-ide-text-secondary flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Expanded Stage Details */}
      {expandedStage && (
        <div className="border-b border-ide-border">
          <div className="px-3 py-1 text-xs text-ide-text-secondary bg-ide-bg-secondary/30">
            {selectedRun.stages.find(s => s.id === expandedStage)?.name} Jobs
          </div>
          {selectedRun.stages.find(s => s.id === expandedStage)?.jobs.map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-ide-bg-secondary/30 cursor-pointer border-b border-ide-border/30"
            >
              {React.createElement(STATUS_ICONS[job.status], {
                size: 12,
                className: `${STATUS_COLORS[job.status]} ${job.status === 'running' ? 'animate-spin' : ''}`,
              })}
              <span className="text-xs flex-1">{job.name}</span>
              <span className="text-xs text-ide-text-secondary">{formatDuration(job.duration)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Job Log */}
      {selectedJob && (
        <div className="border-b border-ide-border">
          <div className="flex items-center justify-between px-3 py-1 bg-ide-bg-secondary/30">
            <span className="text-xs text-ide-text-secondary flex items-center gap-1">
              <FaSpinner size={10} />
              {selectedJob.name}
            </span>
            <button onClick={() => copyLog(selectedJob.log)} className="text-xs text-ide-text-secondary hover:text-ide-text">
              {copied ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} />}
            </button>
          </div>
          <pre className="px-3 py-2 text-xs font-mono text-ide-text bg-ide-bg-secondary/20 max-h-32 overflow-y-auto">
            {selectedJob.log || 'No output yet...'}
          </pre>
        </div>
      )}

      {/* Run History */}
      <div className="flex items-center px-3 py-1.5 border-b border-ide-border">
        <span className="text-xs text-ide-text-secondary">Run History</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {runs.map(run => (
          <div
            key={run.id}
            onClick={() => { setSelectedRun(run); setSelectedJob(null) }}
            className={`flex items-center gap-2 px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/30 cursor-pointer ${
              selectedRun.id === run.id ? 'bg-ide-bg-secondary/30' : ''
            }`}
          >
            {React.createElement(STATUS_ICONS[run.status], {
              size: 14,
              className: `${STATUS_COLORS[run.status]} ${run.status === 'running' ? 'animate-spin' : ''}`,
            })}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{run.branch}</span>
                <span className="text-xs font-mono text-ide-text-secondary">{run.commit}</span>
              </div>
              <div className="text-xs text-ide-text-secondary truncate">{run.commitMessage}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ide-text-secondary">{timeAgo(run.startedAt)}</div>
              {run.totalDuration && <div className="text-xs text-ide-text-secondary">{formatDuration(run.totalDuration)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
