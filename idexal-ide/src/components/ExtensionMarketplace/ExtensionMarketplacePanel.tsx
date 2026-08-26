import React, { useState, useMemo } from 'react'
import {
  FaCode, FaSearch, FaDownload, FaTrash, FaCheck, FaStar, FaExternalLinkAlt, FaFilter, FaTh, FaList, FaShieldAlt, FaBolt, FaTerminal, FaCodeBranch, FaBrain, FaBox, FaEye
} from '../Icon'

interface MarketplaceExtension {
  id: string
  name: string
  displayName: string
  description: string
  author: string
  version: string
  downloads: number
  rating: number
  ratingCount: number
  icon: string
  category: string
  tags: string[]
  installed: boolean
  enabled: boolean
  featured: boolean
  verified: boolean
  lastUpdated: string
}

const MOCK_EXTENSIONS: MarketplaceExtension[] = [
  { id: 'ms-vscode.prettier', name: 'prettier', displayName: 'Prettier - FaCode formatter', description: 'FaCode formatter using prettier', author: 'Prettier', version: '10.4.0', downloads: 28000000, rating: 4.8, ratingCount: 4500, icon: '🎨', category: 'Formatters', tags: ['prettier', 'format'], installed: true, enabled: true, featured: true, verified: true, lastUpdated: '2024-02-15' },
  { id: 'dbaeumer.vscode-eslint', name: 'eslint', displayName: 'ESLint', description: 'Integrates ESLint JavaScript linting', author: 'Microsoft', version: '2.4.4', downloads: 25000000, rating: 4.7, ratingCount: 3800, icon: '✓', category: 'Linters', tags: ['eslint', 'lint'], installed: true, enabled: true, featured: true, verified: true, lastUpdated: '2024-02-10' },
  { id: 'bradlc.vscode-tailwindcss', name: 'tailwindcss', displayName: 'Tailwind CSS IntelliSense', description: 'Tailwind CSS tooling for VS FaCode', author: 'Tailwind Labs', version: '0.10.4', downloads: 12000000, rating: 4.9, ratingCount: 2100, icon: '🌊', category: 'Linters', tags: ['tailwind', 'css'], installed: false, enabled: false, featured: true, verified: true, lastUpdated: '2024-02-12' },
  { id: 'ms-vscode.vscode-typescript-next', name: 'typescript', displayName: 'TypeScript Importer', description: 'Import TypeScript modules automatically', author: 'Microsoft', version: '5.4.0', downloads: 18000000, rating: 4.6, ratingCount: 1800, icon: '📘', category: 'Programming Languages', tags: ['typescript', 'import'], installed: false, enabled: false, featured: false, verified: true, lastUpdated: '2024-02-08' },
  { id: 'eamodio.gitlens', name: 'gitlens', displayName: 'GitLens — Git supercharged', description: 'Supercharge Git within VS FaCode', author: 'GitKraken', version: '14.2.0', downloads: 15000000, rating: 4.8, ratingCount: 5200, icon: '🔍', category: 'SCM Providers', tags: ['git', 'lens'], installed: true, enabled: true, featured: true, verified: true, lastUpdated: '2024-02-14' },
  { id: 'ritwickdey.LiveServer', name: 'liveserver', displayName: 'Live Server', description: 'Launch local development server with live reload', author: 'Ritwick Dey', version: '5.7.9', downloads: 32000000, rating: 4.7, ratingCount: 6100, icon: '🌐', category: 'Other', tags: ['live', 'server'], installed: false, enabled: false, featured: false, verified: false, lastUpdated: '2023-12-01' },
  { id: 'ms-python.python', name: 'python', displayName: 'Python', description: 'Python language support with IntelliSense', author: 'Microsoft', version: '2024.2.0', downloads: 45000000, rating: 4.8, ratingCount: 8900, icon: '🐍', category: 'Programming Languages', tags: ['python'], installed: false, enabled: false, featured: true, verified: true, lastUpdated: '2024-02-13' },
  { id: 'rust-lang.rust-analyzer', name: 'rust-analyzer', displayName: 'rust-analyzer', description: 'Rust language support', author: 'Rust', version: '0.4.1700', downloads: 5000000, rating: 4.9, ratingCount: 1200, icon: '🦀', category: 'Programming Languages', tags: ['rust'], installed: true, enabled: true, featured: true, verified: true, lastUpdated: '2024-02-15' },
  { id: 'ms-vscode.vscode-json', name: 'json', displayName: 'JSON', description: 'JSON language support', author: 'Microsoft', version: '1.0.0', downloads: 35000000, rating: 4.5, ratingCount: 2800, icon: '📋', category: 'Programming Languages', tags: ['json'], installed: true, enabled: true, featured: false, verified: true, lastUpdated: '2024-01-20' },
  { id: 'formulahendry.code-runner', name: 'coderunner', displayName: 'FaCode Runner', description: 'Run code snippets in multiple languages', author: 'Jun Han', version: '0.12.1', downloads: 18000000, rating: 4.6, ratingCount: 3200, icon: '▶️', category: 'Other', tags: ['run', 'code'], installed: false, enabled: false, featured: false, verified: false, lastUpdated: '2023-11-15' },
  { id: 'ms-vscode.remote-ssh', name: 'remote-ssh', displayName: 'Remote - SSH', description: 'Open remote folders via SSH', author: 'Microsoft', version: '0.108.0', downloads: 10000000, rating: 4.5, ratingCount: 1900, icon: '🔌', category: 'Remote', tags: ['ssh', 'remote'], installed: false, enabled: false, featured: false, verified: true, lastUpdated: '2024-02-05' },
  { id: 'ms-vscode.theme-monokai-pro', name: 'monokai', displayName: 'Monokai Pro', description: 'Professional Monokai theme', author: 'Monokai', version: '1.2.2', downloads: 8000000, rating: 4.8, ratingCount: 2400, icon: '🎨', category: 'Themes', tags: ['theme', 'monokai'], installed: false, enabled: false, featured: false, verified: true, lastUpdated: '2023-10-01' },
  { id: 'esbenp.prettier-vscode', name: 'prettier', displayName: 'Prettier ESLint', description: 'Format with Prettier and lint with ESLint', author: 'Prettier', version: '5.0.0', downloads: 6000000, rating: 4.3, ratingCount: 800, icon: '✨', category: 'Formatters', tags: ['prettier', 'eslint'], installed: false, enabled: false, featured: false, verified: true, lastUpdated: '2024-01-10' },
]

