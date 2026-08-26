import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Badge, Card, PageHeader, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

const EVENTS = [
  'usage.threshold',
  'key.created',
  'key.revoked',
  'invoice.paid',
  'invoice.payment_failed',
  'budget.exceeded',
  'provider.failover',
] as const

interface Hook {
  id: string
  url: string
  events: string[]
  active: boolean
  secret: string
}

interface Delivery {
  id: string
  event: string
  status: number | 'pending'
  when: string
}

const DEMO_HOOKS: Hook[] = [
  { id: 'wh_1', url: 'https://myapp.dev/hooks/idexal', events: ['usage.threshold', 'invoice.paid'], active: true, secret: 'whsec_…7f2a' },
  { id: 'wh_2', url: 'https://myapp.dev/hooks/billing', events: ['invoice.paid', 'invoice.payment_failed'], active: false, secret: 'whsec_…b91c' },
]

const DEMO_DELIVERIES: Delivery[] = [
  { id: 'd1', event: 'usage.threshold', status: 200, when: '12 min ago' },
  { id: 'd2', event: 'invoice.paid', status: 200, when: '2h ago' },
  { id: 'd3', event: 'provider.failover', status: 500, when: '3h ago' },
  { id: 'd4', event: 'usage.threshold', status: 'pending', when: 'sending…' },
]

export function DeveloperWebhooks() {
  const toast = useUiStore((s) => s.toast)
  const [hooks, setHooks] = useState<Hook[]>(DEMO_HOOKS)
  const [deliveries] = useState<Delivery[]>(DEMO_DELIVERIES)
  const [creating, setCreating] = useState(false)
  const [url, setUrl] = useState('')
  const [selected, setSelected] = useState<string[]>(['usage.threshold'])

  const create = () => {
    if (!url.startsWith('https://')) {
      toast('Webhook URL must be HTTPS', 'error')
      return
    }
    setHooks([...hooks, { id: `wh_${Date.now()}`, url, events: selected, active: true, secret: `whsec_…${Math.random().toString(36).slice(2, 6)}` }])
    setUrl('')
    setCreating(false)
    toast('Webhook created — signing secret shown once', 'success')
  }

  return (
    <>
      <PageHeader
        title="Webhooks"
        desc="Receive real-time events — usage, billing, gateway routing."
        actions={<button className="btn btn-primary" onClick={() => setCreating(!creating)}><FaIcon icon="fa-plus" className="h-4 w-4" /> Add endpoint</button>}
      />

      {creating && (
        <Card className="mb-4 space-y-4 p-6">
          <label className="block text-sm font-medium">
            Endpoint URL
            <input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourapp.com/hooks/idexal" className="input mt-1.5" />
          </label>
          <div>
            <div className="mb-2 text-sm font-medium">Events</div>
            <div className="flex flex-wrap gap-1.5">
              {EVENTS.map((ev) => (
                <button
                  key={ev}
                  onClick={() => setSelected(selected.includes(ev) ? selected.filter((x) => x !== ev) : [...selected, ev])}
                  className={`btn px-3 py-1.5 font-mono text-xs ${selected.includes(ev) ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="btn btn-primary">Create webhook</button>
            <button onClick={() => setCreating(false)} className="btn btn-ghost">Cancel</button>
          </div>
          <p className="text-xs text-muted">Deliveries are signed with <code dir="ltr" className="font-mono text-primary">X-Idexal-Signature</code> (HMAC-SHA256). Retries: 3 attempts with exponential backoff.</p>
        </Card>
      )}

      <Card className="p-4">
        <TableWrap head={['Endpoint', 'Events', 'Signing secret', 'Status', 'Actions']}>
          {hooks.map((h) => (
            <tr key={h.id}>
              <Td dir="ltr" className="max-w-xs truncate font-mono text-xs">{h.url}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {h.events.map((ev) => <Badge key={ev} color="gray">{ev}</Badge>)}
                </div>
              </Td>
              <Td><code dir="ltr" className="font-mono text-xs">{h.secret}</code></Td>
              <Td>{h.active ? <Badge color="green">active</Badge> : <Badge color="gray">paused</Badge>}</Td>
              <Td>
                <div className="flex gap-2 text-xs">
                  <button className="font-semibold text-primary hover:underline" onClick={() => toast(`Test event sent to ${h.url}`, 'info')}>Send test</button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => { setHooks(hooks.filter((x) => x.id !== h.id)); toast('Webhook deleted', 'success') }}
                  >
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>

      <h3 className="mb-3 mt-8 font-semibold">Recent deliveries</h3>
      <Card className="p-4">
        <TableWrap head={['Event', 'Status', 'When', '']}>
          {deliveries.map((d) => (
            <tr key={d.id}>
              <Td><code dir="ltr" className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">{d.event}</code></Td>
              <Td>
                {d.status === 'pending' ? (
                  <Badge color="amber">pending</Badge>
                ) : (
                  <Badge color={d.status === 200 ? 'green' : 'red'}>{d.status}</Badge>
                )}
              </Td>
              <Td className="text-xs text-muted">{d.when}</Td>
              <Td><button className="text-xs font-semibold text-primary hover:underline" onClick={() => toast('Replaying delivery…', 'info')}>Replay</button></Td>
            </tr>
          ))}
        </TableWrap>
      </Card>
    </>
  )
}
