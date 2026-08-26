import { aiProviderService, AIProviderConfig, AIModel, ModelPurpose } from './aiProviders'

export interface FallbackEntry {
  providerId: string
  modelId: string
  isEmergency?: boolean  // Emergency fallback (always available)
  maxRetries?: number    // Custom retry count for this entry
}

export interface ProviderHealth {
  providerId: string
  successCount: number
  failureCount: number
  lastError?: string
  lastErrorTime?: number
  lastSuccessTime?: number
  consecutiveFailures: number
  cooldownUntil?: number
}

export interface FallbackEvent {
  type: 'attempt' | 'fallback' | 'success' | 'exhausted'
  providerId: string
  modelId: string
  purpose: ModelPurpose
  error?: string
  attemptNumber: number
}

const COOLDOWN_BASE_MS = 30_000
const COOLDOWN_MAX_MS = 300_000
const MAX_CONSECUTIVE_FAILURES = 3

export interface FallbackConfig {
  /** Maximum retries per provider before moving to next */
  maxRetriesPerProvider: number
  /** Base cooldown in ms */
  cooldownBaseMs: number
  /** Maximum cooldown in ms */
  cooldownMaxMs: number
  /** Maximum consecutive failures before marking unhealthy */
  maxConsecutiveFailures: number
  /** Enable context preservation across fallbacks */
  preserveContext: boolean
  /** Enable automatic retry */
  autoRetry: boolean
}

const DEFAULT_CONFIG: FallbackConfig = {
  maxRetriesPerProvider: 2,
  cooldownBaseMs: 30_000,
  cooldownMaxMs: 300_000,
  maxConsecutiveFailures: 3,
  preserveContext: true,
  autoRetry: true,
}

class FallbackService {
  private chains: Map<ModelPurpose, FallbackEntry[]> = new Map()
  private health: Map<string, ProviderHealth> = new Map()
  private listeners: Set<(event: FallbackEvent) => void> = new Set()
  private config: FallbackConfig = { ...DEFAULT_CONFIG }
  private storageKey = 'idexal-fallback-state'
  private emergencyProvider: { providerId: string; modelId: string } | null = null

  constructor() {
    this.loadFromStorage()
  }

  // ── Configuration ────────────────────────────────────────

