import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX, DonutChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'
import { useUiStore } from '@/stores/uiStore'

const revenue = series(30, 10, 3, 61)
const bySource = [
  { name: 'API usage', value: 1840 },
  { name: 'Plugin sales', value: 450 },
  { name: 'Subscriptions', value: 160 },
]

export function DeveloperEarningsPage() {
  const toast = useUiStore((s) => s.toast)
  const [payoutRequested, setPayoutRequested] = useState(false)

  const requestPayout = () => {
    setPayoutRequested(true)
    toast('Payout of $180.00 requested — arrives in 3-5 business days', 'success')
  }

  return (
    <>
      <PageHeader
        title="💰 Earnings"
        desc="Revenue from API usage share, plugins and subscriptions."
        actions={
          <button onClick={requestPayout} disabled={payoutRequested} className="btn btn-primary">
            <FaIcon icon="fa-money-bill-transfer" className="h-4 w-4" /> {payoutRequested ? 'Payout requested ✓' : 'Request payout ($180)'}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total earnings" value="$2,450" delta="+12%" icon={<FaIcon icon="fa-sack-dollar" className="h-5 w-5" />} />
        <StatCard label="This month" value="$320" delta="+9%" icon={<FaIcon icon="fa-calendar" className="h-5 w-5" />} />
        <StatCard label="Pending payout" value="$180" icon={<FaIcon icon="fa-hourglass-half" className="h-5 w-5" />} />
        <StatCard label="Next payout date" value="Sep 1" icon={<FaIcon icon="fa-calendar-check" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Daily revenue — 30 days</h3>
          <AreaChartX data={revenue} height={260} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">By source</h3>
          <DonutChartX data={bySource} height={260} />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Payout history</h3>
          <TableWrap head={['Period', 'Amount', 'Method', 'Status']}>
            {[
              ['Aug 2026', '$320.00', 'Bank transfer', 'processing'],
              ['Jul 2026', '$410.00', 'Bank transfer', 'paid'],
              ['Jun 2026', '$380.00', 'Bank transfer', 'paid'],
              ['May 2026', '$350.00', 'PayPal', 'paid'],
            ].map(([p, amt, m, st]) => (
              <tr key={p}>
                <Td className="font-medium">{p}</Td>
                <Td dir="ltr" className="font-mono text-xs">{amt}</Td>
                <Td>{m}</Td>
                <Td><Badge color={st === 'paid' ? 'green' : 'amber'}>{st}</Badge></Td>
              </tr>
            ))}
          </TableWrap>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Top earning plugins</h3>
          <div className="space-y-4">
            {[
              { name: 'ThemeX', revenue: 450, installs: 1230 },
              { name: 'GitPro Tools', revenue: 320, installs: 890 },
              { name: 'VimX Bindings', revenue: 0, installs: 2140 },
            ].map((p) => (
              <div key={p.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span dir="ltr" className="font-mono text-xs text-muted">${p.revenue} · {p.installs.toLocaleString()} installs</span>
                </div>
                <Progress value={p.revenue} max={450} color="#22d3ee" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Revenue share: 70% plugin author / 30% platform. API usage share is calculated monthly from gateway metering.
          </p>
        </Card>
      </div>
    </>
  )
}
