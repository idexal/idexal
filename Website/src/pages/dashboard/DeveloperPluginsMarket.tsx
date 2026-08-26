import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Link } from 'react-router-dom'
import { Badge, Card, PageHeader, StatCard } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

interface MarketPlugin {
  id: string
  name: string
  author: string
  desc: string
  installs: number
  rating: number
  price: number
  installed: boolean
  emoji: string
}

const MARKET: MarketPlugin[] = [
  { id: 'themex', name: 'ThemeX', author: 'Kenji Tanaka', desc: '12 beautiful themes with instant preview and custom accent colors.', installs: 1230, rating: 4.8, price: 2.99, installed: false, emoji: '🎨' },
  { id: 'gitpro', name: 'GitPro Tools', author: 'Kenji Tanaka', desc: 'Advanced staging, interactive rebase visualizer and PR templates.', installs: 890, rating: 4.6, price: 4.99, installed: false, emoji: '🌿' },
  { id: 'vimx', name: 'VimX Bindings', author: 'Hans Müller', desc: 'Full Vim motions with plugin support and custom keymaps.', installs: 2140, rating: 4.9, price: 0, installed: true, emoji: '⌨️' },
  { id: 'dockerdash', name: 'Docker Dash', author: 'Marie Dubois', desc: 'Manage containers, images and volumes without leaving the IDE.', installs: 410, rating: 4.3, price: 0, installed: false, emoji: '🐳' },
  { id: 'sqlsniper', name: 'SQL Sniper', author: 'Li Wei', desc: 'Query autocomplete, schema visualizer and safe migrations.', installs: 0, rating: 0, price: 6.99, installed: false, emoji: '🗄️' },
  { id: 'regexhero', name: 'Regex Hero', author: 'Sara Johnson', desc: 'Live regex testing with explanations and match highlighting.', installs: 620, rating: 4.1, price: 0, installed: true, emoji: '🔍' },
]

export function DeveloperPluginsMarket() {
  const toast = useUiStore((s) => s.toast)
  const [plugins, setPlugins] = useState(MARKET)
  const [q, setQ] = useState('')

  const list = plugins.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const installedCount = plugins.filter((p) => p.installed).length

  const toggleInstall = (p: MarketPlugin) => {
    setPlugins(plugins.map((x) => (x.id === p.id ? { ...x, installed: !x.installed, installs: x.installs + (x.installed ? -1 : 1) } : x)))
    toast(p.installed ? `${p.name} uninstalled` : `${p.name} installed — restart not required`, p.installed ? 'info' : 'success')
  }

  return (
    <>
      <PageHeader
        title="Plugin marketplace"
        desc={`${plugins.length} plugins · ${installedCount} installed`}
        actions={<Link to="/developer/plugins/submit" className="btn btn-primary"><FaIcon icon="fa-upload" className="h-4 w-4" /> Publish yours</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Installed" value={String(installedCount)} icon={<FaIcon icon="fa-plug" className="h-5 w-5" />} />
        <StatCard label="Marketplace total" value={String(plugins.reduce((a, p) => a + p.installs, 0))} icon={<FaIcon icon="fa-download" className="h-5 w-5" />} />
        <StatCard label="Avg rating" value={(plugins.reduce((a, p) => a + p.rating, 0) / plugins.length).toFixed(1)} icon={<FaIcon icon="fa-star" className="h-5 w-5" />} />
      </div>

      <div className="relative mb-4 mt-6 max-w-xs">
        <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search marketplace…" className="input ps-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <Card key={p.id} className="flex flex-col p-5" hover>
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-2xl">{p.emoji}</span>
              {p.installed && <Badge color="green">installed</Badge>}
            </div>
            <h3 className="mt-3 font-bold">{p.name}</h3>
            <p className="mt-1 text-xs text-muted">by {p.author}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.desc}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <span><FaIcon icon="fa-download" className="me-1 h-3 w-3" />{p.installs.toLocaleString()}</span>
              <span>⭐ {p.rating || 'new'}</span>
              <span className="ms-auto font-bold text-[var(--text)]">{p.price === 0 ? 'Free' : `$${p.price}`}</span>
            </div>
            <button onClick={() => toggleInstall(p)} className={`btn mt-4 w-full ${p.installed ? 'btn-secondary' : 'btn-primary'}`}>
              {p.installed ? <>Uninstall</> : <><FaIcon icon="fa-plus" className="h-3.5 w-3.5" /> Install</>}
            </button>
          </Card>
        ))}
      </div>
    </>
  )
}
