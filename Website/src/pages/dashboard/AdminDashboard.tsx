import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Link } from 'react-router-dom'
import { useT } from '@/lib/useI18n'
import {
  Badge, Card, EmptyState, PageHeader, Progress, StatCard, TableWrap, Td,
} from '@/components/ui/primitives'
import { AreaChartX, BarChartX, DonutChartX, LineChartX } from '@/components/ui/charts'
import { CsvButton } from '@/pages/dashboard/ManagerExtra'
import { MOCK_INVOICES, MOCK_USERS, series } from '@/data/mock'

const revenue30 = series(30, 1400, 260, 3)
const users30 = series(30, 11000, 90, 5)

export function AdminOverview() {
  const t = useT()
  return (
    <>
      <PageHeader title={`${t('dash.overview')} — ${t('nav.admin')}`} desc="Platform health at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.users')} value="12,453" delta="+12%" icon={<FaIcon icon="fa-user" regular className="h-5 w-5" />} />
        <StatCard label="Revenue (MTD)" value="$45,230" delta="+8%" icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="Active Subs" value="3,210" delta="+15%" icon={<FaIcon icon="fa-arrow-trend-up" className="h-5 w-5" />} />
        <StatCard label="API Calls (24h)" value="1.2M" delta="+23%" icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Revenue — last 30 days</h3>
          <AreaChartX data={revenue30} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">User growth</h3>
          <LineChartX data={users30} lines={[{ key: 'value', color: '#10b981' }]} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Top plans</h3>
          <BarChartX layout="vertical" data={[{ name: 'Pro', value: 2100 }, { name: 'Team', value: 450 }, { name: 'Free', value: 660 }, { name: 'Enterprise', value: 180 }]} dataKey="value" height={220} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 flex items-center justify-between font-semibold">Geographic <FaIcon icon="fa-earth-americas" className="h-4 w-4 text-muted" /></h3>
          <div className="space-y-3">
            {[['🇺🇸 USA', 34], ['🇩🇪 Germany', 18], ['🇯🇵 Japan', 14], ['🇪🇬 Egypt', 12], ['🇧🇷 Brazil', 9]].map(([name, pct]) => (
              <div key={name as string}>
                <div className="mb-1 flex justify-between text-sm"><span>{name}</span><span className="text-muted">{pct}%</span></div>
                <Progress value={pct as number} color="#22d3ee" />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Recent activity</h3>
          <ul className="space-y-2.5 text-sm">
            {[['👤', 'New Enterprise signup — Acme Corp', '12 min ago'], ['💳', 'Payment failed for INV-1040', '1h ago'], ['🚀', 'v1.0.0 deployed to production', '3h ago'], ['🧩', "Plugin 'ThemeX' passed review", '6h ago']].map(([e, txt, when]) => (
              <li key={txt} className="flex items-center gap-3"><span>{e}</span><span className="flex-1">{txt}</span><span className="text-xs text-muted">{when}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="border-amber-500/40 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-500"><FaIcon icon="fa-triangle-exclamation" className="h-4 w-4" /> Alerts</h3>
          <div className="space-y-2.5 text-sm">
            <div className="rounded-lg bg-amber-500/10 p-3">Mistral provider error rate &gt; 5%</div>
            <div className="rounded-lg bg-blue-500/10 p-3">Disk usage on db-replica-2 at 78%</div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-500">All other systems operational</div>
          </div>
        </Card>
      </div>
    </>
  )
}

export function AdminUsers() {
  const t = useT()
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('all')
  const filtered = useMemo(
    () =>
      MOCK_USERS.filter(
        (u) => (q === '' || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase())) && (plan === 'all' || u.plan === plan),
      ),
    [q, plan],
  )
  return (
    <>
      <PageHeader
        title={t('dash.users')}
        desc={`${filtered.length} of ${MOCK_USERS.length} users`}
        actions={<CsvButton filename="users.csv" rows={MOCK_USERS as unknown as Record<string, unknown>[]} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input ps-9" />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input max-w-[160px]">
          <option value="all">All plans</option>
          {['Free', 'Pro', 'Team', 'Enterprise'].map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <Card className="p-4">
        <TableWrap head={['ID', 'Name', 'Email', 'Plan', 'Status', 'Joined', 'Actions']}>
          {filtered.map((u) => (
            <tr key={u.id} className="transition hover:bg-[var(--surface-2)]">
              <Td>#{u.id}</Td>
              <Td>
                <Link to={`/admin/users/${u.id}`} className="flex items-center gap-2.5 font-semibold hover:text-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-[11px] font-bold text-white">
                    {u.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  {u.name}
                </Link>
              </Td>
              <Td dir="ltr">{u.email}</Td>
              <Td><Badge color={u.plan === 'Free' ? 'gray' : u.plan === 'Pro' ? 'blue' : u.plan === 'Team' ? 'indigo' : 'green'}>{u.plan}</Badge></Td>
              <Td><Badge color={u.status === 'active' ? 'green' : u.status === 'banned' ? 'red' : 'amber'}>{u.status}</Badge></Td>
              <Td>{u.joined}</Td>
              <Td>
                <button className="btn btn-ghost px-2 py-1 text-xs text-red-500"><FaIcon icon="fa-ban" className="me-1 h-3.5 w-3.5" />Ban</button>
              </Td>
            </tr>
          ))}
        </TableWrap>
        {filtered.length === 0 && <EmptyState icon={<FaIcon icon="fa-user" regular className="h-6 w-6" />} title="No users match your filters." />}
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>Showing 1–{filtered.length}</span>
          <div className="flex gap-1">
            <button className="btn btn-secondary px-3 py-1.5">←</button>
            <button className="btn btn-primary px-3 py-1.5">1</button>
            <button className="btn btn-secondary px-3 py-1.5">2</button>
            <button className="btn btn-secondary px-3 py-1.5">…</button>
            <button className="btn btn-secondary px-3 py-1.5">45</button>
            <button className="btn btn-secondary px-3 py-1.5">→</button>
          </div>
        </div>
      </Card>
    </>
  )
}

export function AdminUserDetail() {
  const t = useT()
  const u = MOCK_USERS[0]
  return (
    <>
      <PageHeader title={`${t('dash.users')} / ${u.name}`} actions={<><button className="btn btn-secondary">Impersonate</button><button className="btn btn-danger">Ban user</button></>} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xl font-bold text-white">AH</div>
          <h3 className="mt-3 font-bold">{u.name}</h3>
          <p dir="ltr" className="text-sm text-muted">{u.email}</p>
          <div className="mt-2 flex justify-center gap-1.5"><Badge color="blue">{u.plan}</Badge><Badge color="green">{u.status}</Badge></div>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-start text-sm">
            <div className="flex justify-between"><dt className="text-muted">Country</dt><dd>{u.country}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd>{u.joined}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Role</dt><dd>{u.role}</dd></div>
          </dl>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-4 font-semibold">📊 Usage this month</h3>
            <div className="space-y-4">
              {[{ l: `API calls: ${u.apiCalls.toLocaleString()}`, v: u.apiCalls, m: 50000 }, { l: `Storage: ${u.storageGb} GB`, v: u.storageGb, m: 10 }, { l: 'Compute: 45h', v: 45, m: 100 }].map((r) => (
                <div key={r.l}>
                  <div className="mb-1.5 text-sm">{r.l}</div>
                  <Progress value={r.v} max={r.m} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">💳 Billing history</h3>
            <TableWrap head={['Invoice', 'Amount', 'Date', 'Status']}>
              {[['INV-1042', '$29.00', '2026-08-01'], ['INV-1039', '$29.00', '2026-07-01'], ['INV-1036', '$29.00', '2026-06-01']].map((r) => (
                <tr key={r[0]}>
                  <Td>{r[0]}</Td><Td>{r[1]}</Td><Td>{r[2]}</Td>
                  <Td><Badge color="green">✓ paid</Badge></Td>
                </tr>
              ))}
            </TableWrap>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">📋 Recent activity</h3>
            <ul className="space-y-2 text-sm">
              <li>🔐 Signed in from 192.168.1.1 — 2h ago</li>
              <li>✏️ Updated profile — 1d ago</li>
              <li>🔑 Created API key 'staging' — 3d ago</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

export function AdminSubscriptions() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('dash.subscriptions')} desc="MRR, churn and plan distribution." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="MRR" value="$45,230" delta="+8%" icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="ARR" value="$542,760" icon={<FaIcon icon="fa-arrow-trend-up" className="h-5 w-5" />} />
        <StatCard label="Churn" value="2.3%" delta="-0.4%" icon={<FaIcon icon="fa-wave-square" className="h-5 w-5" />} />
        <StatCard label="ARPU" value="$14.10" icon={<FaIcon icon="fa-user" regular className="h-5 w-5" />} />
        <StatCard label="LTV" value="$338.40" icon={<FaIcon icon="fa-microchip" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Revenue trend</h3>
          <AreaChartX data={revenue30} height={250} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Plan distribution</h3>
          <DonutChartX data={[{ name: 'Pro', value: 2100 }, { name: 'Free', value: 660 }, { name: 'Team', value: 450 }, { name: 'Enterprise', value: 180 }]} height={250} />
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-500"><FaIcon icon="fa-bell" className="h-4 w-4" /> Failed payments</h3>
        <TableWrap head={['Invoice', 'Customer', 'Amount', 'Attempt', 'Actions']}>
          {[['INV-1040', 'Omar Khaled', '$499.00', '2nd', true], ['INV-1031', 'Sara Johnson', '$29.00', '1st', false]].map((r) => (
            <tr key={r[0] as string}>
              <Td className="font-semibold">{r[0]}</Td>
              <Td>{r[1]}</Td>
              <Td>{r[2]}</Td>
              <Td><Badge color={r[3] ? 'red' : 'amber'}>{r[3] ? 'retry due' : 'grace period'}</Badge></Td>
              <Td>
                <div className="flex gap-1.5">
                  <button className="btn btn-secondary px-2.5 py-1 text-xs">Retry now</button>
                  <button className="btn btn-ghost px-2.5 py-1 text-xs">Notify</button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function AdminFinance() {
  const t = useT()
  const methods = [
    { name: 'Credit Card', pct: 65 },
    { name: 'PayPal', pct: 25 },
    { name: 'Crypto', pct: 10 },
  ]
  return (
    <>
      <PageHeader title={t('dash.finance')} desc="Revenue breakdown and transactions." actions={<button className="btn btn-secondary">Export CSV</button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value="$45,230" delta="+8%" icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="Subscriptions" value="$38,100" icon={<FaIcon icon="fa-arrow-trend-up" className="h-5 w-5" />} />
        <StatCard label="One-time" value="$7,130" icon={<FaIcon icon="fa-file-lines" className="h-5 w-5" />} />
        <StatCard label="Refunds" value="-$230" icon={<FaIcon icon="fa-triangle-exclamation" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Net revenue trend</h3>
          <AreaChartX data={revenue30.map((p) => ({ ...p, value: Math.round(p.value * 0.98) }))} height={250} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Payment methods</h3>
          <div className="space-y-4">
            {methods.map((m) => (
              <div key={m.name}>
                <div className="mb-1 flex justify-between text-sm"><span>{m.name}</span><span className="text-muted">{m.pct}%</span></div>
                <Progress value={m.pct} color={['#3b82f6', '#22d3ee', '#f59e0b'][methods.indexOf(m)]} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Transactions</h3>
        <TableWrap head={['Invoice', 'Customer', 'Amount', 'Method', 'Status']}>
          {MOCK_INVOICES.map((inv) => (
            <tr key={inv.id}>
              <Td className="font-semibold">{inv.id}</Td>
              <Td>{inv.user}</Td>
              <Td>${inv.amount.toFixed(2)}</Td>
              <Td>{inv.method.replace(' •••• 8811', '').replace(' •••• 9931', '')}</Td>
              <Td><Badge color={inv.status === 'paid' ? 'green' : inv.status === 'failed' ? 'red' : 'amber'}>{inv.status}</Badge></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function AdminSecurity() {
  const t = useT()
  const events = [
    ['🔴', 'Brute-force attempt blocked', 'IP 45.33.x.x', 'Critical', '12 min ago'],
    ['🟡', 'New admin session', 'Marie Dubois — Paris', 'Medium', '2h ago'],
    ['🟢', 'API key rotated', 'production key', 'Info', '5h ago'],
    ['🟡', 'Rate limit exceeded', 'key sk-…a1b2', 'Medium', 'Yesterday'],
  ] as const
  return (
    <>
      <PageHeader title={t('dash.security')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active threats" value="0" icon={<FaIcon icon="fa-shield-halved" className="h-5 w-5" />} />
        <StatCard label="2FA adoption" value="45%" icon={<FaIcon icon="fa-lock" className="h-5 w-5" />} />
        <StatCard label="Blocked IPs" value="23" icon={<FaIcon icon="fa-ban" className="h-5 w-5" />} />
        <StatCard label="Audit entries" value="12,453" icon={<FaIcon icon="fa-file-lines" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Recent security events</h3>
          <TableWrap head={['Severity', 'Event', 'Source', 'When']}>
            {events.map((e) => (
              <tr key={e[1]}>
                <Td><Badge color={e[3] === 'Critical' ? 'red' : e[3] === 'Medium' ? 'amber' : 'gray'}>{e[3]}</Badge></Td>
                <Td className="font-medium">{e[1]}</Td>
                <Td dir="ltr">{e[2]}</Td>
                <Td className="text-muted">{e[4]}</Td>
              </tr>
            ))}
          </TableWrap>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Security score</h3>
          <div className="my-4 text-center text-5xl font-extrabold gradient-text">92<span className="text-lg text-muted">/100</span></div>
          <Progress value={92} color="#10b981" />
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>✓ Encryption at rest enabled</li>
            <li>⚠️ Enforce 2FA for admins</li>
            <li>⚠️ Rotate keys older than 90 days</li>
          </ul>
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><FaIcon icon="fa-key" className="h-4 w-4 text-primary" /> API key management</h3>
        <TableWrap head={['Owner', 'Key', 'Scope', 'Last used', 'Action']}>
          {[['Ahmed Hassan', 'sk-…8f2d', 'read+write', '2h ago'], ['CI Pipeline', 'sk-…ci77', 'read', '31m ago']].map((r) => (
            <tr key={r[1]}>
              <Td className="font-semibold">{r[0]}</Td>
              <Td><code dir="ltr" className="font-mono text-xs">{r[1]}</code></Td>
              <Td>{r[2]}</Td>
              <Td>{r[3]}</Td>
              <Td><button className="text-xs font-semibold text-red-500 hover:underline">Revoke</button></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
