import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useT } from '@/lib/useI18n'
import { Badge, Card, EmptyState, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX, BarChartX } from '@/components/ui/charts'
import { PROVIDERS, series } from '@/data/mock'
import { useUiStore } from '@/stores/uiStore'
import type { Provider } from '@/types'
import { FaIcon } from '@/components/shared/FaIcon'

export function AdminProviders() {
  const t = useT()
  const [kind, setKind] = useState('All')
  const kinds = ['All', 'AI', 'Embedding', 'Search', 'Rerank']
  const list = PROVIDERS.filter((p) => kind === 'All' || p.kind === kind)
  return (
    <>
      <PageHeader
        title={t('dash.providers')}
        desc="Every AI provider in one hub — keys, models, usage and fallback chains."
        actions={<button className="btn btn-primary"><FaIcon icon="fa-plus" className="h-4 w-4" /> Add provider</button>}
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`btn px-3 py-1.5 text-xs ${kind === k ? 'btn-primary' : 'btn-secondary'}`}>{k}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((p) => (
          <Card key={p.id} className="p-5" hover>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-primary"><FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" /></span>
                <div>
                  <div className="flex items-center gap-2 font-bold">{p.name} <Badge color="gray">{p.kind}</Badge></div>
                  <code dir="ltr" className="font-mono text-xs text-muted">{p.apiKeyMasked}</code>
                </div>
              </div>
              {p.status === 'connected' ? <Badge color="green">🟢 Active</Badge> : p.status === 'error' ? <Badge color="red">🔴 Error</Badge> : <Badge color="gray">Disabled</Badge>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-center text-xs">
              <div><div className="font-bold">{p.usage30d.toLocaleString()}</div><div className="text-muted">tokens 30d</div></div>
              <div><div className="font-bold">${p.cost.toFixed(2)}</div><div className="text-muted">cost</div></div>
              <div><div className="font-bold">{p.latencyMs || '—'}{p.latencyMs ? 'ms' : ''}</div><div className="text-muted">latency</div></div>
            </div>
            {p.models.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {p.models.map((m) => (
                  <div key={m} dir="ltr" className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-sm">
                    <span className="font-mono text-xs">{m}</span>
                    <span className="flex items-center gap-2">
                      <Badge color="green">Active</Badge>
                      <Link to="/admin/providers/configure" className="text-xs font-semibold text-primary hover:underline">Configure</Link>
                    </span>
                  </div>
                ))}
                <button dir="ltr" className="w-full rounded-lg border border-dashed border-line py-1.5 text-xs text-muted hover:border-primary hover:text-primary">+ Add custom model</button>
              </div>
            )}
            {p.fallback && (
              <div className="mt-3 text-xs text-muted">
                Fallback: {p.fallback.map((f) => PROVIDERS.find((x) => x.id === f)?.name ?? f).join(' → ')}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-secondary flex-1 px-3 py-1.5 text-xs"><FaIcon icon="fa-arrows-rotate" className="h-3.5 w-3.5" /> Test connection</button>
              <Link to={`/admin/providers/${p.id}`} className="btn btn-secondary flex-1 px-3 py-1.5 text-xs">Details & logs</Link>
              <Link to="/admin/providers/configure" className="btn btn-ghost px-2 py-1.5 text-xs"><FaIcon icon="fa-sliders" className="h-4 w-4" /></Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

export function AdminProviderDetail() {
  const t = useT()
  const { id } = useParams()
  const p: Provider = PROVIDERS.find((x) => x.id === id) ?? PROVIDERS[0]
  return (
    <>
      <PageHeader title={`${t('dash.providers')} / ${p.name}`} desc={`${p.kind} · ${p.status}`} actions={<button className="btn btn-secondary">View logs</button>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Calls — last 30 days</h3>
            <AreaChartX data={p.history.length ? p.history : [{ day: '—', calls: 0 }]} dataKey="calls" height={220} />
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Models</h3>
            <TableWrap head={['Model', 'Chat', 'Embedding', 'Cost / 1K', 'Status']}>
              {(p.models.length ? p.models : ['—']).map((m, i) => (
                <tr key={m}>
                  <Td><code dir="ltr" className="font-mono text-xs">{m}</code></Td>
                  <Td>{i < 2 && m !== '—' ? <FaIcon icon="fa-check" className="text-accent" /> : '—'}</Td>
                  <Td>{m === '—' ? '—' : i === p.models.length - 1 ? '✗' : '✓'}</Td>
                  <Td>${(0.01 / (i + 1)).toFixed(3)}</Td>
                  <Td><Badge color={p.status === 'connected' ? 'green' : 'red'}>{p.status}</Badge></Td>
                </tr>
              ))}
            </TableWrap>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5 text-center">
            <div className="text-3xl font-extrabold gradient-text">{p.usage30d.toLocaleString()}</div>
            <div className="text-xs text-muted">tokens used (30d)</div>
            <div className="mt-4 text-2xl font-bold">${p.cost.toFixed(2)}</div>
            <div className="text-xs text-muted">estimated cost</div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 font-semibold">Fallback chain</h3>
            <ol className="space-y-2 text-sm">
              <li className="rounded-lg bg-blue-500/10 px-3 py-2 font-semibold text-primary">1 · This provider ({p.name})</li>
              {(p.fallback ?? []).map((f, i) => (
                <li key={f} className="rounded-lg bg-[var(--surface-2)] px-3 py-2">{i + 2} · {PROVIDERS.find((x) => x.id === f)?.name}</li>
              ))}
            </ol>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 font-semibold">API key</h3>
            <code dir="ltr" className="block break-all rounded-lg bg-[var(--surface-2)] p-3 font-mono text-xs">{p.apiKeyMasked}</code>
            <button className="btn btn-danger mt-3 w-full">Rotate key</button>
          </Card>
        </div>
      </div>
    </>
  )
}

export function AdminProviderConfigure() {
  const [authMode, setAuthMode] = useState<'bearer' | 'header'>('bearer')
  const [tested, setTested] = useState<null | boolean>(null)
  const toast = useUiStore((s) => s.toast)
  return (
    <>
      <PageHeader title="Configure Provider — Custom API" desc="Connect any OpenAI-compatible endpoint." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Provider Name<input defaultValue="My Custom API" className="input mt-1.5" /></label>
            <label className="text-sm font-medium">Base URL<input dir="ltr" defaultValue="https://api.idexa.com/v1" className="input mt-1.5" /></label>
          </div>
          <label className="block text-sm font-medium">API Key<div className="mt-1.5 flex gap-2"><input dir="ltr" type="password" defaultValue="sk-secret" className="input" /><button className="btn btn-secondary shrink-0">Show</button></div></label>

          <div>
            <div className="mb-2 text-sm font-medium">Authentication</div>
            <div className="flex flex-wrap gap-4 text-sm">
              {[['bearer', 'Bearer Token'], ['header', 'Custom Header']].map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={authMode === v} onChange={() => setAuthMode(v as typeof authMode)} className="accent-[var(--primary)]" /> {l}
                </label>
              ))}
            </div>
            {authMode === 'header' && <input placeholder="X-API-Key" className="input mt-2 max-w-xs" />}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Models (auto-discovered)</div>
            <div dir="ltr" className="space-y-1.5">
              {[['idexal-pro', true, true, '$0.001'], ['idexal-lite', true, false, '$0.0005']].map(([m, chat, emb, cost]) => (
                <div key={m as string} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{m}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span>{chat ? 'Chat ✓' : 'Chat ✗'} · {emb ? 'Embed ✓' : 'Embed ✗'}</span>
                    <span className="text-muted">{cost}/1K</span>
                  </span>
                </div>
              ))}
              <button className="w-full rounded-lg border border-dashed border-line py-2 text-xs text-muted hover:border-primary hover:text-primary">+ Add model manually</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium">Requests/min<input dir="ltr" type="number" defaultValue={1000} className="input mt-1.5" /></label>
            <label className="text-sm font-medium">Tokens/min<input dir="ltr" type="number" defaultValue={100000} className="input mt-1.5" /></label>
            <label className="text-sm font-medium">Concurrent<input dir="ltr" type="number" defaultValue={50} className="input mt-1.5" /></label>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Fallback chain</div>
            <div className="grid max-w-md gap-2">
              <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-semibold text-primary">1 · This provider (Custom)</div>
              <select className="input" defaultValue=""><option value="">2 · Choose fallback…</option><option>OpenAI</option><option>Anthropic</option></select>
              <select className="input" defaultValue=""><option value="">3 · Choose fallback…</option><option>Google AI</option><option>Groq</option></select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => { setTested(true); toast('Connection successful — 12 models discovered', 'success') }} className="btn btn-secondary"><FaIcon icon="fa-arrows-rotate" className="h-4 w-4" /> Test connection</button>
            <button onClick={() => toast('Custom provider saved', 'success')} className="btn btn-primary"><FaIcon icon="fa-floppy-disk" regular className="h-4 w-4" /> Save</button>
            <Link to="/admin/providers" className="btn btn-ghost">Cancel</Link>
          </div>
          {tested !== null && (
            <div className={`rounded-xl p-3 text-sm font-medium ${tested ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {tested ? '✓ Connection successful — 12 models discovered (234ms)' : '✗ Connection failed'}
            </div>
          )}
        </Card>
        <Card className="h-fit p-6">
          <h3 className="font-semibold">Rate limits preview</h3>
          <div className="mt-4 space-y-4">
            <div><div className="mb-1 flex justify-between text-sm"><span className="text-muted">Requests/min</span><span>1,000</span></div><Progress value={65} /></div>
            <div><div className="mb-1 flex justify-between text-sm"><span className="text-muted">Tokens/min</span><span>100,000</span></div><Progress value={80} color="#22d3ee" /></div>
            <div><div className="mb-1 flex justify-between text-sm"><span className="text-muted">Concurrency</span><span>50</span></div><Progress value={40} color="#10b981" /></div>
          </div>
        </Card>
      </div>
    </>
  )
}

export function AdminContent() {
  const tabs = [
    { id: 'blog', label: 'Blog' },
    { id: 'pages', label: 'Pages' },
    { id: 'docs', label: 'Docs' },
    { id: 'faq', label: 'FAQ' },
    { id: 'changelog', label: 'Changelog' },
  ]
  const posts = [
    { title: 'Introducing Idexal IDE 1.0', status: 'Published', author: 'Team', date: 'Aug 20' },
    { title: 'Inside the Rust Engine', status: 'Published', author: 'Layla', date: 'Aug 12' },
    { title: 'Roadmap H2 2026', status: 'Draft', author: 'Team', date: 'Today' },
    { title: 'Agent Marketplace teaser', status: 'Review', author: 'Yousef', date: 'Yesterday' },
  ]
  const [tab, setTab] = useState('blog')
  return (
    <>
      <PageHeader title="Content Management" actions={<button className="btn btn-primary"><FaIcon icon="fa-pen-to-square" className="h-4 w-4" /> New post</button>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className={`btn px-3.5 py-1.5 text-xs ${tab === x.id ? 'btn-primary' : 'btn-secondary'}`}>{x.label}</button>
        ))}
      </div>
      <Card className="p-4">
        <TableWrap head={['Title', 'Status', 'Author', 'Date', 'Actions']}>
          {posts.map((p) => (
            <tr key={p.title}>
              <Td className="max-w-xs truncate font-semibold">{p.title}</Td>
              <Td><Badge color={p.status === 'Published' ? 'green' : p.status === 'Draft' ? 'gray' : 'amber'}>{p.status}</Badge></Td>
              <Td>{p.author}</Td>
              <Td>{p.date}</Td>
              <Td><div className="flex gap-2 text-xs"><button className="font-semibold text-primary hover:underline">Edit</button><button className="text-red-500 hover:underline">Delete</button></div></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function AdminAnalytics() {
  const t = useT()
  const analytics30 = series(30, 40000, 3000, 17).map((p) => ({ day: p.day, api: p.value }))
  const sessions = series(30, 8000, 700, 19)
  return (
    <>
      <PageHeader title={t('dash.analytics')} desc="Traffic, API consumption and engagement." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions (MTD)" value="248K" delta="+11%" icon={<FaIcon icon="fa-globe" className="h-5 w-5" />} />
        <StatCard label="API Calls (MTD)" value="1.2M" delta="+23%" icon={<FaIcon icon="fa-microchip" className="h-5 w-5" />} />
        <StatCard label="Avg. session" value="14m 32s" icon={<FaIcon icon="fa-layer-group" className="h-5 w-5" />} />
        <StatCard label="Bounce rate" value="18%" delta="-3%" icon={<FaIcon icon="fa-bolt" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">API consumption</h3>
          <AreaChartX data={analytics30.map((d) => ({ day: d.day, value: d.api }))} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Website sessions</h3>
          <AreaChartX data={sessions} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Top pages</h3>
          <BarChartX layout="vertical" data={[{ name: '/', value: 84200 }, { name: '/pricing', value: 41300 }, { name: '/docs', value: 33900 }, { name: '/features', value: 27800 }, { name: '/blog', value: 19600 }]} dataKey="value" colors={['#22d3ee']} height={220} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Referrers</h3>
          <BarChartX layout="vertical" data={[{ name: 'google.com', value: 46200 }, { name: 'news.ycom.com', value: 21400 }, { name: 'github.com', value: 18900 }, { name: 'twitter.com', value: 12300 }, { name: 'direct', value: 58200 }]} dataKey="value" colors={['#10b981']} height={220} />
        </Card>
      </div>
    </>
  )
}

export function AdminSettings() {
  const [saved, setSaved] = useState(false)
  const toast = useUiStore((s) => s.toast)
  return (
    <>
      <PageHeader title="Platform Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h3 className="font-semibold">General</h3>
          <label className="block text-sm font-medium">Site name<input defaultValue="Idexal" className="input mt-1.5" /></label>
          <label className="block text-sm font-medium">Support email<input dir="ltr" defaultValue="support@idexal.dev" className="input mt-1.5" /></label>
          <label className="block text-sm font-medium">Default language
            <select defaultValue="en" className="input mt-1.5"><option value="en">English</option><option value="ar">العربية</option></select>
          </label>
          <label className="flex items-center justify-between rounded-xl border border-line p-3 text-sm font-medium">
            Maintenance mode
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        </Card>
        <Card className="space-y-4 p-6">
          <h3 className="font-semibold">Integrations</h3>
          <div className="divide-y divide-[var(--border)]">
            {[['Stripe', 'Payments & subscriptions'], ['Resend', 'Transactional email'], ['Plausible', 'Privacy-first analytics'], ['Cloudflare', 'CDN & WAF']].map(([n, d]) => (
              <div key={n} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div><div className="text-sm font-semibold">{n}</div><div className="text-xs text-muted">{d}</div></div>
                <Badge color="green"><FaIcon icon="fa-check" className="h-3 w-3" /> Connected</Badge>
              </div>
            ))}
          </div>
          <button onClick={() => { setSaved(true); toast('Settings saved', 'success') }} className="btn btn-primary">{saved ? '✓ Saved' : 'Save changes'}</button>
        </Card>
      </div>
    </>
  )
}

export function AdminSystem() {
  const services = [
    { name: 'api-gateway', cpu: 34, mem: 61, ok: true },
    { name: 'dashboard-web', cpu: 12, mem: 28, ok: true },
    { name: 'agent-worker-1', cpu: 78, mem: 82, ok: false },
    { name: 'db-primary', cpu: 41, mem: 55, ok: true },
    { name: 'redis-cache', cpu: 8, mem: 22, ok: true },
  ]
  return (
    <>
      <PageHeader title="System Health" desc="Servers, workers and infrastructure." actions={<button className="btn btn-secondary"><FaIcon icon="fa-server" className="h-4 w-4" /> Restart all</button>} />
      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Service', 'CPU', 'Memory', 'Status']}>
          {services.map((s) => (
            <tr key={s.name}>
              <Td><code dir="ltr" className="font-mono text-xs font-semibold">{s.name}</code></Td>
              <Td><div className="w-40"><Progress value={s.cpu} color={s.cpu > 70 ? '#ef4444' : '#3b82f6'} /><span className="mt-1 block text-xs text-muted">{s.cpu}%</span></div></Td>
              <Td><div className="w-40"><Progress value={s.mem} color={s.mem > 75 ? '#f59e0b' : '#22d3ee'} /><span className="mt-1 block text-xs text-muted">{s.mem}%</span></div></Td>
              <Td>{s.ok ? <Badge color="green">Healthy</Badge> : <Badge color="amber">High load</Badge>}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Uptime (90d)" value="99.97%" icon={<FaIcon icon="fa-server" className="h-5 w-5" />} />
        <StatCard label="Queue depth" value="142 jobs" icon={<FaIcon icon="fa-chevron-right" className="h-5 w-5" />} />
        <StatCard label="Error rate (24h)" value="0.03%" icon={<FaIcon icon="fa-magnifying-glass" className="h-5 w-5" />} />
      </div>
    </>
  )
}

export function TrashIcon() {
  return <FaIcon icon="fa-trash-can" className="h-4 w-4" />
}

export function NoProvidersYet() {
  return <EmptyState icon={<FaIcon icon="fa-plug-circle-bolt" className="h-6 w-6" />} title="No providers configured yet." />
}
