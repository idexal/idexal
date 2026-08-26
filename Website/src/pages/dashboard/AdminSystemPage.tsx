import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'
import { useUiStore } from '@/stores/uiStore'

const SERVICES = [
  { name: 'api-gateway', region: 'eu-central', cpu: 34, mem: 61, uptime: '99.99%', ok: true },
  { name: 'dashboard-web', region: 'global CDN', cpu: 12, mem: 28, uptime: '99.98%', ok: true },
  { name: 'agent-worker-1', region: 'us-east', cpu: 78, mem: 82, uptime: '99.91%', ok: false },
  { name: 'db-primary', region: 'eu-central', cpu: 41, mem: 55, uptime: '100%', ok: true },
  { name: 'redis-cache', region: 'eu-central', cpu: 8, mem: 22, uptime: '100%', ok: true },
  { name: 'omniroute-gw', region: 'edge', cpu: 52, mem: 47, uptime: '99.97%', ok: true },
]

const latency = series(24, 220, 40, 91).map((p) => ({ day: p.day, ms: p.value }))

export function AdminSystemPage() {
  const t = useT()
  const toast = useUiStore((s) => s.toast)
  const [backingUp, setBackingUp] = useState(false)
  const [lastBackup, setLastBackup] = useState('2h ago')

  const runBackup = () => {
    setBackingUp(true)
    setTimeout(() => {
      setBackingUp(false)
      setLastBackup('just now')
      toast('Database backup completed — stored in 3 regions', 'success')
    }, 1500)
  }

  return (
    <>
      <PageHeader
        title={t('dash.system')}
        desc="Infrastructure health, queues and backups."
        actions={<button onClick={runBackup} disabled={backingUp} className="btn btn-secondary">
          <FaIcon icon="fa-database" className={`h-4 w-4 ${backingUp ? 'animate-pulse' : ''}`} />
          {backingUp ? 'Backing up…' : `Backup now (last: ${lastBackup})`}
        </button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall uptime (90d)" value="99.97%" icon={<FaIcon icon="fa-server" className="h-5 w-5" />} />
        <StatCard label="Queue depth" value="142 jobs" icon={<FaIcon icon="fa-layer-group" className="h-5 w-5" />} />
        <StatCard label="Error rate (24h)" value="0.03%" icon={<FaIcon icon="fa-bug" className="h-5 w-5" />} />
        <StatCard label="p95 latency" value="412ms" icon={<FaIcon icon="fa-stopwatch" className="h-5 w-5" />} />
      </div>

      <Card className="mt-6 overflow-x-auto p-4">
        <h3 className="mb-3 px-1 font-semibold">Services</h3>
        <TableWrap head={['Service', 'Region', 'CPU', 'Memory', 'Uptime', 'Status']}>
          {SERVICES.map((s) => (
            <tr key={s.name}>
              <Td><code dir="ltr" className="font-mono text-xs font-bold">{s.name}</code></Td>
              <Td dir="ltr" className="text-xs text-muted">{s.region}</Td>
              <Td>
                <div className="w-32">
                  <Progress value={s.cpu} color={s.cpu > 70 ? '#ef4444' : '#3b82f6'} />
                  <span className="mt-1 block text-xs text-muted">{s.cpu}%</span>
                </div>
              </Td>
              <Td>
                <div className="w-32">
                  <Progress value={s.mem} color={s.mem > 75 ? '#f59e0b' : '#22d3ee'} />
                  <span className="mt-1 block text-xs text-muted">{s.mem}%</span>
                </div>
              </Td>
              <Td dir="ltr" className="font-mono text-xs">{s.uptime}</Td>
              <Td>{s.ok ? <Badge color="green">healthy</Badge> : <Badge color="amber">high load</Badge>}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">API latency (24h, avg ms)</h3>
          <AreaChartX data={latency} dataKey="ms" height={230} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Job queue</h3>
          <div className="space-y-3">
            {[
              ['webhooks.deliver', 64, '#3b82f6'],
              ['usage.rollup', 38, '#22d3ee'],
              ['emails.send', 28, '#10b981'],
              ['backups.run', 12, '#f59e0b'],
            ].map(([name, count, color]) => (
              <div key={name as string}>
                <div className="mb-1 flex justify-between text-sm">
                  <code dir="ltr" className="font-mono text-xs">{name}</code>
                  <span className="text-xs text-muted">{count} jobs</span>
                </div>
                <Progress value={count as number} max={70} color={color as string} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
