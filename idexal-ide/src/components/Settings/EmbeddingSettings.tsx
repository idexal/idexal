import React, { useState, useEffect } from 'react'
import {
  FaDatabase, FaBrain, FaBolt, FaKey, FaGlobe, FaCheck, FaTimes, FaSync, FaSearch, FaArrowRight
} from '../Icon'
import {
  embeddingService, EmbeddingProvider, RerankProvider, EmbeddingPurpose,
  EmbeddingConfig, RerankConfig,
  EMBEDDING_PROVIDERS, RERANK_PROVIDERS, EMBEDDING_PURPOSES
} from '../../services/embeddingService'

export default function EmbeddingSettings() {
  const [activeTab, setActiveTab] = useState<'embedding' | 'rerank' | 'purposes' | 'test'>('embedding')
  const [purposeAssignments, setPurposeAssignments] = useState<Record<string, { provider: string; model: string; rerankProvider?: string; rerankModel?: string }>>({})
  const [batchTexts, setBatchTexts] = useState('')
  const [batchResults, setBatchResults] = useState<{ text: string; dimensions: number; time: number }[]>([])
  const [batchStatus, setBatchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [embeddingConfigs, setEmbeddingConfigs] = useState<Record<string, EmbeddingConfig>>({})
  const [rerankConfigs, setRerankConfigs] = useState<Record<string, RerankConfig>>({})
  const [testQuery, setTestQuery] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    const providers = embeddingService.getConfiguredEmbeddingProviders()
    const configs: Record<string, EmbeddingConfig> = {}
    for (const p of providers) {
      const c = embeddingService.getEmbeddingConfig(p)
      if (c) configs[p] = c
    }
    setEmbeddingConfigs(configs)

    const rProviders = embeddingService.getConfiguredRerankProviders()
    const rConfigs: Record<string, RerankConfig> = {}
    for (const p of rProviders) {
      const c = embeddingService.getRerankConfig(p)
      if (c) rConfigs[p] = c
    }
    setRerankConfigs(rConfigs)
  }, [])

  const handleSaveEmbedding = (provider: EmbeddingProvider, config: EmbeddingConfig) => {
    embeddingService.setEmbeddingConfig(provider, config)
    setEmbeddingConfigs(prev => ({ ...prev, [provider]: config }))
  }

  const handleSaveRerank = (provider: RerankProvider, config: RerankConfig) => {
    embeddingService.setRerankConfig(provider, config)
    setRerankConfigs(prev => ({ ...prev, [provider]: config }))
  }

  const handleTestEmbed = async () => {
    if (!testQuery.trim()) return
    setTestStatus('loading')
    try {
      const vector = await embeddingService.embedSingle(testQuery)
      setTestResults([`Vector dimensions: ${vector.length}`, `First 5 values: [${vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`, `Norm: ${Math.sqrt(vector.reduce((s, v) => s + v * v, 0)).toFixed(4)}`])
      setTestStatus('success')
    } catch (e: any) {
      setTestResults([`Error: ${e.message}`])
      setTestStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ide-border">
        <FaDatabase size={14} className="text-cyan-400" />
        <span className="text-xs font-semibold">Embeddings & Rerank</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ide-border">
        {(['embedding', 'rerank', 'purposes', 'test'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[10px] border-b-2 text-center capitalize ${
              activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}
          >
            {tab === 'embedding' ? '🔗 Embedding' : tab === 'rerank' ? '🎯 Rerank' : tab === 'purposes' ? '🎯 Purposes' : '🧪 Test'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Embedding Providers */}
        {activeTab === 'embedding' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Configure embedding providers for vector search, RAG pipelines, and semantic similarity.
            </p>
            {(Object.keys(EMBEDDING_PROVIDERS) as EmbeddingProvider[]).filter(p => p !== 'custom').map(provider => {
              const info = EMBEDDING_PROVIDERS[provider]
              const config = embeddingService.getEmbeddingConfig(provider)
              const isConfigured = !!(config?.apiKey && config.apiKey.length > 0)
              return (
                <ProviderCard
                  key={provider}
                  icon={info.icon}
                  name={info.name}
                  provider={provider}
                  isConfigured={isConfigured}
                  models={info.models.map(m => `${m.name} (${m.dimensions}d)`)}
                  config={config}
                  onSave={(cfg) => handleSaveEmbedding(provider, cfg)}
                />
              )
            })}
          </div>
        )}

        {/* Rerank Providers */}
        {activeTab === 'rerank' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Configure reranking providers for reordering search results by relevance.
            </p>
            {(Object.keys(RERANK_PROVIDERS) as RerankProvider[]).filter(p => p !== 'custom').map(provider => {
              const info = RERANK_PROVIDERS[provider]
              const config = embeddingService.getRerankConfig(provider)
              const isConfigured = !!(config?.apiKey && config.apiKey.length > 0)
              return (
                <RerankProviderCard
                  key={provider}
                  icon={info.icon}
                  name={info.name}
                  provider={provider}
                  isConfigured={isConfigured}
                  models={info.models.map(m => m.name)}
                  config={config}
                  onSave={(cfg) => handleSaveRerank(provider, cfg)}
                />
              )
            })}
          </div>
        )}

        {/* Purposes */}
        {activeTab === 'purposes' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Assign embedding + rerank models to each purpose. Different purposes benefit from different providers.
            </p>
            {EMBEDDING_PURPOSES.map(purpose => (
              <div key={purpose.purpose} className="border border-ide-border/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{purpose.label}</span>
                </div>
                <p className="text-[9px] text-ide-text-secondary mb-2">{purpose.description}</p>
                <div className="space-y-2">
                  {/* Embedding Provider + Model */}
                  <div className="flex gap-2">
                    <select
                      value={purposeAssignments[purpose.purpose]?.provider || ''}
                      onChange={e => {
                        const provider = e.target.value as EmbeddingProvider
                        const models = EMBEDDING_PROVIDERS[provider]?.models || []
                        setPurposeAssignments(prev => ({
                          ...prev,
                          [purpose.purpose]: { ...prev[purpose.purpose], provider, model: models[0]?.id || '' }
                        }))
                        embeddingService.setPurposeConfig(
                          purpose.purpose as EmbeddingPurpose,
                          provider,
                          models[0]?.id || ''
                        )
                      }}
                      className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
                    >
                      <option value="">Embedding provider...</option>
                      {(Object.keys(EMBEDDING_PROVIDERS) as EmbeddingProvider[]).filter(p => p !== 'custom').map(p => (
                        <option key={p} value={p}>{EMBEDDING_PROVIDERS[p].icon} {EMBEDDING_PROVIDERS[p].name}</option>
                      ))}
                    </select>
                    <select
                      value={purposeAssignments[purpose.purpose]?.model || ''}
                      onChange={e => {
                        const model = e.target.value
                        setPurposeAssignments(prev => ({
                          ...prev,
                          [purpose.purpose]: { ...prev[purpose.purpose], model }
                        }))
                        if (purposeAssignments[purpose.purpose]?.provider) {
                          embeddingService.setPurposeConfig(
                            purpose.purpose as EmbeddingPurpose,
                            purposeAssignments[purpose.purpose].provider as EmbeddingProvider,
                            model
                          )
                        }
                      }}
                      className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
                      disabled={!purposeAssignments[purpose.purpose]?.provider}
                    >
                      <option value="">Model...</option>
                      {(EMBEDDING_PROVIDERS[purposeAssignments[purpose.purpose]?.provider as EmbeddingProvider]?.models || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.dimensions}d)</option>
                      ))}
                    </select>
                  </div>
                  {/* Rerank Provider + Model */}
                  <div className="flex gap-2">
                    <select
                      value={purposeAssignments[purpose.purpose]?.rerankProvider || ''}
                      onChange={e => {
                        const rerankProvider = e.target.value as RerankProvider
                        const models = RERANK_PROVIDERS[rerankProvider]?.models || []
                        setPurposeAssignments(prev => ({
                          ...prev,
                          [purpose.purpose]: { ...prev[purpose.purpose], rerankProvider, rerankModel: models[0]?.id || '' }
                        }))
                      }}
                      className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text opacity-70"
                    >
                      <option value="">Rerank provider (optional)...</option>
                      {(Object.keys(RERANK_PROVIDERS) as RerankProvider[]).filter(p => p !== 'custom').map(p => (
                        <option key={p} value={p}>{RERANK_PROVIDERS[p].icon} {RERANK_PROVIDERS[p].name}</option>
                      ))}
                    </select>
                    <select
                      value={purposeAssignments[purpose.purpose]?.rerankModel || ''}
                      onChange={e => setPurposeAssignments(prev => ({
                        ...prev,
                        [purpose.purpose]: { ...prev[purpose.purpose], rerankModel: e.target.value }
                      }))}
                      className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text opacity-70"
                      disabled={!purposeAssignments[purpose.purpose]?.rerankProvider}
                    >
                      <option value="">Rerank model...</option>
                      {(RERANK_PROVIDERS[purposeAssignments[purpose.purpose]?.rerankProvider as RerankProvider]?.models || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test */}
        {activeTab === 'test' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Test embedding generation and similarity search.
            </p>
            <div className="flex gap-2">
              <input
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Enter text to embed..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
                onKeyDown={e => e.key === 'Enter' && handleTestEmbed()}
              />
              <button
                onClick={handleTestEmbed}
                disabled={!testQuery.trim() || testStatus === 'loading'}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
              >
                {testStatus === 'loading' ? <FaSync size={10} className="animate-spin" /> : <FaBolt size={10} />}
                Embed
              </button>
            </div>
            {testResults.length > 0 && (
              <div className={`p-2 rounded text-[10px] font-mono ${
                testStatus === 'success' ? 'bg-green-500/10 text-green-400' :
                testStatus === 'error' ? 'bg-red-500/10 text-red-400' :
                'bg-ide-bg-secondary text-ide-text'
              }`}>
                {testResults.map((r, i) => <div key={i}>{r}</div>)}
              </div>
            )}

            {/* Batch Embed Test */}
            <div className="mt-4 pt-3 border-t border-ide-border/30">
              <label className="text-[10px] text-ide-text-secondary block mb-1">Batch Compare (one text per line)</label>
              <textarea
                value={batchTexts}
                onChange={e => setBatchTexts(e.target.value)}
                placeholder="Hello world\nfunction fibonacci(n) { ... }\nReact component lifecycle"
                rows={3}
                className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-[10px] text-ide-text font-mono resize-none"
              />
              <button
                onClick={async () => {
                  if (!batchTexts.trim()) return
                  setBatchStatus('loading')
                  try {
                    const texts = batchTexts.split('\n').filter(t => t.trim())
                    const start = performance.now()
                    const vectors = await embeddingService.embed(texts)
                    const elapsed = performance.now() - start
                    setBatchResults(texts.map((t, i) => ({
                      text: t.substring(0, 40),
                      dimensions: vectors[i].length,
                      time: Math.round(elapsed / texts.length),
                    })))
                    setBatchStatus('success')
                  } catch (e: any) {
                    setBatchResults([{ text: `Error: ${e.message}`, dimensions: 0, time: 0 }])
                    setBatchStatus('error')
                  }
                }}
                disabled={!batchTexts.trim() || batchStatus === 'loading'}
                className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-[10px] flex items-center gap-1"
              >
                {batchStatus === 'loading' ? <FaSync size={10} className="animate-spin" /> : <FaBolt size={10} />}
                Batch Embed
              </button>
              {batchResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {batchResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                      <span className="text-ide-text-secondary w-32 truncate">{r.text}</span>
                      <span className="text-cyan-400">{r.dimensions}d</span>
                      <span className="text-ide-text-secondary">{r.time}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderCard({ icon, name, provider, isConfigured, models, config, onSave }: {
  icon: string; name: string; provider: EmbeddingProvider; isConfigured: boolean; models: string[];
  config?: EmbeddingConfig; onSave: (cfg: EmbeddingConfig) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [selectedModel, setSelectedModel] = useState(config?.model || '')
  const [dimensions, setDimensions] = useState(config?.dimensions || 1536)

  return (
    <div className="border border-ide-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/20"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-xs text-left">{name}</span>
        {isConfigured ? (
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded">✓ Configured</span>
        ) : (
          <span className="text-[9px] bg-ide-bg-secondary text-ide-text-secondary px-1.5 rounded">Not set</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-ide-border/20">
          <div className="pt-2">
            <label className="text-[9px] text-ide-text-secondary block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text font-mono"
            />
          </div>
          <div>
            <label className="text-[9px] text-ide-text-secondary block mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
            >
              <option value="">Select model...</option>
              {models.map((m, i) => <option key={i} value={m.split(' (')[0]}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <label className="text-[9px] text-ide-text-secondary">Dimensions:</label>
            <input
              type="number"
              value={dimensions}
              onChange={e => setDimensions(Number(e.target.value))}
              className="w-20 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
            />
            <button
              onClick={() => apiKey && selectedModel && onSave({ provider, model: selectedModel, apiKey, baseUrl: EMBEDDING_PROVIDERS[provider].baseUrl, dimensions })}
              disabled={!apiKey || !selectedModel}
              className="ml-auto px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-[10px]"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RerankProviderCard({ icon, name, provider, isConfigured, models, config, onSave }: {
  icon: string; name: string; provider: RerankProvider; isConfigured: boolean; models: string[];
  config?: RerankConfig; onSave: (cfg: RerankConfig) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [selectedModel, setSelectedModel] = useState(config?.model || '')

  return (
    <div className="border border-ide-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/20"
      >
        <span className="text-sm">{icon}</span>
        <span className="flex-1 text-xs text-left">{name}</span>
        {isConfigured ? (
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded">✓ Configured</span>
        ) : (
          <span className="text-[9px] bg-ide-bg-secondary text-ide-text-secondary px-1.5 rounded">Not set</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-ide-border/20">
          <div className="pt-2">
            <label className="text-[9px] text-ide-text-secondary block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text font-mono"
            />
          </div>
          <div>
            <label className="text-[9px] text-ide-text-secondary block mb-1">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
            >
              <option value="">Select model...</option>
              {models.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={() => apiKey && selectedModel && onSave({ provider, model: selectedModel, apiKey, baseUrl: RERANK_PROVIDERS[provider].baseUrl })}
            disabled={!apiKey || !selectedModel}
            className="w-full px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded text-[10px]"
          >
            Save
          </button>
        </div>
      )}
    </div>
  )
}
