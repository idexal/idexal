import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX, BarChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'
import { exportCsv } from '@/pages/dashboard/ManagerExtra'

type Period = '30d' | '90d' | '12m'

const MRR_SERIES = series(90, 38000, 900, 23).map((p) => ({ day: p.day, mrr: p.value, new: Math.round(p.value * 0.04), churned: Math.round(p.value * 0.015) }))

const INVOICES = [
  { id: 'INV-1042', customer: 'Ahmed Hassan', plan: 'Pro', amount: 29, method: 'Visa', status: 'paid', date: '2026-08-25' },
  { id: 'INV-1041', customer: 'Kenji Tanaka', plan: 'Team', amount: 99, method: 'PayPal', status: 'paid', date: '2026-08-24' },
  { id: 'INV-1040', customer: 'Omar Khaled', plan: 'Enterprise', amount: 499, method: 'Visa', status: 'failed', date: '2026-08-23' },
  { id: 'INV-1039', customer: 'Marie Dubois', plan: 'Pro', amount: 29, method: 'Visa', status: 'paid', date: '2026-08-22' },
  { id: 'INV-1038', customer: 'Sara Johnson', plan: 'Free', amount: 15, method: 'Crypto', status: 'refunded', date: '2026-08-21' },
  { id: 'INV-1037', customer: 'Hans Müller', plan: 'Pro', amount: 29, method: 'Visa', status: 'paid', date: '2026-08-20' },
  { id: 'INV-1036', customer: 'Noor Al-Sayed', plan: 'Team', amount: 99, method: 'PayPal', status: 'paid', date: '2026-08-19' },
  { id: 'INV-1035', customer: 'Li Wei', plan: 'Free', amount: 0, method: '—', status: 'open', date: '2026-08-18' },
]

export function AdminFinancePage() {
  const t = useT()
  const [period, setPeriod] = useState<Period>('30d')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'failed' | 'refunded' | 'open'>('all')

  const data = useMemo(() => {
    if (period === '30d') return MRR_SERIES.slice(-30)
    if (period === '90d') return MRR_SERIES
    return MRR_SERIES // 12m would aggregate monthly in production
  }, [period])

  const totals = useMemo(() => {
    const paid = INVOICES.filter((i) => i.status === 'paid')
    const revenue = paid.reduce((a, i) => a + i.amount, 0)
    const failed = INVOICES.filter((i) => i.status === 'failed').reduce((a, i) => a + i.amount, 0)
    const refunded = INVOICES.filter((i) => i.status === 'refunded').reduce((a, i) => a + i.amount, 0)
    return { revenue, failed, refunded, net: revenue - refunded }
  }, [])

  const rows = useMemo(() => INVOICES.filter((i) => statusFilter === 'all' || i.status === statusFilter), [statusFilter])

  return (
    <>
      <PageHeader
        title={t('dash.finance')}
        desc="Revenue, subscriptions and payment operations."
        actions={<button className="btn btn-secondary" onClick={() => exportCsv('invoices.csv', INVOICES as unknown as Record<string, unknown>[])}>
          <FaIcon icon="fa-download" className="h-4 w-4" /> Export CSV
        </button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value="$45,230" delta="+8%" icon={<FaIcon icon="fa-chart-line" className="h-5 w-5" />} />
        <StatCard label="ARR" value="$542,760" icon={<FaIcon icon="fa-arrow-trend-up" className="h-5 w-5" />} />
        <StatCard label="ARPU" value="$14.10" icon={<FaIcon icon="fa-users" className="h-5 w-5" />} />
        <StatCard label="Churn" value="2.3%" delta="-0.4%" icon={<FaIcon icon="fa-arrows-rotate" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">MRR trend</h3>
            <div className="flex gap-1.5">
              {(['30d', '90d', '12m'] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`btn px-2.5 py-1 text-xs ${period === p ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
              ))}
            </div>
          </div>
          <AreaChartX data={data} dataKey="mrr" height={260} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">New vs churned (MRR)</h3>
          <BarChartX
            data={[
              { name: 'New', value: data.reduce((a, d) => a + d.new, 0) },
              { name: 'Churned', value: data.reduce((a, d) => a + d.churned, 0) },
            ]}
            dataKey="value"
            colors={['#10b981', '#ef4444']}
            height={260}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (period)" value={`$${totals.revenue.toLocaleString()}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="Failed" value={`$${totals.failed.toLocaleString()}`} icon={<FaIcon icon="fa-triangle-exclamation" className="h-5 w-5" />} />
        <StatCard label="Refunded" value={`$${totals.refunded.toLocaleString()}`} icon={<FaIcon icon="fa-rotate-left" className="h-5 w-5" />} />
        <StatCard label="Net" value={`$${totals.net.toLocaleString()}`} icon={<FaIcon icon="fa-scale-balanced" className="h-5 w-5" />} />
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Invoices</h3>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['all', 'paid', 'failed', 'refunded', 'open'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`btn px-3 py-1.5 text-xs capitalize ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}>{s}</button>
        ))}
      </div>
      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Invoice', 'Customer', 'Plan', 'Amount', 'Method', 'Date', 'Status']}>
          {rows.map((inv) => (
            <tr key={inv.id} className="hover:bg-[var(--surface-2)]">
              <Td className="font-semibold">{inv.id}</Td>
              <Td>{inv.customer}</Td>
              <Td><Badge color={inv.plan === 'Free' ? 'gray' : inv.plan === 'Pro' ? 'blue' : inv.plan === 'Team' ? 'indigo' : 'green'}>{inv.plan}</Badge></Td>
              <Td>${inv.amount.toFixed(2)}</Td>
              <Td>{inv.method}</Td>
              <Td dir="ltr" className="font-mono text-xs text-muted">{inv.date}</Td>
              <Td><Badge color={inv.status === 'paid' ? 'green' : inv.status === 'failed' ? 'red' : inv.status === 'refunded' ? 'amber' : 'gray'}>{inv.status}</Badge></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
