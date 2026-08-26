import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useT } from '@/lib/useI18n'
import { Badge, Card, EmptyState, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { AreaChartX } from '@/components/ui/charts'
import { MY_PLUGINS, USER_API_KEYS, series } from '@/data/mock'
import { FaIcon } from '@/components/shared/FaIcon'

const devUsage = series(30, 400, 90, 29)

export function DeveloperOverview() {
  return (
    <>
      <PageHeader title="🛠️ Developer Hub" desc="Your API usage, keys and plugins in one place." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="API requests (30d)" value="13,570" delta="+18%" icon={<FaIcon icon="fa-code" className="h-5 w-5" />} />
        <StatCard label="Active keys" value={String(USER_API_KEYS.length)} icon={<FaIcon icon="fa-key" className="h-5 w-5" />} />
        <StatCard label="Published plugins" value="2" icon={<FaIcon icon="fa-box-open" className="h-5 w-5" />} />
        <StatCard label="Plugin revenue" value="$770" delta="+12%" icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">API Usage — 30 days</h3>
          <AreaChartX data={devUsage} height={240} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Quick actions</h3>
          <div className="space-y-2">
            {[
              { to: '/developer/api-keys', icon: 'fa-key', label: 'Generate new API key' },
              { to: '/developer/playground', icon: 'fa-flask', label: 'Test API endpoint' },
              { to: '/developer/plugins', icon: 'fa-box-open', label: 'View plugin stats' },
              { to: '/docs', icon: 'fa-book-open', label: 'Read documentation' },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-medium transition hover:border-primary hover:text-primary">
                <FaIcon icon={a.icon} className="h-4 w-4 text-primary" /> {a.label}
                <span className="ms-auto text-muted">›</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

export function DeveloperApiKeys() {
  return (
    <>
      <PageHeader title="API Keys" actions={<button className="btn btn-primary"><FaIcon icon="fa-plus" className="h-4 w-4" /> Generate key</button>} />
      <Card className="p-4">
        <TableWrap head={['Name', 'Key', 'Created', 'Last used', 'Requests', 'Actions']}>
          {USER_API_KEYS.map((k) => (
            <tr key={k.id}>
              <Td className="font-semibold">{k.name}</Td>
              <Td><code dir="ltr" className="font-mono text-xs">{k.masked}</code></Td>
              <Td>{k.created}</Td>
              <Td>{k.lastUsed}</Td>
              <Td>{k.requests.toLocaleString()}</Td>
              <Td><button className="text-xs font-semibold text-red-500 hover:underline">Revoke</button></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function DeveloperPlugins() {
  const t = useT()
  return (
    <>
      <PageHeader
        title={`${t('dash.plugins')} — My Plugins`}
        actions={<Link to="/developer/plugins/submit" className="btn btn-primary"><FaIcon icon="fa-upload" className="h-4 w-4" /> Submit plugin</Link>}
      />
      <Card className="p-4">
        <TableWrap head={['Plugin', 'Installs', 'Rating', 'Revenue', 'Status']}>
          {MY_PLUGINS.map((p) => (
            <tr key={p.id}>
              <Td><Link to={`/developer/plugins/${p.id}`} className="font-semibold hover:text-primary">{p.name}</Link></Td>
              <Td>{p.installs.toLocaleString()}</Td>
              <Td>⭐ {p.rating}</Td>
              <Td>${p.revenue}</Td>
              <Td><Badge color={p.status === 'live' ? 'green' : p.status === 'review' ? 'amber' : 'gray'}>{p.status}</Badge></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}

export function DeveloperPluginDetail() {
  const { id } = useParams()
  const p = MY_PLUGINS.find((x) => x.id === id) ?? MY_PLUGINS[0]
  const installs = series(30, p.installs / 30, p.installs / 120, 41)
  return (
    <>
      <PageHeader title={`🧩 ${p.name}`} desc={`Status: ${p.status} · ⭐ ${p.rating}`} actions={<button className="btn btn-secondary">Update version</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Installs" value={p.installs.toLocaleString()} icon={<FaIcon icon="fa-boxes-stacked" className="h-5 w-5" />} />
        <StatCard label="Rating" value={`${p.rating} / 5`} icon={<FaIcon icon="fa-star" className="h-5 w-5" />} />
        <StatCard label="Revenue (total)" value={`$${p.revenue}`} icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
      </div>
      <Card className="mt-6 p-5">
        <h3 className="mb-3 font-semibold">Install trend — 30 days</h3>
        <AreaChartX data={installs} height={220} />
      </Card>
    </>
  )
}

export function DeveloperSubmitPlugin() {
  const [submitted, setSubmitted] = useState(false)
  return (
    <>
      <PageHeader title="Submit New Plugin" desc="Packages are reviewed within 3 business days." />
      {submitted ? (
        <Card className="p-10 text-center">
          <FaIcon icon="fa-rocket" className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-3 text-lg font-bold">Submitted for review!</h3>
          <p className="mt-1 text-sm text-muted">We'll email you when the review completes.</p>
        </Card>
      ) : (
        <Card className="max-w-2xl p-6">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
            <label className="block text-sm font-medium">Plugin Name<input required className="input mt-1.5" placeholder="MyAwesomePlugin" /></label>
            <label className="block text-sm font-medium">Description<textarea required rows={3} className="input mt-1.5 resize-y" placeholder="What does your plugin do?" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Version<input dir="ltr" defaultValue="1.0.0" className="input mt-1.5" /></label>
              <label className="block text-sm font-medium">Price
                <select className="input mt-1.5"><option>Free</option><option>$2.99</option><option>$4.99</option><option>$9.99</option></select>
              </label>
            </div>
            <label className="block cursor-pointer rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted transition hover:border-primary hover:text-primary">
              <FaIcon icon="fa-upload" className="mx-auto mb-2 h-6 w-6" />
              Choose package (.ixp or .zip)
              <input type="file" className="hidden" accept=".zip,.ixp,.tgz" />
            </label>
            <button type="submit" className="btn btn-primary"><FaIcon icon="fa-paper-plane" className="h-4 w-4 rtl:-scale-x-100" /> Submit for review</button>
          </form>
        </Card>
      )}
    </>
  )
}

export function DeveloperEarnings() {
  const earnings = series(30, 10, 3, 61)
  return (
    <>
      <PageHeader title="💰 Earnings" actions={<button className="btn btn-primary">Request payout</button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total earnings" value="$2,450" icon={<FaIcon icon="fa-dollar-sign" className="h-5 w-5" />} />
        <StatCard label="This month" value="$320" delta="+9%" icon={<FaIcon icon="fa-arrow-trend-up" className="h-5 w-5" />} />
        <StatCard label="Pending payout" value="$180" icon={<FaIcon icon="fa-paper-plane" className="h-5 w-5" />} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Daily revenue — 30 days</h3>
          <AreaChartX data={earnings} height={230} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Payouts</h3>
          <div className="space-y-2 text-sm">
            {[['Aug 2026', '$320', 'pending'], ['Jul 2026', '$410', 'paid'], ['Jun 2026', '$380', 'paid'], ['May 2026', '$350', 'paid']].map(([m, amt, st]) => (
              <div key={m} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2.5">
                <span className="font-medium">{m}</span>
                <span className="flex items-center gap-2">{amt} <Badge color={st === 'paid' ? 'green' : 'amber'}>{st}</Badge></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

export function DeveloperSdk() {
  const sdks = [
    { name: 'idexal-ts', lang: 'TypeScript', cmd: 'npm install @idexal/sdk' },
    { name: 'idexal-py', lang: 'Python', cmd: 'pip install idexal' },
    { name: 'idexal-go', lang: 'Go', cmd: 'go get github.com/idexal/go-sdk' },
    { name: 'idexal-cli', lang: 'Rust', cmd: 'cargo install idexal-cli' },
  ]
  return (
    <>
      <PageHeader title="SDKs & Libraries" desc="Official clients for the Idexal API." />
      <div className="grid gap-4 md:grid-cols-2">
        {sdks.map((s) => (
          <Card key={s.name} className="overflow-hidden p-0" hover>
            <div className="border-b border-line px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">{s.name}</span>
                <Badge color="blue">{s.lang}</Badge>
              </div>
            </div>
            <pre dir="ltr" className="bg-[#0b1220] px-5 py-3.5 font-mono text-[13px] text-slate-200">$ {s.cmd}</pre>
          </Card>
        ))}
      </div>
    </>
  )
}

export function DeveloperPlayground() {
  const [model, setModel] = useState('auto/fast')
  const [body, setBody] = useState('{\n  "model": "auto/fast",\n  "messages": [{ "role": "user", "content": "Hello!" }]\n}')
  const [sending, setSending] = useState(false)
  const [output, setOutput] = useState('')
  const [meta, setMeta] = useState<{ status: number; ms: number; model?: string } | null>(null)
  const [modelsList, setModelsList] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const outputRef = useRef<HTMLPreElement>(null)

  // Load the live model catalog from the gateway on mount.
  useEffect(() => {
    setLoadingModels(true)
    fetch('/api/gateway/v1/models')
      .then((r) => r.json())
      .then((j: { data?: { id: string }[] }) => {
        const ids = (j.data ?? []).map((m) => m.id)
        // Prefer readable models first, cap the dropdown at 300.
        const preferred = ids.filter((id) => /^(auto\/|gemini|ox-alpha)/.test(id))
        const rest = ids.filter((id) => !preferred.includes(id)).sort()
        setModelsList([...preferred, ...rest].slice(0, 300))
      })
      .catch(() => setModelsList(['auto/fast', 'auto/smart']))
      .finally(() => setLoadingModels(false))
  }, [])

  const send = () => {
    setSending(true)
    setOutput('')
    setMeta(null)
    const started = performance.now()
    fetch('/api/gateway/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
      .then(async (res) => {
        const reader = res.body?.getReader()
        if (!reader) throw new Error('no body')
        const dec = new TextDecoder()
        let buf = ''
        let acc = ''
        let servedModel = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (payload === '[DONE]') continue
            try {
              const j = JSON.parse(payload)
              servedModel = servedModel || j.model || ''
              const delta = j.choices?.[0]?.delta ?? {}
              const piece: string = delta.content ?? delta.reasoning_content ?? ''
              if (piece) {
                acc += piece
                setOutput(acc)
                outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
              }
            } catch { /* partial chunk */ }
          }
        }
        setMeta({ status: res.status, ms: Math.round(performance.now() - started), model: servedModel })
      })
      .catch((e: Error) => {
        setOutput(`Error: ${e.message}`)
        setMeta({ status: 502, ms: Math.round(performance.now() - started) })
      })
      .finally(() => setSending(false))
  }

  return (
    <>
      <PageHeader title="🎮 Live API Playground" desc="POST https://api.idexa.com/v1/chat/completions — real inference via the Idexal gateway." />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-muted">Model:</span>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value)
            setBody((b) => { try { const j = JSON.parse(b); j.model = e.target.value; return JSON.stringify(j, null, 2) } catch { return b } })
          }}
          className="input max-w-xs font-mono text-xs"
          dir="ltr"
        >
          {loadingModels && <option>Loading gateway models…</option>}
          {modelsList.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="ms-auto flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-accent" style={{ background: '#10b981' }} /> Gateway live
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted"><FaIcon icon="fa-square-terminal" className="h-3.5 w-3.5" /> Request body</span>
            <button onClick={send} disabled={sending} className="btn btn-primary px-3 py-1.5 text-xs">{sending ? 'Streaming…' : '▶ Send request'}</button>
          </div>
          <textarea dir="ltr" value={body} onChange={(e) => setBody(e.target.value)} rows={12} spellCheck={false} className="w-full resize-y bg-[#0b1220] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none" />
        </Card>
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Response {meta?.model ? <span className="font-mono normal-case text-primary">{meta.model}</span> : ''}</span>
            {meta && <span className={`text-xs font-semibold ${meta.status === 200 ? 'text-accent' : 'text-red-500'}`}>✓ {meta.status} · {meta.ms}ms</span>}
          </div>
          <pre ref={outputRef} dir="ltr" className="max-h-96 min-h-72 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-6 text-slate-200">
            {output || (!sending && <span className="text-muted">Send a request — responses stream here live from the gateway.</span>)}
            {sending && <span className="inline-block h-4 w-2 animate-pulse bg-primary align-middle" />}
          </pre>
        </Card>
      </div>
    </>
  )
}

export function DeveloperApiDocs() {
  const endpoints = [
    ['POST', '/v1/chat', 'Create a chat completion'],
    ['GET', '/v1/models', 'List available models'],
    ['GET', '/v1/usage', 'Current cycle usage'],
    ['DELETE', '/v1/api-keys/:id', 'Revoke an API key'],
  ] as const
  return (
    <>
      <PageHeader title="API Documentation" desc="Base URL: api.idexa.com/v1 · OpenAI-compatible · Pay-as-you-go" />
      <Card className="p-4">
        <TableWrap head={['Method', 'Endpoint', 'Description']}>
          {endpoints.map(([m, path, d]) => (
            <tr key={path}>
              <Td><Badge color={m === 'POST' ? 'green' : m === 'GET' ? 'blue' : 'red'}>{m}</Badge></Td>
              <Td><code dir="ltr" className="font-mono text-xs">{path}</code></Td>
              <Td className="text-muted">{d}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-semibold">First-party models</h3>
        <TableWrap head={['Model', 'Context', 'Input / 1M', 'Output / 1M', 'Best for']}>
          {[
            ['idexal-pro', '200K', '$3.00', '$15.00', 'Flagship reasoning & agents'],
            ['idexal-lite', '128K', '$0.15', '$0.60', 'Fast chat & autocomplete'],
            ['idexal-code', '1M', '$1.50', '$6.00', 'Repo-scale refactors'],
            ['idexal-embed', '8K', '$0.02', '—', 'Semantic search embeddings'],
          ].map((r) => (
            <tr key={r[0]}>
              <Td><code dir="ltr" className="font-mono text-xs font-bold text-primary">{r[0]}</code></Td>
              <Td>{r[1]}</Td>
              <Td>{r[2]}</Td>
              <Td>{r[3]}</Td>
              <Td className="text-muted">{r[4]}</Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
      <Card className="mt-4 overflow-hidden p-0">
        <pre dir="ltr" className="bg-[#0b1220] p-5 font-mono text-[13px] leading-6 text-slate-200">{`curl https://api.idexa.com/v1/chat/completions \\
  -H "Authorization: Bearer $IDEXAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"idexal-pro","messages":[{"role":"user","content":"Hi"}]}'`}</pre>
      </Card>
    </>
  )
}

export function PluginTrashNote() {
  return (
    <EmptyState icon={<FaIcon icon="fa-trash-can" className="h-6 w-6" />} title="Nothing archived." />
  )
}
