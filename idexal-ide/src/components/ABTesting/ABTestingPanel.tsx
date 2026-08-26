import React, { useState, useMemo } from 'react'
import {
  FaCode, FaPlay, FaPause, FaTrash, FaPlus, FaChartLine, FaChevronDown, FaChevronRight, FaUsers, FaCheckCircle, FaClock, FaBullseye, FaExclamationTriangle, FaEye, FaCopy, FaCheck
} from '../Icon'

interface ABExperiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  hypothesis: string
  variants: ABVariant[]
  metric: string
  targetSampleSize: number
  currentSampleSize: number
  confidence: number
  startDate: Date
  endDate: Date | null
  winner?: string
}

interface ABVariant {
  id: string
  name: string
  description: string
  traffic: number
  conversions: number
  conversionRate: number
  isControl: boolean
  color: string
}

const MOCK_EXPERIMENTS: ABExperiment[] = [
  {
    id: 'exp-1', name: 'New Onboarding Flow', description: 'Test simplified onboarding vs current flow',
    status: 'running', hypothesis: 'Simplified onboarding will increase activation by 15%',
    metric: 'Activation Rate', targetSampleSize: 5000, currentSampleSize: 3245, confidence: 92,
    startDate: new Date(Date.now() - 604800000), endDate: null,
    variants: [
      { id: 'v1', name: 'Control', description: 'Current onboarding (5 steps)', traffic: 50, conversions: 412, conversionRate: 25.4, isControl: true, color: '#6b7280' },
      { id: 'v2', name: 'Simplified', description: 'New onboarding (3 steps)', traffic: 50, conversions: 523, conversionRate: 32.2, isControl: false, color: '#22c55e' },
    ],
  },
  {
    id: 'exp-2', name: 'Pricing Page Layout', description: 'Test annual pricing prominence vs monthly',
    status: 'running', hypothesis: 'Annual pricing first will increase annual subscriptions by 20%',
    metric: 'Annual Subscription Rate', targetSampleSize: 3000, currentSampleSize: 1890, confidence: 78,
    startDate: new Date(Date.now() - 432000000), endDate: null,
    variants: [
      { id: 'v1', name: 'Control', description: 'Monthly pricing first', traffic: 50, conversions: 142, conversionRate: 15.0, isControl: true, color: '#6b7280' },
      { id: 'v2', name: 'Annual First', description: 'Annual pricing first', traffic: 50, conversions: 178, conversionRate: 18.8, isControl: false, color: '#3b82f6' },
    ],
  },
  {
    id: 'exp-3', name: 'CTA Button Color', description: 'Test green vs blue CTA buttons',
    status: 'completed', hypothesis: 'Green CTA will increase click-through by 10%',
    metric: 'Click-Through Rate', targetSampleSize: 10000, currentSampleSize: 10000, confidence: 98,
    startDate: new Date(Date.now() - 1209600000), endDate: new Date(Date.now() - 172800000), winner: 'v2',
    variants: [
      { id: 'v1', name: 'Green CTA', description: 'Green button (#22c55e)', traffic: 50, conversions: 423, conversionRate: 8.5, isControl: true, color: '#22c55e' },
      { id: 'v2', name: 'Blue CTA', description: 'Blue button (#3b82f6)', traffic: 50, conversions: 512, conversionRate: 10.2, isControl: false, color: '#3b82f6' },
    ],
  },
  {
    id: 'exp-4', name: 'Checkout Simplification', description: 'Test one-page checkout vs multi-step',
    status: 'draft', hypothesis: 'One-page checkout will reduce cart abandonment by 25%',
    metric: 'Cart Completion Rate', targetSampleSize: 2000, currentSampleSize: 0, confidence: 0,
    startDate: new Date(Date.now() + 86400000), endDate: null,
    variants: [
      { id: 'v1', name: 'Control', description: 'Multi-step checkout', traffic: 50, conversions: 0, conversionRate: 0, isControl: true, color: '#6b7280' },
      { id: 'v2', name: 'One-Page', description: 'Single page checkout', traffic: 50, conversions: 0, conversionRate: 0, isControl: false, color: '#a855f7' },
    ],
  },
]

