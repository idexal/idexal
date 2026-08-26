import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  FaCodeBranch, FaSearch, FaCode, FaUndo, FaExpand, FaExclamationTriangle, FaArrowRight, FaBox, FaLayerGroup, FaEye, FaEyeSlash
} from '../Icon'

interface DepNode {
  id: string
  name: string
  type: 'file' | 'package' | 'module'
  language: string
  size: number
  imports: string[]
  importedBy: string[]
  x: number
  y: number
}

interface DepEdge {
  from: string
  to: string
  type: 'import' | 'export' | 'dynamic'
  count: number
}

const MOCK_NODES: DepNode[] = [
  { id: 'App', name: 'App.tsx', type: 'file', language: 'tsx', size: 12, imports: ['useAgent', 'editorStore', 'settingsStore', 'TitleBar', 'Sidebar', 'EditorArea', 'ChatPanel', 'TerminalPanel'], importedBy: [], x: 400, y: 200 },
  { id: 'useAgent', name: 'useAgent.ts', type: 'file', language: 'ts', size: 8, imports: ['agentOrchestrator', 'aiService'], importedBy: ['App', 'ChatPanel'], x: 200, y: 100 },
  { id: 'editorStore', name: 'editorStore.ts', type: 'file', language: 'ts', size: 3, imports: [], importedBy: ['App', 'EditorArea', 'TabBar'], x: 600, y: 100 },
  { id: 'settingsStore', name: 'settingsStore.ts', type: 'file', language: 'ts', size: 4, imports: ['themeService'], importedBy: ['App', 'SettingsPanel'], x: 150, y: 250 },
  { id: 'agentOrchestrator', name: 'agentOrchestrator.ts', type: 'file', language: 'ts', size: 15, imports: ['aiStreamingService', 'contextWindowManager'], importedBy: ['useAgent'], x: 100, y: 50 },
  { id: 'aiService', name: 'aiService.ts', type: 'file', language: 'ts', size: 6, imports: [], importedBy: ['useAgent'], x: 300, y: 50 },
  { id: 'aiStreamingService', name: 'aiStreamingService.ts', type: 'file', language: 'ts', size: 7, imports: [], importedBy: ['agentOrchestrator'], x: 50, y: 150 },
  { id: 'contextWindowManager', name: 'contextWindowManager.ts', type: 'file', language: 'ts', size: 5, imports: [], importedBy: ['agentOrchestrator'], x: 100, y: 150 },
  { id: 'TitleBar', name: 'TitleBar.tsx', type: 'file', language: 'tsx', size: 4, imports: [], importedBy: ['App'], x: 300, y: 300 },
  { id: 'Sidebar', name: 'Sidebar.tsx', type: 'file', language: 'tsx', size: 6, imports: ['fileSystemService', 'projectContextService'], importedBy: ['App'], x: 500, y: 300 },
  { id: 'EditorArea', name: 'EditorArea.tsx', type: 'file', language: 'tsx', size: 10, imports: ['editorStore', 'MonacoEditor', 'TabBar'], importedBy: ['App'], x: 400, y: 350 },
  { id: 'MonacoEditor', name: 'MonacoEditor.tsx', type: 'file', language: 'tsx', size: 8, imports: [], importedBy: ['EditorArea'], x: 300, y: 400 },
  { id: 'TabBar', name: 'TabBar.tsx', type: 'file', language: 'tsx', size: 5, imports: ['editorStore'], importedBy: ['EditorArea'], x: 500, y: 400 },
  { id: 'ChatPanel', name: 'ChatPanel.tsx', type: 'file', language: 'tsx', size: 12, imports: ['useAgent', 'MarkdownRenderer'], importedBy: ['App'], x: 600, y: 250 },
  { id: 'TerminalPanel', name: 'TerminalPanel.tsx', type: 'file', language: 'tsx', size: 6, imports: [], importedBy: ['App'], x: 700, y: 300 },
  { id: 'MarkdownRenderer', name: 'MarkdownRenderer.tsx', type: 'file', language: 'tsx', size: 4, imports: [], importedBy: ['ChatPanel', 'MarkdownPreview'], x: 700, y: 200 },
  { id: 'fileSystemService', name: 'fileSystemService.ts', type: 'file', language: 'ts', size: 8, imports: [], importedBy: ['Sidebar', 'QuickOpen'], x: 600, y: 350 },
  { id: 'projectContextService', name: 'projectContextService.ts', type: 'file', language: 'ts', size: 5, imports: ['fileSystemService'], importedBy: ['Sidebar'], x: 650, y: 400 },
  { id: 'themeService', name: 'themeService.ts', type: 'file', language: 'ts', size: 3, imports: [], importedBy: ['settingsStore'], x: 100, y: 350 },
  { id: 'MarkdownPreview', name: 'MarkdownPreview.tsx', type: 'file', language: 'tsx', size: 5, imports: ['MarkdownRenderer'], importedBy: [], x: 800, y: 200 },
]

const MOCK_EDGES: DepEdge[] = MOCK_NODES.flatMap(node =>
  node.imports.map(imp => ({ from: node.id, to: imp, type: 'import' as const, count: 1 }))
)

const NODE_COLORS: Record<string, string> = {
  file: '#89b4fa',
  package: '#a6e3a1',
  module: '#cba6f7',
}

const LANG_COLORS: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#61dafb',
  js: '#f7df1e',
  jsx: '#61dafb',
}

