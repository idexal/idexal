/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          EMBEDDING & RERANK SERVICE v2.0                       ║
 * ║  Vector Embeddings • Semantic Search • RAG • Purpose Routing   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - 8 embedding providers with 20+ models
 * - 4 rerank providers with 8+ models
 * - Purpose-specific provider routing (code, docs, general, multilingual)
 * - Semantic search across long-term memory
 * - Vector store with persistence
 * - Batch embedding and comparison
 */

import { aiProviderService, AIProviderConfig, AIModel, ProviderFamily } from './aiProviders'

export type EmbeddingProvider = 'openai' | 'voyage' | 'cohere' | 'jina' | 'mistral' | 'google' | 'ollama' | 'custom'
export type RerankProvider = 'cohere' | 'jina' | 'voyage' | 'custom'

/** Embedding purposes for specialized routing */
export type EmbeddingPurpose = 'code-search' | 'documentation' | 'general' | 'multilingual' | 'long-term-memory' | 'conversation' | 'rag-pipeline'

export interface EmbeddingPurposeConfig {
  purpose: EmbeddingPurpose
  label: string
  description: string
  icon: string
  preferredProvider: EmbeddingProvider | null
  preferredModel: string | null
  preferredRerankProvider: RerankProvider | null
  preferredRerankModel: string | null
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider
  model: string
  apiKey: string
  baseUrl: string
  dimensions?: number
}

export interface RerankConfig {
  provider: RerankProvider
  model: string
  apiKey: string
  baseUrl: string
}

export interface EmbeddedChunk {
  id: string
  text: string
  vector: number[]
  metadata?: Record<string, any>
}

export interface SearchResult {
  id: string
  text: string
  score: number
  metadata?: Record<string, any>
}

export interface RerankResult {
  index: number
  score: number
  text: string
}

// ── Provider Definitions ─────────────────────────────────────

export const EMBEDDING_PROVIDERS: Record<EmbeddingProvider, {
  name: string; baseUrl: string; models: Array<{ id: string; name: string; dimensions: number; maxTokens: number }>; icon: string
}> = {
  openai: {
    name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', icon: '🟢',
    models: [
      { id: 'text-embedding-3-large', name: 'Embedding 3 Large', dimensions: 3072, maxTokens: 8191 },
      { id: 'text-embedding-3-small', name: 'Embedding 3 Small', dimensions: 1536, maxTokens: 8191 },
      { id: 'text-embedding-ada-002', name: 'Ada 002', dimensions: 1536, maxTokens: 8191 },
    ],
  },
  voyage: {
    name: 'Voyage AI', baseUrl: 'https://api.voyageai.com/v1', icon: '🚢',
    models: [
      { id: 'voyage-3-large', name: 'Voyage 3 Large', dimensions: 1024, maxTokens: 32000 },
      { id: 'voyage-3', name: 'Voyage 3', dimensions: 1024, maxTokens: 32000 },
      { id: 'voyage-code-3', name: 'Voyage Code 3', dimensions: 1024, maxTokens: 32000 },
      { id: 'voyage-law-2', name: 'Voyage Law 2', dimensions: 1024, maxTokens: 32000 },
    ],
  },
  cohere: {
    name: 'Cohere', baseUrl: 'https://api.cohere.com/v2', icon: '🩵',
    models: [
      { id: 'embed-english-v3.0', name: 'Embed English v3', dimensions: 1024, maxTokens: 512 },
      { id: 'embed-multilingual-v3.0', name: 'Embed Multilingual v3', dimensions: 1024, maxTokens: 512 },
      { id: 'embed-english-light-v3.0', name: 'Embed English Light v3', dimensions: 384, maxTokens: 512 },
    ],
  },
  jina: {
    name: 'Jina AI', baseUrl: 'https://api.jina.ai/v1', icon: '🔮',
    models: [
      { id: 'jina-embeddings-v3', name: 'Jina Embeddings v3', dimensions: 1024, maxTokens: 8192 },
      { id: 'jina-embeddings-v2-base-en', name: 'Jina v2 Base', dimensions: 768, maxTokens: 8192 },
    ],
  },
  mistral: {
    name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', icon: '🟣',
    models: [
      { id: 'mistral-embed', name: 'Mistral Embed', dimensions: 1024, maxTokens: 8192 },
    ],
  },
  google: {
    name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', icon: '🔵',
    models: [
      { id: 'text-embedding-004', name: 'Text Embedding 004', dimensions: 768, maxTokens: 2048 },
      { id: 'embedding-001', name: 'Embedding 001', dimensions: 768, maxTokens: 2048 },
    ],
  },
  ollama: {
    name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/api', icon: '🦙',
    models: [
      { id: 'nomic-embed-text', name: 'Nomic Embed Text', dimensions: 768, maxTokens: 8192 },
      { id: 'mxbai-embed-large', name: 'MXBAI Embed Large', dimensions: 1024, maxTokens: 512 },
      { id: 'all-minilm', name: 'All MiniLM', dimensions: 384, maxTokens: 256 },
    ],
  },
  custom: {
    name: 'Custom Provider', baseUrl: '', icon: '⚙️',
    models: [],
  },
}

