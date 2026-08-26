import { useMemo, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { CsvButton } from '@/pages/dashboard/ManagerExtra'
import { useUiStore } from '@/stores/uiStore'

interface UserRow {
  id: number
  name: string
  email: string
  plan: 'Free' | 'Pro' | 'Team' | 'Enterprise'
  status: 'active' | 'banned' | 'pending'
  role: string
  joined: string
  country: string
  apiCalls: number
  spend: number
}

const USERS: UserRow[] = [
  { id: 1, name: 'Ahmed Hassan', email: 'ahmed@example.com', plan: 'Pro', status: 'active', role: 'user', joined: '2026-01-14', country: '🇪🇬', apiCalls: 15230, spend: 116 },
  { id: 2, name: 'Sara Johnson', email: 'sara@example.com', plan: 'Free', status: 'active', role: 'user', joined: '2026-02-03', country: '🇺🇸', apiCalls: 812, spend: 0 },
  { id: 3, name: 'Omar Khaled', email: 'omar@example.com', plan: 'Enterprise', status: 'banned', role: 'user', joined: '2025-11-20', country: '🇦🇪', apiCalls: 98221, spend: 2495 },
  { id: 4, name: 'Kenji Tanaka', email: 'kenji@example.com', plan: 'Team', status: 'active', role: 'developer', joined: '2025-09-08', country: '🇯🇵', apiCalls: 44190, spend: 495 },
  { id: 5, name: 'Marie Dubois', email: 'marie@example.com', plan: 'Pro', status: 'active', role: 'manager', joined: '2026-03-19', country: '🇫🇷', apiCalls: 21774, spend: 87 },
  { id: 6, name: 'Li Wei', email: 'liwei@example.com', plan: 'Free', status: 'pending', role: 'user', joined: '2026-08-01', country: '🇨🇳', apiCalls: 96, spend: 0 },
  { id: 7, name: 'Noor Al-Sayed', email: 'noor@example.com', plan: 'Team', status: 'active', role: 'team', joined: '2026-04-22', country: '🇯🇴', apiCalls: 33450, spend: 198 },
  { id: 8, name: 'Hans Müller', email: 'hans@example.com', plan: 'Pro', status: 'active', role: 'developer', joined: '2026-05-30', country: '🇩🇪', apiCalls: 18902, spend: 87 },
]

export function AdminUsersPage() {
  const toast = useUiStore((s) => s.toast)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [banned, setBanned] = useState<Set<number>>(new Set([3]))

  const rows = useMemo(
    () =>
      USERS.map((u) => ({ ...u, status: banned.has(u.id) ? ('banned' as const) : u.status }))
        .filter(
          (u) =>
            (q === '' || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) &&
            (plan === 'all' || u.plan === plan) &&
            (status === 'all' || u.status === status),
        ),
    [q, plan, status, banned],
  )

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const bulkBan = () => {
    if (selected.size === 0) return
    setBanned(new Set([...banned, ...selected]))
    toast(`${selected.size} user(s) banned`, 'success')
    setSelected(new Set())
  }

  const mrr = USERS.filter((u) => u.status === 'active' && banned.size === 0 || !banned.has(u.id)).reduce(
    (a, u) => a + (u.plan === 'Pro' ? 29 : u.plan === 'Team' ? 99 : u.plan === 'Enterprise' ? 499 : 0),
    0,
  )

  return (
    <>
      <PageHeader
        title="Users"
        desc={`${rows.length} of ${USERS.length} users`}
        actions={<CsvButton filename="users.csv" rows={rows as unknown as Record<string, unknown>[]} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={String(USERS.length)} icon={<FaIcon icon="fa-users" className="h-5 w-5" />} />
        <StatCard label="Active" value={String(USERS.filter((u) => !banned.has(u.id) && u.status !== 'pending').length)} icon={<FaIcon icon="fa-user-check" className="h-5 w-5" />} />
        <StatCard label="Banned" value={String(banned.size)} icon={<FaIcon icon="fa-ban" className="h-5 w-5" />} />
        <StatCard label="MRR from list" value={`$${mrr.toLocaleString()}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="input ps-9" />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="input max-w-[150px]">
          {['all', 'Free', 'Pro', 'Team', 'Enterprise'].map((p) => <option key={p} value={p}>{p === 'all' ? 'All plans' : p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input max-w-[150px]">
          {['all', 'active', 'banned', 'pending'].map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        {selected.size > 0 && (
          <button onClick={bulkBan} className="btn btn-danger px-3 py-1.5 text-xs">
            <FaIcon icon="fa-ban" className="h-3.5 w-3.5" /> Ban {selected.size} selected
          </button>
        )}
      </div>

      <Card className="overflow-x-auto p-4">
        <TableWrap head={['', 'User', 'Plan', 'Status', 'API calls', 'Spend', 'Joined', 'Actions']}>
          {rows.map((u) => (
            <tr key={u.id} className="hover:bg-[var(--surface-2)]">
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggleSelect(u.id)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-[11px] font-bold text-white">
                    {u.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <div>
                    <div className="font-semibold">{u.name}</div>
                    <div dir="ltr" className="text-xs text-muted">{u.email}</div>
                  </div>
                </div>
              </Td>
              <Td><Badge color={u.plan === 'Free' ? 'gray' : u.plan === 'Pro' ? 'blue' : u.plan === 'Team' ? 'indigo' : 'green'}>{u.plan}</Badge></Td>
              <Td><Badge color={u.status === 'active' ? 'green' : u.status === 'banned' ? 'red' : 'amber'}>{u.status}</Badge></Td>
              <Td dir="ltr" className="font-mono text-xs">{u.apiCalls.toLocaleString()}</Td>
              <Td dir="ltr" className="font-mono text-xs">${u.spend}</Td>
              <Td dir="ltr" className="font-mono text-xs text-muted">{u.joined}</Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  {banned.has(u.id) ? (
                    <button className="font-semibold text-accent hover:underline" onClick={() => { setBanned(new Set([...banned].filter((x) => x !== u.id))); toast(`${u.name} unbanned`, 'success') }}>
                      Unban
                    </button>
                  ) : (
                    <button className="font-semibold text-red-500 hover:underline" onClick={() => { setBanned(new Set([...banned, u.id])); toast(`${u.name} banned`, 'success') }}>
                      Ban
                    </button>
                  )}
                  <button className="font-semibold text-primary hover:underline" onClick={() => toast(`Impersonation link sent to ${u.email}`, 'info')}>
                    Impersonate
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
