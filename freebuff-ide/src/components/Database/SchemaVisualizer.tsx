import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Database, Search, ZoomIn, ZoomOut, Maximize2, RefreshCw,
  Key, Link, ChevronDown, ChevronRight, Table, GitBranch,
  Download, Copy, Check, Eye
} from 'lucide-react'

interface Column {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: { table: string; column: string }
  isIndexed: boolean
  defaultValue?: string
}

interface TableInfo {
  name: string
  columns: Column[]
  x: number
  y: number
  color: string
  rowCount: number
  engine: string
}

interface Relationship {
  from: { table: string; column: string }
  to: { table: string; column: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  label?: string
}

const TABLE_COLORS = [
  { header: 'bg-blue-600', border: 'border-blue-500/50', accent: '#3b82f6' },
  { header: 'bg-green-600', border: 'border-green-500/50', accent: '#22c55e' },
  { header: 'bg-purple-600', border: 'border-purple-500/50', accent: '#a855f7' },
  { header: 'bg-amber-600', border: 'border-amber-500/50', accent: '#f59e0b' },
  { header: 'bg-rose-600', border: 'border-rose-500/50', accent: '#f43f5e' },
  { header: 'bg-cyan-600', border: 'border-cyan-500/50', accent: '#06b6d4' },
  { header: 'bg-indigo-600', border: 'border-indigo-500/50', accent: '#6366f1' },
  { header: 'bg-teal-600', border: 'border-teal-500/50', accent: '#14b8a6' },
]

const MOCK_TABLES: TableInfo[] = [
  {
    name: 'users', x: 80, y: 60, color: 'blue', rowCount: 15420, engine: 'InnoDB',
    columns: [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'username', type: 'VARCHAR(100)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'avatar_url', type: 'TEXT', nullable: true, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'role', type: "ENUM('admin','user','mod')", nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: "'user'" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false, defaultValue: 'NOW()' },
    ],
  },
  {
    name: 'posts', x: 520, y: 40, color: 'green', rowCount: 89320, engine: 'InnoDB',
    columns: [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
      { name: 'user_id', type: 'BIGINT', nullable: false, isPrimaryKey: false, isForeignKey: true, references: { table: 'users', column: 'id' }, isIndexed: true },
      { name: 'title', type: 'VARCHAR(500)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'slug', type: 'VARCHAR(500)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'content', type: 'LONGTEXT', nullable: true, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'status', type: "ENUM('draft','published','archived')", nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: "'draft'" },
      { name: 'view_count', type: 'INT', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false, defaultValue: '0' },
      { name: 'published_at', type: 'TIMESTAMP', nullable: true, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false, defaultValue: 'NOW()' },
    ],
  },
  {
    name: 'comments', x: 260, y: 380, color: 'purple', rowCount: 342100, engine: 'InnoDB',
    columns: [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
      { name: 'user_id', type: 'BIGINT', nullable: false, isPrimaryKey: false, isForeignKey: true, references: { table: 'users', column: 'id' }, isIndexed: true },
      { name: 'post_id', type: 'BIGINT', nullable: false, isPrimaryKey: false, isForeignKey: true, references: { table: 'posts', column: 'id' }, isIndexed: true },
      { name: 'parent_id', type: 'BIGINT', nullable: true, isPrimaryKey: false, isForeignKey: true, references: { table: 'comments', column: 'id' }, isIndexed: true },
      { name: 'content', type: 'TEXT', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: 'NOW()' },
    ],
  },
  {
    name: 'tags', x: 680, y: 380, color: 'amber', rowCount: 256, engine: 'InnoDB',
    columns: [
      { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'slug', type: 'VARCHAR(100)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'color', type: 'VARCHAR(7)', nullable: true, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: 'NOW()' },
    ],
  },
  {
    name: 'post_tags', x: 850, y: 80, color: 'rose', rowCount: 178640, engine: 'InnoDB',
    columns: [
      { name: 'post_id', type: 'BIGINT', nullable: false, isPrimaryKey: true, isForeignKey: true, references: { table: 'posts', column: 'id' }, isIndexed: true },
      { name: 'tag_id', type: 'INT', nullable: false, isPrimaryKey: true, isForeignKey: true, references: { table: 'tags', column: 'id' }, isIndexed: true },
    ],
  },
  {
    name: 'media', x: 520, y: 420, color: 'cyan', rowCount: 12500, engine: 'InnoDB',
    columns: [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimaryKey: true, isForeignKey: false, isIndexed: true },
      { name: 'user_id', type: 'BIGINT', nullable: false, isPrimaryKey: false, isForeignKey: true, references: { table: 'users', column: 'id' }, isIndexed: true },
      { name: 'filename', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'mime_type', type: 'VARCHAR(100)', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true },
      { name: 'size', type: 'BIGINT', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'url', type: 'TEXT', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: false },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false, isIndexed: true, defaultValue: 'NOW()' },
    ],
  },
]

