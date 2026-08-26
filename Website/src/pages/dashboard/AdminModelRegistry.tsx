import { useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'
import { Card, PageHeader, TableWrap, Td } from '@/components/ui/primitives'
import { useUiStore } from '@/stores/uiStore'

interface RegistryModel {
  id: string
  ctx: string
  input: number
  output: number
  enabled: boolean
  gatewayRouted: boolean
}

const INITIAL: RegistryModel[] = [
  { id: 'idexal-pro', ctx: '200K', input: 3, output: 15, enabled: true, gatewayRouted: true },
  { id: 'idexal-lite', ctx: '128K', input: 0.15, output: 0.6, enabled: true, gatewayRouted: true },
  { id: 'idexal-code', ctx: '1M', input: 1.5, output: 6, enabled: true, gatewayRouted: true },
  { id: 'idexal-embed', ctx: '8K', input: 0.02, output: 0, enabled: true, gatewayRouted: false },
]

/** Admin — manage Idexal first-party models: pricing, availability, gateway routing. */
export function AdminModelRegistry() {
  const toast = useUiStore((s) => s.toast)
  const [models, setModels] = useState(INITIAL)
  const [dirty, setDirty] = useState(false)

  const update = (id: string, patch: Partial<RegistryModel>) => {
    setModels(models.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    setDirty(true)
  }

  const save = () => {
    toast('Model registry saved — changes propagate to the gateway within 60s', 'success')
    setDirty(false)
  }

  return (
    <>
      <PageHeader
        title="Model Registry"
        desc="Idexal first-party models — pricing, context windows and gateway routing."
        actions={
          <button onClick={save} disabled={!dirty} className="btn btn-primary">
            <FaIcon icon="fa-floppy-disk" className="h-4 w-4" /> {dirty ? 'Save changes' : 'Saved'}
          </button>
        }
      />

      <Card className="overflow-x-auto p-4">
        <TableWrap head={['Model', 'Context', 'Input $/1M', 'Output $/1M', 'Gateway route', 'Enabled']}>
          {models.map((m) => (
            <tr key={m.id}>
              <Td><code dir="ltr" className="font-mono text-xs font-bold text-primary">{m.id}</code></Td>
              <Td>
                <input
                  dir="ltr"
                  value={m.ctx}
                  onChange={(e) => update(m.id, { ctx: e.target.value })}
                  className="input w-20 px-2 py-1 font-mono text-xs"
                />
              </Td>
              <Td>
                <input
                  dir="ltr"
                  type="number"
                  step="0.01"
                  min="0"
                  value={m.input}
                  onChange={(e) => update(m.id, { input: Number(e.target.value) })}
                  className="input w-20 px-2 py-1 font-mono text-xs"
                />
              </Td>
              <Td>
                <input
                  dir="ltr"
                  type="number"
                  step="0.01"
                  min="0"
                  value={m.output}
                  onChange={(e) => update(m.id, { output: Number(e.target.value) })}
                  className="input w-20 px-2 py-1 font-mono text-xs"
                />
              </Td>
              <Td>
                <Toggle on={m.gatewayRouted} onChange={(v) => update(m.id, { gatewayRouted: v })} />
              </Td>
              <Td>
                <Toggle on={m.enabled} onChange={(v) => update(m.id, { enabled: v })} />
              </Td>
            </tr>
          ))}
        </TableWrap>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><FaIcon icon="fa-circle-info" className="text-primary" /> Gateway routing</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Enabled models with routing ON are served at <code dir="ltr" className="font-mono text-xs text-primary">api.idexa.com/v1</code> and appear in <code dir="ltr" className="font-mono text-xs">GET /v1/models</code>. Disabled models return <code dir="ltr" className="font-mono text-xs">404 model_not_found</code>.
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><FaIcon icon="fa-triangle-exclamation" className="text-amber-500" /> Pricing changes</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            New prices apply to requests after the next gateway sync (≤60s). In-flight requests are billed at the price captured when the request started.
          </p>
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'border border-line bg-[var(--surface-2)]'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-[1.4rem]' : 'start-0.5'}`} />
    </button>
  )
}
