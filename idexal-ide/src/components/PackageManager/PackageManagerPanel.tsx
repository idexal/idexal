import React, { useState, useEffect, useMemo } from 'react'
import {
  FaBox, FaSearch, FaDownload, FaTrash, FaSync, FaArrowUp, FaChevronDown, FaChevronRight, FaExternalLinkAlt, FaCode, FaCheckCircle, FaExclamationCircle, FaFilter, FaPlus, FaMinus
} from '../Icon'

interface PackageInfo {
  name: string
  version: string
  latestVersion: string
  description: string
  author: string
  license: string
  dependencies: number
  weeklyDownloads: number
  repository: string
  isOutdated: boolean
  isDev: boolean
}

interface TaskResult {
  success: boolean
  output: string
  packageName: string
  duration: number
}

type PackageManagerType = 'npm' | 'yarn' | 'pnpm'

const MOCK_PACKAGES: PackageInfo[] = [
  { name: 'react', version: '18.2.0', latestVersion: '18.3.0', description: 'A JavaScript library for building user interfaces', author: 'React Team', license: 'MIT', dependencies: 0, weeklyDownloads: 18000000, repository: 'https://github.com/facebook/react', isOutdated: true, isDev: false },
  { name: 'react-dom', version: '18.2.0', latestVersion: '18.3.0', description: 'React package for working with the DOM', author: 'React Team', license: 'MIT', dependencies: 1, weeklyDownloads: 16000000, repository: 'https://github.com/facebook/react', isOutdated: true, isDev: false },
  { name: 'typescript', version: '5.3.3', latestVersion: '5.4.0', description: 'TypeScript is a language for application scale JavaScript', author: 'Microsoft', license: 'Apache-2.0', dependencies: 0, weeklyDownloads: 25000000, repository: 'https://github.com/microsoft/TypeScript', isOutdated: true, isDev: true },
  { name: 'zustand', version: '4.5.0', latestVersion: '4.5.2', description: 'Bear necessities for state management in React', author: 'Daishi Kato', license: 'MIT', dependencies: 0, weeklyDownloads: 4500000, repository: 'https://github.com/pmndrs/zustand', isOutdated: false, isDev: false },
  { name: 'lucide-react', version: '0.344.0', latestVersion: '0.365.0', description: 'Beautiful & consistent icons', author: 'Lucide', license: 'ISC', dependencies: 0, weeklyDownloads: 3200000, repository: 'https://github.com/lucide-icons/lucide', isOutdated: true, isDev: false },
  { name: 'tailwindcss', version: '3.4.1', latestVersion: '3.4.4', description: 'A utility-first CSS framework', author: 'Tailwind Labs', license: 'MIT', dependencies: 2, weeklyDownloads: 12000000, repository: 'https://github.com/tailwindlabs/tailwindcss', isOutdated: true, isDev: true },
  { name: 'vite', version: '5.0.12', latestVersion: '5.1.0', description: 'Next generation frontend tooling', author: 'Evan You', license: 'MIT', dependencies: 5, weeklyDownloads: 15000000, repository: 'https://github.com/vitejs/vite', isOutdated: true, isDev: true },
  { name: '@monaco-editor/react', version: '4.6.0', latestVersion: '4.6.0', description: 'React wrapper for Monaco Editor', author: 'Suren Atomyan', license: 'MIT', dependencies: 1, weeklyDownloads: 1800000, repository: 'https://github.com/suren-atoyan/monaco-react', isOutdated: false, isDev: false },
  { name: 'vitest', version: '1.2.0', latestVersion: '1.3.0', description: 'Next Generation Testing Framework', author: 'Vitest Team', license: 'MIT', dependencies: 8, weeklyDownloads: 7000000, repository: 'https://github.com/vitest-dev/vitest', isOutdated: true, isDev: true },
  { name: '@xterm/xterm', version: '6.0.0', latestVersion: '6.0.0', description: 'Full terminal emulator in the browser', author: 'xterm.js', license: 'MIT', dependencies: 0, weeklyDownloads: 900000, repository: 'https://github.com/xtermjs/xterm.js', isOutdated: false, isDev: false },
  { name: 'eslint', version: '8.56.0', latestVersion: '9.0.0', description: 'Pluggable JavaScript linter', author: 'ESLint Team', license: 'MIT', dependencies: 12, weeklyDownloads: 22000000, repository: 'https://github.com/eslint/eslint', isOutdated: true, isDev: true },
  { name: 'prettier', version: '3.2.0', latestVersion: '3.2.5', description: 'Opinionated code formatter', author: 'Prettier', license: 'MIT', dependencies: 3, weeklyDownloads: 20000000, repository: 'https://github.com/prettier/prettier', isOutdated: true, isDev: true },
]

