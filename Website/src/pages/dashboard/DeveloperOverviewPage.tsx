import { Link } from 'react-router-dom'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { series, USER_API_KEYS } from '@/data/mock'

const usage30 = series(30, 40, 14, 7)

export function DeveloperOverviewPage() {
  const t = useT()
  const quick = [
    { to: '/developer/playground', icon: 'fa-flask', label: 'Test a model', desc: 'Live streaming playground' },
    { to: '/developer/api-keys', icon: 'fa-key', label: 'Create API key', desc: 'Provisioned on the gateway instantly' },
    { to: '/developer/models', icon: 'fa-microchip', label: 'Browse models', desc: '1,900+ models, live catalog' },
    { to: '/developers', icon: 'fa-book', label: 'Read the docs', desc: 'API reference in 4 languages' },
  ]

  return (
    <>
      <PageHeader
        title="🛠️ Developer Hub"
        desc="Your keys, usage and spend in one place."
        actions={<Badge color="green"><FaIcon icon="fa-circle-check" className="h-3" /> Gateway live</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Credits remaining" value="$3.82" delta="-24%" icon={<FaIcon icon="fa-wallet" className="h-5 w-5" />} />
        <StatCard label="Requests (30d)" value="13,570" delta="+18%" icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
        <StatCard label="Active keys" value={String(USER_API_KEYS.length)} icon={<FaIcon icon="fa-key" className="h-5 w-5" />} />
        <StatCard label="p95 latency" value="412ms" icon={<FaIcon icon="fa-stopwatch" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">API usage — 30 days</h3>
          <AreaChartX data={usage30} height={230} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Monthly budget</h3>
          <div className="mb-2 flex items-baseline justify-between">
            <span dir="ltr" className="text-2xl font-extrabold">$1.18</span>
            <span className="text-xs text-muted">of $5.00</span>
          </div>
          <Progress value={24} color="#10b981" />
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex justify-between"><span>idexal-pro</span><span dir="ltr" className="font-mono text-xs">$0.86</span></li>
            <li className="flex justify-between"><span>idexal-lite</span><span dir="ltr" className="font-mono text-xs">$0.22</span></li>
            <li className="flex justify-between"><span>idexal-code</span><span dir="ltr" className="font-mono text-xs">$0.10</span></li>
          </ul>
          <Link to="/developer/usage" className="btn btn-secondary mt-4 w-full">{t('dash.usage')} →</Link>
        </Card>
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Quick actions</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="h-full p-5" hover>
              <FaIcon icon={a.icon} className="h-5 w-5 text-primary" />
              <div className="mt-3 font-bold">{a.label}</div>
              <div className="mt-1 text-xs text-muted">{a.desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Your keys</h3>
          <Link to="/developer/api-keys" className="text-xs font-semibold text-primary hover:underline">Manage all →</Link>
        </div>
        <div className="space-y-2">
          {USER_API_KEYS.map((k) => (
            <div key={k.id} dir="ltr" className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm">
              <span className="font-medium">{k.name}</span>
              <code className="font-mono text-xs text-muted">{k.masked}</code>
              <span className="text-xs text-muted">{k.lastUsed}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
