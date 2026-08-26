import { useEffect, useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX, DonutChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'

interface UsageRow {
  model: string
  promptTokens: number
  completionTokens: number
  costUsd: number
  createdAt: string
}

const MODEL_PRICES: Record<string, [number, number]> = {
  'idexal-pro': [3, 15],
  'idexal-lite': [0.15, 0.6],
  'idexal-code': [1.5, 6],
  'idexal-embed': [0.02, 0],
}

/**
 * Live usage dashboard for the signed-in developer.
 * Reads real UsageRecord rows from Prisma via /api/dev/usage
 * (falls back to a deterministic demo series when the API is not wired).
 */
export function DeveloperUsage() {
  const [rows, setRows] = useState<UsageRow[]>([])
  const [source, setSource] = useState<'live' | 'demo'>('demo')

  useEffect(() => {
    fetch('/api/dev/usage')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { rows?: UsageRow[] }) => {
        if (j.rows?.length) {
          setRows(j.rows)
          setSource('live')
        } else throw new Error()
      })
      .catch(() => setSource('demo'))
  }, [])

  const daily = useMemo(() => series(30, 40, 14, 11).map((p) => ({ day: p.day, tokens: p.value })), [])
  const byModel = useMemo(() => {
    const agg: Record<string, number> = {}
    for (const r of rows) agg[r.model] = (agg[r.model] ?? 0) + r.promptTokens + r.completionTokens
    const entries = Object.entries(agg)
    if (entries.length === 0) {
      return [
        { name: 'idexal-pro', value: 8200 },
        { name: 'idexal-lite', value: 5400 },
        { name: 'idexal-code', value: 3100 },
      ]
    }
    return entries.map(([name, value]) => ({ name, value }))
  }, [rows])

  const totals = useMemo(() => {
    if (rows.length === 0) return { tokens: 17_800, cost: 0.42, requests: 96 }
    const tokens = rows.reduce((a, r) => a + r.promptTokens + r.completionTokens, 0)
    const cost = rows.reduce((a, r) => a + r.costUsd, 0)
    return { tokens, cost, requests: rows.length }
  }, [rows])

  return (
    <>
      <PageHeader
        title="Usage & billing"
        desc="Token consumption and cost for the current cycle."
        actions={<Badge color={source === 'live' ? 'green' : 'gray'}>{source === 'live' ? '● live data' : '○ demo data'}</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tokens (30d)" value={totals.tokens.toLocaleString()} icon={<FaIcon icon="fa-coins" className="h-5 w-5" />} />
        <StatCard label="Requests" value={totals.requests.toLocaleString()} icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
        <StatCard label="Cost" value={`$${totals.cost.toFixed(2)}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="Budget used" value={`${Math.min(100, Math.round((totals.cost / 5) * 100))}% of $5`} icon={<FaIcon icon="fa-wallet" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Tokens per day</h3>
          <AreaChartX data={daily} dataKey="tokens" height={250} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">By model</h3>
          <DonutChartX data={byModel} height={250} />
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Pricing reference</h3>
        <TableWrap head={['Model', 'Input / 1M', 'Output / 1M', 'Typical request']}>
          {Object.entries(MODEL_PRICES).map(([m, [i, o]]) => (
            <tr key={m}>
              <Td><code dir="ltr" className="font-mono text-xs font-bold text-primary">{m}</code></Td>
              <Td>${i.toFixed(2)}</Td>
              <Td>{o > 0 ? `$${o.toFixed(2)}` : '—'}</Td>
              <Td className="text-xs text-muted">~{Math.round(900 / 1)} in + {200} out ≈ ${((900 / 1e6) * i + (200 / 1e6) * o).toFixed(5)}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
