import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

interface KeyRow {
  id: string
  name: string
  preview: string
  scope: 'read' | 'write' | 'manage'
  created: string
  lastUsed: string
  requests: number
}

const INITIAL: KeyRow[] = [
  { id: 'k1', name: 'production', preview: 'sk-…8f2d', scope: 'write', created: '2026-03-02', lastUsed: '2h ago', requests: 12340 },
  { id: 'k2', name: 'staging', preview: 'sk-…a1b2', scope: 'read', created: '2026-05-11', lastUsed: '1d ago', requests: 1230 },
]

const SCOPES: { id: KeyRow['scope']; desc: string }[] = [
  { id: 'read', desc: 'GET endpoints only — usage, models, logs' },
  { id: 'write', desc: 'Inference + key management for own account' },
  { id: 'manage', desc: 'Full management API (admin operations)' },
]

export function DeveloperKeys() {
  const toast = useUiStore((s) => s.toast)
  const [keys, setKeys] = useState<KeyRow[]>(INITIAL)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [scope, setScope] = useState<KeyRow['scope']>('write')
  const [freshSecret, setFreshSecret] = useState<{ name: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = () => {
    if (!name.trim()) {
      toast('Give the key a name first', 'error')
      return
    }
    // Production: POST /api/dev/keys → Prisma row + provisionGatewayKey() twin.
    const secret = `idexal_sk_${Array.from({ length: 32 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('')}`
    setKeys([
      { id: `k${Date.now()}`, name: name.trim(), preview: `sk-…${secret.slice(-4)}`, scope, created: 'Today', lastUsed: 'never', requests: 0 },
      ...keys,
    ])
    setFreshSecret({ name: name.trim(), secret })
    setName('')
    setCreating(false)
    toast('Key created — also provisioned on api.idexa.com', 'success')
  }

  const copy = async () => {
    if (!freshSecret) return
    try {
      await navigator.clipboard.writeText(freshSecret.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast('Copy failed — select the text manually', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="API Keys"
        desc="Keys authenticate requests to api.idexa.com — each key is provisioned on the gateway automatically."
        actions={<button className="btn btn-primary" onClick={() => setCreating(!creating)}><FaIcon icon="fa-plus" className="h-4 w-4" /> Create key</button>}
      />

      {freshSecret && (
        <Card className="mb-4 border-blue-500/40 p-5">
          <div className="flex items-center gap-2">
            <FaIcon icon="fa-circle-exclamation" className="text-amber-500" />
            <h3 className="font-bold">Copy your secret now — it will not be shown again</h3>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code dir="ltr" className="flex-1 break-all rounded-lg bg-blue-500/10 px-3 py-2 font-mono text-sm text-primary">{freshSecret.secret}</code>
            <button onClick={() => void copy()} className="btn btn-secondary shrink-0">
              <FaIcon icon={copied ? 'fa-check' : 'fa-copy'} className={`h-4 w-4 ${copied ? 'text-emerald-500' : ''}`} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Key "{freshSecret.name}" is active on the gateway with a $5 monthly budget.</p>
        </Card>
      )}

      {creating && (
        <Card className="mb-4 space-y-4 p-6">
          <label className="block text-sm font-medium">
            Key name
            <input dir="ltr" value={name} onChange={(e) => setName(e.target.value)} placeholder="production" className="input mt-1.5" />
          </label>
          <div>
            <div className="mb-2 text-sm font-medium">Scope</div>
            <div className="space-y-2">
              {SCOPES.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${scope === s.id ? 'border-primary bg-blue-500/5' : 'border-line hover:bg-[var(--surface-2)]'}`}>
                  <input type="radio" checked={scope === s.id} onChange={() => setScope(s.id)} className="mt-1 accent-[var(--primary)]" />
                  <span>
                    <span className="font-mono text-sm font-bold text-primary">{s.id}</span>
                    <span className="ms-2 text-xs text-muted">{s.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={generate} className="btn btn-primary">Generate key</button>
            <button onClick={() => setCreating(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Name', 'Key', 'Scope', 'Created', 'Last used', 'Requests', 'Actions']}>
          {keys.map((k) => (
            <tr key={k.id} className="hover:bg-[var(--surface-2)]">
              <Td className="font-semibold">{k.name}</Td>
              <Td><code dir="ltr" className="font-mono text-xs">{k.preview}</code></Td>
              <Td><Badge color={k.scope === 'manage' ? 'red' : k.scope === 'write' ? 'blue' : 'gray'}>{k.scope}</Badge></Td>
              <Td>{k.created}</Td>
              <Td className="text-muted">{k.lastUsed}</Td>
              <Td dir="ltr" className="font-mono text-xs">{k.requests.toLocaleString()}</Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  <button className="font-semibold text-primary hover:underline" onClick={() => toast(`Test request sent with ${k.name}`, 'info')}>Test</button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => { setKeys(keys.filter((x) => x.id !== k.id)); toast(`Key "${k.name}" revoked on idexal.com and api.idexa.com`, 'success') }}
                  >
                    Revoke
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>

      <Card className="mt-4 p-5">
        <h3 className="flex items-center gap-2 font-semibold"><FaIcon icon="fa-shield-halved" className="text-primary" /> Best practices</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>• Use <b className="text-[var(--text)]">read</b> keys for dashboards, <b className="text-[var(--text)]">write</b> for apps, <b className="text-[var(--text)]">manage</b> only for automation.</li>
          <li>• Rotate keys every 90 days — old keys keep a 24h grace window.</li>
          <li>• Set per-key budgets from the <Link to="/developer/usage" className="text-primary hover:underline">Usage page</Link> to cap spend.</li>
        </ul>
      </Card>
    </>
  )
}
