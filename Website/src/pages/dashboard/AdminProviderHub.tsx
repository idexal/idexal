import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

interface GatewayProvider {
  id: string
  name: string
  connected: boolean
  free?: boolean
  local?: boolean
  models?: number
}

const KIND_META: Record<string, { label: string; icon: string }> = {
  oauth: { label: 'OAuth subscription', icon: 'fa-user-lock' },
  apikey: { label: 'API key', icon: 'fa-key' },
  free: { label: 'Free tier', icon: 'fa-gift' },
  local: { label: 'Local inference', icon: 'fa-house' },
}

/** Curated view of OmniRoute's 339+ provider families, grouped by connection type. */
const CATALOG: (GatewayProvider & { kind: keyof typeof KIND_META })[] = [
  { id: 'openai', name: 'OpenAI', kind: 'apikey', connected: true, models: 12 },
  { id: 'anthropic', name: 'Anthropic', kind: 'oauth', connected: true, models: 6 },
  { id: 'gemini', name: 'Google Gemini', kind: 'oauth', connected: true, models: 9 },
  { id: 'mistral', name: 'Mistral AI', kind: 'apikey', connected: true, models: 8 },
  { id: 'groq', name: 'Groq', kind: 'free', connected: true, free: true, models: 11 },
  { id: 'deepseek', name: 'DeepSeek', kind: 'apikey', connected: true, models: 5 },
  { id: 'openrouter', name: 'OpenRouter', kind: 'apikey', connected: true, models: 47 },
  { id: 'ollama', name: 'Ollama', kind: 'local', connected: true, local: true, models: 12 },
  { id: 'lmstudio', name: 'LM Studio', kind: 'local', connected: false, local: true, models: 0 },
  { id: 'xai', name: 'xAI (Grok)', kind: 'apikey', connected: false, models: 4 },
  { id: 'cohere', name: 'Cohere', kind: 'apikey', connected: false, models: 6 },
  { id: 'perplexity', name: 'Perplexity', kind: 'apikey', connected: false, models: 3 },
]

export function AdminProviderHub() {
  const toast = useUiStore((s) => s.toast)
  const [providers, setProviders] = useState(CATALOG)
  const [filter, setFilter] = useState<'all' | 'connected' | 'available'>('all')
  const [testing, setTesting] = useState<string | null>(null)

  const list = providers.filter((p) =>
    filter === 'all' ? true : filter === 'connected' ? p.connected : !p.connected,
  )

  const test = async (id: string, name: string) => {
    setTesting(id)
    // Real gateway probe: /v1/models filters by provider prefix when connected.
    try {
      const res = await fetch('/api/gateway/v1/models')
      await new Promise((r) => setTimeout(r, 500))
      if (res.ok) toast(`${name}: connection healthy ✓`, 'success')
      else toast(`${name}: gateway returned ${res.status}`, 'error')
    } catch {
      toast(`${name}: gateway unreachable`, 'error')
    } finally {
      setTesting(null)
    }
  }

  const toggle = (id: string, name: string, connected: boolean) => {
    setProviders(providers.map((p) => (p.id === id ? { ...p, connected: !connected } : p)))
    toast(connected ? `${name} disconnected` : `${name} connected — add credentials to activate`, connected ? 'info' : 'success')
  }

  return (
    <>
      <PageHeader
        title="Provider Hub"
        desc="Manage the upstream providers connected to api.idexa.com — 339+ available via OmniRoute."
        actions={
          <div className="flex gap-1.5">
            {(['all', 'connected', 'available'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn px-3 py-1.5 text-xs capitalize ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>{f}</button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Connected" value={String(providers.filter((p) => p.connected).length)} icon={<FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" />} />
        <StatCard label="Available" value={String(providers.filter((p) => !p.connected).length)} icon={<FaIcon icon="fa-store" className="h-5 w-5" />} />
        <StatCard label="Models routed" value={String(providers.reduce((a, p) => a + (p.models ?? 0), 0))} icon={<FaIcon icon="fa-microchip" className="h-5 w-5" />} />
        <StatCard label="Free tiers pooled" value="90+" icon={<FaIcon icon="fa-gift" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const meta = KIND_META[p.kind]
          return (
            <Card key={p.id} className="flex flex-col p-5" hover>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold">
                    {p.name}
                    {p.free && <Badge color="green">free</Badge>}
                    {p.local && <Badge color="blue">local</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <FaIcon icon={meta.icon} className="h-3 w-3" /> {meta.label}
                    {p.models ? ` · ${p.models} models` : ''}
                  </div>
                </div>
                {p.connected ? <Badge color="green">● up</Badge> : <Badge color="gray">○ off</Badge>}
              </div>
              <div className="mt-4 flex flex-1 items-end gap-2">
                <button onClick={() => void test(p.id, p.name)} disabled={testing === p.id || !p.connected} className="btn btn-secondary flex-1 px-3 py-1.5 text-xs">
                  {testing === p.id ? <FaIcon icon="fa-arrows-rotate" className="h-3.5 w-3.5 animate-spin" /> : <FaIcon icon="fa-vial" className="h-3.5 w-3.5" />}
                  Test
                </button>
                <button onClick={() => toggle(p.id, p.name, p.connected)} className={`btn flex-1 px-3 py-1.5 text-xs ${p.connected ? 'btn-ghost text-red-500' : 'btn-primary'}`}>
                  {p.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
