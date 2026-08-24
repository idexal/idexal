import React, { useState, useMemo } from 'react'
import {
  Shield, AlertTriangle, AlertCircle, CheckCircle, XCircle, Search,
  RefreshCw, ExternalLink, ChevronDown, ChevronRight, Lock, Unlock,
  Eye, Code, Package, FileText, Globe, Zap
} from 'lucide-react'

interface Vulnerability {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  title: string
  description: string
  file: string
  line?: number
  package?: string
  cve?: string
  fixAvailable: boolean
  status: 'open' | 'fixed' | 'ignored'
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertCircle },
  low: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', icon: AlertCircle },
  info: { color: 'text-ide-text-secondary', bg: 'bg-ide-bg-secondary', border: 'border-ide-border', icon: CheckCircle },
}

const MOCK_VULNS: Vulnerability[] = [
  { id: 'v1', severity: 'critical', category: 'Dependency', title: 'Critical: Prototype Pollution in lodash', description: 'Versions of lodash before 4.17.21 are vulnerable to Prototype Pollution via the merge function.', package: 'lodash@4.17.19', cve: 'CVE-2021-23337', file: 'package.json', fixAvailable: true, status: 'open' },
  { id: 'v2', severity: 'high', category: 'Secret Detection', title: 'Hardcoded API Key detected', description: 'An API key was found hardcoded in source code. This could lead to unauthorized access.', file: 'src/services/aiStreamingService.ts', line: 45, fixAvailable: true, status: 'open' },
  { id: 'v3', severity: 'high', category: 'Dependency', title: 'High: Regular Expression DoS in node-forge', description: 'node-forge before 1.3.0 is vulnerable to URL parsing attacks.', package: 'node-forge@1.2.1', cve: 'CVE-2022-24771', file: 'package.json', fixAvailable: true, status: 'open' },
  { id: 'v4', severity: 'medium', category: 'Code Quality', title: 'SQL Injection risk in query builder', description: 'User input is directly interpolated into SQL queries without parameterization.', file: 'src/services/databaseService.ts', line: 128, fixAvailable: true, status: 'open' },
  { id: 'v5', severity: 'medium', category: 'Security Misconfiguration', title: 'CORS misconfiguration', description: 'CORS is configured to allow all origins. This could allow unauthorized cross-origin requests.', file: 'electron/src/main.ts', line: 89, fixAvailable: true, status: 'open' },
  { id: 'v6', severity: 'low', category: 'Code Quality', title: 'Console.log statements in production', description: 'Debug console.log statements found that could leak sensitive information.', file: 'src/services/agentOrchestrator.ts', line: 234, fixAvailable: true, status: 'fixed' },
  { id: 'v7', severity: 'low', category: 'Dependency', title: 'Low: Information disclosure in color package', description: 'color package before 4.2.3 has a ReDoS vulnerability.', package: 'color@4.2.0', file: 'package.json', fixAvailable: true, status: 'ignored' },
  { id: 'v8', severity: 'info', category: 'License', title: 'MIT License detected', description: 'All dependencies use permissive licenses.', file: 'package.json', fixAvailable: false, status: 'open' },
]

const MOCK扫描结果 = {
  totalScanned: 847,
  filesScanned: 59,
  dependenciesScanned: 84,
  scanDuration: 12.5,
  lastScan: new Date(Date.now() - 600000),
}

