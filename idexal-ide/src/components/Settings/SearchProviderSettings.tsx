import React, { useState, useEffect } from 'react'
import {
  FaSearch, FaGlobe, FaFileAlt, FaBolt, FaKey, FaCheck, FaTimes, FaSync, FaCode, FaArrowRight, FaDatabase, FaShieldAlt, FaClock, FaBullseye
} from '../Icon'
import {
  searchProviderService, WebSearchProvider, DocSearchProvider, SearchPurpose, SearchConfig,
  WEB_SEARCH_PROVIDERS, DOC_SEARCH_PROVIDERS, SEARCH_PURPOSES
} from '../../services/searchProviderService'
import { embeddingService } from '../../services/embeddingService'

type Tab = 'web' | 'docs' | 'purposes' | 'rag' | 'history'

export default function SearchProviderSettings() {
  const [activeTab, setActiveTab] = useState<Tab>('web')
  const [webConfigs, setWebConfigs] = useState<Record<string, SearchConfig>>({})
  const [docConfigs, setDocConfigs] = useState<Record<string, SearchConfig>>({})
  const [providerHealth, setProviderHealth] = useState<Record<string, { ok: boolean; latency?: number; lastCheck?: number }>>({})
  const [testQuery, setTestQuery] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [ragQuery, setRagQuery] = useState('')
  const [ragResults, setRagResults] = useState<string[]>([])
  const [ragStatus, setRagStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [ragMaxTokens, setRagMaxTokens] = useState(4000)
  const [ragSources, setRagSources] = useState<'all' | 'web' | 'docs'>('all')
  const [history, setHistory] = useState<Array<{ query: string; provider: string; results: number; timestamp: number }>>([])
  const [multiProviderResults, setMultiProviderResults] = useState<string[]>([])
  const [purposeAssignments, setPurposeAssignments] = useState<Record<string, { webProvider: string | null; docProvider: string | null }>>({})

  useEffect(() => {
    reloadConfigs()
    setHistory(searchProviderService.getSearchHistory())
    // Load purpose configs
    const pConfigs: Record<string, { webProvider: string | null; docProvider: string | null }> = {}
    for (const purpose of SEARCH_PURPOSES) {
      const config = searchProviderService.getPurposeConfig(purpose.purpose as SearchPurpose)
      pConfigs[purpose.purpose] = config ?? { webProvider: null, docProvider: null }
    }
    setPurposeAssignments(pConfigs)
  }, [])

  const reloadConfigs = () => {
    const wConfigs: Record<string, SearchConfig> = {}
    for (const provider of Object.keys(WEB_SEARCH_PROVIDERS) as WebSearchProvider[]) {
      const c = searchProviderService.getWebConfig(provider)
      if (c) wConfigs[provider] = c
    }
    setWebConfigs(wConfigs)

    const dConfigs: Record<string, SearchConfig> = {}
    for (const provider of Object.keys(DOC_SEARCH_PROVIDERS) as DocSearchProvider[]) {
      const c = searchProviderService.getDocConfig(provider)
      if (c) dConfigs[provider] = c
    }
    setDocConfigs(dConfigs)
  }

  const handleSaveWeb = (provider: WebSearchProvider, config: SearchConfig) => {
    searchProviderService.setWebConfig(provider, config)
    reloadConfigs()
  }

  const handleSaveDoc = (provider: DocSearchProvider, config: SearchConfig) => {
    searchProviderService.setDocConfig(provider, config)
    reloadConfigs()
  }

  const checkProviderHealth = async (provider: string, checkFn: () => Promise<any>) => {
    const start = performance.now()
    try {
      await checkFn()
      setProviderHealth(prev => ({ ...prev, [provider]: { ok: true, latency: Math.round(performance.now() - start), lastCheck: Date.now() } }))
    } catch {
      setProviderHealth(prev => ({ ...prev, [provider]: { ok: false, lastCheck: Date.now() } }))
    }
  }

  const handleTestSearch = async () => {
    if (!testQuery.trim()) return
    setTestStatus('loading')
    try {
      const results = await searchProviderService.webSearch(testQuery, 5)
      setTestResults(results.map(r => `${r.position}. ${r.title}\n   ${r.url}\n   ${r.snippet}`))
      setTestStatus('success')
      setHistory(searchProviderService.getSearchHistory())
    } catch (e: any) {
      setTestResults([`Error: ${e.message}`])
      setTestStatus('error')
    }
  }

  const handleMultiSearch = async () => {
    if (!testQuery.trim()) return
    setTestStatus('loading')
    try {
      const results = await searchProviderService.multiSearch(testQuery, 10)
      setMultiProviderResults(results.map(r => `${r.position}. ${r.title}\n   ${r.url}\n   ${r.snippet}`))
      setTestStatus('success')
    } catch (e: any) {
      setMultiProviderResults([`Error: ${e.message}`])
      setTestStatus('error')
    }
  }

  const handleTestRAG = async () => {
    if (!ragQuery.trim()) return
    setRagStatus('loading')
    try {
      const rag = await searchProviderService.ragSearch(ragQuery, 3, 3)
      const lines = [`Query: ${rag.query}`, `Sources: ${rag.sources.length} | Tokens: ~${rag.totalTokens}`, '']
      for (const [i, s] of rag.sources.entries()) {
        lines.push(`[${i + 1}] ${s.source} (score: ${s.score.toFixed(3)})`)
        lines.push(`    ${s.content.slice(0, 150)}...`)
      }
      setRagResults(lines)
      setRagStatus('success')
    } catch (e: any) {
      setRagResults([`Error: ${e.message}`])
      setRagStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ide-border">
        <FaSearch size={14} className="text-blue-400" />
        <span className="text-xs font-semibold">Search Providers & RAG</span>
      </div>

      <div className="flex border-b border-ide-border">
        {(['web', 'docs', 'purposes', 'rag', 'history'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 text-[10px] border-b-2 text-center capitalize ${
              activeTab === tab ? 'border-blue-400 text-blue-400' : 'border-transparent text-ide-text-secondary hover:text-ide-text'
            }`}>
            {tab === 'web' ? '🌐 Web' : tab === 'docs' ? '📄 Docs' : tab === 'purposes' ? '🎯 Purposes' : tab === 'rag' ? '🔗 RAG' : '📜 History'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* ── Web Search ── */}
        {activeTab === 'web' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Configure web search providers. Attach them to LLM calls for Retrieval-Augmented Generation.
            </p>

            {(Object.keys(WEB_SEARCH_PROVIDERS) as WebSearchProvider[]).filter(p => p !== 'custom').map(provider => {
              const info = WEB_SEARCH_PROVIDERS[provider]
              const config = searchProviderService.getWebConfig(provider)
              const isConfigured = !!(config?.apiKey && config.apiKey.length > 0) || provider === 'duckduckgo'
              const isActive = config?.enabled
              const health = providerHealth[provider]
              return (
                <WebProviderCard key={provider} provider={provider} info={info}
                  isConfigured={isConfigured} isActive={!!isActive} config={config} health={health}
                  onSave={(cfg) => handleSaveWeb(provider, cfg)}
                  onHealthCheck={() => checkProviderHealth(provider, () => searchProviderService.webSearch('test', 1, provider))} />
              )
            })}

            {/* Multi-Provider Search */}
            <div className="border border-ide-border/30 rounded-lg p-3 mt-4">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <FaBolt size={12} className="text-yellow-400" /> Quick Test
              </div>
              <div className="flex gap-2">
                <input value={testQuery} onChange={e => setTestQuery(e.target.value)}
                  placeholder="Search the web..."
                  className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
                  onKeyDown={e => e.key === 'Enter' && handleTestSearch()} />
                <button onClick={handleTestSearch} disabled={!testQuery.trim() || testStatus === 'loading'}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
                  {testStatus === 'loading' ? <FaSync size={10} className="animate-spin" /> : <FaSearch size={10} />}
                  Search
                </button>
                <button onClick={handleMultiSearch} disabled={!testQuery.trim() || testStatus === 'loading'}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
                  title="Search across all configured providers">
                  Multi
                </button>
              </div>
              {testResults.length > 0 && (
                <div className={`mt-2 p-2 rounded text-[10px] font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto ${
                  testStatus === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {testResults.join('\n')}
                </div>
              )}
              {multiProviderResults.length > 0 && (
                <div className="mt-2 p-2 rounded text-[10px] font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto bg-purple-500/10 text-purple-400">
                  <div className="font-bold mb-1">Multi-Provider Results ({multiProviderResults.length}):</div>
                  {multiProviderResults.join('\n')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Document Search ── */}
        {activeTab === 'docs' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Configure document search providers for code, wikis, and documentation. Results feed into RAG pipelines.
            </p>

            {(Object.keys(DOC_SEARCH_PROVIDERS) as DocSearchProvider[]).filter(p => p !== 'custom').map(provider => {
              const info = DOC_SEARCH_PROVIDERS[provider]
              const config = searchProviderService.getDocConfig(provider)
              const isConfigured = provider === 'local' || !!(config?.apiKey)
              const isActive = config?.enabled
              return (
                <DocProviderCard key={provider} provider={provider} info={info}
                  isConfigured={isConfigured} isActive={!!isActive} config={config}
                  onSave={(cfg) => handleSaveDoc(provider, cfg)} />
              )
            })}
          </div>
        )}

        {/* ── Search Purposes ── */}
        {activeTab === 'purposes' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Assign search providers to each purpose. Different search tasks benefit from different providers.
            </p>
            {SEARCH_PURPOSES.map(purpose => (
              <div key={purpose.purpose} className="border border-ide-border/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{purpose.label}</span>
                  {purpose.useRerank && <span className="text-[8px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">RERANK</span>}
                </div>
                <p className="text-[9px] text-ide-text-secondary mb-2">{purpose.description}</p>
                <div className="flex gap-2">
                  <select
                    value={purposeAssignments[purpose.purpose]?.webProvider || ''}
                    onChange={e => {
                      const webProvider = e.target.value as WebSearchProvider || null
                      setPurposeAssignments(prev => ({
                        ...prev,
                        [purpose.purpose]: { ...prev[purpose.purpose], webProvider }
                      }))
                      searchProviderService.setPurposeConfig(
                        purpose.purpose as SearchPurpose,
                        webProvider as WebSearchProvider | null,
                        purposeAssignments[purpose.purpose]?.docProvider as DocSearchProvider | null
                      )
                    }}
                    className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
                  >
                    <option value="">Web provider...</option>
                    {(Object.keys(WEB_SEARCH_PROVIDERS) as WebSearchProvider[]).filter(p => p !== 'custom').map(p => (
                      <option key={p} value={p}>{WEB_SEARCH_PROVIDERS[p].icon} {WEB_SEARCH_PROVIDERS[p].name}</option>
                    ))}
                  </select>
                  <select
                    value={purposeAssignments[purpose.purpose]?.docProvider || ''}
                    onChange={e => {
                      const docProvider = e.target.value as DocSearchProvider || null
                      setPurposeAssignments(prev => ({
                        ...prev,
                        [purpose.purpose]: { ...prev[purpose.purpose], docProvider }
                      }))
                      searchProviderService.setPurposeConfig(
                        purpose.purpose as SearchPurpose,
                        purposeAssignments[purpose.purpose]?.webProvider as WebSearchProvider | null,
                        docProvider as DocSearchProvider | null
                      )
                    }}
                    className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text"
                  >
                    <option value="">Doc provider...</option>
                    {(Object.keys(DOC_SEARCH_PROVIDERS) as DocSearchProvider[]).filter(p => p !== 'custom').map(p => (
                      <option key={p} value={p}>{DOC_SEARCH_PROVIDERS[p].icon} {DOC_SEARCH_PROVIDERS[p].name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RAG Pipeline ── */}
        {activeTab === 'rag' && (
          <div className="space-y-3">
            <p className="text-[10px] text-ide-text-secondary">
              Test the RAG pipeline — combines web search + document embeddings for context-augmented LLM calls.
            </p>

            <div className="bg-ide-bg-secondary/30 rounded-lg p-3 text-[10px] space-y-1">
              <div className="font-medium text-ide-text">How RAG Works:</div>
              <div className="flex items-center gap-2 text-ide-text-secondary flex-wrap">
                <span className="text-blue-400">1. Search</span> Web + docs
                <FaArrowRight size={10} /> <span className="text-purple-400">2. Embed</span> Vectors
                <FaArrowRight size={10} /> <span className="text-green-400">3. Retrieve</span> Top-K
                <FaArrowRight size={10} /> <span className="text-yellow-400">4. Rerank</span> Score
                <FaArrowRight size={10} /> <span className="text-cyan-400">5. Generate</span> LLM
              </div>
            </div>

            <div className="flex items-center gap-3 text-[10px]">
              <span className={searchProviderService.isWebSearchAvailable() ? 'text-green-400' : 'text-red-400'}>
                {searchProviderService.isWebSearchAvailable() ? '✓' : '✗'} Web Search
              </span>
              <span className={embeddingService.getConfiguredEmbeddingProviders().length > 0 ? 'text-green-400' : 'text-red-400'}>
                {embeddingService.getConfiguredEmbeddingProviders().length > 0 ? '✓' : '✗'} Embeddings
              </span>
            </div>

            {/* RAG Config */}
            <div className="flex gap-2 text-[10px]">
              <label className="flex items-center gap-1 text-ide-text-secondary">
                Sources:
                <select value={ragSources} onChange={e => setRagSources(e.target.value as any)}
                  className="bg-ide-bg-secondary border border-ide-border rounded px-1 py-0.5 text-ide-text">
                  <option value="all">All</option>
                  <option value="web">Web only</option>
                  <option value="docs">Docs only</option>
                </select>
              </label>
              <label className="flex items-center gap-1 text-ide-text-secondary">
                Max tokens:
                <input type="number" value={ragMaxTokens} onChange={e => setRagMaxTokens(Number(e.target.value))}
                  className="w-16 bg-ide-bg-secondary border border-ide-border rounded px-1 py-0.5 text-ide-text" />
              </label>
            </div>

            <div className="flex gap-2">
              <input value={ragQuery} onChange={e => setRagQuery(e.target.value)}
                placeholder="RAG query..."
                className="flex-1 bg-ide-bg-secondary border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text"
                onKeyDown={e => e.key === 'Enter' && handleTestRAG()} />
              <button onClick={handleTestRAG} disabled={!ragQuery.trim() || ragStatus === 'loading'}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
                {ragStatus === 'loading' ? <FaSync size={10} className="animate-spin" /> : <FaDatabase size={10} />}
                Run RAG
              </button>
            </div>
            {ragResults.length > 0 && (
              <div className={`p-2 rounded text-[10px] font-mono whitespace-pre-wrap max-h-[250px] overflow-y-auto ${
                ragStatus === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {ragResults.join('\n')}
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Search History</span>
              <button onClick={() => { searchProviderService.clearSearchHistory(); setHistory([]) }}
                className="text-[10px] text-red-400 hover:text-red-300">Clear</button>
            </div>
            {history.length === 0 ? (
              <p className="text-[10px] text-ide-text-secondary text-center py-6">No search history yet.</p>
            ) : (
              <div className="space-y-1">
                {history.slice(0, 50).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 bg-ide-bg-secondary/10 rounded text-[10px]">
                    <FaSearch size={10} className="text-ide-text-secondary" />
                    <span className="flex-1 truncate text-ide-text">{h.query}</span>
                    <span className="text-ide-text-secondary">{h.provider}</span>
                    <span className="text-green-400">{h.results} results</span>
                    <span className="text-ide-text-secondary">{new Date(h.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WebProviderCard({ provider, info, isConfigured, isActive, config, health, onSave, onHealthCheck }: {
  provider: WebSearchProvider; info: typeof WEB_SEARCH_PROVIDERS.google
  isConfigured: boolean; isActive: boolean; config?: SearchConfig
  health?: { ok: boolean; latency?: number; lastCheck?: number }
  onSave: (cfg: SearchConfig) => void; onHealthCheck: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [enabled, setEnabled] = useState(config?.enabled || false)

  return (
    <div className="border border-ide-border/30 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/20">
        <span className="text-sm">{info.icon}</span>
        <span className="flex-1 text-xs text-left">{info.name}</span>
        {health && (
          <span className={`text-[9px] px-1.5 rounded flex items-center gap-0.5 ${
            health.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {health.ok ? <FaShieldAlt size={8} /> : <FaTimes size={8} />}
            {health.latency ? `${health.latency}ms` : 'Error'}
          </span>
        )}
        {isActive ? (
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded">● Active</span>
        ) : isConfigured ? (
          <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded">Configured</span>
        ) : (
          <span className="text-[9px] bg-ide-bg-secondary text-ide-text-secondary px-1.5 rounded">Not set</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-ide-border/20">
          {provider !== 'duckduckgo' && (
            <div className="pt-2">
              <label className="text-[9px] text-ide-text-secondary block mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Enter API key..."
                className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text font-mono" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-ide-text-secondary cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                className="rounded" />
              Enable
            </label>
            <button onClick={onHealthCheck}
              className="px-2 py-0.5 bg-ide-bg-secondary hover:bg-ide-border rounded text-[9px] text-ide-text-secondary flex items-center gap-0.5"
              title="Test connection">
              <FaSync size={8} /> Test
            </button>
            <button onClick={() => onSave({ provider, apiKey, baseUrl: info.baseUrl, enabled })}
              disabled={provider !== 'duckduckgo' && !apiKey}
              className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-[10px]">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DocProviderCard({ provider, info, isConfigured, isActive, config, onSave }: {
  provider: DocSearchProvider; info: typeof DOC_SEARCH_PROVIDERS.local
  isConfigured: boolean; isActive: boolean; config?: SearchConfig
  onSave: (cfg: SearchConfig) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [enabled, setEnabled] = useState(config?.enabled || false)
  const [workspaceUrl, setWorkspaceUrl] = useState(config?.workspaceUrl || '')

  return (
    <div className="border border-ide-border/30 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-bg-secondary/20">
        <span className="text-sm">{info.icon}</span>
        <span className="flex-1 text-xs text-left">{info.name}</span>
        <span className="text-[9px] text-ide-text-secondary max-w-[180px] truncate">{info.description}</span>
        {isActive ? (
          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded">● Active</span>
        ) : isConfigured ? (
          <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded">Ready</span>
        ) : (
          <span className="text-[9px] bg-ide-bg-secondary text-ide-text-secondary px-1.5 rounded">Not set</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-ide-border/20">
          {info.requiresKey && (
            <div className="pt-2">
              <label className="text-[9px] text-ide-text-secondary block mb-1">API Key / Token</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Enter API key..."
                className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text font-mono" />
            </div>
          )}
          {(provider === 'github' || provider === 'sitemap') && (
            <div>
              <label className="text-[9px] text-ide-text-secondary block mb-1">
                {provider === 'github' ? 'Repository (owner/repo)' : 'Sitemap URL'}
              </label>
              <input value={workspaceUrl} onChange={e => setWorkspaceUrl(e.target.value)}
                placeholder={provider === 'github' ? 'owner/repo' : 'https://example.com/sitemap.xml'}
                className="w-full bg-ide-bg-secondary border border-ide-border rounded px-2 py-1 text-[10px] text-ide-text font-mono" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-ide-text-secondary cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}
                className="rounded" />
              Enable
            </label>
            <button onClick={() => onSave({ provider, apiKey, baseUrl: info.requiresKey ? '' : '', enabled, workspaceUrl })}
              disabled={info.requiresKey && !apiKey}
              className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-[10px]">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