export const RERANK_PROVIDERS: Record<RerankProvider, {
  name: string; baseUrl: string; models: Array<{ id: string; name: string }>; icon: string
}> = {
  cohere: {
    name: 'Cohere', baseUrl: 'https://api.cohere.com/v2', icon: '🩵',
    models: [
      { id: 'rerank-english-v3.0', name: 'Rerank English v3' },
      { id: 'rerank-multilingual-v3.0', name: 'Rerank Multilingual v3' },
      { id: 'rerank-english-v2.0', name: 'Rerank English v2' },
    ],
  },
  jina: {
    name: 'Jina AI', baseUrl: 'https://api.jina.ai/v1', icon: '🔮',
    models: [
      { id: 'jina-reranker-v2-base-multilingual', name: 'Jina Reranker v2' },
      { id: 'jina-reranker-v1-turbo-en', name: 'Jina Reranker Turbo' },
    ],
  },
  voyage: {
    name: 'Voyage AI', baseUrl: 'https://api.voyageai.com/v1', icon: '🚢',
    models: [
      { id: 'rerank-2', name: 'Voyage Rerank 2' },
      { id: 'rerank-2-lite', name: 'Voyage Rerank 2 Lite' },
    ],
  },
  custom: {
    name: 'Custom Provider', baseUrl: '', icon: '⚙️',
    models: [],
  },
}

// ── Purpose Definitions ─────────────────────────────────────

