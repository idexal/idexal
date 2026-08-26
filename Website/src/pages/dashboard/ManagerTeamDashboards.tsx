import { useState } from 'react'
import { useT } from '@/lib/useI18n'
import { Badge, Card, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { BarChartX } from '@/components/ui/charts'
import { MY_TASKS, TEAM_PERF, TICKETS } from '@/data/mock'
import { FaIcon } from '@/components/shared/FaIcon'

export function ManagerOverview() {
  const t = useT()
  const byCategory = [
    { name: 'Billing', value: 14 },
    { name: 'Bugs', value: 12 },
    { name: 'Accounts', value: 9 },
    { name: 'Features', value: 6 },
    { name: 'Other', value: 4 },
  ]
  return (
    <>
      <PageHeader title={`${t('nav.manager')} — ${t('dash.overview')}`} desc="Your team's support performance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value="12" icon={<FaIcon icon="fa-clipboard-list" className="h-5 w-5" />} />
        <StatCard label="Active tickets" value="45" delta="+5%" icon={<FaIcon icon="fa-file-lines" className="h-5 w-5" />} />
        <StatCard label="Resolved this week" value="120" delta="+9%" icon={<FaIcon icon="fa-circle-check" className="h-5 w-5" />} />
        <StatCard label="Satisfaction" value="4.8 / 5" icon={<FaIcon icon="fa-star" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Team performance</h3>
          <TableWrap head={['Name', 'Tickets', 'Avg time', 'Rating', 'Status']}>
            {TEAM_PERF.map((m) => (
              <tr key={m.name}>
                <Td className="font-semibold">{m.name}</Td>
                <Td>{m.tickets}</Td>
                <Td>{m.avgTimeH}h</Td>
                <Td>⭐ {m.rating}</Td>
                <Td>{m.online ? <Badge color="green">🟢 online</Badge> : <Badge color="gray">offline</Badge>}</Td>
              </tr>
            ))}
          </TableWrap>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Tickets by category</h3>
          <BarChartX data={byCategory} dataKey="value" height={240} />
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Pending reviews (needs your approval)</h3>
        <div className="space-y-2.5">
          {[["Plugin 'GitPro Tools' — marketplace listing", 'review'], ['Blog post "Roadmap H2 2026"', 'draft'], ['Refund request INV-1038 ($15)', 'refund']].map(([item, tag]) => (
            <div key={item} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
              <span className="flex items-center gap-2"><Badge color="amber">{tag}</Badge> {item}</span>
              <span className="flex gap-1.5">
                <button className="btn btn-primary px-3 py-1.5 text-xs">Approve</button>
                <button className="btn btn-secondary px-3 py-1.5 text-xs">Reject</button>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

export function ManagerTickets() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('dash.tickets')} desc={`${TICKETS.filter((x) => x.status !== 'resolved').length} open / pending`} />
      <Card className="p-4">
        <TableWrap head={['ID', 'Subject', 'Requester', 'Assignee', 'Priority', 'Status', 'Age']}>
          {TICKETS.map((tk) => (
            <tr key={tk.id}>
              <Td className="font-mono text-xs font-semibold">{tk.id}</Td>
              <Td className="max-w-xs truncate font-medium">{tk.subject}</Td>
              <Td dir="ltr">{tk.requester}</Td>
              <Td>{tk.assignee}</Td>
              <Td><Badge color={tk.priority === 'high' ? 'red' : tk.priority === 'medium' ? 'amber' : 'gray'}>{tk.priority}</Badge></Td>
              <Td><Badge color={tk.status === 'resolved' ? 'green' : tk.status === 'open' ? 'blue' : 'amber'}>{tk.status}</Badge></Td>
              <Td className="text-muted">{tk.ageHours}h</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function ManagerReports() {
  return (
    <>
      <PageHeader title="Reports" desc="Weekly performance summaries." actions={<button className="btn btn-secondary">Export PDF</button>} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['First response time', '18 min', -12],
          ['Resolution time', '2.4 h', -8],
          ['Tickets per agent', '20.4', +3],
          ['CSAT score', '4.8/5', +2],
        ].map(([label, value, delta]) => (
          <StatCard key={label as string} label={label as string} value={value as string} delta={(delta as number) > 0 ? `+${delta}%` : `${delta}%`} icon={<FaIcon icon="fa-chart-column" className="h-5 w-5" />} />
        ))}
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Weekly resolution volume</h3>
        <BarChartX
          data={[
            { name: 'W1', value: 96 }, { name: 'W2', value: 108 }, { name: 'W3', value: 101 }, { name: 'W4', value: 120 },
          ]}
          dataKey="value"
          colors={['#3b82f6']}
          height={220}
        />
      </Card>
    </>
  )
}

export function TeamDashboardHome() {
  const t = useT()
  const [tasks, setTasks] = useState(MY_TASKS)
  const doneCount = tasks.filter((x) => x.done).length
  return (
    <>
      <PageHeader title={`${t('dash.welcome')}, Ahmed 👋`} desc="Frontend Developer — 🟢 Online · Hours today: 6.5h" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tasks completed" value={`${doneCount}/${tasks.length}`} icon={<FaIcon icon="fa-circle-check" className="h-5 w-5" />} />
        <StatCard label="Hours logged" value="32/40" icon={<FaIcon icon="fa-stopwatch" className="h-5 w-5" />} />
        <StatCard label="Code reviews" value="5" icon={<FaIcon icon="fa-clipboard-list" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">{t('dash.myTasks')}</h3>
          <ul className="space-y-2.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => setTasks(tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))}
                  className="h-4.5 w-4.5 accent-[var(--primary)]"
                  style={{ width: 18, height: 18 }}
                />
                <span className={`flex-1 text-sm ${task.done ? 'text-muted line-through' : 'font-medium'}`}>{task.title}</span>
                <Badge color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'gray'}>{task.priority}</Badge>
                <span className={`hidden whitespace-nowrap text-xs sm:inline ${task.due === 'Today' && !task.done ? 'font-bold text-red-500' : 'text-muted'}`}>{task.due}</span>
              </li>
            ))}
          </ul>
          <Progress value={(doneCount / tasks.length) * 100} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold"><FaIcon icon="fa-calendar-days" className="h-4 w-4 text-primary" /> {t('dash.calendar')}</h3>
            <div className="space-y-2 text-sm">
              {[['Standup', 'Daily 09:30'], ['Design review', 'Tue 14:00'], ['Sprint planning', 'Thu 11:00'], ['Demo day', 'Fri 16:00']].map(([e, when]) => (
                <div key={e} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2">
                  <span className="font-medium">{e}</span><span className="text-xs text-muted">{when}</span>
                </div>
              ))}
            </div>
          </Card>
          <TeamChat />
        </div>
      </div>
    </>
  )
}

function TeamChat() {
  const t = useT()
  const [msgs, setMsgs] = useState([
    { from: 'Noor', text: 'PR #234 looks good — one nit on naming 🙏', time: '10:24' },
    { from: 'Ali', text: 'Deploy to staging finished ✓', time: '10:31' },
    { from: 'You', text: 'Reviewing now.', time: '10:33' },
  ])
  const [draft, setDraft] = useState('')
  return (
    <Card className="flex flex-col p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><FaIcon icon="fa-message" className="h-4 w-4 text-primary" /> {t('dash.chat')}</h3>
      <div className="mb-3 max-h-52 flex-1 space-y-2 overflow-y-auto pe-1">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === 'You' ? 'ms-auto bg-sky-500/15' : 'bg-[var(--surface-2)]'}`}>
            <div className="text-[11px] font-bold text-primary">{m.from} · {m.time}</div>
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          setMsgs([...msgs, { from: 'You', text: draft.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
          setDraft('')
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" className="input" />
        <button className="btn btn-primary shrink-0 px-3"><FaIcon icon="fa-paper-plane" className="h-4 w-4 rtl:-scale-x-100" /></button>
      </form>
    </Card>
  )
}

export function TeamTimeClock() {
  const [clockedIn, setClockedIn] = useState(false)
  return (
    <>
      <PageHeader title="Time tracking" desc="Clock in and out for your shift." />
      <Card className="mx-auto max-w-md p-8 text-center">
        <div className="text-5xl font-extrabold tabular-nums tracking-tight gradient-text">06:30:00</div>
        <p className="mt-2 text-sm text-muted">{clockedIn ? '🟢 Clocked in since 09:00' : '⚪ Not clocked in'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => setClockedIn(!clockedIn)} className={`btn ${clockedIn ? 'btn-danger' : 'btn-primary'} px-8 py-3 text-base`}>
            {clockedIn ? 'Clock out' : <><FaIcon icon="fa-play" className="h-4 w-4" /> Clock in</>}
          </button>
        </div>
        <div className="mt-8 border-t border-line pt-5 text-start text-sm">
          <div className="mb-2 font-semibold">This week</div>
          {[['Monday', '8.0h'], ['Tuesday', '7.5h'], ['Wednesday', '8.0h'], ['Thursday', '6.5h'], ['Friday', '—']].map(([d, h]) => (
            <div key={d} className="flex justify-between border-b border-line py-1.5 last:border-0"><span className="text-muted">{d}</span><span className="font-medium">{h}</span></div>
          ))}
        </div>
      </Card>
    </>
  )
}
