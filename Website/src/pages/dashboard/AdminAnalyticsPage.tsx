import { useEffect, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { useT } from '@/lib/useI18n'
import { Card, PageHeader, Progress, StatCard } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { series } from '@/data/mock'

const funnel = [
  { stage: 'Visited site', value: 248000, pct: 100 },
  { stage: 'Signed up', value: 12400, pct: 5 },
  { stage: 'Generated API key', value: 6200, pct: 2.5 },
  { stage: 'First API call', value: 4800, pct: 1.9 },
  { stage: 'Upgraded to paid', value: 1240, pct: 0.5 },
]

const cohorts = [
  { month: 'Mar', retention: [100, 62, 48, 41, 36, 34] },
  { month: 'Apr', retention: [100, 58, 45, 39, 35, 0] },
  { month: 'May', retention: [100, 64, 51, 44, 0, 0] },
  { month: 'Jun', retention: [100, 66, 54, 0, 0, 0] },
  { month: 'Jul', retention: [100, 71, 0, 0, 0, 0] },
  { month: 'Aug', retention: [100, 0, 0, 0, 0, 0] },
]

const realtime = series(30, 420, 60, 77).map((p) => ({ day: p.day, active: p.value }))

export function AdminAnalyticsPage() {
  const t = useT()
  const [liveUsers, setLiveUsers] = useState(342)

  // Simulated real-time tick — replaced by WebSocket in production.
  useEffect(() => {
    const id = setInterval(() => {
      setLiveUsers((v) => Math.max(180, Math.min(520, v + Math.round((Math.random() - 0.5) * 24))))
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <PageHeader title={t('dash.analytics')} desc="Traffic, conversion funnel, retention and live activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Live users</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              live
            </span>
          </div>
          <div dir="ltr" className="mt-2 text-3xl font-extrabold tabular-nums">{liveUsers.toLocaleString()}</div>
          <div className="mt-1 text-xs text-muted">active in the last 5 minutes</div>
        </Card>
        <StatCard label="Sessions (MTD)" value="248K" delta="+11%" icon={<FaIcon icon="fa-globe" className="h-5 w-5" />} />
        <StatCard label="Signup conversion" value="5.0%" delta="+0.4%" icon={<FaIcon icon="fa-user-plus" className="h-5 w-5" />} />
        <StatCard label="Trial → paid" value="20.6%" delta="+1.2%" icon={<FaIcon icon="fa-credit-card" className="h-5 w-5" />} />
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><FaIcon icon="fa-filter" className="text-primary" /> Conversion funnel (MTD)</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={f.stage}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">{f.stage}</span>
                <span dir="ltr" className="font-mono text-xs text-muted">{f.value.toLocaleString()} · {f.pct}%</span>
              </div>
              <Progress value={f.pct} max={100} color={['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#a855f7'][i]} />
              {i < funnel.length - 1 && (
                <div className="mt-1 text-[11px] text-muted">
                  ↓ {Math.round((funnel[i + 1].value / f.value) * 100)}% continue to next stage
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Active users (30d)</h3>
          <AreaChartX data={realtime} dataKey="active" height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Top countries</h3>
          <div className="space-y-3">
            {[
              ['🇺🇸 USA', 34],
              ['🇩🇪 Germany', 18],
              ['🇯🇵 Japan', 14],
              ['🇪🇬 Egypt', 12],
              ['🇧🇷 Brazil', 9],
              ['🇫🇷 France', 7],
            ].map(([c, pct]) => (
              <div key={c as string}>
                <div className="mb-1 flex justify-between text-sm"><span>{c}</span><span className="text-muted">{pct}%</span></div>
                <Progress value={pct as number} color="#6366f1" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-5">
        <h3 className="mb-4 font-semibold">Retention cohorts (monthly, %)</h3>
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-muted">
              <th className="px-3 py-2 text-start font-medium">Cohort</th>
              {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map((m) => (
                <th key={m} className="px-3 py-2 text-center font-medium">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.month}>
                <td className="px-3 py-2 font-semibold">{c.month} 2026</td>
                {c.retention.map((r, i) => (
                  <td key={i} className="px-2 py-2 text-center">
                    {r > 0 ? (
                      <span
                        className="inline-block w-16 rounded-lg py-1.5 text-xs font-bold"
                        style={{
                          background: `rgba(59, 130, 246, ${0.12 + (r / 100) * 0.55})`,
                          color: r > 60 ? '#fff' : 'var(--text)',
                        }}
                      >
                        {r}%
                      </span>
                    ) : (
                      <span className="text-muted">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Retention is improving: Aug cohort retains 71% at M1 vs 58% in April — onboarding v2 shipped in June.</p>
      </Card>
    </>
  )
}
