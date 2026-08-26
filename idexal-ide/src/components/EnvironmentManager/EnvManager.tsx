import React, { useState, useEffect } from 'react'
import {
  FaEye, FaEyeSlash, FaPlus, FaTrash, FaCopy, FaCheck, FaTimes, FaShieldAlt, FaSync, FaExclamationTriangle, FaLock, FaUnlock
} from '../Icon'

interface EnvManagerProps {
  onClose: () => void
}

interface EnvVar {
  key: string
  value: string
  isSecret: boolean
  source: 'user' | 'project' | 'system'
}

const COMMON_ENV_VARS = [
  { key: 'NODE_ENV', description: 'Node.js environment', default: 'development' },
  { key: 'PORT', description: 'Server port', default: '3000' },
  { key: 'DATABASE_URL', description: 'Database connection string', secret: true },
  { key: 'API_KEY', description: 'API key', secret: true },
  { key: 'OPENAI_API_KEY', description: 'OpenAI API key', secret: true },
  { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', secret: true },
  { key: 'REDIS_URL', description: 'Redis connection string', secret: true },
  { key: 'AWS_ACCESS_KEY_ID', description: 'AWS access key', secret: true },
  { key: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret key', secret: true },
]

export default function EnvManager({ onClose }: EnvManagerProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [showValues, setShowValues] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newSecret, setNewSecret] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'env' | 'templates'>('env')

  useEffect(() => {
    loadEnvVars()
  }, [])

  const loadEnvVars = async () => {
    const vars: EnvVar[] = []

    // Load from electron API
    const safeKeys = [
      'HOME', 'USER', 'SHELL', 'PATH', 'LANG', 'TERM',
      'EDITOR', 'VISUAL', 'NODE_ENV', 'XDG_CONFIG_HOME',
    ]

    for (const key of safeKeys) {
      try {
        if (window.electronAPI?.getEnv) {
          const value = await window.electronAPI.getEnv(key)
          if (value) {
            vars.push({
              key,
              value,
              isSecret: false,
              source: 'system',
            })
          }
        }
      } catch {}
    }

    // Load from localStorage (user-defined)
    try {
      const stored = localStorage.getItem('idexal-env-vars')
      if (stored) {
        const parsed = JSON.parse(stored)
        for (const [key, value] of Object.entries(parsed)) {
          vars.push({
            key,
            value: value as string,
            isSecret: key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD'),
            source: 'user',
          })
        }
      }
    } catch {}

    setEnvVars(vars)
  }

  const saveUserVars = () => {
    const userVars: Record<string, string> = {}
    envVars.filter(v => v.source === 'user').forEach(v => {
      userVars[v.key] = v.value
    })
    localStorage.setItem('idexal-env-vars', JSON.stringify(userVars))
  }

  const addVar = () => {
    if (!newKey.trim()) return
    const vars = [...envVars]
    const existing = vars.findIndex(v => v.key === newKey)
    if (existing >= 0) {
      vars[existing] = { key: newKey, value: newValue, isSecret: newSecret, source: 'user' }
    } else {
      vars.push({ key: newKey, value: newValue, isSecret: newSecret, source: 'user' })
    }
    setEnvVars(vars)
    setNewKey('')
    setNewValue('')
    setNewSecret(false)
    setShowAdd(false)
    saveUserVars()
  }

  const deleteVar = (key: string) => {
    setEnvVars(prev => prev.filter(v => v.key !== key))
    saveUserVars()
  }

  const updateVar = (key: string, value: string) => {
    setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value } : v))
    setEditingKey(null)
    saveUserVars()
  }

  const toggleShow = (key: string) => {
    setShowValues(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const copyValue = (key: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const filteredVars = envVars.filter(v =>
    !search || v.key.toLowerCase().includes(search.toLowerCase()) ||
    v.value.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaLock className="w-4 h-4 text-ide-accent" />
          <span className="text-sm font-medium text-ide-text">Environment Variables</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-ide-surface rounded text-ide-text-muted">
            {envVars.length} vars
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={loadEnvVars} className="p-1 rounded hover:bg-ide-border" title="Refresh">
            <FaSync className="w-3.5 h-3.5 text-ide-text-muted" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-ide-border">
            <FaTimes className="w-4 h-4 text-ide-text-muted" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        <button
          onClick={() => setActiveTab('env')}
          className={`flex-1 py-2 text-xs font-medium ${
            activeTab === 'env' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'
          }`}
        >
          Variables
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-xs font-medium ${
            activeTab === 'templates' ? 'text-ide-accent border-b-2 border-ide-accent' : 'text-ide-text-muted'
          }`}
        >
          Templates
        </button>
      </div>

      {activeTab === 'env' ? (
        <>
          {/* Search + Add */}
          <div className="px-3 py-2 border-b border-ide-border space-y-2">
            <div className="flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search variables..."
                className="flex-1 px-3 py-1.5 bg-ide-surface border border-ide-border rounded text-xs text-ide-text placeholder:text-ide-text-muted/50 outline-none focus:border-ide-accent"
              />
              <button
                onClick={() => setShowAdd(p => !p)}
                className="px-2 py-1.5 bg-ide-accent text-white rounded text-xs hover:bg-ide-accent/80 flex items-center gap-1"
              >
                <FaPlus className="w-3 h-3" /> Add
              </button>
            </div>

            {/* Add form */}
            {showAdd && (
              <div className="flex gap-2 items-end p-2 bg-ide-surface rounded border border-ide-border">
                <div className="flex-1">
                  <label className="text-[10px] text-ide-text-muted">Key</label>
                  <input
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="MY_VAR"
                    className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono outline-none mt-0.5"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-ide-text-muted">Value</label>
                  <input
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="value"
                    type={newSecret ? 'password' : 'text'}
                    className="w-full px-2 py-1 bg-ide-bg border border-ide-border rounded text-xs text-ide-text font-mono outline-none mt-0.5"
                  />
                </div>
                <button
                  onClick={() => setNewSecret(p => !p)}
                  className={`p-1.5 rounded border ${newSecret ? 'bg-yellow-500/20 border-yellow-500/30' : 'border-ide-border'}`}
                  title={newSecret ? 'Secret (hidden)' : 'Visible'}
                >
                  {newSecret ? <FaEyeSlash className="w-3 h-3 text-yellow-400" /> : <FaEye className="w-3 h-3 text-ide-text-muted" />}
                </button>
                <button onClick={addVar} className="px-3 py-1.5 bg-ide-accent text-white rounded text-xs hover:bg-ide-accent/80">
                  Save
                </button>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded text-ide-text-muted hover:bg-ide-border">
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Variables List */}
          <div className="flex-1 overflow-y-auto">
            {filteredVars.length === 0 ? (
              <div className="p-8 text-center text-ide-text-muted text-sm">
                <FaLock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No environment variables</p>
              </div>
            ) : (
              <div className="divide-y divide-ide-border">
                {filteredVars.map(v => (
                  <div key={v.key} className="flex items-center gap-2 px-3 py-2 hover:bg-ide-surface/50 group">
                    {/* Source badge */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      v.source === 'system' ? 'bg-blue-400' :
                      v.source === 'project' ? 'bg-green-400' : 'bg-purple-400'
                    }`} title={v.source} />

                    {/* Key */}
                    <span className="text-xs font-mono text-ide-text w-40 truncate">{v.key}</span>

                    {/* Value */}
                    {editingKey === v.key ? (
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') updateVar(v.key, editValue); if (e.key === 'Escape') setEditingKey(null) }}
                        className="flex-1 px-2 py-0.5 bg-ide-bg border border-ide-accent rounded text-xs font-mono text-ide-text outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-xs font-mono text-ide-text-secondary truncate">
                        {v.isSecret && !showValues.has(v.key) ? '••••••••' : v.value}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {v.isSecret && (
                        <button onClick={() => toggleShow(v.key)} className="p-1 rounded hover:bg-ide-border" title="Toggle visibility">
                          {showValues.has(v.key) ? <FaEyeSlash className="w-3 h-3 text-ide-text-muted" /> : <FaEye className="w-3 h-3 text-ide-text-muted" />}
                        </button>
                      )}
                      <button onClick={() => copyValue(v.key, v.value)} className="p-1 rounded hover:bg-ide-border" title="Copy value">
                        {copiedKey === v.key ? <FaCheck className="w-3 h-3 text-green-400" /> : <FaCopy className="w-3 h-3 text-ide-text-muted" />}
                      </button>
                      {v.source === 'user' && (
                        <>
                          <button onClick={() => { setEditingKey(v.key); setEditValue(v.value) }} className="p-1 rounded hover:bg-ide-border" title="Edit">
                            <span className="text-[10px] text-ide-text-muted">✎</span>
                          </button>
                          <button onClick={() => deleteVar(v.key)} className="p-1 rounded hover:bg-ide-border" title="Delete">
                            <FaTrash className="w-3 h-3 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Source label */}
                    <span className="text-[9px] text-ide-text-muted/50 w-10 text-right">{v.source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Templates Tab */
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs text-ide-text-muted mb-3">
            Quick-add common environment variables:
          </div>
          {COMMON_ENV_VARS.map(template => (
            <div key={template.key} className="flex items-center gap-3 p-2 bg-ide-surface rounded border border-ide-border hover:border-ide-accent/30 transition-colors">
              <div className="flex-1">
                <div className="text-xs font-mono text-ide-text">{template.key}</div>
                <div className="text-[10px] text-ide-text-muted">{template.description}</div>
              </div>
              {template.secret && <FaLock className="w-3 h-3 text-yellow-400" />}
              <button
                onClick={() => {
                  setNewKey(template.key)
                  setNewValue(template.default || '')
                  setNewSecret(!!template.secret)
                  setShowAdd(true)
                  setActiveTab('env')
                }}
                className="px-2 py-1 text-[10px] bg-ide-accent/20 text-ide-accent rounded hover:bg-ide-accent/30"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-2 border-t border-ide-border flex items-center justify-between text-[10px] text-ide-text-muted">
        <div className="flex items-center gap-2">
          <FaShieldAlt className="w-3 h-3" />
          <span>Values are stored locally and never sent externally</span>
        </div>
        <span>{envVars.filter(v => v.isSecret).length} secrets</span>
      </div>
    </div>
  )
}