export const EMBEDDING_PURPOSES: EmbeddingPurposeConfig[] = [
  {
    purpose: 'code-search',
    label: '💻 Code Search',
    description: 'Semantic search across code files, functions, and classes. Optimized for variable names, function signatures, and code patterns.',
    icon: '💻',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'documentation',
    label: '📚 Documentation',
    description: 'Search across README, API docs, comments, and technical documentation. Optimized for natural language queries.',
    icon: '📚',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'general',
    label: '🔍 General',
    description: 'General-purpose semantic search across all content types. Balanced for accuracy and speed.',
    icon: '🔍',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'multilingual',
    label: '🌍 Multilingual',
    description: 'Multi-language content search. Supports Arabic, English, and 100+ languages with cross-lingual matching.',
    icon: '🌍',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'long-term-memory',
    label: '🧠 Long-Term Memory',
    description: 'Semantic search across agent memories, decisions, and learned patterns. Optimized for recall and relevance.',
    icon: '🧠',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'conversation',
    label: '💬 Conversation',
    description: 'Search across chat history and conversation summaries. Optimized for context and continuity.',
    icon: '💬',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
  {
    purpose: 'rag-pipeline',
    label: '🤖 RAG Pipeline',
    description: 'Full RAG pipeline with embedding + reranking. Optimized for retrieval-augmented generation workflows.',
    icon: '🤖',
    preferredProvider: null,
    preferredModel: null,
    preferredRerankProvider: null,
    preferredRerankModel: null,
  },
]

// ── Embedding Service ────────────────────────────────────────

class EmbeddingService {
  private configs: Map<EmbeddingProvider, EmbeddingConfig> = new Map()
  private rerankConfigs: Map<RerankProvider, RerankConfig> = new Map()
  private vectors: Map<string, EmbeddedChunk[]> = new Map()
  private listeners: Set<() => void> = new Set()
  private storageKey = 'idexal-embedding-config'

  constructor() {
    this.loadFromStorage()
  }

  // ── Configuration ────────────────────────────────────────

  getEmbeddingConfig(provider: EmbeddingProvider): EmbeddingConfig | undefined {
    return this.configs.get(provider)
  }

  setEmbeddingConfig(provider: EmbeddingProvider, config: EmbeddingConfig) {
    this.configs.set(provider, config)
    this.saveToStorage()
  }

  getRerankConfig(provider: RerankProvider): RerankConfig | undefined {
    return this.rerankConfigs.get(provider)
  }

  setRerankConfig(provider: RerankProvider, config: RerankConfig) {
    this.rerankConfigs.set(provider, config)
    this.saveToStorage()
  }

  getConfiguredEmbeddingProviders(): EmbeddingProvider[] {
    return Array.from(this.configs.keys()).filter(k => this.configs.get(k)!.apiKey)
  }

  getConfiguredRerankProviders(): RerankProvider[] {
    return Array.from(this.rerankConfigs.keys()).filter(k => this.rerankConfigs.get(k)!.apiKey)
  }

  // ── Purpose Configuration ─────────────────────────────────

  private purposeAssignments: Map<EmbeddingPurpose, { embeddingProvider: EmbeddingProvider; embeddingModel: string; rerankProvider: RerankProvider | null; rerankModel: string | null }> = new Map()

  /** Set provider/model for a specific purpose */
  setPurposeConfig(
    purpose: EmbeddingPurpose,
    embeddingProvider: EmbeddingProvider,
    embeddingModel: string,
    rerankProvider?: RerankProvider,
    rerankModel?: string
  ) {
    this.purposeAssignments.set(purpose, {
      embeddingProvider,
      embeddingModel,
      rerankProvider: rerankProvider ?? null,
      rerankModel: rerankModel ?? null,
    })
    this.saveToStorage()
  }

  /** Get provider/model for a specific purpose */
  getPurposeConfig(purpose: EmbeddingPurpose) {
    return this.purposeAssignments.get(purpose) ?? null
  }

  /** Get all purpose configurations */
  getAllPurposeConfigs(): Record<EmbeddingPurpose, { embeddingProvider: EmbeddingProvider; embeddingModel: string; rerankProvider: RerankProvider | null; rerankModel: string | null } | null> {
    const result: Record<string, any> = {}
    for (const purpose of EMBEDDING_PURPOSES) {
      result[purpose.purpose] = this.purposeAssignments.get(purpose.purpose) ?? null
    }
    return result as any
  }

  /** Get the best provider for a purpose (falls back to configured providers) */
  getProviderForPurpose(purpose: EmbeddingPurpose): { provider: EmbeddingProvider; model: string } | null {
    const config = this.purposeAssignments.get(purpose)
    if (config) {
      return { provider: config.embeddingProvider, model: config.embeddingModel }
    }
    // Fallback to first configured provider
    const providers = this.getConfiguredEmbeddingProviders()
    if (providers.length > 0) {
      const p = providers[0]
      const models = EMBEDDING_PROVIDERS[p].models
      return { provider: p, model: models[0]?.id ?? '' }
    }
    return null
  }

  /** Get the best rerank provider for a purpose */
  getRerankForPurpose(purpose: EmbeddingPurpose): { provider: RerankProvider; model: string } | null {
    const config = this.purposeAssignments.get(purpose)
    if (config?.rerankProvider) {
      return { provider: config.rerankProvider, model: config.rerankModel ?? '' }
    }
    // Fallback to first configured rerank provider
    const providers = this.getConfiguredRerankProviders()
    if (providers.length > 0) {
      const p = providers[0]
      const models = RERANK_PROVIDERS[p].models
      return { provider: p, model: models[0]?.id ?? '' }
    }
    return null
  }

  /** Embed with purpose-specific routing */
  async embedForPurpose(purpose: EmbeddingPurpose, texts: string[]): Promise<number[][]> {
    const target = this.getProviderForPurpose(purpose)
    if (target) {
      return this.embed(texts, target.provider)
    }
    return this.embed(texts)
  }

  /** Rerank with purpose-specific routing */
  async rerankForPurpose(purpose: EmbeddingPurpose, query: string, documents: string[], topN: number = 5): Promise<RerankResult[]> {
    const target = this.getRerankForPurpose(purpose)
    if (target) {
      return this.rerank(query, documents, topN, target.provider)
    }
    return this.rerank(query, documents, topN)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() { this.listeners.forEach(l => l()) }

  // ── Embedding Generation ─────────────────────────────────

  async embed(texts: string[], provider?: EmbeddingProvider): Promise<number[][]> {
    const p = provider || this.getConfiguredEmbeddingProviders()[0]
    if (!p) throw new Error('No embedding provider configured')
    const config = this.configs.get(p)
    if (!config) throw new Error(`No config for ${p}`)

    switch (p) {
      case 'openai': return this.embedOpenAI(texts, config)
      case 'voyage': return this.embedVoyage(texts, config)
      case 'cohere': return this.embedCohere(texts, config)
      case 'jina': return this.embedJina(texts, config)
      case 'mistral': return this.embedMistral(texts, config)
      case 'google': return this.embedGoogle(texts, config)
      case 'ollama': return this.embedOllama(texts, config)
      default: throw new Error(`Unsupported embedding provider: ${p}`)
    }
  }

  async embedSingle(text: string, provider?: EmbeddingProvider): Promise<number[]> {
    const results = await this.embed([text], provider)
    return results[0]
  }

  private async embedOpenAI(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const body = { input: texts, model: config.model, dimensions: config.dimensions }
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status}`)
    const data = await res.json()
    return data.data.map((d: any) => d.embedding)
  }

  private async embedVoyage(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const body = { input: texts, model: config.model }
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Voyage embedding error: ${res.status}`)
    const data = await res.json()
    return data.data.map((d: any) => d.embedding)
  }

  private async embedCohere(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const body = { texts, model: config.model, input_type: 'search_document', embedding_types: ['float'] }
    const res = await fetch(`${config.baseUrl}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Cohere embedding error: ${res.status}`)
    const data = await res.json()
    return data.embeddings?.float || data.embeddings
  }

  private async embedJina(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const body = { model: config.model, input: texts.map(t => ({ text: t })), task: 'retrieval.passage' }
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Jina embedding error: ${res.status}`)
    const data = await res.json()
    return data.data.map((d: any) => d.embedding)
  }

  private async embedMistral(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const body = { model: config.model, input: texts }
    const res = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Mistral embedding error: ${res.status}`)
    const data = await res.json()
    return data.data.map((d: any) => d.embedding)
  }

  private async embedGoogle(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      const res = await fetch(`${config.baseUrl}/models/${config.model}:embedContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      })
      if (!res.ok) throw new Error(`Google embedding error: ${res.status}`)
      const data = await res.json()
      results.push(data.embedding.values)
    }
    return results
  }

  private async embedOllama(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      const res = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, prompt: text }),
      })
      if (!res.ok) throw new Error(`Ollama embedding error: ${res.status}`)
      const data = await res.json()
      results.push(data.embedding)
    }
    return results
  }

  // ── Vector Store ─────────────────────────────────────────

  async addDocuments(collectionId: string, documents: Array<{ id: string; text: string; metadata?: Record<string, any> }>) {
    const vectors = await this.embed(documents.map(d => d.text))
    const chunks: EmbeddedChunk[] = documents.map((doc, i) => ({
      id: doc.id,
      text: doc.text,
      vector: vectors[i],
      metadata: doc.metadata,
    }))

    const existing = this.vectors.get(collectionId) || []
    this.vectors.set(collectionId, [...existing, ...chunks])
    this.saveVectorsToStorage()
  }

  search(collectionId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
    return this.searchWithScores(collectionId, query, topK)
  }

  async searchWithScores(collectionId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryVector = await this.embedSingle(query)
    const collection = this.vectors.get(collectionId) || []

    const scored = collection.map(chunk => ({
      id: chunk.id,
      text: chunk.text,
      score: this.cosineSimilarity(queryVector, chunk.vector),
      metadata: chunk.metadata,
    }))

    return scored.sort((a, b) => b.score - a.score).slice(0, topK)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dotProduct = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  // ── Reranking ────────────────────────────────────────────

  async rerank(query: string, documents: string[], topN: number = 5, provider?: RerankProvider): Promise<RerankResult[]> {
    const p = provider || this.getConfiguredRerankProviders()[0]
    if (!p) throw new Error('No rerank provider configured')
    const config = this.rerankConfigs.get(p)
    if (!config) throw new Error(`No config for ${p}`)

    switch (p) {
      case 'cohere': return this.rerankCohere(query, documents, topN, config)
      case 'jina': return this.rerankJina(query, documents, topN, config)
      case 'voyage': return this.rerankVoyage(query, documents, topN, config)
      default: throw new Error(`Unsupported rerank provider: ${p}`)
    }
  }

  private async rerankCohere(query: string, documents: string[], topN: number, config: RerankConfig): Promise<RerankResult[]> {
    const res = await fetch(`${config.baseUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, query, documents, top_n: topN }),
    })
    if (!res.ok) throw new Error(`Cohere rerank error: ${res.status}`)
    const data = await res.json()
    return data.results.map((r: any) => ({ index: r.index, score: r.relevance_score, text: documents[r.index] }))
  }

  private async rerankJina(query: string, documents: string[], topN: number, config: RerankConfig): Promise<RerankResult[]> {
    const res = await fetch(`${config.baseUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, query, documents, top_n: topN }),
    })
    if (!res.ok) throw new Error(`Jina rerank error: ${res.status}`)
    const data = await res.json()
    return data.results.map((r: any) => ({ index: r.index, score: r.relevance_score, text: documents[r.index] }))
  }

  private async rerankVoyage(query: string, documents: string[], topN: number, config: RerankConfig): Promise<RerankResult[]> {
    const res = await fetch(`${config.baseUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, query, documents, top_n: topN }),
    })
    if (!res.ok) throw new Error(`Voyage rerank error: ${res.status}`)
    const data = await res.json()
    return data.data.map((r: any) => ({ index: r.index, score: r.relevance_score, text: documents[r.index] }))
  }

  // ── Persistence ──────────────────────────────────────────

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        embedding: Object.fromEntries(this.configs),
        rerank: Object.fromEntries(this.rerankConfigs),
        purposes: Object.fromEntries(this.purposeAssignments),
      }))
      this.notify()
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.embedding) {
          for (const [k, v] of Object.entries(data.embedding)) {
            this.configs.set(k as EmbeddingProvider, v as EmbeddingConfig)
          }
        }
        if (data.rerank) {
          for (const [k, v] of Object.entries(data.rerank)) {
            this.rerankConfigs.set(k as RerankProvider, v as RerankConfig)
          }
        }
        if (data.purposes) {
          for (const [k, v] of Object.entries(data.purposes)) {
            this.purposeAssignments.set(k as EmbeddingPurpose, v as any)
          }
        }
      }
    } catch {}
  }

  private saveVectorsToStorage() {
    try {
      const data: Record<string, any[]> = {}
      this.vectors.forEach((chunks, key) => {
        data[key] = chunks.map(c => ({ ...c, vector: Array.from(c.vector) }))
      })
      localStorage.setItem('idexal-embedding-vectors', JSON.stringify(data))
    } catch {}
  }

  loadVectorsFromStorage() {
    try {
      const saved = localStorage.getItem('idexal-embedding-vectors')
      if (saved) {
        const data = JSON.parse(saved)
        for (const [k, v] of Object.entries(data)) {
          this.vectors.set(k, (v as any[]).map(c => ({ ...c, vector: c.vector })))
        }
      }
    } catch {}
  }
}

export const embeddingService = new EmbeddingService()
export default embeddingService
