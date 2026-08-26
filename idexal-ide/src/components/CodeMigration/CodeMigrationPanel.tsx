import React, { useState, useMemo } from 'react'
import {
  FaArrowRight, FaSync, FaCode, FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronRight, FaBolt, FaFileAlt, FaCopy, FaCheck, FaCodeBranch, FaLayerGroup, FaTerminal, FaPlay, FaClock
} from '../Icon'

interface MigrationRule {
  id: string
  name: string
  description: string
  from: string
  to: string
  autoFix: boolean
  affected: number
  status: 'pending' | 'processing' | 'done'
}

interface MigrationPreset {
  id: string
  name: string
  description: string
  from: string
  to: string
  icon: string
  rules: number
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
}

const PRESETS: MigrationPreset[] = [
  { id: 'js-to-ts', name: 'JavaScript → TypeScript', description: 'Convert JavaScript files to TypeScript with type annotations', from: 'JavaScript', to: 'TypeScript', icon: '📘', rules: 12, difficulty: 'medium', estimatedTime: '30 min' },
  { id: 'react-class-fc', name: 'Class Components → Hooks', description: 'Migrate React class components to functional components with hooks', from: 'React Class', to: 'React Hooks', icon: '⚛️', rules: 8, difficulty: 'medium', estimatedTime: '45 min' },
  { id: 'js-to-rust', name: 'JavaScript → Rust', description: 'Convert JavaScript/TypeScript code patterns to Rust equivalents', from: 'JavaScript', to: 'Rust', icon: '🦀', rules: 20, difficulty: 'hard', estimatedTime: '2 hours' },
  { id: 'express-to-hono', name: 'Express → Hono', description: 'Migrate Express.js routes to Hono framework', from: 'Express.js', to: 'Hono', icon: '🔥', rules: 10, difficulty: 'easy', estimatedTime: '20 min' },
  { id: 'css-to-tailwind', name: 'CSS → Tailwind', description: 'Convert vanilla CSS classes to Tailwind utility classes', from: 'CSS', to: 'Tailwind', icon: '🌊', rules: 15, difficulty: 'medium', estimatedTime: '1 hour' },
  { id: 'redux-to-zustand', name: 'Redux → Zustand', description: 'Migrate Redux store and actions to Zustand state management', from: 'Redux', to: 'Zustand', icon: '🐻', rules: 7, difficulty: 'easy', estimatedTime: '25 min' },
]

const MOCK_RULES: MigrationRule[] = [
  { id: 'r1', name: 'Convert var to const/let', description: 'Replace var declarations with const or let based on reassignment', from: 'var x = 5', to: 'const x = 5', autoFix: true, affected: 45, status: 'done' },
  { id: 'r2', name: 'Add TypeScript types', description: 'Infer and add type annotations to function parameters and return types', from: 'function add(a, b) {}', to: 'function add(a: number, b: number): number {}', autoFix: true, affected: 120, status: 'done' },
  { id: 'r3', name: 'Convert callbacks to async/await', description: 'Replace callback-based patterns with async/await syntax', from: 'fetch(url, (err, data) => {})', to: 'const data = await fetch(url)', autoFix: true, affected: 28, status: 'processing' },
  { id: 'r4', name: 'Replace require with import', description: 'Convert CommonJS require to ES module import statements', from: 'const x = require("module")', to: 'import x from "module"', autoFix: true, affected: 67, status: 'pending' },
  { id: 'r5', name: 'Add interface definitions', description: 'Generate TypeScript interfaces from object usage patterns', from: '{ name: string, age: number }', to: 'interface User { name: string; age: number }', autoFix: false, affected: 34, status: 'pending' },
  { id: 'r6', name: 'Convert string concatenation to template literals', description: 'Replace string + concatenation with template literal syntax', from: '"Hello " + name', to: '`Hello ${name}`', autoFix: true, affected: 52, status: 'done' },
  { id: 'r7', name: 'Replace == with ===', description: 'Use strict equality operators instead of loose equality', from: 'x == "5"', to: 'x === "5"', autoFix: true, affected: 18, status: 'done' },
  { id: 'r8', name: 'Add error handling', description: 'Wrap unhandled promises with try/catch blocks', from: 'asyncFn()', to: 'try { await asyncFn() } catch (e) {}', autoFix: false, affected: 15, status: 'pending' },
]