function formatDownloads(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

const CATEGORIES = ['All', 'Formatters', 'Linters', 'Programming Languages', 'SCM Providers', 'Themes', 'Remote', 'Other']

export default function ExtensionMarketplacePanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>(MOCK_EXTENSIONS)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'installs' | 'rating' | 'name' | 'updated'>('installs')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedExt, setSelectedExt] = useState<MarketplaceExtension | null>(null)
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [filterInstalled, setFilterInstalled] = useState<'all' | 'installed' | 'not-installed'>('all')

  const filtered = useMemo(() => {
    return extensions
      .filter(ext => {
        if (selectedCategory !== 'All' && ext.category !== selectedCategory) return false
        if (filterInstalled === 'installed' && !ext.installed) return false
        if (filterInstalled === 'not-installed' && ext.installed) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return ext.displayName.toLowerCase().includes(q) || ext.description.toLowerCase().includes(q) ||
            ext.tags.some(t => t.includes(q)) || ext.author.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'installs') return b.downloads - a.downloads
        if (sortBy === 'rating') return b.rating - a.rating
        if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
        return 0
      })
  }, [extensions, selectedCategory, sortBy, searchQuery, filterInstalled])

  const stats = useMemo(() => ({
    total: extensions.length,
    installed: extensions.filter(e => e.installed).length,
    featured: extensions.filter(e => e.featured).length,
  }), [extensions])

  const toggleInstall = async (ext: MarketplaceExtension) => {
    setInstallingId(ext.id)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1000))
    setExtensions(prev => prev.map(e => e.id === ext.id ? { ...e, installed: !e.installed, enabled: !e.installed } : e))
    setInstallingId(null)
  }

  const toggleEnable = (ext: MarketplaceExtension) => {
    setExtensions(prev => prev.map(e => e.id === ext.id ? { ...e, enabled: !e.enabled } : e))
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">Extensions Marketplace</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
            {viewMode === 'grid' ? <FaList size={14} /> : <FaTh size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{stats.total} extensions</span>
        <span className="text-green-400">{stats.installed} installed</span>
        <span className="text-yellow-400">{stats.featured} featured</span>
      </div>

      {/* Search + Filters */}
      <div className="px-3 py-2 space-y-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
            <FaSearch size={14} className="text-ide-text-secondary mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search extensions..."
              className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
          >
            <option value="installs">Most Downloads</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name</option>
          </select>
          <select
            value={filterInstalled}
            onChange={e => setFilterInstalled(e.target.value as typeof filterInstalled)}
            className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="installed">Installed</option>
            <option value="not-installed">Not Installed</option>
          </select>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Extension List */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedExt ? (
          /* Extension Detail View */
          <div className="space-y-3">
            <button onClick={() => setSelectedExt(null)} className="text-xs text-blue-400 hover:underline">← Back to list</button>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{selectedExt.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{selectedExt.displayName}</span>
                  {selectedExt.verified && <FaShieldAlt size={12} className="text-blue-400" />}
                </div>
                <div className="text-xs text-ide-text-secondary">{selectedExt.author} · v{selectedExt.version}</div>
                <div className="text-xs text-ide-text-secondary mt-1">{selectedExt.description}</div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-yellow-400">★ {selectedExt.rating}</span>
                  <span className="text-ide-text-secondary">{formatDownloads(selectedExt.downloads)} downloads</span>
                  <span className="text-ide-text-secondary">{selectedExt.category}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {selectedExt.installed ? (
                    <>
                      <button
                        onClick={() => toggleEnable(selectedExt)}
                        className={`px-3 py-1 rounded text-xs ${selectedExt.enabled ? 'bg-green-600/20 text-green-400' : 'bg-ide-bg-secondary text-ide-text-secondary'}`}
                      >
                        {selectedExt.enabled ? '✓ Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => toggleInstall(selectedExt)}
                        className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30"
                      >
                        Uninstall
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleInstall(selectedExt)}
                      disabled={installingId === selectedExt.id}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs flex items-center gap-1"
                    >
                      {installingId === selectedExt.id ? <FaCode size={10} className="animate-spin" /> : <FaDownload size={10} />}
                      Install
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedExt.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">{tag}</span>
              ))}
            </div>
          </div>
        ) : (
          /* Extension Grid/List */
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2' : 'space-y-1'}>
            {filtered.map(ext => (
              <div
                key={ext.id}
                onClick={() => setSelectedExt(ext)}
                className={`flex items-center gap-3 p-2 rounded border border-ide-border/50 hover:bg-ide-bg-secondary/30 cursor-pointer ${
                  ext.installed ? 'border-l-2 border-l-green-500' : ''
                }`}
              >
                <div className="text-2xl flex-shrink-0">{ext.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">{ext.displayName}</span>
                    {ext.verified && <FaShieldAlt size={10} className="text-blue-400 flex-shrink-0" />}
                    {ext.featured && <FaStar size={10} className="text-yellow-400 flex-shrink-0 fill-yellow-400" />}
                  </div>
                  <div className="text-xs text-ide-text-secondary truncate">{ext.description}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-ide-text-secondary">
                    <span>{ext.author}</span>
                    <span>★ {ext.rating}</span>
                    <span>{formatDownloads(ext.downloads)}</span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleInstall(ext) }}
                  disabled={installingId === ext.id}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 flex-shrink-0 ${
                    ext.installed
                      ? 'bg-ide-bg-secondary text-ide-text-secondary hover:bg-red-600/20 hover:text-red-400'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {installingId === ext.id ? <FaCode size={10} className="animate-spin" /> : ext.installed ? <FaCheck size={10} /> : <FaDownload size={10} />}
                  {ext.installed ? 'Installed' : 'Install'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