  getConfig(): FallbackConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<FallbackConfig>) {
    this.config = { ...this.config, ...updates }
    this.saveToStorage()
  }

  setEmergencyFallback(providerId: string, modelId: string) {
    this.emergencyProvider = { providerId, modelId }
    this.saveToStorage()
  }

  getEmergencyFallback(): { providerId: string; modelId: string } | null {
    return this.emergencyProvider
  }

  clearEmergencyFallback() {
    this.emergencyProvider = null
    this.saveToStorage()
  }

  // ── Chain Configuration ────────────────────────────────────

  getChain(purpose: ModelPurpose): FallbackEntry[] {
    if (this.chains.has(purpose)) return this.chains.get(purpose)!
    return this.buildDefaultChain(purpose)
  }

  setChain(purpose: ModelPurpose, entries: FallbackEntry[]) {
    this.chains.set(purpose, entries)
    this.saveToStorage()
  }

  addToChain(purpose: ModelPurpose, entry: FallbackEntry) {
    const chain = this.getChain(purpose)
    if (!chain.some(e => e.providerId === entry.providerId && e.modelId === entry.modelId)) {
      chain.push(entry)
      this.chains.set(purpose, chain)
      this.saveToStorage()
    }
  }

  removeFromChain(purpose: ModelPurpose, providerId: string, modelId: string) {
    const chain = this.getChain(purpose).filter(
      e => !(e.providerId === providerId && e.modelId === modelId)
    )
    this.chains.set(purpose, chain)
    this.saveToStorage()
  }

  private buildDefaultChain(purpose: ModelPurpose): FallbackEntry[] {
    const assigned = aiProviderService.getModelForPurpose(purpose)
    const chain: FallbackEntry[] = []

    if (assigned) {
      chain.push({ providerId: assigned.provider.id, modelId: assigned.model.id })
    }

    const enabled = aiProviderService.getEnabledProviders()
    for (const provider of enabled) {
      if (provider.apiKey && provider.models.length > 0) {
        const bestModel = provider.models.find(m =>
          purpose === 'chat' ? m.supportsFunctionCalling :
          purpose === 'code' ? m.id.includes('code') || m.supportsFunctionCalling :
          purpose === 'vision' ? m.supportsVision :
          true
        ) || provider.models[0]

        if (!chain.some(e => e.providerId === provider.id && e.modelId === bestModel.id)) {
          chain.push({ providerId: provider.id, modelId: bestModel.id })
        }
      }
    }

    return chain
  }

  // ── Health Tracking ────────────────────────────────────────

  getHealth(providerId: string): ProviderHealth {
    if (!this.health.has(providerId)) {
      this.health.set(providerId, {
        providerId,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
      })
    }
    return this.health.get(providerId)!
  }

  recordSuccess(providerId: string) {
    const h = this.getHealth(providerId)
    h.successCount++
    h.consecutiveFailures = 0
    h.lastSuccessTime = Date.now()
    h.cooldownUntil = undefined
    this.saveToStorage()
  }

  recordFailure(providerId: string, error: string) {
    const h = this.getHealth(providerId)
    h.failureCount++
    h.consecutiveFailures++
    h.lastError = error
    h.lastErrorTime = Date.now()
    const backoff = Math.min(
      COOLDOWN_BASE_MS * Math.pow(2, h.consecutiveFailures - 1),
      COOLDOWN_MAX_MS
    )
    h.cooldownUntil = Date.now() + backoff
    this.saveToStorage()
  }

  isHealthy(providerId: string): boolean {
    const h = this.getHealth(providerId)
    if (h.cooldownUntil && Date.now() < h.cooldownUntil) return false
    if (h.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && h.cooldownUntil) return false
    return true
  }

  getAllHealth(): ProviderHealth[] {
    return Array.from(this.health.values())
  }

  resetHealth(providerId?: string) {
    if (providerId) {
      this.health.delete(providerId)
    } else {
      this.health.clear()
    }
    this.saveToStorage()
  }

  // ── Execute with Fallback ──────────────────────────────────

  async executeWithFallback<T>(
    purpose: ModelPurpose,
    fn: (providerId: string, modelId: string) => Promise<T>,
    context?: Record<string, any>
  ): Promise<{ result: T; providerId: string; modelId: string; attempts: number }> {
    const chain = this.getChain(purpose)
    let lastError = ''
    let attempts = 0

    // Try each provider in the chain
    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i]
      const maxRetries = entry.maxRetries || this.config.maxRetriesPerProvider

      // Skip unhealthy providers (unless they're emergency)
      if (!this.isHealthy(entry.providerId) && !entry.isEmergency) {
        this.emitEvent({ type: 'fallback', ...entry, purpose, error: 'cooldown', attemptNumber: attempts + 1 })
        continue
      }

      // Try this provider with retries
      for (let retry = 0; retry < maxRetries; retry++) {
        attempts++
        this.emitEvent({ type: 'attempt', ...entry, purpose, attemptNumber: attempts })

        try {
          // Preserve context across fallbacks if enabled
          const result = await fn(entry.providerId, entry.modelId)
          this.recordSuccess(entry.providerId)
          this.emitEvent({ type: 'success', ...entry, purpose, attemptNumber: attempts })
          return { result, providerId: entry.providerId, modelId: entry.modelId, attempts }
        } catch (error: any) {
          lastError = error?.message || String(error)
          this.recordFailure(entry.providerId, lastError)
          this.emitEvent({ type: 'fallback', ...entry, purpose, error: lastError, attemptNumber: attempts })

          // Don't retry if it's a permanent error
          if (this.isPermanentError(lastError)) break
        }
      }
    }

    // Try emergency fallback if configured
    if (this.emergencyProvider) {
      try {
        attempts++
        this.emitEvent({ type: 'attempt', ...this.emergencyProvider, purpose, attemptNumber: attempts })
        const result = await fn(this.emergencyProvider.providerId, this.emergencyProvider.modelId)
        this.recordSuccess(this.emergencyProvider.providerId)
        this.emitEvent({ type: 'success', ...this.emergencyProvider, purpose, attemptNumber: attempts })
        return { result, providerId: this.emergencyProvider.providerId, modelId: this.emergencyProvider.modelId, attempts }
      } catch (error: any) {
        lastError = error?.message || String(error)
        this.recordFailure(this.emergencyProvider.providerId, lastError)
      }
    }

    this.emitEvent({ type: 'exhausted', providerId: '', modelId: '', purpose, error: lastError || 'No providers available', attemptNumber: attempts })
    throw new Error(`All providers exhausted for "${purpose}". Last error: ${lastError || 'No providers available'}`)
  }

  private isPermanentError(error: string): boolean {
    const permanentErrors = [
      'invalid_api_key',
      'authentication',
      'unauthorized',
      'permission',
      'quota',
      'billing',
    ]
    const lowerError = error.toLowerCase()
    return permanentErrors.some(e => lowerError.includes(e))
  }

  // ── Events ─────────────────────────────────────────────────

  onEvent(listener: (event: FallbackEvent) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  emitEvent(event: FallbackEvent) {
    this.listeners.forEach(l => l(event))
  }

  // ── Persistence ────────────────────────────────────────────

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        chains: Object.fromEntries(this.chains),
        health: Object.fromEntries(this.health),
        config: this.config,
        emergencyProvider: this.emergencyProvider,
      }))
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.chains) {
          for (const [purpose, chain] of Object.entries(data.chains)) {
            this.chains.set(purpose as ModelPurpose, chain as FallbackEntry[])
          }
        }
        if (data.health) {
          for (const [id, h] of Object.entries(data.health)) {
            this.health.set(id, h as ProviderHealth)
          }
        }
        if (data.config) {
          this.config = { ...DEFAULT_CONFIG, ...data.config }
        }
        if (data.emergencyProvider) {
          this.emergencyProvider = data.emergencyProvider
        }
      }
    } catch {}
  }
}

export const fallbackService = new FallbackService()
export default fallbackService