export default function DependencyGraphPanel({ onClose }: { onClose: () => void }) {
  const [nodes] = useState(MOCK_NODES)
  const [edges] = useState(MOCK_EDGES)
  const [selectedNode, setSelectedNode] = useState<DepNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [showExternal, setShowExternal] = useState(true)
  const [highlightMode, setHighlightMode] = useState<'none' | 'imports' | 'importedBy'>('none')
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes
    const q = searchQuery.toLowerCase()
    return nodes.filter(n => n.name.toLowerCase().includes(q))
  }, [nodes, searchQuery])

  const highlightedNodes = useMemo(() => {
    if (!selectedNode || highlightMode === 'none') return new Set<string>()
    if (highlightMode === 'imports') return new Set(selectedNode.imports)
    return new Set(selectedNode.importedBy)
  }, [selectedNode, highlightMode])

  const nodeStats = useMemo(() => ({
    total: nodes.length,
    files: nodes.filter(n => n.type === 'file').length,
    packages: nodes.filter(n => n.type === 'package').length,
    totalImports: edges.length,
    maxImports: Math.max(...nodes.map(n => n.imports.length)),
    mostImported: [...nodes].sort((a, b) => b.importedBy.length - a.importedBy.length).slice(0, 3),
  }), [nodes, edges])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width = canvas.parentElement?.clientWidth || 800
    const h = canvas.height = canvas.parentElement?.clientHeight || 400

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(zoom, zoom)

    // Draw edges
    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.from)
      const to = nodes.find(n => n.id === edge.to)
      if (!from || !to) return

      const isHighlighted = selectedNode && (
        (highlightMode === 'imports' && from.id === selectedNode.id) ||
        (highlightMode === 'importedBy' && to.id === selectedNode.id)
      )

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      // Curved edge
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2 - 30
      ctx.quadraticCurveTo(midX, midY, to.x, to.y)
      ctx.strokeStyle = isHighlighted ? '#89b4fa' : 'rgba(100, 100, 100, 0.3)'
      ctx.lineWidth = isHighlighted ? 2 : 1
      ctx.stroke()

      // Arrow
      const angle = Math.atan2(to.y - midY, to.x - midX)
      const arrowSize = 6
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(to.x - arrowSize * Math.cos(angle - 0.3), to.y - arrowSize * Math.sin(angle - 0.3))
      ctx.lineTo(to.x - arrowSize * Math.cos(angle + 0.3), to.y - arrowSize * Math.sin(angle + 0.3))
      ctx.closePath()
      ctx.fillStyle = isHighlighted ? '#89b4fa' : 'rgba(100, 100, 100, 0.4)'
      ctx.fill()
    })

    // Draw nodes
    filteredNodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id
      const isHovered = hoveredNode === node.id
      const isHighlighted = highlightedNodes.has(node.id)
      const isSearchMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())

      const radius = 8 + node.imports.length * 2

      // Glow
      if (isSelected || isHovered) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? 'rgba(137, 180, 250, 0.2)' : 'rgba(137, 180, 250, 0.1)'
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isHighlighted ? '#cba6f7' : isSearchMatch ? '#f9e2af' : NODE_COLORS[node.type]
      ctx.globalAlpha = isHighlighted || isSearchMatch ? 1 : 0.8
      ctx.fill()
      ctx.globalAlpha = 1

      // Border
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = isSelected ? '#ffffff' : isHighlighted ? '#cba6f7' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.stroke()

      // Label
      ctx.fillStyle = '#ffffff'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(node.name.length > 14 ? node.name.slice(0, 12) + '..' : node.name, node.x, node.y + radius + 12)
    })

    ctx.restore()
  }, [nodes, edges, filteredNodes, selectedNode, highlightedNodes, highlightMode, hoveredNode, searchQuery, zoom])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    const clicked = filteredNodes.find(n => {
      const dx = n.x - x
      const dy = n.y - y
      return Math.sqrt(dx * dx + dy * dy) < 12 + n.imports.length * 2
    })

    setSelectedNode(clicked || null)
    setHighlightMode(clicked ? 'imports' : 'none')
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCodeBranch size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">Dependency Graph</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <FaSearch size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search modules..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1 bg-ide-bg-secondary rounded text-ide-text-secondary"><FaCode size={14} /></button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))} className="p-1 bg-ide-bg-secondary rounded text-ide-text-secondary"><FaCode size={14} /></button>
        <button onClick={() => setZoom(1)} className="p-1 bg-ide-bg-secondary rounded text-ide-text-secondary"><FaUndo size={14} /></button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{nodeStats.total} modules</span>
        <span className="text-cyan-400">{nodeStats.totalImports} dependencies</span>
        <span className="text-ide-text-secondary">Max imports: {nodeStats.maxImports}</span>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative overflow-hidden bg-ide-bg-secondary/10">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={handleCanvasClick}
        />
        {/* Legend */}
        <div className="absolute top-2 left-2 bg-ide-bg/90 border border-ide-border rounded p-2 text-xs space-y-1">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.file }} /> File</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.package }} /> Package</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.module }} /> Module</div>
        </div>
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (
        <div className="border-t border-ide-border px-3 py-2 bg-ide-bg-secondary/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">{selectedNode.name}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHighlightMode(highlightMode === 'imports' ? 'importedBy' : 'imports')}
                className="px-2 py-0.5 text-xs rounded bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text"
              >
                {highlightMode === 'imports' ? '→ Imports' : '← Imported By'}
              </button>
              <button onClick={() => setSelectedNode(null)} className="text-ide-text-secondary">×</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-ide-text-secondary">Imports ({selectedNode.imports.length}):</span>
              <div className="mt-0.5 space-y-0.5">
                {selectedNode.imports.map(imp => (
                  <div key={imp} className="text-cyan-400 truncate">→ {imp}</div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-ide-text-secondary">Imported by ({selectedNode.importedBy.length}):</span>
              <div className="mt-0.5 space-y-0.5">
                {selectedNode.importedBy.map(imp => (
                  <div key={imp} className="text-purple-400 truncate">← {imp}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
