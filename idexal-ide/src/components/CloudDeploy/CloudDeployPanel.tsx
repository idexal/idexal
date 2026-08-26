import React, { useState, useEffect, useMemo } from 'react'
import {
  FaCloud, FaRocket, FaCheckCircle, FaTimesCircle, FaClock, FaCode, FaSync, FaChevronDown, FaChevronRight, FaGlobe, FaServer, FaShieldAlt, FaBolt, FaExternalLinkAlt, FaTerminal, FaExclamationTriangle, FaCopy, FaCheck
} from '../Icon'

interface Deployment {
  id: string
  environment: string
  provider: string
  status: 'deploying' | 'success' | 'failed' | 'queued' | 'cancelled'
  version: string
  commit: string
  branch: string
  startedAt: Date
  completedAt: Date | null
  duration: number | null
  logs: string[]
  url: string
}

interface DeployConfig {
  provider: string
  region: string
  buildCommand: string
  outputDir: string
  envVars: Record<string, string>
  autoDeploy: boolean
  branch: string
}

const MOCK_DEPLOYMENTS: Deployment[] = [
  { id: 'dep-1', environment: 'production', provider: 'Vercel', status: 'success', version: 'v2.4.1', commit: 'a1b2c3d', branch: 'main', startedAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 7020000), duration: 180, logs: ['Building...', 'Installing dependencies', 'Compiling TypeScript', 'Optimizing bundle', 'Deploying to edge', 'Deployed successfully'], url: 'https://idexal.vercel.app' },
  { id: 'dep-2', environment: 'staging', provider: 'Railway', status: 'success', version: 'v2.4.0-rc.1', commit: 'e4f5g6h', branch: 'release/2.4', startedAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 3480000), duration: 120, logs: ['Building...', 'Deploying', 'Health check passed'], url: 'https://staging-idexal.railway.app' },
  { id: 'dep-3', environment: 'production', provider: 'AWS', status: 'deploying', version: 'v2.5.0', commit: 'i7j8k9l', branch: 'main', startedAt: new Date(Date.now() - 300000), completedAt: null, duration: null, logs: ['Building Docker image...', 'Pushing to ECR...'], url: '' },
  { id: 'dep-4', environment: 'development', provider: 'Fly.io', status: 'failed', version: 'v2.3.9', commit: 'm0n1o2p', branch: 'dev', startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86340000), duration: 60, logs: ['Building...', 'Error: Build failed - memory limit exceeded'], url: '' },
]

