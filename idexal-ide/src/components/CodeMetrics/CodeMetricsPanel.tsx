import React, { useState, useMemo } from 'react'
import {
  FaCode, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaFileAlt, FaLayerGroup, FaCodeBranch, FaClock, FaBullseye, FaBolt, FaEye
} from '../Icon'

interface FileMetric {
  name: string
  path: string
  lines: number
  codeLines: number
  commentLines: number
  blankLines: number
  functions: number
  classes: number
  complexity: 'low' | 'medium' | 'high' | 'critical'
  maintainability: number
  duplication: number
  lastModified: string
}

interface ProjectMetrics {
  totalFiles: number
  totalLines: number
  totalCodeLines: number
  totalComments: number
  totalFunctions: number
  totalClasses: number
  averageComplexity: number
  maintainabilityIndex: number
  technicalDebt: string
  testCoverage: number
}

const MOCK_FILES: FileMetric[] = [
  { name: 'App.tsx', path: 'src/App.tsx', lines: 320, codeLines: 280, commentLines: 25, blankLines: 15, functions: 8, classes: 0, complexity: 'medium', maintainability: 78, duplication: 5, lastModified: '2h ago' },
  { name: 'ChatPanel.tsx', path: 'src/components/AI/ChatPanel.tsx', lines: 580, codeLines: 520, commentLines: 30, blankLines: 30, functions: 15, classes: 0, complexity: 'high', maintainability: 62, duplication: 12, lastModified: '1h ago' },
  { name: 'agentOrchestrator.ts', path: 'src/services/agentOrchestrator.ts', lines: 450, codeLines: 400, commentLines: 35, blankLines: 15, functions: 12, classes: 2, complexity: 'high', maintainability: 58, duplication: 8, lastModified: '3h ago' },
  { name: 'agentHierarchy.ts', path: 'src/services/agentHierarchy.ts', lines: 620, codeLines: 560, commentLines: 40, blankLines: 20, functions: 18, classes: 3, complexity: 'critical', maintainability: 45, duplication: 15, lastModified: '4h ago' },
  { name: 'MonacoEditor.tsx', path: 'src/components/Editor/MonacoEditor.tsx', lines: 280, codeLines: 240, commentLines: 25, blankLines: 15, functions: 6, classes: 0, complexity: 'medium', maintainability: 75, duplication: 3, lastModified: '5h ago' },
  { name: 'TerminalPanel.tsx', path: 'src/components/Terminal/TerminalPanel.tsx', lines: 340, codeLines: 300, commentLines: 20, blankLines: 20, functions: 10, classes: 0, complexity: 'medium', maintainability: 72, duplication: 7, lastModified: '6h ago' },
  { name: 'GitPanel.tsx', path: 'src/components/Git/GitPanel.tsx', lines: 220, codeLines: 190, commentLines: 15, blankLines: 15, functions: 8, classes: 0, complexity: 'low', maintainability: 85, duplication: 2, lastModified: '1d ago' },
  { name: 'fileSystemService.ts', path: 'src/services/fileSystemService.ts', lines: 180, codeLines: 160, commentLines: 10, blankLines: 10, functions: 6, classes: 0, complexity: 'low', maintainability: 88, duplication: 1, lastModified: '2d ago' },
  { name: 'EditorArea.tsx', path: 'src/components/Editor/EditorArea.tsx', lines: 400, codeLines: 360, commentLines: 20, blankLines: 20, functions: 12, classes: 0, complexity: 'high', maintainability: 65, duplication: 10, lastModified: '1h ago' },
  { name: 'useAgent.ts', path: 'src/hooks/useAgent.ts', lines: 500, codeLines: 450, commentLines: 30, blankLines: 20, functions: 10, classes: 0, complexity: 'high', maintainability: 60, duplication: 14, lastModified: '2h ago' },
]

