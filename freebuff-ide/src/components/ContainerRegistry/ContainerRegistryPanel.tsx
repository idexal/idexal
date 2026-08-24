import React, { useState, useMemo } from 'react'
import {
  Container, Search, Trash2, Download, RefreshCw, ChevronDown,
  ChevronRight, CheckCircle, XCircle, Clock, ExternalLink, Copy,
  Check, Tag, HardDrive, ArrowUpDown, Eye, Shield, Layers
} from 'lucide-react'

interface DockerImage {
  id: string
  name: string
  tag: string
  size: string
  created: Date
  pushed: Date
  status: 'active' | 'deprecated' | 'vulnerable'
  digest: string
  layers: number
  vulnerabilities: { critical: number; high: number; medium: number; low: number }
  platform: string
  author: string
}

const MOCK_IMAGES: DockerImage[] = [
  { id: 'img-1', name: 'idexal/api-server', tag: 'v2.4.1', size: '245 MB', created: new Date(Date.now() - 3600000), pushed: new Date(Date.now() - 3600000), status: 'active', digest: 'sha256:a1b2c3d4...', layers: 8, vulnerabilities: { critical: 0, high: 0, medium: 2, low: 5 }, platform: 'linux/amd64', author: 'CI/CD' },
  { id: 'img-2', name: 'idexal/api-server', tag: 'v2.4.0', size: '242 MB', created: new Date(Date.now() - 86400000), pushed: new Date(Date.now() - 86400000), status: 'active', digest: 'sha256:e5f6g7h8...', layers: 8, vulnerabilities: { critical: 0, high: 1, medium: 3, low: 7 }, platform: 'linux/amd64', author: 'CI/CD' },
  { id: 'img-3', name: 'idexal/api-server', tag: 'v2.3.0', size: '238 MB', created: new Date(Date.now() - 604800000), pushed: new Date(Date.now() - 604800000), status: 'deprecated', digest: 'sha256:i9j0k1l2...', layers: 7, vulnerabilities: { critical: 1, high: 3, medium: 5, low: 10 }, platform: 'linux/amd64', author: 'CI/CD' },
  { id: 'img-4', name: 'idexal/worker', tag: 'v1.2.0', size: '180 MB', created: new Date(Date.now() - 172800000), pushed: new Date(Date.now() - 172800000), status: 'active', digest: 'sha256:m3n4o5p6...', layers: 6, vulnerabilities: { critical: 0, high: 0, medium: 1, low: 3 }, platform: 'linux/amd64', author: 'CI/CD' },
  { id: 'img-5', name: 'idexal/nginx-proxy', tag: 'v3.0.0', size: '45 MB', created: new Date(Date.now() - 259200000), pushed: new Date(Date.now() - 259200000), status: 'active', digest: 'sha256:q7r8s9t0...', layers: 3, vulnerabilities: { critical: 0, high: 0, medium: 0, low: 1 }, platform: 'linux/amd64', author: 'Manual' },
  { id: 'img-6', name: 'idexal/cron-runner', tag: 'v1.0.0', size: '156 MB', created: new Date(Date.now() - 1209600000), pushed: new Date(Date.now() - 1209600000), status: 'vulnerable', digest: 'sha256:u1v2w3x4...', layers: 5, vulnerabilities: { critical: 2, high: 4, medium: 6, low: 8 }, platform: 'linux/amd64', author: 'CI/CD' },
  { id: 'img-7', name: 'idexal/migration', tag: 'v3.2.0', size: '98 MB', created: new Date(Date.now() - 345600000), pushed: new Date(Date.now() - 345600000), status: 'active', digest: 'sha256:y5z6a7b8...', layers: 4, vulnerabilities: { critical: 0, high: 0, medium: 0, low: 2 }, platform: 'linux/amd64', author: 'CI/CD' },
]

