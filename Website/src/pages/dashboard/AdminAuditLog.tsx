import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { CsvButton } from '@/pages/dashboard/ManagerExtra'

type Sev = 'info' | 'warning' | 'critical'

interface AuditEntry {
  id: string
  time: string
  actor: string
  action: string
  target: string
  ip: string
  sev: Sev
}

const DEMO: AuditEntry[] = [
  { id: 'a1', time: '2026-08-25 10:42', actor: 'admin@idexal.com', action: 'user.ban', target: 'user:omar@example.com', ip: '41.62.10.11', sev: 'warning' },
  { id: 'a2', time: '2026-08-25 10:31', actor: 'admin@idexal.com', action: 'gateway.sync_keys', target: '2 keys', ip: '41.62.10.11', sev: 'info' },
  { id: 'a3', time: '2026-08-25 09:58', actor: 'system', action: 'provider.failover', target: 'mistral → openai', ip: '—', sev: 'warning' },
  { id: 'a4', time: '2026-08-25 09:44', actor: 'marie@idexal.com', action: 'content.publish', target: 'blog:roadmap-h2-2026', ip: '88.12.44.9', sev: 'info' },
  { id: 'a5', time: '2026-08-25 09:12', actor: 'system', action: 'auth.bruteforce_block', target: 'ip:45.33.x.x', ip: '45.33.x.x', sev: 'critical' },
  { id: 'a6', time: '2026-08-25 08:47', actor: 'admin@idexal.com', action: 'plan.change', target: 'user:ahmed@example.com → PRO', ip: '41.62.10.11', sev: 'info' },
  { id: 'a7', time: '2026-08-25 08:15', actor: 'system', action: 'invoice.payment_failed', target: 'INV-1040', ip: '—', sev: 'warning' },
  { id: 'a8', time: '2026-08-25 07:30', actor: 'kenji@example.com', action: 'apikey.create', target: 'key:staging', ip: '126.4.19.7', sev: 'info' },
  { id: 'a9', time: '2026-08-25 06:52', actor: 'admin@idexal.com', action: 'provider.rotate_key', target: 'openai', ip: '41.62.10.11', sev: 'critical' },
  { id: 'a10', time: '2026-08-24 23:59', actor: 'system', action: 'backup.complete', target: 'db-primary', ip: '—', sev: 'info' },
]

const sevBadge = (s: Sev) =>
  s === 'critical' ? <Badge color="red">critical</Badge> : s === 'warning' ? <Badge color="amber">warning</Badge> : <Badge color="gray">info</Badge>

export function AdminAuditLog() {
  const [q, setQ] = useState('')
  const [sev, setSev] = useState<'all' | Sev>('all')

  const rows = useMemo(
    () =>
      DEMO.filter(
        (e) =>
          (sev === 'all' || e.sev === sev) &&
          (q === '' || `${e.actor} ${e.action} ${e.target}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, sev],
  )

  return (
    <>
      <PageHeader
        title="Audit log"
        desc="Every administrative action, immutable and searchable."
        actions={<CsvButton filename="audit-log.csv" rows={rows as unknown as Record<string, unknown>[]} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entries (30d)" value="12,453" icon={<FaIcon icon="fa-clipboard-list" className="h-5 w-5" />} />
        <StatCard label="Critical events" value="2" icon={<FaIcon icon="fa-triangle-exclamation" className="h-5 w-5" />} />
        <StatCard label="Admin actions today" value="14" icon={<FaIcon icon="fa-user-shield" className="h-5 w-5" />} />
        <StatCard label="Retention" value="365 days" icon={<FaIcon icon="fa-database" className="h-5 w-5" />} />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, target…" className="input ps-9" />
        </div>
        {(['all', 'info', 'warning', 'critical'] as const).map((s) => (
          <button key={s} onClick={() => setSev(s)} className={`btn px-3 py-1.5 text-xs ${sev === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <TableWrap head={['Time', 'Severity', 'Actor', 'Action', 'Target', 'IP']}>
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-[var(--surface-2)]">
              <Td className="whitespace-nowrap font-mono text-xs text-muted">{e.time}</Td>
              <Td>{sevBadge(e.sev)}</Td>
              <Td dir="ltr" className="font-medium">{e.actor}</Td>
              <Td><code dir="ltr" className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">{e.action}</code></Td>
              <Td dir="ltr" className="text-xs text-muted">{e.target}</Td>
              <Td dir="ltr" className="font-mono text-xs text-muted">{e.ip}</Td>
            </tr>
          ))}
        </TableWrap>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted">No entries match your filters.</p>}
      </Card>
    </>
  )
}