const PROVIDERS = [
  { id: 'vercel', name: 'Vercel', icon: '▲', color: 'text-white', regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'] },
  { id: 'railway', name: 'Railway', icon: '🚂', color: 'text-purple-400', regions: ['us-west1', 'eu-west1'] },
  { id: 'fly', name: 'Fly.io', icon: '🪁', color: 'text-violet-400', regions: ['iad', 'lhr', 'nrt'] },
  { id: 'aws', name: 'AWS', icon: '☁️', color: 'text-orange-400', regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'] },
  { id: 'cloudflare', name: 'Cloudflare Pages', icon: '🔶', color: 'text-orange-400', regions: ['auto'] },
  { id: 'netlify', name: 'Netlify', icon: '◆', color: 'text-teal-400', regions: ['us-east-1', 'eu-central-1'] },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export default function CloudDeployPanel({ onClose }: { onClose: () => void }) {
  const [deployments, setDeployments] = useState(MOCK_DEPLOYMENTS)
  const [selectedDeploy, setSelectedDeploy] = useState<Deployment>(MOCK_DEPLOYMENTS[0])
  const [config, setConfig] = useState<DeployConfig>({
    provider: 'vercel', region: 'us-east-1', buildCommand: 'npm run build', outputDir: 'dist', envVars: {}, autoDeploy: true, branch: 'main'
  })
  const [isDeploying, setIsDeploying] = useState(false)
  const [expandedLog, setExpandedLog] = useState(false)
  const [activeTab, setActiveTab] = useState<'deployments' | 'configure' | 'providers'>('deployments')
  const [copied, setCopied] = useState(false)

  // Simulate active deployment
  useEffect(() => {
    const active = deployments.find(d => d.status === 'deploying')
    if (!active) return
    const interval = setInterval(() => {
      setDeployments(prev => prev.map(d => {
        if (d.id !== active.id) return d
        const newLogs = [...d.logs]
        const steps = ['Building TypeScript...', 'Generating static assets', 'Running tests...', 'Optimizing bundle...', 'Uploading to CDN...', 'Configuring SSL...', 'Health check...', 'Deployed! 🎉']
        const nextStep = steps[newLogs.length - 2] || steps[steps.length - 1]
        if (newLogs.length < steps.length) newLogs.push(nextStep)
        const isDone = nextStep === 'Deployed! 🎉'
        return {
          ...d,
          logs: newLogs,
          status: isDone ? 'success' : 'deploying',
          completedAt: isDone ? new Date() : null,
          duration: isDone ? Math.floor((Date.now() - d.startedAt.getTime()) / 1000) : null,
          url: isDone ? 'https://idexal.vercel.app' : '',
        }
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [deployments])

  const startDeploy = async () => {
    const provider = PROVIDERS.find(p => p.id === config.provider)
    const newDeploy: Deployment = {
      id: `dep-${Date.now()}`,
      environment: 'production',
      provider: provider?.name || config.provider,
      status: 'deploying',
      version: `v${Date.now().toString(36).slice(-4)}`,
      commit: Math.random().toString(36).slice(2, 9),
      branch: config.branch,
      startedAt: new Date(),
      completedAt: null,
      duration: null,
      logs: ['Starting deployment...'],
      url: '',
    }
    setDeployments(prev => [newDeploy, ...prev])
    setSelectedDeploy(newDeploy)
    setIsDeploying(true)
  }

  const statusColors = {
    deploying: 'text-blue-400',
    success: 'text-green-400',
    failed: 'text-red-400',
    queued: 'text-yellow-400',
    cancelled: 'text-ide-text-secondary',
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCloud size={16} className="text-sky-400" />
          <span className="text-sm font-semibold">Cloud Deploy</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'deployments' as const, label: 'Deployments' },
          { key: 'configure' as const, label: 'Configure' },
          { key: 'providers' as const, label: 'Providers' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
              activeTab === tab.key ? 'border-sky-400 text-sky-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Deployments Tab */}
        {activeTab === 'deployments' && (
          <div>
            {deployments.map(dep => (
              <div
                key={dep.id}
                onClick={() => setSelectedDeploy(dep)}
                className={`px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer ${
                  selectedDeploy.id === dep.id ? 'bg-ide-bg-secondary/20' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {dep.status === 'deploying' ? (
                    <FaCode size={12} className="text-blue-400 animate-spin" />
                  ) : dep.status === 'success' ? (
                    <FaCheckCircle size={12} className="text-green-400" />
                  ) : (
                    <FaTimesCircle size={12} className="text-red-400" />
                  )}
                  <span className="text-xs font-semibold flex-1">{dep.version}</span>
                  <span className={`text-xs ${statusColors[dep.status]}`}>{dep.status}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ide-text-secondary">
                  <span>{dep.provider}</span>
                  <span>•</span>
                  <span>{dep.environment}</span>
                  <span>•</span>
                  <span>{dep.branch}@{dep.commit}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ide-text-secondary mt-0.5">
                  <span>{timeAgo(dep.startedAt)}</span>
                  {dep.duration && <span>• {dep.duration}s</span>}
                  {dep.url && (
                    <a href={dep.url} target="_blank" rel="noopener" className="text-sky-400 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <FaExternalLinkAlt size={8} /> Live
                    </a>
                  )}
                </div>

                {/* Expanded logs */}
                {selectedDeploy.id === dep.id && (
                  <div className="mt-2 space-y-1">
                    <div className="bg-ide-bg-secondary/30 rounded p-2">
                      {dep.logs.map((log, i) => (
                        <div key={i} className="text-xs font-mono text-ide-text-secondary flex items-center gap-1">
                          <span className="text-ide-text-secondary/40">{i + 1}</span>
                          {i === dep.logs.length - 1 && dep.status === 'deploying' ? (
                            <span className="text-blue-400">{log} <span className="animate-pulse">▌</span></span>
                          ) : (
                            <span>{log}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {dep.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ide-text-secondary">URL:</span>
                        <span className="text-xs text-sky-400 font-mono">{dep.url}</span>
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(dep.url); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                          {copied ? <FaCheck size={10} className="text-green-400" /> : <FaCopy size={10} className="text-ide-text-secondary" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Configure Tab */}
        {activeTab === 'configure' && (
          <div className="p-3 space-y-3">
            <div>
              <label className="text-xs text-ide-text-secondary mb-1 block">Provider</label>
              <select value={config.provider} onChange={e => setConfig(p => ({ ...p, provider: e.target.value }))} className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs">
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ide-text-secondary mb-1 block">Region</label>
              <select value={config.region} onChange={e => setConfig(p => ({ ...p, region: e.target.value }))} className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs">
                {PROVIDERS.find(p => p.id === config.provider)?.regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ide-text-secondary mb-1 block">Build Command</label>
              <input type="text" value={config.buildCommand} onChange={e => setConfig(p => ({ ...p, buildCommand: e.target.value }))} className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs text-ide-text-secondary mb-1 block">Output Directory</label>
              <input type="text" value={config.outputDir} onChange={e => setConfig(p => ({ ...p, outputDir: e.target.value }))} className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs font-mono" />
            </div>
            <div>
              <label className="text-xs text-ide-text-secondary mb-1 block">Branch</label>
              <input type="text" value={config.branch} onChange={e => setConfig(p => ({ ...p, branch: e.target.value }))} className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs font-mono" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={config.autoDeploy} onChange={e => setConfig(p => ({ ...p, autoDeploy: e.target.checked }))} className="accent-sky-500" />
              Auto-deploy on push to {config.branch}
            </label>
            <button
              onClick={startDeploy}
              disabled={isDeploying}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded text-xs text-white"
            >
              {isDeploying ? <FaCode size={12} className="animate-spin" /> : <FaRocket size={12} />}
              {isDeploying ? 'Deploying...' : 'Deploy Now'}
            </button>
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="p-3 space-y-2">
            {PROVIDERS.map(provider => (
              <div
                key={provider.id}
                onClick={() => setConfig(p => ({ ...p, provider: provider.id }))}
                className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                  config.provider === provider.id ? 'border-sky-400 bg-sky-400/5' : 'border-ide-border/50 hover:bg-ide-bg-secondary/30'
                }`}
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="flex-1">
                  <span className="text-xs font-semibold">{provider.name}</span>
                  <div className="text-xs text-ide-text-secondary">{provider.regions.length} regions available</div>
                </div>
                {config.provider === provider.id && <FaCheckCircle size={14} className="text-sky-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
