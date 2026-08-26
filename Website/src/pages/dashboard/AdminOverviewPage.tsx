import { Link } from 'react-router-dom'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'

const revenue30 = series(30, 1400, 260, 3)
const users30 = series(30, 11000, 90, 5)

export function AdminOverviewPage() {
  const t = useT()
  const alerts = [
    { text: 'agent-worker-1 CPU at 78%', sev: 'amber', to: '/admin/system' },
    { text: '1 invoice payment failed (INV-1040)', sev: 'red', to: '/admin/finance' },
    { text: '2 keys pending gateway sync', sev: 'blue', to: '/admin/gateway' },
  ]

  const quick = [
    { to: '/admin/users', icon: 'fa-users', label: 'Users', desc: '12,453 total' },
    { to: '/admin/provider-hub', icon: 'fa-network-wired', label: 'Providers', desc: '8 connected' },
    { to: '/admin/model-registry', icon: 'fa-microchip', label: 'Models', desc: '4 first-party' },
    { to: '/admin/audit', icon: 'fa-clipboard-list', label: 'Audit log', desc: '12,453 entries' },
  ]

  return (
    <>
      <PageHeader title={`${t('dash.overview')} — ${t('nav.admin')}`} desc="Platform health, revenue and live activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.users')} value="12,453" delta="+12%" icon={<FaIcon icon="fa-users" className="h-5 w-5" />} />
        <StatCard label="MRR" value="$45,230" delta="+8%" icon={<FaIcon icon="fa-chart-line" className="h-5 w-5" />} />
        <StatCard label="API calls (24h)" value="1.2M" delta="+23%" icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
        <StatCard label="Gateway" value="Live" icon={<FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Revenue — 30 days</h3>
          <AreaChartX data={revenue30} height={230} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Alerts</h3>
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link key={a.text} to={a.to} className="block rounded-xl border border-line p-3 text-sm transition hover:border-primary">
                <Badge color={a.sev}>{a.sev === 'red' ? 'critical' : a.sev === 'amber' ? 'warning' : 'info'}</Badge>
                <span className="ms-2">{a.text}</span>
                <span className="ms-auto text-muted">→</span>
              </Link>
            ))}
          </div>
          <h3 className="mb-3 mt-6 font-semibold">Disk — db-replica-2</h3>
          <Progress value={78} color="#f59e0b" />
          <p className="mt-1 text-xs text-muted">78% used — cleanup scheduled tonight.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">User growth — 30 days</h3>
          <AreaChartX data={users30} height={220} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Jump to</h3>
          <div className="grid grid-cols-2 gap-2">
            {quick.map((q) => (
              <Link key={q.to} to={q.to} className="rounded-xl border border-line p-3 transition hover:border-primary">
                <FaIcon icon={q.icon} className="h-4 w-4 text-primary" />
                <div className="mt-2 text-sm font-bold">{q.label}</div>
                <div className="text-[11px] text-muted">{q.desc}</div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