const MOCK_RELATIONSHIPS: Relationship[] = [
  { from: { table: 'posts', column: 'user_id' }, to: { table: 'users', column: 'id' }, type: 'one-to-many', label: 'author' },
  { from: { table: 'comments', column: 'user_id' }, to: { table: 'users', column: 'id' }, type: 'one-to-many', label: 'commenter' },
  { from: { table: 'comments', column: 'post_id' }, to: { table: 'posts', column: 'id' }, type: 'one-to-many', label: 'post' },
  { from: { table: 'comments', column: 'parent_id' }, to: { table: 'comments', column: 'id' }, type: 'one-to-many', label: 'reply' },
  { from: { table: 'post_tags', column: 'post_id' }, to: { table: 'posts', column: 'id' }, type: 'many-to-many', label: 'tagged' },
  { from: { table: 'post_tags', column: 'tag_id' }, to: { table: 'tags', column: 'id' }, type: 'many-to-many', label: 'has' },
  { from: { table: 'media', column: 'user_id' }, to: { table: 'users', column: 'id' }, type: 'one-to-many', label: 'uploaded' },
]

const TABLE_WIDTH = 220
const ROW_HEIGHT = 22
const HEADER_HEIGHT = 32

export default function SchemaVisualizer({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetails, setShowDetails] = useState(true)
  const [copied, setCopied] = useState(false)

  const tablesRef = useRef<TableInfo[]>(MOCK_TABLES.map(t => ({ ...t })))

  const colorIndex = useMemo(() => {
    const map: Record<string, number> = {}
    MOCK_TABLES.forEach((t, i) => { map[t.name] = i % TABLE_COLORS.length })
    return map
  }, [])

  const getTableBounds = useCallback((table: TableInfo) => {
    const height = HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + 4
    return { x: table.x, y: table.y, width: TABLE_WIDTH, height }
  }, [])

  const drawSchema = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw relationships first (behind tables)
    MOCK_RELATIONSHIPS.forEach(rel => {
      const fromTable = tablesRef.current.find(t => t.name === rel.from.table)
      const toTable = tablesRef.current.find(t => t.name === rel.to.table)
      if (!fromTable || !toTable) return

      const fromColIdx = fromTable.columns.findIndex(c => c.name === rel.from.column)
      const toColIdx = toTable.columns.findIndex(c => c.name === rel.to.column)
      if (fromColIdx < 0 || toColIdx < 0) return

      const fromX = fromTable.x + TABLE_WIDTH
      const fromY = fromTable.y + HEADER_HEIGHT + fromColIdx * ROW_HEIGHT + ROW_HEIGHT / 2
      const toX = toTable.x
      const toY = toTable.y + HEADER_HEIGHT + toColIdx * ROW_HEIGHT + ROW_HEIGHT / 2

      // Determine highlight
      const isHighlighted = selectedTable === rel.from.table || selectedTable === rel.to.table ||
        hoveredTable === rel.from.table || hoveredTable === rel.to.table

      ctx.beginPath()
      ctx.strokeStyle = isHighlighted ? '#60a5fa' : '#4b5563'
      ctx.lineWidth = isHighlighted ? 2 : 1
      if (!isHighlighted) ctx.setLineDash([4, 4])
      else ctx.setLineDash([])

      const midX = (fromX + toX) / 2
      ctx.moveTo(fromX, fromY)
      ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY)
      ctx.stroke()
      ctx.setLineDash([])

      // Arrow head
      const angle = Math.atan2(toY - (fromY + toY) / 2, toX - midX)
      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(toX - 8 * Math.cos(angle - Math.PI / 6), toY - 8 * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(toX - 8 * Math.cos(angle + Math.PI / 6), toY - 8 * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fillStyle = isHighlighted ? '#60a5fa' : '#4b5563'
      ctx.fill()

      // Label
      if (isHighlighted && rel.label) {
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#9ca3af'
        ctx.textAlign = 'center'
        ctx.fillText(rel.label, midX, (fromY + toY) / 2 - 6)
      }
    })

    // Draw tables
    tablesRef.current.forEach(table => {
      const isSelected = selectedTable === table.name
      const isHovered = hoveredTable === table.name
      const isSearchMatch = searchQuery && table.name.toLowerCase().includes(searchQuery.toLowerCase())
      const colorIdx = colorIndex[table.name]
      const color = TABLE_COLORS[colorIdx]
      const bounds = getTableBounds(table)

      // Shadow
      if (isSelected || isHovered) {
        ctx.shadowColor = color.accent
        ctx.shadowBlur = isSelected ? 12 : 6
      }

      // Table background
      ctx.fillStyle = '#1a1b2e'
      ctx.strokeStyle = isSelected ? color.accent : isHovered ? '#6b7280' : '#374151'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.beginPath()
      const r = 6
      ctx.moveTo(bounds.x + r, bounds.y)
      ctx.lineTo(bounds.x + bounds.width - r, bounds.y)
      ctx.quadraticCurveTo(bounds.x + bounds.width, bounds.y, bounds.x + bounds.width, bounds.y + r)
      ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - r)
      ctx.quadraticCurveTo(bounds.x + bounds.width, bounds.y + bounds.height, bounds.x + bounds.width - r, bounds.y + bounds.height)
      ctx.lineTo(bounds.x + r, bounds.y + bounds.height)
      ctx.quadraticCurveTo(bounds.x, bounds.y + bounds.height, bounds.x, bounds.y + bounds.height - r)
      ctx.lineTo(bounds.x, bounds.y + r)
      ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + r, bounds.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Header
      ctx.fillStyle = color.accent
      ctx.beginPath()
      ctx.moveTo(bounds.x + r, bounds.y)
      ctx.lineTo(bounds.x + bounds.width - r, bounds.y)
      ctx.quadraticCurveTo(bounds.x + bounds.width, bounds.y, bounds.x + bounds.width, bounds.y + r)
      ctx.lineTo(bounds.x + bounds.width, bounds.y + HEADER_HEIGHT)
      ctx.lineTo(bounds.x, bounds.y + HEADER_HEIGHT)
      ctx.lineTo(bounds.x, bounds.y + r)
      ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + r, bounds.y)
      ctx.closePath()
      ctx.fill()

      // Table name
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(table.name, bounds.x + 10, bounds.y + 21)

      // Row count
      ctx.font = '9px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(`${table.rowCount.toLocaleString()} rows`, bounds.x + bounds.width - 8, bounds.y + 21)

      // Search highlight
      if (isSearchMatch) {
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 2
        ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4)
      }

      // Columns
      table.columns.forEach((col, colIdx) => {
        const rowY = bounds.y + HEADER_HEIGHT + colIdx * ROW_HEIGHT

        // Row background
        ctx.fillStyle = col.isPrimaryKey ? 'rgba(59,130,246,0.1)' : col.isForeignKey ? 'rgba(168,85,247,0.1)' : colIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)'
        ctx.fillRect(bounds.x + 1, rowY, bounds.width - 2, ROW_HEIGHT)

        // PK/FK icon
        let iconX = bounds.x + 8
        if (col.isPrimaryKey) {
          ctx.fillStyle = '#fbbf24'
          ctx.font = '10px sans-serif'
          ctx.fillText('🔑', iconX, rowY + 15)
          iconX += 14
        } else if (col.isForeignKey) {
          ctx.fillStyle = '#a78bfa'
          ctx.font = '10px sans-serif'
          ctx.fillText('🔗', iconX, rowY + 15)
          iconX += 14
        }

        // Column name
        ctx.font = '11px monospace'
        ctx.fillStyle = col.isPrimaryKey ? '#60a5fa' : '#d1d5db'
        ctx.textAlign = 'left'
        ctx.fillText(col.name, iconX, rowY + 14)

        // Column type
        ctx.font = '10px monospace'
        ctx.fillStyle = '#6b7280'
        ctx.textAlign = 'right'
        ctx.fillText(col.type, bounds.x + bounds.width - 8, rowY + 14)

        // Nullable indicator
        if (!col.nullable) {
          ctx.fillStyle = '#ef4444'
          ctx.font = '8px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText('NOT NULL', bounds.x + bounds.width - ctx.measureText(col.type).width - 12, rowY + 14)
        }
      })

      // Bottom border
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(bounds.x, bounds.y + bounds.height)
      ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height)
      ctx.stroke()
    })

    ctx.restore()
  }, [zoom, pan, selectedTable, hoveredTable, searchQuery, colorIndex, getTableBounds])

  useEffect(() => {
    drawSchema()
    const handleResize = () => drawSchema()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawSchema])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    // Check if clicking a table
    const clickedTable = tablesRef.current.find(t => {
      const bounds = getTableBounds(t)
      return x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height
    })

    if (clickedTable) {
      setSelectedTable(clickedTable.name === selectedTable ? null : clickedTable.name)
    } else {
      setSelectedTable(null)
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
      return
    }

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom

    const hovered = tablesRef.current.find(t => {
      const bounds = getTableBounds(t)
      return x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height
    })
    setHoveredTable(hovered?.name || null)
    canvas.style.cursor = hovered ? 'pointer' : 'grab'
  }

  const handleCanvasMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(3, Math.max(0.2, z * delta)))
  }

  const selectedTableData = useMemo(() => {
    if (!selectedTable) return null
    return MOCK_TABLES.find(t => t.name === selectedTable)
  }, [selectedTable])

  const relatedRels = useMemo(() => {
    if (!selectedTable) return []
    return MOCK_RELATIONSHIPS.filter(r => r.from.table === selectedTable || r.to.table === selectedTable)
  }, [selectedTable])

  const copySchema = () => {
    const sql = MOCK_TABLES.map(t => {
      const cols = t.columns.map(c => {
        let def = `  ${c.name} ${c.type}`
        if (!c.nullable) def += ' NOT NULL'
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`
        return def
      }).join(',\n')
      const pks = t.columns.filter(c => c.isPrimaryKey).map(c => c.name)
      const pk = pks.length ? `,\n  PRIMARY KEY (${pks.join(', ')})` : ''
      return `CREATE TABLE ${t.name} (\n${cols}${pk}\n) ENGINE=${t.engine};`
    }).join('\n\n')
    navigator.clipboard?.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">Schema Visualizer</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copySchema} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Copy SQL">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ide-border bg-ide-bg-secondary/20">
        <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1 flex-1">
          <Search size={12} className="text-ide-text-secondary" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="flex-1 bg-transparent text-xs outline-none text-ide-text placeholder:text-ide-text-secondary/50"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><ZoomIn size={14} /></button>
          <span className="text-[10px] text-ide-text-secondary w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><ZoomOut size={14} /></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><Maximize2 size={14} /></button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-ide-bg/90 border border-ide-border rounded-lg p-2 text-[10px] space-y-1">
          <div className="flex items-center gap-2"><span>🔑</span> Primary Key</div>
          <div className="flex items-center gap-2"><span>🔗</span> Foreign Key</div>
          <div className="flex items-center gap-2"><div className="w-3 h-px bg-gray-500 border-b border-dashed" /> Relationship</div>
          <div className="flex items-center gap-2"><div className="w-3 h-px bg-blue-400" /> Highlighted</div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-3 right-3 bg-ide-bg/90 border border-ide-border rounded-lg p-2 text-[10px] text-ide-text-secondary space-y-0.5">
          <div>{MOCK_TABLES.length} tables</div>
          <div>{MOCK_RELATIONSHIPS.length} relationships</div>
          <div>{MOCK_TABLES.reduce((s, t) => s + t.columns.length, 0)} columns</div>
        </div>
      </div>

      {/* Selected Table Details */}
      {selectedTableData && showDetails && (
        <div className="border-t border-ide-border bg-ide-bg-secondary/20 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-ide-border/30">
            <div className="flex items-center gap-2">
              <Table size={12} className="text-blue-400" />
              <span className="text-xs font-semibold">{selectedTableData.name}</span>
              <span className="text-[10px] text-ide-text-secondary">{selectedTableData.rowCount.toLocaleString()} rows</span>
            </div>
            <button onClick={() => setSelectedTable(null)} className="text-ide-text-secondary hover:text-ide-text">
              <Eye size={12} />
            </button>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-ide-text-secondary border-b border-ide-border/30">
                <th className="text-left px-3 py-1">Column</th>
                <th className="text-left px-3 py-1">Type</th>
                <th className="text-left px-3 py-1">Nullable</th>
                <th className="text-left px-3 py-1">Key</th>
                <th className="text-left px-3 py-1">Default</th>
              </tr>
            </thead>
            <tbody>
              {selectedTableData.columns.map(col => (
                <tr key={col.name} className="border-b border-ide-border/10 hover:bg-ide-bg-secondary/20">
                  <td className="px-3 py-1 font-mono">{col.name}</td>
                  <td className="px-3 py-1 text-ide-text-secondary font-mono">{col.type}</td>
                  <td className="px-3 py-1">{col.nullable ? <span className="text-green-400">YES</span> : <span className="text-red-400">NO</span>}</td>
                  <td className="px-3 py-1">
                    {col.isPrimaryKey && <span className="text-yellow-400">PK</span>}
                    {col.isForeignKey && <span className="text-purple-400">FK → {col.references?.table}.{col.references?.column}</span>}
                  </td>
                  <td className="px-3 py-1 text-ide-text-secondary font-mono">{col.defaultValue || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {relatedRels.length > 0 && (
            <div className="px-3 py-1.5 border-t border-ide-border/30">
              <div className="text-[10px] text-ide-text-secondary mb-1">Relationships:</div>
              {relatedRels.map((r, i) => (
                <div key={i} className="text-[10px] text-ide-text-secondary ml-2">
                  → {r.from.table}.{r.from.column} → {r.to.table}.{r.to.column} ({r.type})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
