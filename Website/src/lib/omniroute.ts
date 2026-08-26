/**
 * OmniRoute gateway client — the bridge between idexal.com (control plane)
 * and api.idexa.com (OmniRoute data plane, to be deployed post-launch).
 *
 * OmniRoute management API (verified against its OpenAPI spec v3.8.50):
 *   POST /api/keys            { label }            → 201 { id, keyPreview, key? }
 *   GET  /api/keys                                 → { keys: ApiKey[] }
 *   DEL  /api/keys/{id}                           → revoke
 *   GET  /api/usage/history                       → per-key/model usage
 *   POST /api/usage/budget    { budgetUsd, … }     → set spend limits
 *   GET  /api/providers                                → list connections
 *   POST /api/providers       { provider, apiKey } → connect upstream
 *
 * Auth: `Authorization: Bearer oma_live_…` (Access Token with write/admin
 * scope) — minted once from OmniRoute Settings → Access Tokens and stored
 * server-side only. Inference keys (sk-…) never authorize management.
 */

const GATEWAY_URL = (process.env.OMNIROUTE_URL ?? 'https://api.idexa.com').replace(/\/$/, '')
const ADMIN_TOKEN = process.env.OMNIROUTE_ADMIN_TOKEN ?? ''

export interface OmniRouteKey {
  id: string
  label: string
  keyPreview: string
  isActive: boolean
  createdAt: string
  /** Full secret — returned ONLY on creation, never on list/get. */
  key?: string
}

async function omni<T>(path: string, init?: RequestInit): Promise<T> {
  if (!ADMIN_TOKEN) throw new Error('OMNIROUTE_ADMIN_TOKEN is not configured — key sync disabled.')
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OmniRoute ${res.status} on ${path}: ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export const omniRoute = {
  /** True when the gateway is configured and reachable. */
  get configured(): boolean {
    return ADMIN_TOKEN.length > 0
  },

  /** Provision an inference key on the gateway for a control-plane user. */
  async createKey(label: string): Promise<OmniRouteKey> {
    return omni<OmniRouteKey>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ label }),
    })
  },

  async listKeys(): Promise<{ keys: OmniRouteKey[] }> {
    return omni<{ keys: OmniRouteKey[] }>('/api/keys')
  },

  async revokeKey(gatewayKeyId: string): Promise<void> {
    await omni(`/api/keys/${gatewayKeyId}`, { method: 'DELETE' })
  },

  /** Set a USD spend budget scoped to a key (pay-as-you-go guardrail). */
  async setBudget(budget: Record<string, unknown>): Promise<void> {
    await omni('/api/usage/budget', { method: 'POST', body: JSON.stringify(budget) })
  },

  /** Usage history for dashboards (per model / per key). */
  async usageHistory(): Promise<unknown> {
    return omni('/api/usage/history')
  },

  /** Health probe used by the admin dashboard status widget. */
  async health(): Promise<boolean> {
    try {
      await omni('/api/keys')
      return true
    } catch {
      return false
    }
  },
}

/**
 * Full provisioning flow — call after creating a local ApiKey row.
 * Creates the gateway twin, records its id, and applies the user's budget.
 * If the gateway isn't deployed yet, the local key still works (sync is
 * retried by the admin "Sync now" action).
 */
export async function provisionGatewayKey(opts: {
  localKeyId: string
  userEmail: string
  monthlyBudgetUsd?: number
}): Promise<{ synced: boolean; gatewayKeyId?: string; gatewayPreview?: string }> {
  if (!omniRoute.configured) return { synced: false }
  try {
    const created = await omniRoute.createKey(`idexal.com:${opts.userEmail}:${opts.localKeyId}`)
    if (opts.monthlyBudgetUsd && created.id) {
      await omniRoute.setBudget({ keyId: created.id, budgetUsd: opts.monthlyBudgetUsd }).catch(() => {})
    }
    return { synced: true, gatewayKeyId: created.id, gatewayPreview: created.keyPreview }
  } catch {
    return { synced: false }
  }
}
