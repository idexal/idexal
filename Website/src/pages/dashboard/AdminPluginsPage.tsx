import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

type PStatus = 'live' | 'review' | 'rejected' | 'draft'

interface PluginRow {
  id: string
  name: string
  author: string
  installs: number
  rating: number
  revenue: number
  status: PStatus
  version: string
}

const INITIAL: PluginRow[] = [
  { id: 'p1', name: 'ThemeX', author: 'kenji@example.com', installs: 1230, rating: 4.8, revenue: 450, status: 'live', version: '1.2.0' },
  { id: 'p2', name: 'GitPro Tools', author: 'kenji@example.com', installs: 890, rating: 4.6, revenue: 320, status: 'review', version: '1.0.0' },
  { id: 'p3', name: 'VimX Bindings', author: 'hans@example.com', installs: 2140, rating: 4.9, revenue: 0, status: 'live', version: '2.1.3' },
  { id: 'p4', name: 'Docker Dash', author: 'marie@example.com', installs: 410, rating: 4.3, revenue: 120, status: 'live', version: '0.9.1' },
  { id: 'p5', name: 'SQL Sniper', author: 'liwei@example.com', installs: 0, rating: 0, revenue: 0, status: 'review', version: '1.0.0' },
  { id: 'p6', name: 'Regex Hero', author: 'sara@example.com', installs: 620, rating: 4.1, revenue: 45, status: 'rejected', version: '1.1.0' },
]

const statusBadge = (s: PStatus) =>
  s === 'live' ? <Badge color="green">live</Badge> : s === 'review' ? <Badge color="amber">in review</Badge> : s === 'rejected' ? <Badge color="red">rejected</Badge> : <Badge color="gray">draft</Badge>

export function AdminPluginsPage() {
  const toast = useUiStore((s) => s.toast)
  const [rows, setRows] = useState(INITIAL)
  const [filter, setFilter] = useState<'all' | PStatus>('all')
  const [q, setQ] = useState('')

  const list = useMemo(
    () => rows.filter((r) => (filter === 'all' || r.status === filter) && r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, filter, q],
  )

  const moderate = (id: string, status: PStatus, name: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)))
    toast(`"${name}" → ${status}`, status === 'rejected' ? 'info' : 'success')
  }

  return (
    <>
      <PageHeader title="Plugin marketplace" desc="Review submissions, moderate listings and track ecosystem revenue." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live plugins" value={String(rows.filter((r) => r.status === 'live').length)} icon={<FaIcon icon="fa-plug" className="h-5 w-5" />} />
        <StatCard label="Awaiting review" value={String(rows.filter((r) => r.status === 'review').length)} icon={<FaIcon icon="fa-hourglass-half" className="h-5 w-5" />} />
        <StatCard label="Total installs" value={rows.reduce((a, r) => a + r.installs, 0).toLocaleString()} icon={<FaIcon icon="fa-download" className="h-5 w-5" />} />
        <StatCard label="Ecosystem revenue" value={`$${rows.reduce((a, r) => a + r.revenue, 0)}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins…" className="input ps-9" />
        </div>
        {(['all', 'live', 'review', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`btn px-3 py-1.5 text-xs capitalize ${filter === s ? 'btn-primary' : 'btn-secondary'}`}>{s}</button>
        ))}
      </div>

      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Plugin', 'Author', 'Version', 'Installs', 'Rating', 'Revenue', 'Status', 'Actions']}>
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-[var(--surface-2)]">
              <Td className="font-semibold">{p.name}</Td>
              <Td dir="ltr" className="text-xs text-muted">{p.author}</Td>
              <Td dir="ltr" className="font-mono text-xs">{p.version}</Td>
              <Td dir="ltr" className="font-mono text-xs">{p.installs.toLocaleString()}</Td>
              <Td>⭐ {p.rating || '—'}</Td>
              <Td dir="ltr" className="font-mono text-xs">${p.revenue}</Td>
              <Td>{statusBadge(p.status)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {p.status !== 'live' && (
                    <button className="font-semibold text-accent hover:underline" onClick={() => moderate(p.id, 'live', p.name)}>Approve</button>
                  )}
                  {p.status !== 'rejected' && p.status !== 'live' && (
                    <button className="font-semibold text-red-500 hover:underline" onClick={() => moderate(p.id, 'rejected', p.name)}>Reject</button>
                  )}
                  {p.status === 'live' && (
                    <button className="font-semibold text-amber-500 hover:underline" onClick={() => moderate(p.id, 'review', p.name)}>Unlist</button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
