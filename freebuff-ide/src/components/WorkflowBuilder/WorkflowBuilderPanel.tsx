import React, { useState, useRef, useEffect } from 'react'
import {
  GitBranch, Plus, Trash2, Play, Pause, CheckCircle, XCircle,
  Clock, Zap, Code, Database, Globe, Shield, Send, ArrowRight,
  ChevronDown, Copy, Check
} from 'lucide-react'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'output'
  name: string
  description: string
  icon: string
  color: string
  x: number
  y: number
  config: Record<string, string>
}

interface WorkflowEdge {
  from: string
  to: string
}

interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: 'idle' | 'running' | 'success' | 'failed'
  lastRun: Date | null
}

const NODE_TYPES = {
  trigger: { label: 'Trigger', color: '#22c55e', bg: 'bg-green-500/10 border-green-500/30' },
  action: { label: 'Action', color: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
  condition: { label: 'Condition', color: '#f59e0b', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  output: { label: 'Output', color: '#a855f7', bg: 'bg-purple-500/10 border-purple-500/30' },
}

const NODE_LIBRARY: Omit<WorkflowNode, 'x' | 'y' | 'config'>[] = [
  { id: 'git-push', type: 'trigger', name: 'Git Push', description: 'Triggered on git push', icon: '🔀', color: '#22c55e' },
  { id: 'pr-opened', type: 'trigger', name: 'PR Opened', description: 'Triggered on PR creation', icon: '🔃', color: '#22c55e' },
  { id: 'schedule', type: 'trigger', name: 'Schedule', description: 'Run on schedule', icon: '⏰', color: '#22c55e' },
  { id: 'install-deps', type: 'action', name: 'Install Dependencies', description: 'Run npm install', icon: '📦', color: '#3b82f6' },
  { id: 'build', type: 'action', name: 'Build Project', description: 'Run build command', icon: '🔨', color: '#3b82f6' },
  { id: 'run-tests', type: 'action', name: 'Run Tests', description: 'Execute test suite', icon: '🧪', color: '#3b82f6' },
  { id: 'lint', type: 'action', name: 'Lint Code', description: 'Run ESLint', icon: '🔍', color: '#3b82f6' },
  { id: 'deploy', type: 'action', name: 'Deploy', description: 'Deploy to production', icon: '🚀', color: '#3b82f6' },
  { id: 'notify', type: 'action', name: 'Send Notification', description: 'Send notification', icon: '🔔', color: '#3b82f6' },
  { id: 'check-status', type: 'condition', name: 'Check Status', description: 'Branch on status', icon: '❓', color: '#f59e0b' },
  { id: 'is-branch', type: 'condition', name: 'Is Branch?', description: 'Check branch name', icon: '🔀', color: '#f59e0b' },
  { id: 'webhook', type: 'output', name: 'Webhook', description: 'Send webhook', icon: '🌐', color: '#a855f7' },
  { id: 'create-pr', type: 'output', name: 'Create PR', description: 'Auto-create PR', icon: '📝', color: '#a855f7' },
  { id: 'comment', type: 'output', name: 'Comment', description: 'Add PR comment', icon: '💬', color: '#a855f7' },
]

const MOCK_WORKFLOW: Workflow = {
  id: 'wf-1',
  name: 'CI/CD Pipeline',
  description: 'Build, test, and deploy on every push',
  status: 'idle',
  lastRun: new Date(Date.now() - 3600000),
  nodes: [
    { id: 'n1', type: 'trigger', name: 'Git Push', description: 'On push to main', icon: '🔀', color: '#22c55e', x: 50, y: 120, config: { branch: 'main' } },
    { id: 'n2', type: 'action', name: 'Install Deps', description: 'npm install', icon: '📦', color: '#3b82f6', x: 220, y: 60, config: {} },
    { id: 'n3', type: 'action', name: 'Build', description: 'npm run build', icon: '🔨', color: '#3b82f6', x: 390, y: 60, config: {} },
    { id: 'n4', type: 'action', name: 'Run Tests', description: 'npm test', icon: '🧪', color: '#3b82f6', x: 390, y: 180, config: {} },
    { id: 'n5', type: 'condition', name: 'Tests Pass?', description: 'Check test result', icon: '❓', color: '#f59e0b', x: 560, y: 120, config: {} },
    { id: 'n6', type: 'action', name: 'Lint', description: 'ESLint check', icon: '🔍', color: '#3b82f6', x: 730, y: 60, config: {} },
    { id: 'n7', type: 'action', name: 'Deploy', description: 'Deploy to Vercel', icon: '🚀', color: '#3b82f6', x: 730, y: 180, config: {} },
    { id: 'n8', type: 'output', name: 'Notify', description: 'Slack notification', icon: '🔔', color: '#a855f7', x: 900, y: 120, config: {} },
  ],
  edges: [
    { from: 'n1', to: 'n2' }, { from: 'n1', to: 'n4' },
    { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n5' },
    { from: 'n4', to: 'n5' }, { from: 'n5', to: 'n6' },
    { from: 'n5', to: 'n7' }, { from: 'n6', to: 'n8' },
    { from: 'n7', to: 'n8' },
  ],
}

const MOCK_WORKFLOWS: Workflow[] = [
  MOCK_WORKFLOW,
  { id: 'wf-2', name: 'Code Review', description: 'Review and validate PRs', status: 'idle', lastRun: new Date(Date.now() - 7200000), nodes: [
    { id: 'n1', type: 'trigger', name: 'PR Opened', description: 'On PR creation', icon: '🔃', color: '#22c55e', x: 50, y: 120, config: {} },
    { id: 'n2', type: 'action', name: 'Lint', description: 'ESLint check', icon: '🔍', color: '#3b82f6', x: 220, y: 120, config: {} },
    { id: 'n3', type: 'action', name: 'Test', description: 'Run tests', icon: '🧪', color: '#3b82f6', x: 390, y: 120, config: {} },
    { id: 'n4', type: 'output', name: 'Comment', description: 'Post results', icon: '💬', color: '#a855f7', x: 560, y: 120, config: {} },
  ], edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }] },
]

export default function WorkflowBuilderPanel({ onClose }: { onClose: () => void }) {
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS)
  const [selectedWF, setSelectedWF] = useState<Workflow>(MOCK_WORKFLOW)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'workflows' | 'library'>('editor')
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null)
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw workflow
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width = canvas.parentElement?.clientWidth || 1000
    const h = canvas.height = 300

    ctx.clearRect(0, 0, w, h)

    // Draw edges
    selectedWF.edges.forEach(edge => {
      const from = selectedWF.nodes.find(n => n.id === edge.from)
      const to = selectedWF.nodes.find(n => n.id === edge.to)
      if (!from || !to) return

      const fromX = from.x + 50
      const fromY = from.y + 20
      const toX = to.x
      const toY = to.y + 20

      const isActive = runningNodeId === from.id || (completedNodes.has(from.id) && runningNodeId === to.id)
      const isComplete = completedNodes.has(from.id) && completedNodes.has(to.id)

      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      const midX = (fromX + toX) / 2
      ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY)
      ctx.strokeStyle = isComplete ? '#22c55e' : isActive ? '#3b82f6' : 'rgba(100,100,100,0.3)'
      ctx.lineWidth = isActive ? 2 : 1
      ctx.stroke()

      // Arrow
      const angle = Math.atan2(toY - toY, toX - midX)
      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(toX - 6, toY - 4)
      ctx.lineTo(toX - 6, toY + 4)
      ctx.closePath()
      ctx.fillStyle = isComplete ? '#22c55e' : isActive ? '#3b82f6' : 'rgba(100,100,100,0.4)'
      ctx.fill()
    })

    // Draw nodes
    selectedWF.nodes.forEach(node => {
      const isRunning = runningNodeId === node.id
      const isComplete = completedNodes.has(node.id)
      const isSelected = selectedNode?.id === node.id

      // Node box
      ctx.fillStyle = isComplete ? 'rgba(34,197,94,0.1)' : isRunning ? 'rgba(59,130,246,0.1)' : isSelected ? 'rgba(168,85,247,0.1)' : 'rgba(30,30,40,0.8)'
      ctx.strokeStyle = isComplete ? '#22c55e' : isRunning ? '#3b82f6' : isSelected ? '#a855f7' : node.color + '60'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.beginPath()
      ctx.roundRect(node.x, node.y, 100, 40, 6)
      ctx.fill()
      ctx.stroke()

      // Icon
      ctx.font = '14px serif'
      ctx.fillText(node.icon, node.x + 8, node.y + 26)

      // Label
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(node.name.length > 10 ? node.name.slice(0, 9) + '.' : node.name, node.x + 28, node.y + 17)

      // Type badge
      ctx.font = '8px sans-serif'
      ctx.fillStyle = node.color
      ctx.fillText(node.type, node.x + 28, node.y + 30)

      // Running indicator
      if (isRunning) {
        ctx.beginPath()
        ctx.arc(node.x + 90, node.y + 10, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#3b82f6'
        ctx.fill()
      }
      if (isComplete) {
        ctx.beginPath()
        ctx.arc(node.x + 90, node.y + 10, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#22c55e'
        ctx.fill()
      }
    })
  }, [selectedWF, selectedNode, runningNodeId, completedNodes])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clicked = selectedWF.nodes.find(n => x >= n.x && x <= n.x + 100 && y >= n.y && y <= n.y + 40)
    setSelectedNode(clicked || null)
  }

  const simulateRun = async () => {
    setIsRunning(true)
    setCompletedNodes(new Set())
    for (const node of selectedWF.nodes) {
      setRunningNodeId(node.id)
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
      setCompletedNodes(prev => new Set([...prev, node.id]))
    }
    setRunningNodeId(null)
    setIsRunning(false)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold">Workflow Builder</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={simulateRun} disabled={isRunning} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
            {isRunning ? <Pause size={10} /> : <Play size={10} />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'editor' as const, label: 'Editor' },
          { key: 'workflows' as const, label: `Workflows (${workflows.length})` },
          { key: 'library' as const, label: 'Node Library' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
              activeTab === tab.key ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      {activeTab === 'editor' && (
        <>
          <div className="px-3 py-2 border-b border-ide-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{selectedWF.name}</span>
              <span className="text-xs text-ide-text-secondary">{selectedWF.description}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-ide-bg-secondary/10">
            <canvas ref={canvasRef} className="cursor-pointer" style={{ minWidth: 1000 }} onClick={handleCanvasClick} />
          </div>
          {selectedNode && (
            <div className="border-t border-ide-border px-3 py-2 bg-ide-bg-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{selectedNode.icon}</span>
                <span className="text-xs font-semibold">{selectedNode.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: selectedNode.color + '20', color: selectedNode.color }}>{selectedNode.type}</span>
              </div>
              <div className="text-xs text-ide-text-secondary">{selectedNode.description}</div>
              {Object.keys(selectedNode.config).length > 0 && (
                <div className="mt-1 text-xs font-mono text-ide-text-secondary">
                  {Object.entries(selectedNode.config).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Workflows List */}
      {activeTab === 'workflows' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {workflows.map(wf => (
            <div
              key={wf.id}
              onClick={() => { setSelectedWF(wf); setActiveTab('editor') }}
              className={`p-3 rounded border cursor-pointer ${
                selectedWF.id === wf.id ? 'border-emerald-400 bg-emerald-400/5' : 'border-ide-border/50 hover:bg-ide-bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{wf.name}</span>
                <span className="text-xs text-ide-text-secondary">{wf.nodes.length} nodes</span>
              </div>
              <div className="text-xs text-ide-text-secondary">{wf.description}</div>
              {wf.lastRun && <div className="text-xs text-ide-text-secondary mt-1">Last run: {wf.lastRun.toLocaleString()}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Node Library */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {Object.entries(NODE_TYPES).map(([type, config]) => (
            <div key={type}>
              <div className="text-xs font-semibold mb-1" style={{ color: config.color }}>{config.label}</div>
              {NODE_LIBRARY.filter(n => n.type === type).map(node => (
                <div key={node.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-ide-border/30 hover:bg-ide-bg-secondary/30 mb-1 cursor-grab">
                  <span className="text-sm">{node.icon}</span>
                  <div className="flex-1">
                    <span className="text-xs font-semibold">{node.name}</span>
                    <div className="text-[10px] text-ide-text-secondary">{node.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
