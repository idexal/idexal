import { useMemo, useState } from 'react'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { BarChartX } from '@/components/ui/charts'
import { TEAM_PERF } from '@/data/mock'
import { useUiStore } from '@/stores/uiStore'
import { FaIcon } from '@/components/shared/FaIcon'

/** Export rows of objects as a CSV file download (admin/manager tables). */
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.split('"').join('""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CsvButton({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  const toast = useUiStore((s) => s.toast)
  return (
    <button className="btn btn-secondary" onClick={() => { exportCsv(filename, rows); toast(`Exported ${rows.length} rows to ${filename}`, 'success') }}>
      <FaIcon icon="fa-download" className="h-4 w-4" /> Export CSV
    </button>
  )
}

export function ManagerTeamPage() {
  const t = useT()
  const [q, setQ] = useState('')
  const list = useMemo(() => TEAM_PERF.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())), [q])
  return (
    <>
      <PageHeader title={t('dash.team')} desc={`${TEAM_PERF.length} members · ${TEAM_PERF.filter((m) => m.online).length} online now`} actions={<CsvButton filename="team-performance.csv" rows={TEAM_PERF as unknown as Record<string, unknown>[]} />} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Avg resolution time" value="2.2h" delta="-6%" />
        <StatCard label="Total tickets (wk)" value={String(TEAM_PERF.reduce((a, m) => a + m.tickets, 0))} icon={undefined} />
        <StatCard label="Team rating" value={(TEAM_PERF.reduce((a, m) => a + m.rating, 0) / TEAM_PERF.length).toFixed(1)} />
      </div>
      <div className="relative mb-4 max-w-xs">
        <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member…" className="input ps-9" />
      </div>
      <Card className="p-4">
        <TableWrap head={['Member', 'Tickets', 'Avg time', 'Rating', 'Load', 'Status']}>
          {list.map((m) => {
            const maxT = Math.max(...TEAM_PERF.map((x) => x.tickets))
            return (
              <tr key={m.name}>
                <Td className="font-semibold">{m.name}</Td>
                <Td>{m.tickets}</Td>
                <Td>{m.avgTimeH}h</Td>
                <Td>⭐ {m.rating}</Td>
                <Td><div className="w-28"><Progress value={m.tickets} max={maxT} color={m.avgTimeH > 3 ? '#f59e0b' : '#10b981'} /></div></Td>
                <Td>{m.online ? <Badge color="green">🟢 online</Badge> : <Badge color="gray">offline</Badge>}</Td>
              </tr>
            )
          })}
        </TableWrap>
      </Card>
    </>
  )
}

const PENDING_REVIEWS = [
  { id: 'RV-31', type: 'Plugin', title: 'GitPro Tools — marketplace listing', submittedBy: 'dev@plugins.dev', days: 1 },
  { id: 'RV-30', type: 'Blog', title: 'Roadmap H2 2026 — draft post', submittedBy: 'yousef@idexal.dev', days: 2 },
  { id: 'RV-29', type: 'Refund', title: 'INV-1038 — $15.00 (Sara Johnson)', submittedBy: 'sara@example.com', days: 3 },
  { id: 'RV-28', type: 'Plugin', title: 'VimX Bindings v1.1 update', submittedBy: 'dev@vimx.io', days: 4 },
]

export function ManagerReviewsPage() {
  const t = useT()
  const [decided, setDecided] = useState<Record<string, 'approved' | 'rejected'>>({})
  const pending = PENDING_REVIEWS.filter((r) => !decided[r.id])
  const byType = ['Plugin', 'Blog', 'Refund'].map((ty) => ({ name: ty, value: PENDING_REVIEWS.filter((r) => r.type === ty).length }))
  return (
    <>
      <PageHeader title={t('dash.reviews')} desc={`${pending.length} items awaiting your decision`} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold"><Badge color="amber">{r.type}</Badge> {r.title}</div>
                <div dir="ltr" className="mt-1 text-xs text-muted">{r.id} · by {r.submittedBy} · {r.days}d ago</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDecided({ ...decided, [r.id]: 'approved' })} className="btn btn-primary px-3.5 py-1.5 text-xs">Approve</button>
                <button onClick={() => setDecided({ ...decided, [r.id]: 'rejected' })} className="btn btn-secondary px-3.5 py-1.5 text-xs">Reject</button>
              </div>
            </Card>
          ))}
          {pending.length === 0 && <Card className="p-10 text-center text-sm font-medium text-accent">✓ Queue clear — everything reviewed.</Card>}
          {Object.entries(decided).map(([id, d]) => (
            <div key={id} className={`rounded-xl px-4 py-2.5 text-sm ${d === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {id}: {d}
            </div>
          ))}
        </div>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Queue by type</h3>
          <BarChartX data={byType} dataKey="value" height={220} />
        </Card>
      </div>
    </>
  )
}
