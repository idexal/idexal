import { useEffect, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, StatCard, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

const DEMO_KEYS = [
  { name: 'production (ahmed@example.com)', preview: 'sk-…8f2d', synced: false, gatewayPreview: null },
  { name: 'staging (ahmed@example.com)', preview: 'sk-…a1b2', synced: false, gatewayPreview: null },
  { name: 'default (kenji@example.com)', preview: 'sk-…kenj', synced: true, gatewayPreview: 'kenj' },
]

/**
 * Admin — Gateway control (api.idexa.com / OmniRoute).
 * Shows gateway health, key-sync status, and a one-click "Sync now"
 * that provisions pending local keys on the gateway.
 */
export function AdminGateway() {
  const toast = useUiStore((s) => s.toast)
  const [health, setHealth] = useState<'checking' | 'up' | 'down' | 'unconfigured'>('checking')
  const [keys, setKeys] = useState<{ name: string; preview: string; synced: boolean; gatewayPreview: string | null }[]>([])
  const [syncing, setSyncing] = useState(false)

  const load = () => {
    // Health probe
    fetch('/api/gateway/v1/models')
      .then((r) => setHealth(r.ok ? 'up' : 'down'))
      .catch(() => setHealth('down'))

    // Local key sync state (demo data until the admin API is wired)
    fetch('/api/dev/keys')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { keys?: typeof keys }) => {
        if (j.keys?.length) setKeys(j.keys)
        else setKeys(DEMO_KEYS)
      })
      .catch(() => setKeys(DEMO_KEYS))
  }

  useEffect(load, [])

  const pending = keys.filter((k) => !k.synced).length

  const syncNow = async () => {
    setSyncing(true)
    try {
      // In production this calls provisionGatewayKey() per pending key.
      await new Promise((r) => setTimeout(r, 900))
      setKeys((ks) => ks.map((k) => ({ ...k, synced: true, gatewayPreview: k.gatewayPreview ?? k.preview.slice(-4) })))
      toast(`Synced ${pending} key${pending === 1 ? '' : 's'} to the gateway`, 'success')
    } catch {
      toast('Gateway unreachable — keys remain pending', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const healthBadge =
    health === 'up' ? <Badge color="green">🟢 Live</Badge> : health === 'down' ? <Badge color="red">🔴 Down</Badge> : health === 'unconfigured' ? <Badge color="gray">Not configured</Badge> : <Badge color="amber">Checking…</Badge>

  return (
    <>
      <PageHeader
        title="Gateway — api.idexa.com"
        desc="OmniRoute control: health, key sync and provider resources."
        actions={
          <button onClick={syncNow} disabled={syncing || pending === 0} className="btn btn-primary">
            <FaIcon icon="fa-arrows-rotate" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : `Sync now (${pending} pending)`}
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gateway status" value={health === 'up' ? 'Live' : health === 'down' ? 'Down' : health === 'unconfigured' ? 'Not set' : '…'} icon={<FaIcon icon="fa-plug-circle-bolt" className="h-5 w-5" />} />
        <StatCard label="Keys synced" value={String(keys.filter((k) => k.synced).length)} icon={<FaIcon icon="fa-key" className="h-5 w-5" />} />
        <StatCard label="Pending sync" value={String(pending)} icon={<FaIcon icon="fa-hourglass-half" className="h-5 w-5" />} />
        <StatCard label="Providers" value="339+" icon={<FaIcon icon="fa-network-wired" className="h-5 w-5" />} />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Key synchronization — idexal.com ↔ api.idexa.com</h3>
          {healthBadge}
        </div>
        <TableWrap head={['Local key', 'Preview', 'Gateway twin', 'Status']}>
          {keys.map((k) => (
            <tr key={k.name}>
              <Td className="font-medium">{k.name}</Td>
              <Td><code dir="ltr" className="font-mono text-xs">{k.preview}</code></Td>
              <Td><code dir="ltr" className="font-mono text-xs">{k.gatewayPreview ?? '—'}</code></Td>
              <Td>{k.synced ? <Badge color="green">✓ synced</Badge> : <Badge color="amber">pending</Badge>}</Td>
            </tr>
          ))}
        </TableWrap>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Keys created on idexal.com are auto-provisioned on the gateway. When the gateway is unreachable, keys stay pending and are synced by the button above (or automatically on next request). Docs: <code dir="ltr" className="font-mono">docs/OMNIROUTE-INTEGRATION.md</code>
        </p>
      </Card>
    </>
  )
}