function formatDownloads(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

export default function PackageManagerPanel({ onClose }: { onClose: () => void }) {
  const [manager, setManager] = useState<PackageManagerType>('npm')
  const [searchQuery, setSearchQuery] = useState('')
  const [packages, setPackages] = useState<PackageInfo[]>(MOCK_PACKAGES)
  const [filterType, setFilterType] = useState<'all' | 'outdated' | 'dev' | 'prod'>('all')
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null)
  const [installingPkg, setInstallingPkg] = useState<string | null>(null)
  const [taskLog, setTaskLog] = useState<TaskResult[]>([])
  const [showLog, setShowLog] = useState(false)
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([])

  const filtered = useMemo(() => {
    return packages.filter(p => {
      if (filterType === 'outdated') return p.isOutdated
      if (filterType === 'dev') return p.isDev
      if (filterType === 'prod') return !p.isDev
      return true
    }).filter(p =>
      !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [packages, filterType, searchQuery])

  const stats = useMemo(() => ({
    total: packages.length,
    outdated: packages.filter(p => p.isOutdated).length,
    dev: packages.filter(p => p.isDev).length,
    prod: packages.filter(p => !p.isDev).length,
  }), [packages])

  const simulateAction = async (pkgName: string, action: string) => {
    setInstallingPkg(pkgName)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
    const result: TaskResult = {
      success: true,
      output: `${manager} ${action} ${pkgName}\n${pkgName} ${action === 'install' ? 'installed' : action === 'uninstall' ? 'removed' : 'updated'} successfully`,
      packageName: pkgName,
      duration: Math.floor(800 + Math.random() * 1200),
    }
    setTaskLog(prev => [result, ...prev])
    setInstallingPkg(null)

    if (action === 'update') {
      setPackages(prev => prev.map(p => p.name === pkgName ? { ...p, version: p.latestVersion, isOutdated: false } : p))
    } else if (action === 'uninstall') {
      setPackages(prev => prev.filter(p => p.name !== pkgName))
    }
  }

  const updateAll = async () => {
    const outdated = packages.filter(p => p.isOutdated)
    for (const pkg of outdated) {
      await simulateAction(pkg.name, 'update')
    }
  }

  const handleSearch = async () => {
    if (!searchQuery) { setSearchResults([]); return }
    setInstallingPkg('search')
    await new Promise(r => setTimeout(r, 600))
    const results: PackageInfo[] = [
      { name: searchQuery, version: '0.0.0', latestVersion: '1.0.0', description: `Search result for "${searchQuery}"`, author: 'Community', license: 'MIT', dependencies: 0, weeklyDownloads: Math.floor(Math.random() * 5000000), repository: '', isOutdated: false, isDev: false },
    ]
    setSearchResults(results)
    setInstallingPkg(null)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBox size={16} className="text-purple-400" />
          <span className="text-sm font-semibold">Packages</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={manager}
            onChange={e => setManager(e.target.value as PackageManagerType)}
            className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-0.5 text-xs text-ide-text"
          >
            <option value="npm">npm</option>
            <option value="yarn">yarn</option>
            <option value="pnpm">pnpm</option>
          </select>
          <button onClick={updateAll} className="p-1 hover:bg-ide-bg-secondary rounded" title="Update All">
            <FaSync size={14} className="text-green-400" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{stats.total} packages</span>
        {stats.outdated > 0 && <span className="text-yellow-400">{stats.outdated} outdated</span>}
        <span className="text-blue-400">{stats.dev} dev</span>
        <span className="text-green-400">{stats.prod} prod</span>
      </div>

      {/* Search + Filter */}
      <div className="px-3 py-2 space-y-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
            <FaSearch size={14} className="text-ide-text-secondary mr-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search packages..."
              className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
            />
          </div>
          <button onClick={handleSearch} className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs">
            <FaSearch size={12} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'outdated', 'dev', 'prod'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2 py-0.5 text-xs rounded ${filterType === f ? 'bg-purple-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary hover:text-ide-text'}`}
            >
              {f === 'all' ? 'All' : f === 'outdated' ? `Outdated (${stats.outdated})` : f === 'dev' ? 'Dev' : 'Prod'}
            </button>
          ))}
        </div>
      </div>

      {/* Package List */}
      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border-b border-ide-border">
            <div className="px-3 py-1 text-xs text-purple-400 font-semibold bg-ide-bg-secondary/30">Search Results</div>
            {searchResults.map(pkg => (
              <div key={pkg.name} className="px-3 py-2 border-b border-ide-border/50 flex items-center justify-between hover:bg-ide-bg-secondary/30">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{pkg.name}</div>
                  <div className="text-xs text-ide-text-secondary truncate">{pkg.description}</div>
                </div>
                <button
                  onClick={() => simulateAction(pkg.name, 'install')}
                  disabled={installingPkg === pkg.name}
                  className="ml-2 px-2 py-0.5 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center gap-1"
                >
                  {installingPkg === pkg.name ? <FaCode size={10} className="animate-spin" /> : <FaDownload size={10} />}
                  Install
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Installed Packages */}
        {filtered.map(pkg => (
          <div key={pkg.name} className="border-b border-ide-border/50">
            <div
              className="flex items-center px-3 py-2 hover:bg-ide-bg-secondary/30 cursor-pointer"
              onClick={() => setExpandedPkg(expandedPkg === pkg.name ? null : pkg.name)}
            >
              <div className="flex items-center gap-1.5 mr-2">
                {expandedPkg === pkg.name ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{pkg.name}</span>
                  <span className="text-xs text-ide-text-secondary">v{pkg.version}</span>
                  {pkg.isOutdated && (
                    <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                      <FaArrowUp size={10} />
                      {pkg.latestVersion}
                    </span>
                  )}
                  {pkg.isDev && <span className="text-xs text-orange-400 bg-orange-400/10 px-1 rounded">dev</span>}
                </div>
                <div className="text-xs text-ide-text-secondary truncate">{pkg.description}</div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {pkg.isOutdated && (
                  <button
                    onClick={e => { e.stopPropagation(); simulateAction(pkg.name, 'update') }}
                    disabled={installingPkg === pkg.name}
                    className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                    title="Update"
                  >
                    {installingPkg === pkg.name ? <FaCode size={12} className="animate-spin" /> : <FaArrowUp size={12} />}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); simulateAction(pkg.name, 'uninstall') }}
                  disabled={installingPkg === pkg.name}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400"
                  title="Remove"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedPkg === pkg.name && (
              <div className="px-6 py-2 bg-ide-bg-secondary/20 text-xs space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-ide-text-secondary">Author:</span>
                  <span>{pkg.author}</span>
                  <span className="text-ide-text-secondary">License:</span>
                  <span>{pkg.license}</span>
                  <span className="text-ide-text-secondary">Downloads/week:</span>
                  <span>{formatDownloads(pkg.weeklyDownloads)}</span>
                  <span className="text-ide-text-secondary">Dependencies:</span>
                  <span>{pkg.dependencies}</span>
                </div>
                {pkg.repository && (
                  <a href={pkg.repository} target="_blank" rel="noopener" className="flex items-center gap-1 text-purple-400 hover:underline">
                    <FaExternalLinkAlt size={10} />
                    Repository
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task Log Toggle */}
      {taskLog.length > 0 && (
        <div className="border-t border-ide-border">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full px-3 py-1 text-xs text-ide-text-secondary hover:bg-ide-bg-secondary flex items-center gap-1"
          >
            {showLog ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            Task Log ({taskLog.length})
          </button>
          {showLog && (
            <div className="max-h-32 overflow-y-auto px-3 py-1 space-y-1 border-t border-ide-border/50">
              {taskLog.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {t.success ? <FaCheckCircle size={10} className="text-green-400" /> : <FaExclamationCircle size={10} className="text-red-400" />}
                  <span className="text-ide-text-secondary">{t.duration}ms</span>
                  <span className="truncate">{t.output.split('\n')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