export default function CodeMigrationPanel({ onClose }: { onClose: () => void }) {
  const [selectedPreset, setSelectedPreset] = useState<MigrationPreset>(PRESETS[0])
  const [rules, setRules] = useState(MOCK_RULES)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'rules' | 'progress'>('presets')
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => ({
    total: rules.length,
    done: rules.filter(r => r.status === 'done').length,
    processing: rules.filter(r => r.status === 'processing').length,
    pending: rules.filter(r => r.status === 'pending').length,
    totalAffected: rules.reduce((s, r) => s + r.affected, 0),
  }), [rules])

  const runMigration = async () => {
    setIsRunning(true)
    setActiveTab('rules')
    for (const rule of rules) {
      if (rule.status === 'done') continue
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: 'processing' as const } : r))
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: 'done' as const } : r))
    }
    setIsRunning(false)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaArrowRight size={16} className="text-orange-400" />
          <span className="text-sm font-semibold">FaCode Migration</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
      </div>

      {/* Migration banner */}
      <div className="px-3 py-2 border-b border-ide-border bg-gradient-to-r from-orange-500/5 to-blue-500/5">
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">{selectedPreset.from}</span>
          <FaArrowRight size={12} className="text-ide-text-secondary" />
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">{selectedPreset.to}</span>
          <span className="text-ide-text-secondary ml-2">{stats.totalAffected} instances to migrate</span>
        </div>
      </div>

      <div className="flex border-b border-ide-border">
        {[{ key: 'presets' as const, label: 'Presets' }, { key: 'rules' as const, label: `Rules (${stats.total})` }, { key: 'progress' as const, label: 'Progress' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${activeTab === tab.key ? 'border-orange-400 text-orange-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'presets' && (
          <div className="p-3 space-y-2">
            {PRESETS.map(preset => (
              <div key={preset.id} onClick={() => setSelectedPreset(preset)} className={`p-3 rounded border cursor-pointer ${selectedPreset.id === preset.id ? 'border-orange-400 bg-orange-400/5' : 'border-ide-border/50 hover:bg-ide-bg-secondary/30'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-xs font-semibold flex-1">{preset.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${preset.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : preset.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{preset.difficulty}</span>
                </div>
                <div className="text-xs text-ide-text-secondary">{preset.description}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-ide-text-secondary">
                  <span>{preset.rules} rules</span>
                  <span>~{preset.estimatedTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <div className="px-3 py-2 border-b border-ide-border flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400">{stats.done} done</span>
                <span className="text-blue-400">{stats.processing} running</span>
                <span className="text-ide-text-secondary">{stats.pending} pending</span>
              </div>
              <button onClick={runMigration} disabled={isRunning} className="px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
                {isRunning ? <FaSync size={10} className="animate-spin" /> : <FaPlay size={10} />}
                {isRunning ? 'Running...' : 'Run All'}
              </button>
            </div>
            {rules.map(rule => (
              <div key={rule.id}>
                <div onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="flex items-center gap-2 px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 cursor-pointer">
                  {expandedRule === rule.id ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                  {rule.status === 'done' ? <FaCheckCircle size={12} className="text-green-400" /> :
                   rule.status === 'processing' ? <FaSync size={12} className="text-blue-400 animate-spin" /> :
                   <FaClock size={12} className="text-ide-text-secondary" />}
                  <span className="text-xs flex-1">{rule.name}</span>
                  <span className="text-xs text-ide-text-secondary">{rule.affected} instances</span>
                  {rule.autoFix && <span className="px-1 py-0 bg-green-500/20 text-green-400 rounded text-[10px]">auto-fix</span>}
                </div>
                {expandedRule === rule.id && (
                  <div className="px-6 pb-2 space-y-2">
                    <div className="text-xs text-ide-text-secondary">{rule.description}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 bg-red-500/5 border border-red-500/20 rounded p-2 font-mono">
                        <span className="text-red-400 text-[10px]">Before:</span>
                        <div className="text-ide-text">{rule.from}</div>
                      </div>
                      <FaArrowRight size={12} className="text-ide-text-secondary flex-shrink-0" />
                      <div className="flex-1 bg-green-500/5 border border-green-500/20 rounded p-2 font-mono">
                        <span className="text-green-400 text-[10px]">After:</span>
                        <div className="text-ide-text">{rule.to}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="p-3 space-y-3">
            <div className="w-full h-3 bg-ide-bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
            </div>
            <div className="text-center text-xs text-ide-text-secondary">{stats.done}/{stats.total} rules completed ({Math.round((stats.done / stats.total) * 100)}%)</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total Changes', value: stats.totalAffected, color: 'text-orange-400' },
                { label: 'Auto-fixable', value: rules.filter(r => r.autoFix).reduce((s, r) => s + r.affected, 0), color: 'text-green-400' },
                { label: 'Manual Review', value: rules.filter(r => !r.autoFix).reduce((s, r) => s + r.affected, 0), color: 'text-yellow-400' },
                { label: 'Files Affected', value: 59, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-ide-bg-secondary/30 border border-ide-border/50 rounded p-2">
                  <div className="text-xs text-ide-text-secondary">{s.label}</div>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
