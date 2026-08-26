import React, { useState, useEffect, useMemo } from 'react'
import {
  FaBrain, FaKey, FaGlobe, FaSync, FaPlus, FaTrash, FaCheck, FaTimes, FaChevronDown, FaChevronRight, FaEye, FaEyeSlash, FaBolt, FaCog, FaDownload, FaExclamationTriangle, FaSearch, FaArrowRight, FaCode, FaCopy
} from '../Icon'
import {
  aiProviderService, AIProviderConfig, AIModel, ProviderFamily, ModelPurpose,
  PROVIDER_INFO
} from '../../services/aiProviders'
import { fallbackService, ProviderHealth, FallbackEntry, FallbackEvent } from '../../services/fallbackService'
import FallbackTab from './FallbackTab'

export default function AIProviderSettings({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<AIProviderConfig[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string | null>('openai')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [fetchingModels, setFetchingModels] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'providers' | 'purposes' | 'fallback'>('providers')
  const [fallbackChains, setFallbackChains] = useState<Record<string, FallbackEntry[]>>({})
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([])
  const [fallbackEvents, setFallbackEvents] = useState<FallbackEvent[]>([])
  const [selectedFallbackPurpose, setSelectedFallbackPurpose] = useState<ModelPurpose>('chat')
  const [searchQuery, setSearchQuery] = useState('')
  const [fetchingAll, setFetchingAll] = useState(false)

  useEffect(() => {
    setProviders(aiProviderService.getAllProviders())
    const unsub = aiProviderService.subscribe(() => {
      setProviders(aiProviderService.getAllProviders())
    })
    const unsubFallback = fallbackService.onEvent(event => {
      setFallbackEvents(prev => [...prev.slice(-19), event])
      setProviderHealth(fallbackService.getAllHealth())
    })
    loadFallbackData()
    return () => { unsub(); unsubFallback() }
  }, [])

  const provider = providers.find(p => p.id === selectedProvider)

  const handleFetchModels = async (providerId: string) => {
    setFetchingModels(providerId)
    setFetchError(null)
    try {
      await aiProviderService.fetchModels(providerId)
      setProviders(aiProviderService.getAllProviders())
    } catch (e: any) {
      setFetchError(e.message || 'Failed to fetch models')
    }
    setFetchingModels(null)
  }

  const handleAddCustomProvider = (name: string, baseUrl: string, apiKey: string) => {
    const id = aiProviderService.addCustomProvider(name, baseUrl, apiKey)
    setSelectedProvider(id)
    setShowAddCustom(false)
    setProviders(aiProviderService.getAllProviders())
  }

  const loadFallbackData = () => {
    const chains: Record<string, FallbackEntry[]> = {}
    for (const purpose of ['chat', 'code', 'completion', 'embedding', 'vision', 'audio'] as ModelPurpose[]) {
      chains[purpose] = fallbackService.getChain(purpose)
    }
    setFallbackChains(chains)
    setProviderHealth(fallbackService.getAllHealth())
  }

  const handleRemoveProvider = (id: string) => {
    aiProviderService.removeProvider(id)
    setSelectedProvider(null)
    setProviders(aiProviderService.getAllProviders())
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <div className="flex items-center gap-2">
          <FaBrain size={16} className="text-pink-400" />
          <span className="text-sm font-semibold">AI Providers</span>
          <span className="text-[10px] text-ide-text-secondary bg-ide-bg-secondary px-1.5 rounded">
            {providers.filter(p => p.enabled).length} active
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              setFetchingAll(true)
              await aiProviderService.fetchAllEnabledModels()
              setProviders(aiProviderService.getAllProviders())
              setFetchingAll(false)
            }}
            disabled={fetchingAll}
            className="px-2 py-0.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
          >
            <FaDownload size={10} className={fetchingAll ? 'animate-spin' : ''} />
            Fetch All Models
          </button>
          <button
            onClick={() => setShowAddCustom(true)}
            className="px-2 py-0.5 bg-pink-600 hover:bg-pink-500 rounded text-xs flex items-center gap-1"
          >
            <FaPlus size={10} /> Add Provider
          </button>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        <button
          onClick={() => setActiveTab('providers')}
          className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
            activeTab === 'providers' ? 'border-pink-400 text-pink-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          Providers ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('purposes')}
          className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
            activeTab === 'purposes' ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          Model Assignment
        </button>
        <button
          onClick={() => setActiveTab('fallback')}
          className={`flex-1 px-3 py-1.5 text-xs border-b-2 text-center ${
            activeTab === 'fallback' ? 'border-green-400 text-green-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
          }`}
        >
          Fallback
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <>
            {/* Provider List */}
            <div className="w-[220px] border-r border-ide-border overflow-y-auto flex-shrink-0">
              <div className="px-2 py-1.5 border-b border-ide-border/30">
                <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1">
                  <FaSearch size={10} className="text-ide-text-secondary" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter..."
                    className="flex-1 bg-transparent text-[10px] outline-none text-ide-text placeholder:text-ide-text-secondary/50"
                  />
                </div>
              </div>

              {providers
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => {
                  const info = PROVIDER_INFO[p.family]
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-ide-border/10 ${
                        selectedProvider === p.id ? 'bg-pink-500/10' : 'hover:bg-ide-bg-secondary/20'
                      }`}
                    >
                      <span className="text-sm">{info?.icon || '⚙️'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{p.name}</div>
                        <div className="text-[9px] text-ide-text-secondary truncate">
                          {p.models.length} models • {p.enabled ? 'active' : 'inactive'}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {p.apiKey && <FaKey size={8} className="text-green-400" />}
                        {p.isCustom && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded">custom</span>}
                      </div>
                    </div>
                  )
                })}

              <button
                onClick={() => setShowAddCustom(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-pink-400 hover:bg-ide-bg-secondary/20 text-xs"
              >
                <FaPlus size={12} /> Add Custom Provider
              </button>
            </div>

            {/* Provider Details */}
            <div className="flex-1 overflow-y-auto">
              {provider ? (
                <ProviderDetails
                  provider={provider}
                  onUpdate={(updates) => {
                    aiProviderService.updateProvider(provider.id, updates)
                    setProviders(aiProviderService.getAllProviders())
                  }}
                  onFetchModels={() => handleFetchModels(provider.id)}
                  onRemove={() => handleRemoveProvider(provider.id)}
                  onToggle={() => {
                    aiProviderService.toggleProvider(provider.id)
                    setProviders(aiProviderService.getAllProviders())
                  }}
                  isFetching={fetchingModels === provider.id}
                  fetchError={fetchError}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-ide-text-secondary">
                  <FaBrain size={48} className="mb-3 opacity-20" />
                  <span className="text-sm">Select a provider to configure</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Purpose Assignment Tab */}
        {activeTab === 'purposes' && (
          <PurposeAssignmentTab providers={providers} />
        )}

        {/* Fallback Tab */}
        {activeTab === 'fallback' && (
          <FallbackTab
            chains={fallbackChains}
            health={providerHealth}
            events={fallbackEvents}
            selectedPurpose={selectedFallbackPurpose}
            onSelectPurpose={setSelectedFallbackPurpose}
            onResetHealth={(id?: string) => { fallbackService.resetHealth(id); loadFallbackData() }}
          />
        )}
      </div>

      {/* Add Custom Provider Modal */}
      {showAddCustom && (
        <AddCustomProviderModal
          onAdd={handleAddCustomProvider}
          onClose={() => setShowAddCustom(false)}
        />
      )}
    </div>
  )
}

// Provider Details Component
function ProviderDetails({
  provider, onUpdate, onFetchModels, onRemove, onToggle, isFetching, fetchError
}: {
  provider: AIProviderConfig
  onUpdate: (updates: Partial<AIProviderConfig>) => void
  onFetchModels: () => void
  onRemove: () => void
  onToggle: () => void
  isFetching: boolean
  fetchError: string | null
}) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const info = PROVIDER_INFO[provider.family]

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestError('')
    try {
      await aiProviderService.fetchModels(provider.id)
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (e: any) {
      setTestStatus('error')
      setTestError(e.message)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Provider Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{info?.icon || '⚙️'}</span>
          <div>
            <h3 className="text-sm font-semibold">{provider.name}</h3>
            <span className={`text-[10px] ${info?.color || 'text-gray-400'}`}>
              {info?.name || 'Custom Provider'} {provider.isCustom && '• Custom'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`px-2 py-0.5 rounded text-[10px] ${
              provider.enabled ? 'bg-green-500/20 text-green-400' : 'bg-ide-bg-secondary text-ide-text-secondary'
            }`}
          >
            {provider.enabled ? '● Enabled' : '○ Disabled'}
          </button>
          {provider.isCustom && (
            <button onClick={onRemove} className="p-1 hover:bg-red-500/20 rounded text-red-400">
              <FaTrash size={14} />
            </button>
          )}
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-1">
        <label className="text-[10px] text-ide-text-secondary">API Key</label>
        <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1.5 border border-ide-border">
          <FaKey size={12} className="text-ide-text-secondary flex-shrink-0" />
          <input
            type={showApiKey ? 'text' : 'password'}
            value={provider.apiKey}
            onChange={e => onUpdate({ apiKey: e.target.value })}
            placeholder={provider.family === 'ollama' ? 'Not required for local' : 'Enter API key...'}
            className="flex-1 bg-transparent text-xs outline-none text-ide-text font-mono"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-ide-text-secondary hover:text-ide-text"
          >
            {showApiKey ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
          </button>
          {provider.apiKey && (
            <button
              onClick={() => { navigator.clipboard?.writeText(provider.apiKey) }}
              className="text-ide-text-secondary hover:text-ide-text"
            >
              <FaCopy size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-1">
        <label className="text-[10px] text-ide-text-secondary">Base URL</label>
        <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded px-2 py-1.5 border border-ide-border">
          <FaGlobe size={12} className="text-ide-text-secondary flex-shrink-0" />
          <input
            value={provider.baseUrl}
            onChange={e => onUpdate({ baseUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="flex-1 bg-transparent text-xs outline-none text-ide-text font-mono"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleTestConnection}
          disabled={isFetching || (provider.family !== 'ollama' && !provider.apiKey)}
          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
        >
          {isFetching ? (
            <><FaSync size={10} className="animate-spin" /> Fetching...</>
          ) : testStatus === 'success' ? (
            <><FaCheck size={10} /> Connected!</>
          ) : (
            <><FaBolt size={10} /> Test Connection</>
          )}
        </button>
        <button
          onClick={onFetchModels}
          disabled={isFetching || (provider.family !== 'ollama' && !provider.apiKey)}
          className="px-3 py-1.5 bg-ide-bg-secondary hover:bg-ide-bg-secondary/80 rounded text-xs flex items-center gap-1"
        >
          <FaDownload size={10} /> Fetch Models
        </button>
      </div>

      {fetchError && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 flex items-center gap-2">
          <FaExclamationTriangle size={12} /> {fetchError}
        </div>
      )}

      {provider.lastFetched && (
        <div className="text-[10px] text-ide-text-secondary">
          Last fetched: {new Date(provider.lastFetched).toLocaleString()}
        </div>
      )}

      {/* Models List */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-ide-text-secondary">Available Models ({provider.models.length})</label>
        </div>
        <div className="max-h-[300px] overflow-y-auto border border-ide-border rounded">
          {provider.models.length > 0 ? (
            provider.models.map(model => (
              <div
                key={model.id}
                onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
                className={`px-3 py-2 border-b border-ide-border/20 cursor-pointer ${
                  selectedModel === model.id ? 'bg-pink-500/10' : 'hover:bg-ide-bg-secondary/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate">{model.name}</div>
                    {model.description && (
                      <div className="text-[10px] text-ide-text-secondary truncate">{model.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {model.supportsVision && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded">👁️</span>}
                    {model.supportsStreaming && <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded">stream</span>}
                    {model.contextLength >= 100000 && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded">100K+</span>}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <div className="mt-2 pt-2 border-t border-ide-border/20 grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-ide-text-secondary">Context:</span> {model.contextLength.toLocaleString()} tokens</div>
                    <div><span className="text-ide-text-secondary">Max Output:</span> {model.maxOutput.toLocaleString()}</div>
                    <div><span className="text-ide-text-secondary">Streaming:</span> {model.supportsStreaming ? '✅' : '❌'}</div>
                    <div><span className="text-ide-text-secondary">Vision:</span> {model.supportsVision ? '✅' : '❌'}</div>
                    <div><span className="text-ide-text-secondary">Functions:</span> {model.supportsFunctionCalling ? '✅' : '❌'}</div>
                    {model.pricing && (
                      <div><span className="text-ide-text-secondary">Pricing:</span> ${model.pricing.input}/${model.pricing.output}</div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-ide-text-secondary">
              <FaBrain size={24} className="mb-2 opacity-30" />
              <span className="text-xs">No models loaded</span>
              <span className="text-[10px]">Add API key and click "Fetch Models"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Purpose Assignment Tab
function PurposeAssignmentTab({ providers }: { providers: AIProviderConfig[] }) {
  const [assignments, setAssignments] = useState<Map<ModelPurpose, { providerId: string; modelId: string }>>(new Map())
  const purposeLabels = aiProviderService.getPurposeLabels()
  const enabledProviders = providers.filter(p => p.enabled && p.models.length > 0)

  useEffect(() => {
    setAssignments(aiProviderService.getAllPurposeAssignments())
  }, [providers])

  const handleAssign = (purpose: ModelPurpose, providerId: string, modelId: string) => {
    aiProviderService.assignModel(purpose, providerId, modelId)
    setAssignments(aiProviderService.getAllPurposeAssignments())
  }

  const purposes: ModelPurpose[] = ['chat', 'code', 'completion', 'embedding', 'vision', 'audio']

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="text-xs text-ide-text-secondary mb-2">
        Assign specific models to each purpose. This determines which model is used for different AI tasks.
      </div>

      {purposes.map(purpose => {
        const label = purposeLabels[purpose]
        const current = assignments.get(purpose)
        return (
          <div key={purpose} className="bg-ide-bg-secondary/20 border border-ide-border/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{label.icon}</span>
              <div>
                <div className="text-xs font-semibold">{label.label}</div>
                <div className="text-[10px] text-ide-text-secondary">{label.description}</div>
              </div>
              {current && (
                <span className="ml-auto text-[10px] text-green-400 bg-green-400/10 px-1.5 rounded">
                  {providers.find(p => p.id === current.providerId)?.name}: {current.modelId}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1">
              {enabledProviders.map(provider => (
                <div key={provider.id} className="flex items-center gap-2">
                  <span className="text-[10px] w-20 truncate text-ide-text-secondary">{provider.name}</span>
                  <select
                    value={current?.providerId === provider.id ? current.modelId : ''}
                    onChange={e => {
                      if (e.target.value) handleAssign(purpose, provider.id, e.target.value)
                    }}
                    className="flex-1 bg-ide-bg-secondary text-[10px] text-ide-text px-2 py-1 rounded border border-ide-border"
                  >
                    <option value="">Select model...</option>
                    {provider.models.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.contextLength.toLocaleString()} ctx)</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {enabledProviders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-ide-text-secondary">
          <FaBrain size={32} className="mb-2 opacity-30" />
          <span className="text-xs">No providers enabled</span>
          <span className="text-[10px]">Enable providers and add API keys to assign models</span>
        </div>
      )}
    </div>
  )
}

// Add Custom Provider Modal
function AddCustomProviderModal({ onAdd, onClose }: { onAdd: (name: string, baseUrl: string, apiKey: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [authStyle, setAuthStyle] = useState<'bearer' | 'x-api-key' | 'custom'>('bearer')
  const [showKey, setShowKey] = useState(false)
  const [fetching, setFetching] = useState(false)

  const presets = [
    { name: 'OpenAI-Compatible', baseUrl: 'https://api.openai.com/v1', icon: '🟢', auth: 'bearer' as const },
    { name: 'Idexal AI', baseUrl: 'https://api.idexal.com/v1', icon: '🔷', auth: 'bearer' as const },
    { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', icon: '⚡', auth: 'bearer' as const },
    { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', icon: '🤝', auth: 'bearer' as const },
    { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', icon: '🔥', auth: 'bearer' as const },
    { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', icon: '🧠', auth: 'bearer' as const },
    { name: 'Perplexity', baseUrl: 'https://api.perplexity.ai', icon: '🔍', auth: 'bearer' as const },
    { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/api', icon: '🦙', auth: 'bearer' as const },
    { name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', icon: '🖥️', auth: 'bearer' as const },
    { name: 'vLLM', baseUrl: 'http://localhost:8000/v1', icon: '🚀', auth: 'bearer' as const },
    { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', icon: '🌐', auth: 'bearer' as const },
    { name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', icon: '✖️', auth: 'bearer' as const },
    { name: 'Custom Endpoint', baseUrl: '', icon: '⚙️', auth: 'bearer' as const },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[480px] bg-ide-bg border border-ide-border rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <div className="flex items-center gap-2">
            <FaPlus size={16} className="text-pink-400" />
            <span className="text-sm font-semibold">Add Custom Provider</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-ide-bg-secondary rounded text-ide-text-secondary">×</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Quick Presets */}
          <div>
            <label className="text-[10px] text-ide-text-secondary mb-1 block">Quick Setup</label>
            <div className="grid grid-cols-4 gap-1">
              {presets.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => { setName(preset.name); setBaseUrl(preset.baseUrl); setAuthStyle(preset.auth) }}
                  className="flex flex-col items-center gap-0.5 p-2 bg-ide-bg-secondary/30 hover:bg-ide-bg-secondary rounded text-[9px] text-ide-text-secondary hover:text-ide-text"
                >
                  <span>{preset.icon}</span>
                  <span className="truncate w-full text-center">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Provider Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Custom Provider"
                className="w-full bg-ide-bg-secondary/30 text-xs px-3 py-1.5 rounded border border-ide-border outline-none text-ide-text"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">Base URL</label>
              <input
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full bg-ide-bg-secondary/30 text-xs px-3 py-1.5 rounded border border-ide-border outline-none text-ide-text font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-ide-text-secondary">API Key (optional for local)</label>
              <div className="flex items-center gap-1 bg-ide-bg-secondary/30 rounded border border-ide-border">
                <FaKey size={12} className="text-ide-text-secondary ml-2" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 bg-transparent text-xs px-2 py-1.5 outline-none text-ide-text font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 text-ide-text-secondary hover:text-ide-text"
                >
                  {showKey ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-ide-text-secondary">Auth Style</label>
            <div className="flex gap-1">
              {(['bearer', 'x-api-key', 'custom'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setAuthStyle(style)}
                  className={`flex-1 px-2 py-1 text-[10px] rounded ${
                    authStyle === style ? 'bg-pink-600 text-white' : 'bg-ide-bg-secondary text-ide-text-secondary'
                  }`}
                >
                  {style === 'bearer' ? 'Bearer Token' : style === 'x-api-key' ? 'x-api-key Header' : 'Custom Header'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                if (name && baseUrl) {
                  onAdd(name, baseUrl, apiKey)
                }
              }}
              disabled={!name || !baseUrl}
              className="flex-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded text-xs font-medium"
            >
              Add Provider
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-ide-bg-secondary rounded text-xs text-ide-text-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
