import React, { useState, useMemo } from 'react'
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, Check, Save, Upload,
  Download, Shield, AlertTriangle, Search, Filter, Lock, Unlock,
  ChevronDown, ChevronRight, RefreshCw, FileText
} from 'lucide-react'

interface EnvVariable {
  key: string
  value: string
  isSecret: boolean
  environment: string
  description: string
  isDefined: boolean
}

interface EnvFile {
  name: string
  path: string
  variables: EnvVariable[]
  isLoaded: boolean
}

const MOCK_ENV_FILES: EnvFile[] = [
  {
    name: '.env',
    path: '.env',
    isLoaded: true,
    variables: [
      { key: 'NODE_ENV', value: 'development', isSecret: false, environment: 'development', description: 'Current environment', isDefined: true },
      { key: 'PORT', value: '3000', isSecret: false, environment: 'development', description: 'Server port', isDefined: true },
      { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/mydb', isSecret: true, environment: 'development', description: 'Database connection string', isDefined: true },
      { key: 'JWT_SECRET', value: 'super-secret-key-change-in-production', isSecret: true, environment: 'development', description: 'JWT signing secret', isDefined: true },
      { key: 'API_KEY', value: 'sk-dev-abc123def456', isSecret: true, environment: 'development', description: 'External API key', isDefined: true },
      { key: 'LOG_LEVEL', value: 'debug', isSecret: false, environment: 'development', description: 'Logging level', isDefined: true },
      { key: 'REDIS_URL', value: 'redis://localhost:6379', isSecret: false, environment: 'development', description: 'Redis connection', isDefined: true },
      { key: 'CORS_ORIGIN', value: 'http://localhost:5173', isSecret: false, environment: 'development', description: 'CORS allowed origin', isDefined: true },
    ]
  },
  {
    name: '.env.local',
    path: '.env.local',
    isLoaded: true,
    variables: [
      { key: 'OPENAI_API_KEY', value: 'sk-local-xxxxx', isSecret: true, environment: 'local', description: 'OpenAI API key (local override)', isDefined: true },
      { key: 'ANTHROPIC_API_KEY', value: 'sk-ant-xxxxx', isSecret: true, environment: 'local', description: 'Anthropic API key', isDefined: true },
    ]
  },
  {
    name: '.env.production',
    path: '.env.production',
    isLoaded: false,
    variables: [
      { key: 'NODE_ENV', value: 'production', isSecret: false, environment: 'production', description: 'Production environment', isDefined: true },
      { key: 'DATABASE_URL', value: '${DATABASE_URL}', isSecret: true, environment: 'production', description: 'Production database (use secret)', isDefined: false },
      { key: 'JWT_SECRET', value: '${JWT_SECRET}', isSecret: true, environment: 'production', description: 'Production JWT secret', isDefined: false },
      { key: 'API_KEY', value: '${API_KEY}', isSecret: true, environment: 'production', description: 'Production API key', isDefined: false },
    ]
  },
  {
    name: '.env.test',
    path: '.env.test',
    isLoaded: false,
    variables: [
      { key: 'NODE_ENV', value: 'test', isSecret: false, environment: 'test', description: 'Test environment', isDefined: true },
      { key: 'DATABASE_URL', value: 'postgresql://localhost:5432/mydb_test', isSecret: false, environment: 'test', description: 'Test database', isDefined: true },
    ]
  },
]

export default function EnvironmentManagerPanel({ onClose }: { onClose: () => void }) {
  const [envFiles, setEnvFiles] = useState(MOCK_ENV_FILES)
  const [selectedFile, setSelectedFile] = useState('.env')
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set())
  const [editingVar, setEditingVar] = useState<{ file: string; key: string; field: 'key' | 'value' | 'description' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSecrets, setFilterSecrets] = useState<'all' | 'secret' | 'visible'>('all')
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const currentFile = envFiles.find(f => f.name === selectedFile) || envFiles[0]

  const filteredVars = useMemo(() => {
    return currentFile.variables.filter(v => {
      if (filterSecrets === 'secret' && !v.isSecret) return false
      if (filterSecrets === 'visible' && v.isSecret) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [currentFile, filterSecrets, searchQuery])

  const stats = useMemo(() => {
    const vars = currentFile.variables
    return {
      total: vars.length,
      secrets: vars.filter(v => v.isSecret).length,
      visible: vars.filter(v => !v.isSecret).length,
      defined: vars.filter(v => v.isDefined).length,
      undefined: vars.filter(v => !v.isDefined).length,
    }
  }, [currentFile])

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSecretFlag = (file: string, key: string) => {
    setEnvFiles(prev => prev.map(f => {
      if (f.name !== file) return f
      return { ...f, variables: f.variables.map(v => v.key === key ? { ...v, isSecret: !v.isSecret } : v) }
    }))
  }

  const updateValue = (file: string, key: string, value: string) => {
    setEnvFiles(prev => prev.map(f => {
      if (f.name !== file) return f
      return { ...f, variables: f.variables.map(v => v.key === key ? { ...v, value, isDefined: !value.startsWith('${') } : v) }
    }))
  }

  const addVariable = () => {
    if (!newVarKey.trim()) return
    const newVar: EnvVariable = {
      key: newVarKey,
      value: newVarValue,
      isSecret: false,
      environment: currentFile.name.includes('production') ? 'production' : 'development',
      description: '',
      isDefined: true,
    }
    setEnvFiles(prev => prev.map(f => {
      if (f.name !== selectedFile) return f
      return { ...f, variables: [...f.variables, newVar] }
    }))
    setNewVarKey('')
    setNewVarValue('')
    setShowAddForm(false)
  }

  const removeVariable = (file: string, key: string) => {
    setEnvFiles(prev => prev.map(f => {
      if (f.name !== file) return f
      return { ...f, variables: f.variables.filter(v => v.key !== key) }
    }))
  }

  const copyValue = (key: string, value: string) => {
    navigator.clipboard?.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const exportEnv = () => {
    const lines = currentFile.variables.map(v => {
      const desc = v.description ? `# ${v.description}\n` : ''
      return `${desc}${v.key}=${v.value}`
    }).join('\n\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-yellow-400" />
          <span className="text-sm font-semibold">Environment Variables</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportEnv} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary" title="Export">
            <Download size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex items-center border-b border-ide-border overflow-x-auto">
        {envFiles.map(f => (
          <button
            key={f.name}
            onClick={() => setSelectedFile(f.name)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap border-b-2 ${
              selectedFile === f.name
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            <FileText size={10} />
            {f.name}
            <span className="text-ide-text-secondary/60">({f.variables.length})</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 py-1 text-xs border-b border-ide-border bg-ide-bg-secondary/30">
        <span className="text-ide-text-secondary">{stats.total} variables</span>
        <span className="text-yellow-400">{stats.secrets} secrets</span>
        <span className="text-green-400">{stats.defined} defined</span>
        {stats.undefined > 0 && <span className="text-red-400">{stats.undefined} undefined</span>}
      </div>

      {/* Search + Filter */}
      <div className="px-3 py-2 border-b border-ide-border flex items-center gap-2">
        <div className="flex-1 flex items-center bg-ide-bg-secondary border border-ide-border rounded px-2 py-1">
          <Search size={14} className="text-ide-text-secondary mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="flex-1 bg-transparent text-xs outline-none placeholder-ide-text-secondary"
          />
        </div>
        <select
          value={filterSecrets}
          onChange={e => setFilterSecrets(e.target.value as typeof filterSecrets)}
          className="bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs"
        >
          <option value="all">All</option>
          <option value="secret">Secrets Only</option>
          <option value="visible">Visible Only</option>
        </select>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="px-3 py-2 border-b border-ide-border bg-ide-bg-secondary/20 space-y-2">
          <input
            type="text"
            value={newVarKey}
            onChange={e => setNewVarKey(e.target.value)}
            placeholder="VARIABLE_NAME"
            className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
          />
          <input
            type="text"
            value={newVarValue}
            onChange={e => setNewVarValue(e.target.value)}
            placeholder="value"
            className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-xs font-mono outline-none"
          />
          <div className="flex gap-1">
            <button onClick={addVariable} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs">Add</button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto">
        {filteredVars.map(v => (
          <div key={v.key} className="px-3 py-2 border-b border-ide-border/30 hover:bg-ide-bg-secondary/20 group">
            <div className="flex items-center gap-2">
              {/* Secret toggle */}
              <button
                onClick={() => toggleSecretFlag(selectedFile, v.key)}
                className="text-ide-text-secondary hover:text-yellow-400"
                title={v.isSecret ? 'Mark as visible' : 'Mark as secret'}
              >
                {v.isSecret ? <Lock size={12} className="text-yellow-400" /> : <Unlock size={12} />}
              </button>

              {/* Key */}
              <span className="text-xs font-mono font-semibold text-green-400 min-w-[120px]">{v.key}</span>

              {/* Value */}
              <div className="flex-1 flex items-center gap-1">
                <span className="text-xs font-mono text-ide-text truncate">
                  {v.isSecret && !showSecrets.has(v.key)
                    ? '•'.repeat(Math.min(v.value.length, 20))
                    : v.value
                  }
                </span>
                {!v.isDefined && (
                  <span title="Undefined - uses system value"><AlertTriangle size={10} className="text-yellow-400 flex-shrink-0" /></span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleSecret(v.key)} className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
                  {showSecrets.has(v.key) ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
                <button onClick={() => copyValue(v.key, v.value)} className="p-0.5 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">
                  {copiedKey === v.key ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                </button>
                <button onClick={() => removeVariable(selectedFile, v.key)} className="p-0.5 hover:bg-red-500/20 rounded text-red-400">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
            {v.description && (
              <div className="text-xs text-ide-text-secondary/60 mt-0.5 ml-5">{v.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
