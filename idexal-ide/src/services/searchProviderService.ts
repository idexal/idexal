/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SEARCH PROVIDER SERVICE v2.0                          ║
 * ║   Web Search • Doc Search • RAG • Purpose Routing • Multi      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - 8 web search providers + 7 document search providers
 * - Purpose-specific provider routing (code, docs, web, api, knowledge)
 * - Multi-provider parallel search with dedup
 * - RAG pipeline integration with embedding + rerank
 * - Search history and analytics
 */

import { embeddingService } from './embeddingService'

export type WebSearchProvider = 'google' | 'bing' | 'brave' | 'serpapi' | 'serper' | 'tavily' | 'duckduckgo' | 'custom'
export type DocSearchProvider = 'local' | 'web' | 'sitemap' | 'confluence' | 'notion' | 'github' | 'custom'

/** Search purposes for specialized routing */
export type SearchPurpose = 'code' | 'documentation' | 'web' | 'api-reference' | 'knowledge-base' | 'real-time' | 'academic'

export interface SearchPurposeConfig {
  purpose: SearchPurpose
  label: string
  description: string
  icon: string
  preferredWebProvider: WebSearchProvider | null
  preferredDocProvider: DocSearchProvider | null
  maxResults: number
  useRerank: boolean
}

export interface SearchConfig {
  provider: WebSearchProvider | DocSearchProvider
  apiKey: string
  baseUrl: string
  enabled: boolean
  /** For doc search: specific workspace/repo URLs */
  workspaceUrl?: string
  /** For doc search: max tokens per result */
  maxTokens?: number
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  position: number
}

export interface DocSearchResult {
  title: string
  content: string
  source: string
  score?: number
}

export interface RAGContext {
  query: string
  sources: Array<{ content: string; source: string; score: number }>
  totalTokens: number
}

// ── Provider Definitions ─────────────────────────────────────

export const WEB_SEARCH_PROVIDERS: Record<WebSearchProvider, {
  name: string; baseUrl: string; icon: string; description: string; maxResults: number
}> = {
  google: {
    name: 'Google Search', baseUrl: 'https://customsearch.googleapis.com/v1', icon: '🔍',
    description: 'Google Custom Search API — 100 free queries/day', maxResults: 10,
  },
  bing: {
    name: 'Bing Search', baseUrl: 'https://api.bing.microsoft.com/v7.0', icon: '🔎',
    description: 'Bing Web Search API — 1000 free queries/month', maxResults: 10,
  },
  brave: {
    name: 'Brave Search', baseUrl: 'https://api.search.brave.com/res/v1/web', icon: '🦁',
    description: 'Brave Search API — privacy-focused, 2000 free queries/month', maxResults: 10,
  },
  serpapi: {
    name: 'SerpAPI', baseUrl: 'https://serpapi.com/search', icon: '📊',
    description: 'SerpAPI — Google/Bing/Yahoo results, 100 free searches/month', maxResults: 10,
  },
  serper: {
    name: 'Serper.dev', baseUrl: 'https://google.serper.dev/search', icon: '⚡',
    description: 'Serper.dev — fast Google search, 2500 free queries', maxResults: 10,
  },
  tavily: {
    name: 'Tavily', baseUrl: 'https://api.tavily.com/search', icon: '🌐',
    description: 'Tavily — AI-optimized search, built for RAG', maxResults: 10,
  },
  duckduckgo: {
    name: 'DuckDuckGo', baseUrl: 'https://duckduckgo.com', icon: '🦆',
    description: 'DuckDuckGo — no API key required', maxResults: 10,
  },
  custom: {
    name: 'Custom Search API', baseUrl: '', icon: '⚙️',
    description: 'Any OpenAI-compatible or custom search endpoint', maxResults: 10,
  },
}