const STATUS_CONFIG = {
  draft: { color: 'text-ide-text-secondary', bg: 'bg-ide-bg-secondary', label: 'Draft' },
  running: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Running' },
  paused: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Paused' },
  completed: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Completed' },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export default function ABTestingPanel({ onClose }: { onClose: () => void }) {
  const [experiments, setExperiments] = useState(MOCK_EXPERIMENTS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'experiments' | 'results' | 'settings'>('experiments')

  const stats = useMemo(() => ({
    total: experiments.length,
    running: experiments.filter(e => e.status === 'running').length,
    completed: experiments.filter(e => e.status === 'completed').length,
    totalParticipants: experiments.reduce((s, e) => s + e.currentSampleSize, 0),
  }), [experiments])

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">A/B Testing</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30"><FaPlus size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Total', value: stats.total, color: 'text-ide-text' },
          { label: 'Running', value: stats.running, color: 'text-green-400' },
          { label: 'Completed', value: stats.completed, color: 'text-blue-400' },
          { label: 'Participants', value: stats.totalParticipants.toLocaleString(), color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'experiments' as const, label: 'Experiments' }, { key: 'results' as const, label: 'Results' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'experiments' && experiments.map(exp => {
          const config = STATUS_CONFIG[exp.status]
          const progress = (exp.currentSampleSize / exp.targetSampleSize) * 100
          return (
            <div key={exp.id}>
              <div onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  {expandedId === exp.id ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bg} ${config.color}`}>{config.label}</span>
                  <span className="text-xs font-semibold flex-1">{exp.name}</span>
                  {exp.confidence > 90 && <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">{exp.confidence}% confidence</span>}
                </div>
                <div className="text-[10px] text-ide-text-secondary ml-5 truncate">{exp.description}</div>
                {exp.status === 'running' && (
                  <div className="mt-1 ml-5">
                    <div className="flex items-center justify-between text-[10px] text-ide-text-secondary mb-0.5">
                      <span>{exp.currentSampleSize.toLocaleString()} / {exp.targetSampleSize.toLocaleString()}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-ide-bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                  </div>
                )}
                {exp.winner && (
                  <div className="mt-1 ml-5 text-[10px] text-emerald-400 flex items-center gap-0.5">
                    <FaCheckCircle size={8} /> Winner: {exp.variants.find(v => v.id === exp.winner)?.name}
                  </div>
                )}
              </div>
              {expandedId === exp.id && (
                <div className="px-4 pb-3 space-y-3">
                  <div className="text-xs"><span className="text-ide-text-secondary">Hypothesis:</span> {exp.hypothesis}</div>
                  <div className="text-xs"><span className="text-ide-text-secondary">Metric:</span> {exp.metric}</div>
                  <div className="space-y-1.5">
                    {exp.variants.map(v => (
                      <div key={v.id} className="bg-ide-bg-secondary/30 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: v.color }} />
                          <span className="text-xs font-semibold">{v.name}</span>
                          {v.isControl && <span className="text-[10px] text-ide-text-secondary">(control)</span>}
                          {exp.winner === v.id && <span className="text-[10px] text-emerald-400">✓ Winner</span>}
                        </div>
                        <div className="text-[10px] text-ide-text-secondary">{v.description}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span>Traffic: {v.traffic}%</span>
                          <span>Conv: {v.conversions}</span>
                          <span className={`font-semibold ${v.conversionRate > (exp.variants.find(x => x.isControl)?.conversionRate || 0) ? 'text-emerald-400' : 'text-ide-text-secondary'}`}>
                            Rate: {v.conversionRate}%
                          </span>
                        </div>
                        <div className="w-full h-1 bg-ide-bg-secondary rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ width: `${v.conversionRate * 5}%`, backgroundColor: v.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
                    <span>Started: {timeAgo(exp.startDate)}</span>
                    {exp.endDate && <span>Ended: {timeAgo(exp.endDate)}</span>}
                    <span>Confidence: {exp.confidence}%</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {activeTab === 'results' && (
          <div className="p-3 space-y-3">
            {experiments.filter(e => e.status === 'completed' || e.confidence > 90).map(exp => (
              <div key={exp.id} className="border border-ide-border/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FaCheckCircle size={12} className="text-emerald-400" />
                  <span className="text-xs font-semibold">{exp.name}</span>
                  <span className="text-xs text-emerald-400">{exp.confidence}% confidence</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {exp.variants.map(v => (
                    <div key={v.id} className="bg-ide-bg-secondary/30 rounded p-2 text-xs">
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: v.color }} />
                        <span className="font-semibold">{v.name}</span>
                        {exp.winner === v.id && <span className="text-emerald-400">★</span>}
                      </div>
                      <div className="text-ide-text-secondary">{v.conversionRate}% conversion</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