const STATUS_CONFIG = {
  active: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Active' },
  deprecated: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Deprecated' },
  vulnerable: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Vulnerable' },
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ContainerRegistryPanel({ onClose }: { onClose: () => void }) {
  const [images, setImages] = useState(MOCK_IMAGES)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'pushed' | 'size' | 'vulnerabilities'>('pushed')
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return images.filter(img => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return img.name.toLowerCase().includes(q) || img.tag.toLowerCase().includes(q)
      }
      return true
    }).sort((a, b) => {
      if (sortBy === 'pushed') return b.pushed.getTime() - a.pushed.getTime()
      if (sortBy === 'size') return parseFloat(b.size) - parseFloat(a.size)
      const aVulns = a.vulnerabilities.critical * 10 + a.vulnerabilities.high * 5
      const bVulns = b.vulnerabilities.critical * 10 + b.vulnerabilities.high * 5
      return bVulns - aVulns
    })
  }, [images, searchQuery, sortBy])

  const stats = useMemo(() => ({
    total: images.length,
    active: images.filter(i => i.status === 'active').length,
    totalSize: '1.2 GB',
    totalVulns: images.reduce((s, i) => s + i.vulnerabilities.critical + i.vulnerabilities.high, 0),
  }), [images])

  const copyDigest = (digest: string) => {
    navigator.clipboard?.writeText(digest)
    setCopiedDigest(digest)
    setTimeout(() => setCopiedDigest(null), 1500)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Container size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">Container Registry</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary"><RefreshCw size={14} /></button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-px bg-ide-border">
        {[
          { label: 'Images', value: stats.total, color: 'text-cyan-400' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          { label: 'Total Size', value: stats.totalSize, color: 'text-blue-400' },
          { label: 'Vulns', value: stats.totalVulns, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ide-bg px-2 py-1.5 text-center">
            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-ide-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search images..." className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs">
          <option value="pushed">Recent</option>
          <option value="size">Size</option>
          <option value="vulnerabilities">Vulnerabilities</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(img => {
          const config = STATUS_CONFIG[img.status]
          const totalVulns = img.vulnerabilities.critical + img.vulnerabilities.high + img.vulnerabilities.medium + img.vulnerabilities.low
          return (
            <div key={img.id}>
              <div onClick={() => setExpandedId(expandedId === img.id ? null : img.id)} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  {expandedId === img.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Container size={12} className={config.color} />
                  <span className="text-xs font-semibold flex-1 truncate">{img.name}</span>
                  <span className="px-1.5 py-0.5 bg-ide-bg-secondary rounded text-xs font-mono text-indigo-400">{img.tag}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${config.bg} ${config.color}`}>{config.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ide-text-secondary ml-5">
                  <span>{img.size}</span>
                  <span>{img.layers} layers</span>
                  <span>{timeAgo(img.pushed)}</span>
                  {totalVulns > 0 && <span className={img.vulnerabilities.critical > 0 ? 'text-red-400' : 'text-yellow-400'}>{totalVulns} vulns</span>}
                </div>
              </div>
              {expandedId === img.id && (
                <div className="px-6 pb-2 space-y-2 bg-ide-bg-secondary/10">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-ide-text-secondary">Digest:</span> <span className="font-mono text-cyan-400 flex items-center gap-1">{img.digest} <button onClick={e => { e.stopPropagation(); copyDigest(img.digest) }}>{copiedDigest === img.digest ? <Check size={8} className="text-green-400" /> : <Copy size={8} />}</button></span></div>
                    <div><span className="text-ide-text-secondary">Platform:</span> {img.platform}</div>
                    <div><span className="text-ide-text-secondary">Author:</span> {img.author}</div>
                    <div><span className="text-ide-text-secondary">Created:</span> {timeAgo(img.created)}</div>
                  </div>
                  {totalVulns > 0 && (
                    <div className="text-xs">
                      <span className="text-ide-text-secondary">Vulnerabilities:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {img.vulnerabilities.critical > 0 && <span className="px-1 py-0 bg-red-500/20 text-red-400 rounded text-[10px]">{img.vulnerabilities.critical} critical</span>}
                        {img.vulnerabilities.high > 0 && <span className="px-1 py-0 bg-orange-500/20 text-orange-400 rounded text-[10px]">{img.vulnerabilities.high} high</span>}
                        {img.vulnerabilities.medium > 0 && <span className="px-1 py-0 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">{img.vulnerabilities.medium} medium</span>}
                        {img.vulnerabilities.low > 0 && <span className="px-1 py-0 bg-blue-400/20 text-blue-400 rounded text-[10px]">{img.vulnerabilities.low} low</span>}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><Download size={8} /> Pull</button>
                    <button className="px-2 py-0.5 bg-ide-bg-secondary rounded text-[10px] text-ide-text-secondary hover:text-ide-text flex items-center gap-0.5"><Eye size={8} /> Inspect</button>
                    <button className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] hover:bg-red-600/30 flex items-center gap-0.5"><Trash2 size={8} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