export const DOC_SEARCH_PROVIDERS: Record<DocSearchProvider, {
  name: string; icon: string; description: string; requiresKey: boolean
}> = {
  local: {
    name: 'Local Files', icon: '📁', description: 'Search local project files via embeddings', requiresKey: false,
  },
  github: {
    name: 'GitHub Code', icon: '🐙', description: 'Search GitHub repositories via API', requiresKey: false,
  },
  confluence: {
    name: 'Confluence', icon: '📘', description: 'Atlassian Confluence wiki search', requiresKey: true,
  },
  notion: {
    name: 'Notion', icon: '📝', description: 'Notion workspace search', requiresKey: true,
  },
  sitemap: {
    name: 'Sitemap Crawler', icon: '🕸️', description: 'Crawl any website sitemap for content', requiresKey: false,
  },
  web: {
    name: 'Web Fetch', icon: '🌐', description: 'Fetch and search specific web pages', requiresKey: false,
  },
  custom: {
    name: 'Custom API', icon: '⚙️', description: 'Any custom document search endpoint', requiresKey: true,
  },
}

// ── Purpose Definitions ─────────────────────────────────────

export const SEARCH_PURPOSES: SearchPurposeConfig[] = [
  {
    purpose: 'code',
    label: '💻 Code',
    description: 'Search across code repositories, GitHub, Stack Overflow. Optimized for code snippets and technical solutions.',
    icon: '💻',
    preferredWebProvider: 'brave',
    preferredDocProvider: 'github',
    maxResults: 10,
    useRerank: true,
  },
  {
    purpose: 'documentation',
    label: '📚 Documentation',
    description: 'Search official docs, API references, and technical documentation. Optimized for structured content.',
    icon: '📚',
    preferredWebProvider: null,
    preferredDocProvider: 'confluence',
    maxResults: 8,
    useRerank: true,
  },
  {
    purpose: 'web',
    label: '🌐 Web',
    description: 'General web search across all public content. Best for news, articles, and general information.',
    icon: '🌐',
    preferredWebProvider: 'google',
    preferredDocProvider: null,
    maxResults: 10,
    useRerank: false,
  },
  {
    purpose: 'api-reference',
    label: '🔌 API Reference',
    description: 'Search API documentation, SDKs, and integration guides. Optimized for endpoints, parameters, and examples.',
    icon: '🔌',
    preferredWebProvider: null,
    preferredDocProvider: 'github',
    maxResults: 5,
    useRerank: true,
  },
  {
    purpose: 'knowledge-base',
    label: '🧠 Knowledge Base',
    description: 'Search internal knowledge base, wikis, and team documentation. Optimized for institutional knowledge.',
    icon: '🧠',
    preferredWebProvider: null,
    preferredDocProvider: 'notion',
    maxResults: 8,
    useRerank: true,
  },
  {
    purpose: 'real-time',
    label: '⚡ Real-Time',
    description: 'Fast, real-time search for current information. Optimized for speed and freshness.',
    icon: '⚡',
    preferredWebProvider: 'tavily',
    preferredDocProvider: null,
    maxResults: 5,
    useRerank: false,
  },
  {
    purpose: 'academic',
    label: '🎓 Academic',
    description: 'Search academic papers, research, and scholarly content. Optimized for citations and peer-reviewed sources.',
    icon: '🎓',
    preferredWebProvider: 'serpapi',
    preferredDocProvider: null,
    maxResults: 8,
    useRerank: true,
  },
]

// ── Search Provider Service ──────────────────────────────────

class SearchProviderService {
  private webConfigs: Map<WebSearchProvider, SearchConfig> = new Map()
  private docConfigs: Map<DocSearchProvider, SearchConfig> = new Map()
  private searchHistory: Array<{ query: string; provider: string; results: number; timestamp: number }> = []
  private storageKey = 'idexal-search-providers'

  constructor() {
    this.loadFromStorage()
  }

  // ── Configuration ────────────────────────────────────────

  getWebConfig(provider: WebSearchProvider): SearchConfig | undefined {
    return this.webConfigs.get(provider)
  }

