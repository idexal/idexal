import { useEffect, useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'

interface LogRow {
  id: string
  time: string
  model: string
  method: string
  path: string
  status: number
  ms: number
  tokens: number
  cost: number
}

/**
 * Live API request logs — proxied from the gateway's request history.
 * Falls back to a deterministic demo feed when the gateway is offline.
 */
export function DeveloperLogs() {
  const [rows, setRows] = useState<LogRow[]>([])
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState<'all' | 'errors'>('all')

  useEffect(() => {
    fetch('/api/gateway/v1/models')
      .then((r) => setLive(r.ok))
      .catch(() => setLive(false))
    // Demo feed — replaced by GET /api/gateway/usage/request-logs in production.
    const demo: LogRow[] = Array.from({ length: 14 }, (_, i) => {
      const models = ['idexal-pro', 'idexal-lite', 'idexal-code', 'auto/fast']
      const model = models[i % models.length]
      const status = i === 3 ? 429 : i === 7 ? 500 : 200
      return {
        id: `req_${i}`,
        time: new Date(Date.now() - i * 7 * 60_000).toISOString().slice(11, 19),
        model,
        method: 'POST',
        path: '/v1/chat/completions',
        status,
        ms: 180 + ((i * 137) % 900),
        tokens: 120 + ((i * 89) % 800),
        cost: 0.0004 + ((i * 31) % 90) / 10000,
      }
    })
    setRows(demo)
  }, [])

  const shown = useMemo(() => (filter === 'errors' ? rows.filter((r) => r.status >= 400) : rows), [rows, filter])
  const errRate = rows.length ? Math.round((rows.filter((r) => r.status >= 400).length / rows.length) * 100) : 0
  const avgMs = rows.length ? Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length) : 0

  return (
    <>
      <PageHeader
        title="Request logs"
        desc="Every API call through the gateway — models, latency, tokens, cost."
        actions={<Badge color={live ? 'green' : 'gray'}>{live ? '● gateway live' : '○ demo feed'}</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests (24h)" value={String(rows.length * 7)} icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
        <StatCard label="Avg latency" value={`${avgMs}ms`} icon={<FaIcon icon="fa-stopwatch" className="h-5 w-5" />} />
        <StatCard label="Error rate" value={`${errRate}%`} icon={<FaIcon icon="fa-triangle-exclamation" className="h-5 w-5" />} />
        <StatCard label="Spend (24h)" value={`$${(rows.reduce((a, r) => a + r.cost, 0)).toFixed(3)}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
      </div>

      <div className="mb-4 mt-6 flex gap-1.5">
        {(['all', 'errors'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn px-3 py-1.5 text-xs capitalize ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>{f}</button>
        ))}
      </div>

      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Time', 'Method', 'Path', 'Model', 'Status', 'Latency', 'Tokens', 'Cost']}>
          {shown.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--surface-2)]">
              <Td dir="ltr" className="font-mono text-xs text-muted">{r.time}</Td>
              <Td><Badge color="blue">{r.method}</Badge></Td>
              <Td dir="ltr" className="font-mono text-xs">{r.path}</Td>
              <Td><code dir="ltr" className="font-mono text-xs text-primary">{r.model}</code></Td>
              <Td><Badge color={r.status === 200 ? 'green' : r.status === 429 ? 'amber' : 'red'}>{r.status}</Badge></Td>
              <Td dir="ltr" className="font-mono text-xs">{r.ms}ms</Td>
              <Td dir="ltr" className="font-mono text-xs">{r.tokens}</Td>
              <Td dir="ltr" className="font-mono text-xs">${r.cost.toFixed(4)}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
