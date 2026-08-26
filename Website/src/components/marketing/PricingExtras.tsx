import { useMemo, useState } from 'react'
import { useT } from '@/lib/useI18n'
import { Badge, Card } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'

const PLANS: { id: string; label: string; base: number; seats: number; api: number }[] = [
  { id: 'free', label: 'Free', base: 0, seats: 1, api: 1000 },
  { id: 'pro', label: 'Pro', base: 29, seats: 1, api: 50000 },
  { id: 'team', label: 'Team', base: 99, seats: 10, api: 200000 },
]

/** Rough per-seat + usage estimate mirroring the blueprint's pricing calculator. */
export function PricingCalculator() {
  const t = useT()
  const [seats, setSeats] = useState(5)
  const [api, setApi] = useState(50)
  const [yearly, setYearly] = useState(false)

  const best = useMemo<{ id: string; label: string; base: number; seats: number; api: number }>(() => {
    // cheapest plan that covers the seat count
    if (seats <= 1) return api * 1000 > PLANS[0].api ? PLANS[1] : PLANS[0]
    if (seats <= 3) return PLANS[1]
    return PLANS[2]
  }, [seats, api])

  const extraApiBlocks = Math.max(0, Math.ceil((api * 1000 - (best.id === 'team' ? 200000 : best.api)) / 10000))
  const monthly = best.base + (best.id === 'free' ? 0 : Math.max(0, seats - best.seats) * 9) + extraApiBlocks * 5
  const total = yearly ? Math.round(monthly * 12 * 0.8) : monthly

  return (
    <Card className="p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-bold"><FaIcon icon="fa-calculator" className="h-5 w-5 text-primary" /> Estimate your plan</h3>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-sm font-medium"><span>Team size</span><span>{seats} {seats === 1 ? 'seat' : 'seats'}</span></div>
            <input type="range" min={1} max={50} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <div className="mt-1 flex justify-between text-xs text-muted"><span>1</span><span>50</span></div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm font-medium"><span>API calls</span><span>{api}K / month</span></div>
            <input type="range" min={1} max={500} value={api} onChange={(e) => setApi(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <div className="mt-1 flex justify-between text-xs text-muted"><span>1K</span><span>500K</span></div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Yearly billing ({t('pricing.save20')})
          </label>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 p-6 text-center">
          <Badge color="blue">{best.label}</Badge>
          <div className="mt-3 text-4xl font-extrabold tracking-tight gradient-text">${total.toLocaleString()}</div>
          <div className="text-xs text-muted">{yearly ? 'per year' : 'per month'}</div>
          {extraApiBlocks > 0 && <div className="mt-2 text-[11px] text-muted">incl. {extraApiBlocks}× extra 10K API blocks</div>}
          <a href="#top-plans" className="btn btn-primary mt-4">Choose {best.label}</a>
        </div>
      </div>
    </Card>
  )
}

const MATRIX_ROWS: [string, (boolean | string | number)[]][] = [
  ['Projects', [3, '∞', '∞', '∞']],
  ['API calls / mo', ['1K', '50K', '200K', 'Custom']],
  ['Seats', [1, 1, 10, 'Custom']],
  ['AI Chat', [true, true, true, true]],
  ['Plugin marketplace', [false, true, true, true]],
  ['Admin controls', [false, false, true, true]],
  ['Usage analytics', [false, false, true, true]],
  ['SSO', [false, false, true, true]],
  ['SLA guarantee', [false, false, false, true]],
  ['On-prem option', [false, false, false, true]],
]

export function PlanComparison() {
  const cols = ['Free', 'Pro', 'Team', 'Enterprise']
  const cell = (v: boolean | string | number) =>
    v === true ? <FaIcon icon="fa-check" className="mx-auto h-4 w-4 text-accent" /> : v === false ? <FaIcon icon="fa-minus" className="mx-auto h-4 w-4 text-muted/40" /> : v
  return (
    <div id="top-plans">
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-[var(--surface-2)]">
            <th className="px-5 py-4 text-start font-semibold">Compare plans</th>
            {cols.map((c) => (
              <th key={c} className="px-4 py-4 text-center font-bold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_ROWS.map(([label, vals]) => (
            <tr key={label} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)]/50">
              <td className="px-5 py-3 font-medium">{label}</td>
              {vals.map((v, i) => (
                <td key={i} className="px-4 py-3 text-center">{cell(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
    </div>
  )
}