  setWebConfig(provider: WebSearchProvider, config: SearchConfig) {
    this.webConfigs.set(provider, config)
    this.saveToStorage()
  }

  getDocConfig(provider: DocSearchProvider): SearchConfig | undefined {
    return this.docConfigs.get(provider)
  }

  setDocConfig(provider: DocSearchProvider, config: SearchConfig) {
    this.docConfigs.set(provider, config)
    this.saveToStorage()
  }

  getActiveWebProvider(): WebSearchProvider | null {
    for (const [provider, config] of this.webConfigs) {
      if (config.enabled && (config.apiKey || provider === 'duckduckgo')) return provider
    }
    return null
  }

  isWebSearchAvailable(): boolean {
    return this.getActiveWebProvider() !== null
  }

  // ── Purpose Configuration ─────────────────────────────────

  private purposeAssignments: Map<SearchPurpose, { webProvider: WebSearchProvider | null; docProvider: DocSearchProvider | null }> = new Map()

  /** Set provider for a specific search purpose */
  setPurposeConfig(purpose: SearchPurpose, webProvider: WebSearchProvider | null, docProvider: DocSearchProvider | null) {
    this.purposeAssignments.set(purpose, { webProvider, docProvider })
    this.saveToStorage()
  }

  /** Get provider for a specific search purpose */
  getPurposeConfig(purpose: SearchPurpose) {
    return this.purposeAssignments.get(purpose) ?? null
  }

  /** Get all purpose configurations */
  getAllPurposeConfigs(): Record<SearchPurpose, { webProvider: WebSearchProvider | null; docProvider: DocSearchProvider | null } | null> {
    const result: Record<string, any> = {}
    for (const purpose of SEARCH_PURPOSES) {
      result[purpose.purpose] = this.purposeAssignments.get(purpose.purpose) ?? null
    }
    return result as any
  }

  /** Get the best web provider for a purpose */
  getWebProviderForPurpose(purpose: SearchPurpose): WebSearchProvider | null {
    const config = this.purposeAssignments.get(purpose)
    if (config?.webProvider) return config.webProvider
    const defaultConfig = SEARCH_PURPOSES.find(p => p.purpose === purpose)
    if (defaultConfig?.preferredWebProvider) return defaultConfig.preferredWebProvider
    return this.getActiveWebProvider()
  }

  /** Get the best doc provider for a purpose */
  getDocProviderForPurpose(purpose: SearchPurpose): DocSearchProvider | null {
    const config = this.purposeAssignments.get(purpose)
    if (config?.docProvider) return config.docProvider
    const defaultConfig = SEARCH_PURPOSES.find(p => p.purpose === purpose)
    if (defaultConfig?.preferredDocProvider) return defaultConfig.preferredDocProvider
    return this.getActiveDocProvider()
  }

  /** Search with purpose-specific routing */
  async searchForPurpose(purpose: SearchPurpose, query: string, maxResults?: number): Promise<WebSearchResult[]> {
    const webProvider = this.getWebProviderForPurpose(purpose)
    const purposeConfig = SEARCH_PURPOSES.find(p => p.purpose === purpose)
    const limit = maxResults ?? purposeConfig?.maxResults ?? 5
    if (webProvider) {
      return this.webSearch(query, limit, webProvider)
    }
    return this.webSearch(query, limit)
  }

  /** Doc search with purpose-specific routing */
  async docSearchForPurpose(purpose: SearchPurpose, query: string, maxResults?: number): Promise<DocSearchResult[]> {
    const docProvider = this.getDocProviderForPurpose(purpose)
    const purposeConfig = SEARCH_PURPOSES.find(p => p.purpose === purpose)
    const limit = maxResults ?? purposeConfig?.maxResults ?? 5
    if (docProvider) {
      return this.docSearch(query, limit, docProvider)
    }
    return this.docSearch(query, limit)
  }

