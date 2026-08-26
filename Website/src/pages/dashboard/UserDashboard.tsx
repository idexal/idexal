import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/lib/useI18n'
import { Badge, Card, EmptyState, PageHeader, Progress, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { series, USER_API_KEYS } from '@/data/mock'
import { useUiStore } from '@/stores/uiStore'
import { FaIcon } from '@/components/shared/FaIcon'

const usage30 = series(30, 40, 14, 7)

export function UserOverview() {
  const t = useT()
  return (
    <>
      <PageHeader title={`${t('dash.welcome')}, Ahmed! 👋`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dash.projects')} value="5" icon={<FaIcon icon="fa-folder-tree" className="h-5 w-5" />} />
        <StatCard label="API Calls" value="1,230 / 5,000" icon={<FaIcon icon="fa-chart-line" className="h-5 w-5" />} />
        <StatCard label="Storage" value="1.2 / 5 GB" icon={<FaIcon icon="fa-layer-group" className="h-5 w-5" />} />
        <StatCard label="Active Sessions" value="2" icon={<FaIcon icon="fa-key" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">API Usage — 30 days</h3>
          <AreaChartX data={usage30} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">{t('dash.subscription')}</h3>
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 p-4">
            <div>
              <div className="text-lg font-bold">Pro</div>
              <div className="text-xs text-muted">Renews Sep 25, 2026</div>
            </div>
            <Badge color="blue">$29/mo</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { l: 'API calls', v: 1230, m: 5000 },
              { l: 'Storage', v: 1.2, m: 5 },
              { l: 'Compute hours', v: 9.5, m: 20 },
            ].map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex justify-between"><span className="text-muted">{r.l}</span><span>{r.v} / {r.m}</span></div>
                <Progress value={r.v} max={r.m} />
              </div>
            ))}
          </div>
          <Link to="/dashboard/subscription" className="btn btn-secondary mt-4 w-full">{t('dash.subscription')}</Link>
        </Card>
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Recent Activity</h3>
        <ul className="space-y-2.5 text-sm">
          {[
            ['📥', 'Downloaded Idexal IDE v1.0.0', '2 days ago'],
            ['🔑', "Generated API key 'staging'", '5 days ago'],
            ['⬆️', 'Upgraded to Pro plan', '1 month ago'],
          ].map(([e, txt, when]) => (
            <li key={txt} className="flex items-center gap-3">
              <span>{e}</span><span className="flex-1">{txt}</span><span className="text-xs text-muted">{when}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export function UserProfile() {
  const t = useT()
  const [saved, setSaved] = useState(false)
  const toast = useUiStore((s) => s.toast)
  return (
    <>
      <PageHeader title={t('dash.profile')} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="p-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl font-bold text-white">AH</div>
          <h3 className="mt-4 text-lg font-bold">Ahmed Hassan</h3>
          <p className="text-sm text-muted">ahmed@example.com</p>
          <Badge color="blue">Pro plan</Badge>
          <button className="btn btn-secondary mt-4 w-full">Upload new photo</button>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold">Personal information</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Name<input defaultValue="Ahmed Hassan" className="input mt-1.5" /></label>
              <label className="text-sm font-medium">Email<input dir="ltr" defaultValue="ahmed@example.com" className="input mt-1.5" /></label>
              <label className="text-sm font-medium sm:col-span-2">Bio<textarea rows={3} defaultValue="Full-stack developer building the future." className="input mt-1.5 resize-y" /></label>
              <label className="text-sm font-medium">Website<input dir="ltr" defaultValue="https://ahmed.dev" className="input mt-1.5" /></label>
              <label className="text-sm font-medium">Country<select defaultValue="EG" className="input mt-1.5"><option value="EG">🇪🇬 Egypt</option><option value="AE">🇦🇪 UAE</option><option value="US">🇺🇸 USA</option></select></label>
            </div>
            <button onClick={() => { setSaved(true); toast('Profile saved successfully', 'success') }} className="btn btn-primary mt-4">{saved ? '✓ Saved' : 'Save changes'}</button>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold">🔐 Security</h3>
            <div className="mt-4 divide-y divide-[var(--border)]">
              {[
                ['Change password', 'Last changed 3 months ago'],
                ['Two-Factor Authentication', 'Not enabled — recommended'],
                ['Active sessions', '2 devices signed in'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                  <button className="btn btn-secondary shrink-0">Manage</button>
                </div>
              ))}
            </div>
            <button className="btn btn-danger mt-4">Delete account</button>
          </Card>
        </div>
      </div>
    </>
  )
}

export function UserSubscription() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('dash.subscription')} desc="Manage your plan and payment method." actions={<Link to="/pricing" className="btn btn-secondary">Compare plans</Link>} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 ring-2 ring-primary md:col-span-2">
          <Badge color="blue">Current</Badge>
          <h3 className="mt-3 text-xl font-bold">Pro — $29/mo</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>✓ Unlimited projects · 50K API calls · AI Chat · Priority support</li>
            <li>Renews on September 25, 2026</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary">Upgrade to Team</button>
            <button className="btn btn-secondary">Change payment method</button>
            <button className="btn btn-ghost text-red-500">Cancel subscription</button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold"><FaIcon icon="fa-credit-card" regular className="me-2 inline h-4 w-4" />Payment method</h3>
          <div className="mt-4 rounded-xl border border-line p-4">
            <div className="font-mono text-sm">•••• •••• •••• 4242</div>
            <div className="mt-1 text-xs text-muted">Visa — expires 09/28</div>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Next invoice: $29.00 on Sep 25
          </div>
        </Card>
      </div>
    </>
  )
}

export function UserUsage() {
  const t = useT()
  return (
    <>
      <PageHeader title={t('dash.usage')} desc="Your consumption over the last 30 days." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">API Calls / day</h3>
          <AreaChartX data={usage30} height={260} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Quotas</h3>
          <div className="space-y-4">
            {[{ l: 'API calls', v: 1230, m: 50000 }, { l: 'Storage (GB)', v: 1.2, m: 5 }, { l: 'Compute (h)', v: 9.5, m: 100 }, { l: 'Bandwidth (GB)', v: 12, m: 50 }].map((q) => (
              <div key={q.l}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">{q.l}</span><span>{q.v.toLocaleString()} / {q.m.toLocaleString()}</span></div>
                <Progress value={q.v} max={q.m} color={q.v / q.m > 0.85 ? '#ef4444' : undefined} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-semibold">By provider</h3>
        <TableWrap head={['Provider', 'Calls', 'Tokens', 'Cost']}>
          {[['OpenAI GPT-4o', '820', '112k', '$8.20'], ['Anthropic Claude', '310', '44k', '$3.10'], ['Ollama local', '100', '18k', '$0.00']].map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => <Td key={i}>{c}</Td>)}
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function UserApiKeys() {
  const t = useT()
  const [copied, setCopied] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  return (
    <>
      <PageHeader
        title={t('dash.apiKeys')}
        desc="Keys authenticate API requests. Keep them secret."
        actions={<button className="btn btn-primary" onClick={() => setCreated(true)}><FaIcon icon="fa-plus" className="h-4 w-4" /> Generate key</button>}
      />
      {created && (
        <Card className="mb-4 border-blue-500/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <code className="rounded bg-blue-500/10 px-2 py-1 font-mono text-sm text-primary">sk-idexal-51f8…e92d</code>
            <Badge color="green">Copy it now — shown once</Badge>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <TableWrap head={['Name', 'Key', 'Created', 'Last used', 'Requests', 'Actions']}>
          {(created ? [...USER_API_KEYS, { id: 'key_3', name: 'new-key', masked: 'sk-…e92d', created: 'Today', lastUsed: 'never', requests: 0 }] : USER_API_KEYS).map((k) => (
            <tr key={k.id}>
              <Td className="font-semibold">{k.name}</Td>
              <Td><code className="font-mono text-xs">{k.masked}</code></Td>
              <Td>{k.created}</Td>
              <Td>{k.lastUsed}</Td>
              <Td>{k.requests.toLocaleString()}</Td>
              <Td>
                <div className="flex gap-1.5">
                  <button
                    className="btn btn-ghost p-1.5"
                    aria-label="copy"
                    onClick={() => {
                      setCopied(k.id)
                      setTimeout(() => setCopied(null), 1200)
                    }}
                  >
                    {copied === k.id ? <FaIcon icon="fa-check" className="h-4 w-4 text-accent" /> : <FaIcon icon="fa-copy" regular className="h-4 w-4" />}
                  </button>
                  <button className="btn btn-ghost p-1.5 text-red-500">Revoke</button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function UserDownloads() {
  const t = useT()
  const builds = [
    { platform: 'Windows x64', file: '.exe', size: '84 MB', icon: '🪟' },
    { platform: 'Windows Portable', file: '.zip', size: '91 MB', icon: '🪟' },
    { platform: 'macOS Intel', file: '.dmg', size: '96 MB', icon: '🍎' },
    { platform: 'macOS Apple Silicon', file: '.dmg', size: '94 MB', icon: '🍎' },
    { platform: 'Linux AppImage', file: '.AppImage', size: '102 MB', icon: '🐧' },
    { platform: 'Linux DEB', file: '.deb', size: '99 MB', icon: '🐧' },
  ]
  return (
    <>
      <PageHeader title={t('dash.downloads')} desc="Detected platform: Windows x64" />
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Idexal IDE v1.0.0 — Stable</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <div key={b.platform} className="flex items-center justify-between gap-3 rounded-xl border border-line p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{b.icon} {b.platform}</div>
                <div className="text-xs text-muted">v1.0.0 · {b.file} · {b.size}</div>
              </div>
              <button className="btn btn-primary shrink-0"><FaIcon icon="fa-download" className="h-4 w-4" /> Get</button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-semibold">Download history</h3>
        <TableWrap head={['Version', 'Platform', 'Date']}>
          {[['v1.0.0', 'Windows x64', 'Aug 23, 2026'], ['v0.9.0-beta', 'Windows x64', 'Jul 15, 2026']].map((r) => (
            <tr key={r[0]}>{r.map((c, i) => <Td key={i}>{c}</Td>)}</tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function UserProjects() {
  const projects = [
    { name: 'ecommerce-api', lang: 'TypeScript', files: 214, updated: '2h ago', color: '#3178c6' },
    { name: 'ml-pipeline', lang: 'Python', files: 87, updated: 'Yesterday', color: '#3572A5' },
    { name: 'game-server', lang: 'Rust', files: 341, updated: '3 days ago', color: '#dea584' },
    { name: 'portfolio-site', lang: 'TypeScript', files: 45, updated: '1 week ago', color: '#3178c6' },
    { name: 'cli-tool', lang: 'Go', files: 63, updated: '2 weeks ago', color: '#00ADD8' },
  ]
  return (
    <>
      <PageHeader title="Projects" actions={<button className="btn btn-primary"><FaIcon icon="fa-plus" className="h-4 w-4" /> New project</button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.name} className="p-5" hover>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold">{p.name}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: p.color }} title={p.lang} />
            </div>
            <div className="mt-2 text-xs text-muted">{p.lang} · {p.files} files</div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted">Updated {p.updated}</span>
              <button className="btn btn-secondary px-3 py-1.5 text-xs">Open</button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

export function UserBilling() {
  return (
    <>
      <PageHeader title="Billing & invoices" />
      <Card className="p-5">
        <TableWrap head={['Invoice', 'Amount', 'Date', 'Method', 'Status', '']}>
          {[
            ['INV-1042', '$29.00', '2026-08-01', 'Visa •••• 4242', 'paid'],
            ['INV-1039', '$29.00', '2026-07-01', 'Visa •••• 4242', 'paid'],
            ['INV-1036', '$29.00', '2026-06-01', 'Visa •••• 4242', 'paid'],
            ['INV-1033', '$29.00', '2026-05-01', 'Visa •••• 4242', 'refunded'],
          ].map(([id, amt, date, method, status]) => (
            <tr key={id}>
              <Td className="font-semibold">{id}</Td>
              <Td>{amt}</Td>
              <Td>{date}</Td>
              <Td>{method}</Td>
              <Td><Badge color={status === 'paid' ? 'green' : status === 'failed' ? 'red' : 'amber'}>{status}</Badge></Td>
              <Td><button className="btn btn-ghost px-2 py-1 text-xs">PDF ↓</button></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function UserSupport() {
  const [sent, setSent] = useState(false)
  return (
    <>
      <PageHeader title="Support" desc="Open a ticket or browse documentation." />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="p-6">
          {sent ? (
            <EmptyState icon={<FaIcon icon="fa-check" className="h-6 w-6" />} title={`Ticket #TK-2042 created — we'll reply within 24h.`} />
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-4">
              <label className="block text-sm font-medium">Subject<input required className="input mt-1.5" placeholder="Describe your issue briefly" /></label>
              <label className="block text-sm font-medium">
                Category
                <select className="input mt-1.5"><option>Bug report</option><option>Feature request</option><option>Billing</option><option>Account</option></select>
              </label>
              <label className="block text-sm font-medium">Message<textarea required rows={5} className="input mt-1.5 resize-y" placeholder="Include steps to reproduce…" /></label>
              <button className="btn btn-primary">Submit ticket</button>
            </form>
          )}
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <FaIcon icon="fa-life-ring" className="h-6 w-6 text-primary" />
            <h3 className="mt-2 font-semibold">Documentation</h3>
            <p className="mt-1 text-sm text-muted">Most answers live in our guides.</p>
            <Link to="/docs" className="btn btn-secondary mt-3 w-full">Browse docs</Link>
          </Card>
          <Card className="p-5">
            <FaIcon icon="fa-house" className="h-6 w-6 text-primary" />
            <h3 className="mt-2 font-semibold">Community</h3>
            <p className="mt-1 text-sm text-muted">Join 5,000+ developers on Discord.</p>
            <button className="btn btn-secondary mt-3 w-full">Join server</button>
          </Card>
        </div>
      </div>
    </>
  )
}

export function UserSettings() {
  const t = useT()
  const items = [
    ['Email notifications', 'Product updates and receipts', true],
    ['Security alerts', 'New sign-ins and password changes', true],
    ['Weekly usage digest', 'Summary of API consumption', false],
    ['Beta features', 'Try experimental features early', false],
  ] as const
  const [prefs, setPrefs] = useState(items.map((x) => x[2]))
  return (
    <>
      <PageHeader title={t('dash.settings')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold">Notifications</h3>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {items.map((it, i) => (
              <div key={it[0]} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium">{it[0]}</div>
                  <div className="text-xs text-muted">{it[1]}</div>
                </div>
                <Toggle on={prefs[i]} onChange={(v) => setPrefs(prefs.map((x, j) => (j === i ? v : x)))} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Preferences</h3>
          <div className="mt-4 grid gap-4">
            <label className="text-sm font-medium">Language
              <select defaultValue="en" className="input mt-1.5">{[['en', 'English'], ['ar', 'العربية'], ['fr', 'Français'], ['de', 'Deutsch'], ['ja', '日本語'], ['zh', '中文']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="text-sm font-medium">Theme
              <select defaultValue="dark" className="input mt-1.5"><option value="light">☀️ Light</option><option value="dark">🌙 Dark</option><option value="system">💻 System</option></select>
            </label>
            <label className="text-sm font-medium">Editor font size
              <input type="number" min={10} max={22} defaultValue={14} className="input mt-1.5" />
            </label>
            <button className="btn btn-primary">Save preferences</button>
          </div>
        </Card>
      </div>
    </>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-[var(--surface-2)] border border-line'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-[1.4rem]' : 'start-0.5'}`} />
    </button>
  )
}

export const USER_NAV_ICONS = {
  home: <FaIcon icon="fa-house" className="h-5 w-5" />,
  profile: <FaIcon icon="fa-user" regular className="h-5 w-5" />,
  subscription: <FaIcon icon="fa-credit-card" regular className="h-5 w-5" />,
  usage: <FaIcon icon="fa-chart-line" className="h-5 w-5" />,
  keys: <FaIcon icon="fa-key" className="h-5 w-5" />,
  downloads: <FaIcon icon="fa-download" className="h-5 w-5" />,
  projects: <FaIcon icon="fa-folder-tree" className="h-5 w-5" />,
  billing: <FaIcon icon="fa-credit-card" regular className="h-5 w-5" />,
  support: <FaIcon icon="fa-life-ring" className="h-5 w-5" />,
  settings: <FaIcon icon="fa-gear" className="h-5 w-5" />,
}
