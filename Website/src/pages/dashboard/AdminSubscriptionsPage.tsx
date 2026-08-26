import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { DonutChartX } from '@/components/ui/charts'
import { exportCsv } from '@/pages/dashboard/ManagerExtra'

type Tier = 'Free' | 'Pro' | 'Team' | 'Enterprise'

interface Sub {
  id: string
  user: string
  email: string
  tier: Tier
  seats: number
  status: 'active' | 'past_due' | 'canceled'
  renews: string
  mrr: number
}

const SUBS: Sub[] = [
  { id: 's1', user: 'Ahmed Hassan', email: 'ahmed@example.com', tier: 'Pro', seats: 1, status: 'active', renews: 'Sep 25', mrr: 29 },
  { id: 's2', user: 'Kenji Tanaka', email: 'kenji@example.com', tier: 'Team', seats: 10, status: 'active', renews: 'Sep 24', mrr: 99 },
  { id: 's3', user: 'Omar Khaled', email: 'omar@example.com', tier: 'Enterprise', seats: 50, status: 'past_due', renews: 'Sep 20', mrr: 499 },
  { id: 's4', user: 'Marie Dubois', email: 'marie@example.com', tier: 'Pro', seats: 1, status: 'active', renews: 'Sep 22', mrr: 29 },
  { id: 's5', user: 'Noor Al-Sayed', email: 'noor@example.com', tier: 'Team', seats: 10, status: 'active', renews: 'Sep 19', mrr: 99 },
  { id: 's6', user: 'Sara Johnson', email: 'sara@example.com', tier: 'Free', seats: 1, status: 'active', renews: '—', mrr: 0 },
  { id: 's7', user: 'Hans Müller', email: 'hans@example.com', tier: 'Pro', seats: 1, status: 'canceled', renews: 'Ended', mrr: 0 },
  { id: 's8', user: 'Li Wei', email: 'liwei@example.com', tier: 'Free', seats: 1, status: 'active', renews: '—', mrr: 0 },
]

const TIER_META: Record<Tier, { color: string; price: string }> = {
  Free: { color: 'gray', price: '$0' },
  Pro: { color: 'blue', price: '$29' },
  Team: { color: 'indigo', price: '$99' },
  Enterprise: { color: 'green', price: '$499' },
}

export function AdminSubscriptionsPage() {
  const [tier, setTier] = useState<'all' | Tier>('all')
  const [status, setStatus] = useState<'all' | Sub['status']>('all')

  const rows = useMemo(
    () => SUBS.filter((s) => (tier === 'all' || s.tier === tier) && (status === 'all' || s.status === status)),
    [tier, status],
  )

  const totalMrr = SUBS.reduce((a, s) => a + s.mrr, 0)
  const byTier = (['Pro', 'Team', 'Enterprise', 'Free'] as Tier[]).map((t) => ({
    name: t,
    value: SUBS.filter((s) => s.tier === t && s.status !== 'canceled').reduce((a, s) => a + s.mrr, 0),
  }))

  return (
    <>
      <PageHeader
        title="Subscriptions"
        desc="Plan distribution, subscriber management and MRR breakdown."
        actions={<button className="btn btn-secondary" onClick={() => exportCsv('subscriptions.csv', rows as unknown as Record<string, unknown>[])}>
          <FaIcon icon="fa-download" className="h-4 w-4" /> Export
        </button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total MRR" value={`$${totalMrr.toLocaleString()}`} delta="+8%" icon={<FaIcon icon="fa-chart-line" className="h-5 w-5" />} />
        <StatCard label="Active subs" value={String(SUBS.filter((s) => s.status === 'active').length)} icon={<FaIcon icon="fa-user-check" className="h-5 w-5" />} />
        <StatCard label="Past due" value={String(SUBS.filter((s) => s.status === 'past_due').length)} icon={<FaIcon icon="fa-hourglass-half" className="h-5 w-5" />} />
        <StatCard label="Seats sold" value={String(SUBS.filter((s) => s.status === 'active').reduce((a, s) => a + s.seats, 0))} icon={<FaIcon icon="fa-chair" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-x-auto p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['all', 'Free', 'Pro', 'Team', 'Enterprise'] as const).map((x) => (
              <button key={x} onClick={() => setTier(x)} className={`btn px-3 py-1.5 text-xs capitalize ${tier === x ? 'btn-primary' : 'btn-secondary'}`}>{x}</button>
            ))}
            <span className="mx-2 w-px bg-[var(--border)]" />
            {(['all', 'active', 'past_due', 'canceled'] as const).map((x) => (
              <button key={x} onClick={() => setStatus(x)} className={`btn px-3 py-1.5 text-xs capitalize ${status === x ? 'btn-primary' : 'btn-secondary'}`}>{x.replace('_', ' ')}</button>
            ))}
          </div>
          <TableWrap head={['Subscriber', 'Tier', 'Seats', 'MRR', 'Renews', 'Status']}>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--surface-2)]">
                <Td>
                  <div className="font-semibold">{s.user}</div>
                  <div dir="ltr" className="text-xs text-muted">{s.email}</div>
                </Td>
                <Td><Badge color={TIER_META[s.tier].color}>{s.tier}</Badge></Td>
                <Td>{s.seats}</Td>
                <Td dir="ltr" className="font-mono text-xs">${s.mrr}</Td>
                <Td className="text-xs text-muted">{s.renews}</Td>
                <Td><Badge color={s.status === 'active' ? 'green' : s.status === 'past_due' ? 'amber' : 'red'}>{s.status.replace('_', ' ')}</Badge></Td>
              </tr>
            ))}
          </TableWrap>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted">No subscriptions match the filters.</p>}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">MRR by tier</h3>
          <DonutChartX data={byTier} height={260} />
        </Card>
      </div>
    </>
  )
}