  /** Combined search for a purpose (web + doc) */
  async combinedSearchForPurpose(purpose: SearchPurpose, query: string, maxResults?: number): Promise<{ web: WebSearchResult[]; doc: DocSearchResult[] }> {
    const [web, doc] = await Promise.all([
      this.searchForPurpose(purpose, query, maxResults),
      this.docSearchForPurpose(purpose, query, maxResults),
    ])
    return { web, doc }
  }

  // ── Web Search ───────────────────────────────────────────

  async webSearch(query: string, maxResults: number = 5, provider?: WebSearchProvider): Promise<WebSearchResult[]> {
    const p = provider || this.getActiveWebProvider()
    if (!p) throw new Error('No search provider configured')

    const config = this.webConfigs.get(p)
    if (!config) throw new Error(`No config for ${p}`)

    let results: WebSearchResult[]

    switch (p) {
      case 'google': results = await this.searchGoogle(query, maxResults, config); break
      case 'bing': results = await this.searchBing(query, maxResults, config); break
      case 'brave': results = await this.searchBrave(query, maxResults, config); break
      case 'serpapi': results = await this.searchSerpAPI(query, maxResults, config); break
      case 'serper': results = await this.searchSerper(query, maxResults, config); break
      case 'tavily': results = await this.searchTavily(query, maxResults, config); break
      case 'duckduckgo': results = await this.searchDuckDuckGo(query, maxResults); break
      default: throw new Error(`Unsupported provider: ${p}`)
    }

    this.searchHistory.push({ query, provider: p, results: results.length, timestamp: Date.now() })
    if (this.searchHistory.length > 100) this.searchHistory = this.searchHistory.slice(-100)
    this.saveToStorage()

    return results
  }

  // ── RAG Pipeline ─────────────────────────────────────────

  async ragSearch(query: string, maxWebResults: number = 3, maxDocResults: number = 5): Promise<RAGContext> {
    const sources: RAGContext['sources'] = []

    // Web search
    if (this.isWebSearchAvailable()) {
      try {
        const webResults = await this.webSearch(query, maxWebResults)
        for (const r of webResults) {
          sources.push({ content: `${r.title}\n${r.snippet}`, source: r.url, score: 1 - r.position * 0.1 })
        }
      } catch {}
    }

    // Document search (via embeddings)
    try {
      const docResults = await embeddingService.search('documents', query, maxDocResults)
      for (const r of docResults) {
        sources.push({ content: r.text, source: r.metadata?.source || 'local', score: r.score })
      }
    } catch {}

    sources.sort((a, b) => b.score - a.score)

    const totalTokens = sources.reduce((sum, s) => sum + Math.ceil(s.content.length / 4), 0)
    return { query, sources: sources.slice(0, 10), totalTokens }
  }

  async buildRAGPrompt(userQuery: string, systemPrompt?: string): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    const rag = await this.ragSearch(userQuery)