export default function CodeMetricsPanel({ onClose }: { onClose: () => void }) {
  const [selectedMetric, setSelectedMetric] = useState<'overview' | 'files' | 'complexity' | 'quality'>('overview')
  const [sortBy, setSortBy] = useState<'lines' | 'complexity' | 'maintainability' | 'duplication'>('lines')

  const projectMetrics = useMemo((): ProjectMetrics => {
    const files = MOCK_FILES
    return {
      totalFiles: files.length,
      totalLines: files.reduce((s, f) => s + f.lines, 0),
      totalCodeLines: files.reduce((s, f) => s + f.codeLines, 0),
      totalComments: files.reduce((s, f) => s + f.commentLines, 0),
      totalFunctions: files.reduce((s, f) => s + f.functions, 0),
      totalClasses: files.reduce((s, f) => s + f.classes, 0),
      averageComplexity: Math.round(files.reduce((s, f) => s + (f.complexity === 'low' ? 1 : f.complexity === 'medium' ? 2 : f.complexity === 'high' ? 3 : 4), 0) / files.length * 10) / 10,
      maintainabilityIndex: Math.round(files.reduce((s, f) => s + f.maintainability, 0) / files.length),
      technicalDebt: '12.5 hours',
      testCoverage: 72,
    }
  }, [])

  const sortedFiles = useMemo(() => {
    return [...MOCK_FILES].sort((a, b) => {
      if (sortBy === 'lines') return b.lines - a.lines
      if (sortBy === 'complexity') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 }
        return order[b.complexity] - order[a.complexity]
      }
      if (sortBy === 'maintainability') return a.maintainability - b.maintainability
      return b.duplication - a.duplication
    })
  }, [sortBy])

  const complexityCounts = useMemo(() => ({
    low: MOCK_FILES.filter(f => f.complexity === 'low').length,
    medium: MOCK_FILES.filter(f => f.complexity === 'medium').length,
    high: MOCK_FILES.filter(f => f.complexity === 'high').length,
    critical: MOCK_FILES.filter(f => f.complexity === 'critical').length,
  }), [])

  const complexityColors = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-orange-400', critical: 'text-red-400' }
  const complexityBg = { low: 'bg-green-400', medium: 'bg-yellow-400', high: 'bg-orange-400', critical: 'bg-red-400' }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaCode size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold">FaCode Metrics</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {[
          { key: 'overview' as const, label: 'Overview', icon: FaBullseye },
          { key: 'files' as const, label: 'Files', icon: FaFileAlt },
          { key: 'complexity' as const, label: 'Complexity', icon: FaChartLine },
          { key: 'quality' as const, label: 'Quality', icon: FaCheckCircle },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedMetric(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 flex-1 justify-center ${
              selectedMetric === tab.key
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Overview Tab */}
        {selectedMetric === 'overview' && (
          <div className="space-y-3">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total Files', value: projectMetrics.totalFiles, icon: FaFileAlt, color: 'text-blue-400' },
                { label: 'Total Lines', value: projectMetrics.totalLines.toLocaleString(), icon: FaCode, color: 'text-green-400' },
                { label: 'FaCode Lines', value: projectMetrics.totalCodeLines.toLocaleString(), icon: FaCode, color: 'text-cyan-400' },
                { label: 'Comments', value: projectMetrics.totalComments.toLocaleString(), icon: FaEye, color: 'text-yellow-400' },
                { label: 'Functions', value: projectMetrics.totalFunctions, icon: FaBolt, color: 'text-purple-400' },
                { label: 'Classes', value: projectMetrics.totalClasses, icon: FaLayerGroup, color: 'text-pink-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <stat.icon size={10} className={stat.color} />
                    <span className="text-xs text-ide-text-secondary">{stat.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Key Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ide-text-secondary">Maintainability Index</span>
                <span className={`font-semibold ${projectMetrics.maintainabilityIndex > 70 ? 'text-green-400' : projectMetrics.maintainabilityIndex > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {projectMetrics.maintainabilityIndex}/100
                </span>
              </div>
              <div className="w-full h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${projectMetrics.maintainabilityIndex > 70 ? 'bg-green-400' : projectMetrics.maintainabilityIndex > 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${projectMetrics.maintainabilityIndex}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ide-text-secondary">Test Coverage</span>
                <span className="text-cyan-400 font-semibold">{projectMetrics.testCoverage}%</span>
              </div>
              <div className="w-full h-1.5 bg-ide-bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${projectMetrics.testCoverage}%` }} />
              </div>
            </div>

            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <FaClock size={10} className="text-orange-400" />
                <span className="text-xs text-ide-text-secondary">Estimated Technical Debt</span>
              </div>
              <span className="text-sm font-bold text-orange-400">{projectMetrics.technicalDebt}</span>
            </div>

            {/* Comment Ratio */}
            <div className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
              <div className="text-xs text-ide-text-secondary mb-1">Comment Ratio</div>
              <div className="text-sm">
                <span className="text-yellow-400">{projectMetrics.totalComments}</span>
                <span className="text-ide-text-secondary"> / </span>
                <span className="text-green-400">{projectMetrics.totalCodeLines}</span>
                <span className="text-ide-text-secondary"> = </span>
                <span className="text-cyan-400">{((projectMetrics.totalComments / projectMetrics.totalCodeLines) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {selectedMetric === 'files' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-ide-text-secondary">Sort by:</span>
              {(['lines', 'complexity', 'maintainability', 'duplication'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-0.5 text-xs rounded ${sortBy === s ? 'bg-cyan-600 text-white' : 'text-ide-text-secondary'}`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {sortedFiles.map(file => (
              <div key={file.name} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{file.name}</span>
                  <span className={`text-xs ${complexityColors[file.complexity]}`}>{file.complexity}</span>
                </div>
                <div className="text-xs text-ide-text-secondary truncate mb-1">{file.path}</div>
                <div className="flex items-center gap-3 text-xs text-ide-text-secondary">
                  <span>{file.lines} lines</span>
                  <span>{file.functions} fn</span>
                  <span>{file.maintainability}% maintainable</span>
                </div>
                <div className="flex gap-1 mt-1">
                  <div className="flex-1 h-1 bg-ide-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(file.codeLines / file.lines) * 100}%` }} />
                  </div>
                  <div className="flex-1 h-1 bg-ide-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: `${(file.commentLines / file.lines) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Complexity Tab */}
        {selectedMetric === 'complexity' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map(level => (
                <div key={level} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2 text-center">
                  <div className={`text-lg font-bold ${complexityColors[level]}`}>{complexityCounts[level]}</div>
                  <div className="text-xs text-ide-text-secondary">{level}</div>
                  <div className={`w-full h-1 mt-1 rounded-full ${complexityBg[level]}`} style={{ opacity: 0.5 }} />
                </div>
              ))}
            </div>
            <div className="text-xs text-ide-text-secondary">Files by complexity:</div>
            {sortedFiles.map(file => (
              <div key={file.name} className="flex items-center gap-2 px-2 py-1 hover:bg-ide-bg-secondary/30">
                <div className={`w-2 h-2 rounded-full ${complexityBg[file.complexity]}`} />
                <span className="text-xs flex-1 truncate">{file.name}</span>
                <span className={`text-xs ${complexityColors[file.complexity]}`}>{file.complexity}</span>
                <div className="w-16 h-1 bg-ide-bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${complexityBg[file.complexity]}`}
                    style={{ width: `${file.maintainability}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quality Tab */}
        {selectedMetric === 'quality' && (
          <div className="space-y-3">
            {sortedFiles.map(file => (
              <div key={file.name} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{file.name}</span>
                  <div className="flex items-center gap-1">
                    {file.maintainability >= 70 ? <FaCheckCircle size={10} className="text-green-400" /> : <FaExclamationTriangle size={10} className="text-yellow-400" />}
                    <span className="text-xs">{file.maintainability}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-ide-text-secondary">FaCode:</span>
                    <span className="ml-1 text-green-400">{file.codeLines}</span>
                  </div>
                  <div>
                    <span className="text-ide-text-secondary">Comments:</span>
                    <span className="ml-1 text-yellow-400">{file.commentLines}</span>
                  </div>
                  <div>
                    <span className="text-ide-text-secondary">Duplication:</span>
                    <span className={`ml-1 ${file.duplication > 10 ? 'text-red-400' : file.duplication > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {file.duplication}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
