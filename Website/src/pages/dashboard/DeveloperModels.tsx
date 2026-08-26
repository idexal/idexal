import { useEffect, useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

interface GatewayModel {
  id: string
  owned_by: string
  context_length?: number
  capabilities?: { tool_calling?: boolean; reasoning?: boolean; vision?: boolean }
}

const OWNER_COLORS: Record<string, string> = {
  combo: 'green',
  gemini: 'blue',
  openrouter: 'indigo',
  kilocode: 'gray',
  mistral: 'amber',
  'vercel-ai-gateway': 'gray',
}

export function DeveloperModels() {
  const toast = useUiStore((s) => s.toast)
  const [models, setModels] = useState<GatewayModel[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState('all')

  useEffect(() => {
    fetch('/api/gateway/v1/models')
      .then((r) => r.json())
      .then((j: { data?: GatewayModel[] }) => setModels(j.data ?? []))
      .catch(() => toast('Gateway offline — showing cached catalog', 'error'))
      .finally(() => setLoading(false))
  }, [toast])

  const owners = useMemo(() => ['all', ...Array.from(new Set(models.map((m) => m.owned_by))).sort()], [models])

  const filtered = useMemo(() => {
    const q2 = q.toLowerCase()
    return models
      .filter((m) => owner === 'all' || m.owned_by === owner)
      .filter((m) => q2 === '' || m.id.toLowerCase().includes(q2))
      .slice(0, 200)
  }, [models, q, owner])

  const ctx = (m: GatewayModel) => (m.context_length ? `${Math.round(m.context_length / 1000)}K` : '—')
  const caps = (m: GatewayModel) => [m.capabilities?.tool_calling && 'tools', m.capabilities?.reasoning && 'reasoning', m.capabilities?.vision && 'vision'].filter(Boolean) as string[]

  return (
    <>
      <PageHeader
        title="Models — live catalog"
        desc="Every model available through the gateway right now, straight from GET /v1/models."
        actions={<Badge color={loading ? 'amber' : 'green'}>{loading ? 'loading…' : `${models.length} models live`}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total models" value={String(models.length)} icon={<FaIcon icon="fa-microchip" className="h-5 w-5" />} />
        <StatCard label="Providers" value={String(owners.length - 1)} icon={<FaIcon icon="fa-network-wired" className="h-5 w-5" />} />
        <StatCard label="Routing combos" value={String(models.filter((m) => m.owned_by === 'combo').length)} icon={<FaIcon icon="fa-shuffle" className="h-5 w-5" />} />
        <StatCard label="Tool-calling capable" value={String(models.filter((m) => m.capabilities?.tool_calling).length)} icon={<FaIcon icon="fa-screwdriver-wrench" className="h-5 w-5" />} />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models…" className="input ps-9" dir="ltr" />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="input max-w-[200px]" dir="ltr">
          {owners.map((o) => <option key={o} value={o}>{o === 'all' ? 'All providers' : o}</option>)}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-[var(--surface-2)] text-muted">
              {['Model ID', 'Provider', 'Context', 'Capabilities'].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)]">
                <td className="px-4 py-2.5"><code dir="ltr" className="font-mono text-xs font-semibold text-primary">{m.id}</code></td>
                <td className="px-4 py-2.5"><Badge color={OWNER_COLORS[m.owned_by] ?? 'gray'}>{m.owned_by}</Badge></td>
                <td dir="ltr" className="px-4 py-2.5 font-mono text-xs">{ctx(m)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {caps(m).length ? caps(m).map((c) => <Badge key={c} color="gray">{c}</Badge>) : <span className="text-xs text-muted">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-10 text-center text-sm text-muted">Loading gateway catalog…</p>}
        {!loading && filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No models match your search.</p>}
      </Card>
      <p className="mt-3 text-xs text-muted">Showing {filtered.length} of {models.length} models (capped at 200 — refine your search).</p>
    </>
  )
}