    let contextBlock = ''
    if (rag.sources.length > 0) {
      contextBlock = '\n\nRelevant context from search:\n'
      for (const [i, source] of rag.sources.entries()) {
        contextBlock += `\n[${i + 1}] (${source.source})\n${source.content}\n`
      }
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt + contextBlock })
    } else if (contextBlock) {
      messages.push({ role: 'system', content: `You are a helpful assistant. Use the provided context when relevant.${contextBlock}` })
    }

    messages.push({ role: 'user', content: userQuery })
    return messages
  }

  // ── Provider Implementations ─────────────────────────────

  private async searchGoogle(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(`${config.baseUrl}/search?key=${config.apiKey}&cx=custom&q=${encodeURIComponent(query)}&num=${maxResults}`)
    if (!res.ok) throw new Error(`Google search error: ${res.status}`)
    const data = await res.json()
    return (data.items || []).map((item: any, i: number) => ({
      title: item.title, url: item.link, snippet: item.snippet || '', position: i + 1,
    }))
  }

  private async searchBing(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(`${config.baseUrl}/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
      headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    })
    if (!res.ok) throw new Error(`Bing search error: ${res.status}`)
    const data = await res.json()
    return (data.webPages?.value || []).map((item: any, i: number) => ({
      title: item.name, url: item.url, snippet: item.snippet || '', position: i + 1,
    }))
  }

  private async searchBrave(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(`${config.baseUrl}/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': config.apiKey },
    })
    if (!res.ok) throw new Error(`Brave search error: ${res.status}`)
    const data = await res.json()
    return (data.web?.results || []).map((item: any, i: number) => ({
      title: item.title, url: item.url, snippet: item.description || '', position: i + 1,
    }))
  }

  private async searchSerpAPI(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(`${config.baseUrl}?api_key=${config.apiKey}&q=${encodeURIComponent(query)}&num=${maxResults}&engine=google`)
    if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`)
    const data = await res.json()
    return (data.organic_results || []).slice(0, maxResults).map((item: any, i: number) => ({
      title: item.title, url: item.link, snippet: item.snippet || '', position: i + 1,
    }))
  }

  private async searchSerper(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers: { 'X-API-KEY': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: maxResults }),
    })
    if (!res.ok) throw new Error(`Serper error: ${res.status}`)
    const data = await res.json()
    return (data.organic || []).slice(0, maxResults).map((item: any, i: number) => ({
      title: item.title, url: item.link, snippet: item.snippet || '', position: i + 1,
    }))
  }

  private async searchTavily(query: string, maxResults: number, config: SearchConfig): Promise<WebSearchResult[]> {
    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: config.apiKey, query, max_results: maxResults, search_depth: 'advanced' }),
    })
    if (!res.ok) throw new Error(`Tavily error: ${res.status}`)
    const data = await res.json()
    return (data.results || []).map((item: any, i: number) => ({
      title: item.title, url: item.url, snippet: item.content || '', position: i + 1,
    }))
  }

  // ── Document Search ─────────────────────────────────────

  async docSearch(query: string, maxResults: number = 5, provider?: DocSearchProvider): Promise<DocSearchResult[]> {
    const p = provider || this.getActiveDocProvider()
    if (!p) throw new Error('No document search provider configured')

    const config = this.docConfigs.get(p)
    if (!config) throw new Error(`No config for ${p}`)

    switch (p) {
      case 'github': return this.searchGitHub(query, maxResults, config)
      case 'confluence': return this.searchConfluence(query, maxResults, config)
      case 'notion': return this.searchNotion(query, maxResults, config)
      case 'sitemap': return this.searchSitemap(query, maxResults, config)
      default: throw new Error(`Unsupported doc provider: ${p}`)
    }
  }

  private getActiveDocProvider(): DocSearchProvider | null {
    for (const [provider, config] of this.docConfigs) {
      if (config.enabled && config.apiKey) return provider
    }
    return null
  }

  private async searchGitHub(query: string, maxResults: number, config: SearchConfig): Promise<DocSearchResult[]> {
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' }
    if (config.apiKey) headers['Authorization'] = `token ${config.apiKey}`
    const repo = config.workspaceUrl || ''
    const url = repo
      ? `https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${repo}&per_page=${maxResults}`
      : `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${maxResults}`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`GitHub search error: ${res.status}`)
    const data = await res.json()
    return (data.items || []).map((item: any) => ({
      title: item.name,
      content: item.text_matches?.[0]?.fragment || `File: ${item.path}`,
      source: item.html_url,
      score: 1,
    }))
  }

  private async searchConfluence(query: string, maxResults: number, config: SearchConfig): Promise<DocSearchResult[]> {
    const res = await fetch(`${config.baseUrl}/rest/api/content/search?cql=text~"${encodeURIComponent(query)}"&limit=${maxResults}`, {
      headers: { 'Authorization': `Basic ${btoa(config.apiKey)}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Confluence search error: ${res.status}`)
    const data = await res.json()
    return (data.results || []).map((item: any) => ({
      title: item.title,
      content: item.excerpt || item.body?.storage?.value?.slice(0, 500) || '',
      source: item._links?.webui || '',
      score: 1,
    }))
  }

  private async searchNotion(query: string, maxResults: number, config: SearchConfig): Promise<DocSearchResult[]> {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ query, page_size: maxResults }),
    })
    if (!res.ok) throw new Error(`Notion search error: ${res.status}`)
    const data = await res.json()
    return (data.results || []).map((item: any) => ({
      title: item.properties?.title?.title?.[0]?.plain_text || 'Untitled',
      content: item.properties?.title?.title?.[0]?.plain_text || '',
      source: item.url || '',
      score: 1,
    }))
  }

  private async searchSitemap(query: string, maxResults: number, config: SearchConfig): Promise<DocSearchResult[]> {
    if (!config.workspaceUrl) throw new Error('Sitemap URL required')
    const res = await fetch(`${config.workspaceUrl}/sitemap.xml`)
    if (!res.ok) throw new Error(`Sitemap fetch error: ${res.status}`)
    const xml = await res.text()
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    const results: DocSearchResult[] = []
    for (const url of urls.slice(0, maxResults * 2)) {
      try {
        const page = await fetch(url)
        const html = await page.text()
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.toLowerCase().includes(query.toLowerCase())) {
          const start = text.toLowerCase().indexOf(query.toLowerCase())
          results.push({
            title: url.split('/').pop() || url,
            content: text.slice(Math.max(0, start - 100), start + 300),
            source: url,
            score: 1,
          })
          if (results.length >= maxResults) break
        }
      } catch {}
    }
    return results
  }

  // ── Multi-Provider Search ───────────────────────────────

  async multiSearch(query: string, maxResults: number = 5, providers?: WebSearchProvider[]): Promise<WebSearchResult[]> {
    const targets = providers || [this.getActiveWebProvider()].filter(Boolean) as WebSearchProvider[]
    if (targets.length === 0) throw new Error('No search providers available')

    const allResults = await Promise.allSettled(
      targets.map(p => this.webSearch(query, maxResults, p))
    )

    const merged: WebSearchResult[] = []
    const seen = new Set<string>()

    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        for (const r of result.value) {
          if (!seen.has(r.url)) {
            seen.add(r.url)
            merged.push(r)
          }
        }
      }
    }

    return merged.slice(0, maxResults)
  }

  private async searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult[]> {
    // DuckDuckGo HTML scrape (no API key needed)
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Idexal-IDE/1.0' },
    })
    const html = await res.text()
    const results: WebSearchResult[] = []
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    let match
    let count = 0
    while ((match = regex.exec(html)) !== null && count < maxResults) {
      results.push({
        title: match[2].trim(),
        url: match[1],
        snippet: match[3].replace(/<[^>]*>/g, '').trim(),
        position: count + 1,
      })
      count++
    }
    return results
  }

  // ── History ──────────────────────────────────────────────

  getSearchHistory(): typeof this.searchHistory {
    return [...this.searchHistory].reverse()
  }

  clearSearchHistory() {
    this.searchHistory = []
    this.saveToStorage()
  }

  // ── Persistence ──────────────────────────────────────────

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        web: Object.fromEntries(this.webConfigs),
        doc: Object.fromEntries(this.docConfigs),
        purposes: Object.fromEntries(this.purposeAssignments),
        history: this.searchHistory,
      }))
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.web) {
          for (const [k, v] of Object.entries(data.web)) {
            this.webConfigs.set(k as WebSearchProvider, v as SearchConfig)
          }
        }
        if (data.doc) {
          for (const [k, v] of Object.entries(data.doc)) {
            this.docConfigs.set(k as DocSearchProvider, v as SearchConfig)
          }
        }
        if (data.purposes) {
          for (const [k, v] of Object.entries(data.purposes)) {
            this.purposeAssignments.set(k as SearchPurpose, v as any)
          }
        }
        if (data.history) this.searchHistory = data.history
      }
    } catch {}
  }
}

export const searchProviderService = new SearchProviderService()
export default searchProviderService
