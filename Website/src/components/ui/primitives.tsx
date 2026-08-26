import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`card-surface ${hover ? 'transition hover:-translate-y-0.5 hover:shadow-card' : ''} ${className}`}
      style={{ boxShadow: 'var(--shadow-card, 0 4px 24px rgba(2,8,23,.06))' }}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-base text-muted">{subtitle}</p>}
    </div>
  )
}

export function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay }} className={className}>
      {children}
    </motion.div>
  )
}

const badgeStyles: Record<string, string> = {
  green: 'bg-emerald-500/15 text-emerald-500',
  red: 'bg-red-500/15 text-red-500',
  amber: 'bg-amber-500/15 text-amber-500',
  blue: 'bg-sky-500/15 text-sky-500',
  indigo: 'bg-indigo-500/15 text-blue-300',
  gray: 'bg-slate-500/15 text-muted',
}

export function Badge({ color = 'gray', children }: { color?: keyof typeof badgeStyles | string; children: ReactNode }) {
  return <span className={`badge ${badgeStyles[color] ?? badgeStyles.gray}`}>{children}</span>
}

export function StatusDot({ ok, warn }: { ok?: boolean; warn?: boolean }) {
  const color = ok ? '#10b981' : warn ? '#f59e0b' : '#ef4444'
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: color }} />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  )
}

export function StatCard({ label, value, delta, icon }: { label: string; value: string; delta?: string; icon?: ReactNode }) {
  const up = delta?.startsWith('+')
  return (
    <Card className="p-5" hover>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="rounded-lg bg-blue-500/10 p-2 text-primary [&>svg]:h-4.5 [&>svg]:w-4.5" style={{ width: 36, height: 36 }}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {delta && <div className={`mt-1 text-xs font-medium ${up ? 'text-emerald-500' : 'text-red-500'}`}>{up ? '▲' : '▼'} {delta.replace(/[+-]/, '')}</div>}
    </Card>
  )
}

export function Progress({ value, max = 100, color = 'var(--primary)' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function TableWrap({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-start text-sm">
        <thead>
          <tr className="border-b border-line bg-[var(--surface-2)] text-muted">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '', dir }: { children: ReactNode; className?: string; dir?: 'ltr' | 'rtl' }) {
  return <td dir={dir} className={`border-b border-line px-4 py-3 align-middle ${className}`}>{children}</td>
}

export function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted">
      <div className="rounded-2xl bg-blue-500/10 p-4 text-primary">{icon}</div>
      <p className="text-sm">{title}</p>
    </div>
  )
}

export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