export default function SecurityScannerPanel({ onClose }: { onClose: () => void }) {
  const [vulns, setVulns] = useState(MOCK_VULNS)
  const [isScanning, setIsScanning] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<Set<string>>(new Set(['critical', 'high', 'medium', 'low', 'info']))
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'fixed' | 'ignored'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [scanProgress, setScanProgress] = useState(0)

  const filtered = useMemo(() => {
    return vulns.filter(v => {
      if (!filterSeverity.has(v.severity)) return false
      if (filterStatus !== 'all' && v.status !== filterStatus) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.file.toLowerCase().includes(q)
      }
      return true
    })
  }, [vulns, filterSeverity, filterStatus, searchQuery])

  const stats = useMemo(() => ({
    critical: vulns.filter(v => v.severity === 'critical').length,
    high: vulns.filter(v => v.severity === 'high').length,
    medium: vulns.filter(v => v.severity === 'medium').length,
    low: vulns.filter(v => v.severity === 'low').length,
    info: vulns.filter(v => v.severity === 'info').length,
    open: vulns.filter(v => v.status === 'open').length,
    fixed: vulns.filter(v => v.status === 'fixed').length,
    ignored: vulns.filter(v => v.status === 'ignored').length,
  }), [vulns])

  const runScan = async () => {
    setIsScanning(true)
    setScanProgress(0)
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 100))
      setScanProgress(i)
    }
    setIsScanning(false)
  }

  const fixVuln = (id: string) => {
    setVulns(prev => prev.map(v => v.id === id ? { ...v, status: 'fixed' as const } : v))
  }

  const ignoreVuln = (id: string) => {
    setVulns(prev => prev.map(v => v.id === id ? { ...v, status: 'ignored' as const } : v))
  }

  const toggleSeverity = (sev: string) => {
    setFilterSeverity(prev => {
      const next = new Set(prev)
      if (next.has(sev)) next.delete(sev)
      else next.add(sev)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <span className="text-sm font-semibold">Security Scanner</span>
          {isScanning && <span className="text-xs text-blue-400 animate-pulse">Scanning...</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={runScan} disabled={isScanning} className="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
            {isScanning ? <RefreshCw size={10} className="animate-spin" /> : <Shield size={10} />}
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="px-3 py-2 border-b border-ide-border">
          <div className="w-full h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${scanProgress}%` }} />
          </div>
          <div className="text-xs text-ide-text-secondary mt-1">Scanning files and dependencies... {scanProgress}%</div>
        </div>
      )}

      {/* Severity Stats */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-ide-border overflow-x-auto">
        {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
          const config = SEVERITY_CONFIG[sev]
          return (
            <button
              key={sev}
              onClick={() => toggleSeverity(sev)}
              className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 whitespace-nowrap ${
                filterSeverity.has(sev) ? `${config.bg} ${config.color} border ${config.border}` : 'text-ide-text-secondary'
              }`}
            >
              {sev}: {stats[sev]}
            </button>
          )
        })}
      </div>

      {/* Search + Status Filter */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vulnerabilities..." className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs">
          <option value="all">All ({stats.open + stats.fixed + stats.ignored})</option>
          <option value="open">Open ({stats.open})</option>
          <option value="fixed">Fixed ({stats.fixed})</option>
          <option value="ignored">Ignored ({stats.ignored})</option>
        </select>
      </div>

      {/* Vulnerability List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-ide-text-secondary text-xs">No vulnerabilities found</div>
        ) : (
          filtered.map(vuln => {
            const config = SEVERITY_CONFIG[vuln.severity]
            const Icon = config.icon
            return (
              <div key={vuln.id} className={`border-b border-ide-border/30 ${vuln.status !== 'open' ? 'opacity-50' : ''}`}>
                <div
                  onClick={() => setExpandedId(expandedId === vuln.id ? null : vuln.id)}
                  className={`px-3 py-2 hover:bg-ide-bg-secondary/20 cursor-pointer ${config.bg}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {expandedId === vuln.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Icon size={12} className={config.color} />
                    <span className="text-xs font-semibold flex-1">{vuln.title}</span>
                    {vuln.fixAvailable && vuln.status === 'open' && (
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">Fix available</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ide-text-secondary ml-5">
                    <span className={`px-1 py-0 rounded ${config.bg} ${config.color}`}>{vuln.severity}</span>
                    <span>{vuln.category}</span>
                    {vuln.package && <span className="font-mono">{vuln.package}</span>}
                    <span className="font-mono">{vuln.file}{vuln.line ? `:${vuln.line}` : ''}</span>
                  </div>
                </div>
                {expandedId === vuln.id && (
                  <div className="px-4 pb-2 space-y-2">
                    <div className="text-xs">{vuln.description}</div>
                    {vuln.cve && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`} target="_blank" rel="noopener" className="text-xs text-sky-400 flex items-center gap-1">
                        <ExternalLink size={10} /> {vuln.cve}
                      </a>
                    )}
                    {vuln.status === 'open' && (
                      <div className="flex gap-1">
                        {vuln.fixAvailable && (
                          <button onClick={() => fixVuln(vuln.id)} className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">Fix</button>
                        )}
                        <button onClick={() => ignoreVuln(vuln.id)} className="px-2 py-0.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary hover:text-ide-text">Ignore</button>
                      </div>
                    )}
                    {vuln.status !== 'open' && (
                      <span className={`text-xs ${vuln.status === 'fixed' ? 'text-green-400' : 'text-ide-text-secondary'}`}>
                        {vuln.status === 'fixed' ? '✓ Fixed' : '○ Ignored'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-ide-border px-3 py-1.5 text-xs text-ide-text-secondary flex items-center gap-3">
        <span>Scanned {MOCK扫描结果.totalScanned} packages, {MOCK扫描结果.filesScanned} files</span>
        <span>•</span>
        <span>Last scan: {MOCK扫描结果.lastScan.toLocaleTimeString()}</span>
        <span>•</span>
        <span>{MOCK扫描结果.scanDuration}s</span>
      </div>
    </div>
  )
}
