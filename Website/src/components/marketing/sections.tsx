import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang, useT } from '@/lib/useI18n'
import { i18n } from '@/lib/i18n'
import { Badge, Card, SectionTitle } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'

export function Hero() {
  const t = useT()
  return (
    <section className="grid-bg relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute -top-32 start-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(closest-side,#3b82f6,transparent)' }} />
      <div className="container-x relative flex flex-col items-center py-24 text-center sm:py-32">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge color="blue">
            <FaIcon icon="fa-wand-magic-sparkles" className="h-3 w-3" /> {t('hero.badge')}
          </Badge>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-6 max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl"
        >
          <span className="gradient-text">{t('hero.title')}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }} className="mt-4 text-xl font-medium text-muted">
          {t('hero.subtitle')}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.22 }} className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {t('hero.desc')}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth/register" className="btn btn-primary px-6 py-3 text-base">{t('hero.cta')}</Link>
          <button className="btn btn-secondary px-6 py-3 text-base">
            <FaIcon icon="fa-circle-play" className="h-5 w-5" /> {t('hero.demo')}
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.45 }} className="mt-16 w-full max-w-4xl">
          <EditorMock />
        </motion.div>
      </div>
    </section>
  )
}

function EditorMock() {
  const lines = [
    { n: 1, code: 'const agents = useAgentHierarchy()', c: '#93c5fd' },
    { n: 2, code: '', c: '' },
    { n: 3, code: '// Architect drafts the plan', c: '#64748b' },
    { n: 4, code: "const plan = await architect.plan('add auth')", c: '#a5f3fc' },
    { n: 5, code: '', c: '' },
    { n: 6, code: 'await coder.implement(plan)   // ✓ 42 files', c: '#86efac' },
    { n: 7, code: 'await tester.run(plan)        // ✓ 128 passed', c: '#86efac' },
    { n: 8, code: 'const ok = reviewer.signOff() // ✓ approved', c: '#86efac' },
  ]
  return (
    <div className="card-surface overflow-hidden rounded-2xl shadow-glow">
      <div className="flex items-center gap-2 border-b border-line bg-[var(--surface)] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ms-3 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-primary">orchestrator.ts</span>
      </div>
      <div dir="ltr" className="bg-[#0b1220] px-4 py-4 font-mono text-[13px] leading-6">
        {lines.map((l) => (
          <div key={l.n} className="flex gap-4">
            <span className="w-6 select-none text-end text-slate-600">{l.n}</span>
            <span style={{ color: l.c }}>{l.code || ' '}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsStrip() {
  const t = useT()
  useLang()
  const stats = [
    { v: '72', l: t('hero.stat1') },
    { v: '27', l: t('hero.stat2') },
    { v: '7', l: t('hero.stat3') },
    { v: '5.6K+', l: t('hero.stat4') },
  ]
  return (
    <section className="border-b border-line bg-[var(--surface)] py-10">
      <div className="container-x grid grid-cols-2 gap-6 text-center md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-3xl font-extrabold gradient-text">{s.v}</div>
            <div className="mt-1 text-sm text-muted">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function FeaturesGrid({ children }: { children?: ReactNode }) {
  const t = useT()
  const features = [
    { key: 'aiAssistant', slug: 'ai-assistant', emoji: '🤖' },
    { key: 'multiLang', slug: 'multi-language', emoji: '🌐' },
    { key: 'terminal', slug: 'terminal', emoji: '⌨️' },
    { key: 'git', slug: 'git', emoji: '🌿' },
    { key: 'plugins', slug: 'plugins', emoji: '🧩' },
    { key: 'crossPlatform', slug: 'cross-platform', emoji: '🖥️' },
  ]
  return (
    <section className="py-20">
      <div className="container-x">
        <SectionTitle title={t('features.title')} subtitle={t('features.subtitle')} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.key} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}>
              <Link to={`/features/${f.slug}`} className="block h-full">
                <Card className="h-full p-6" hover>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-xl">{f.emoji}</div>
                  <h3 className="text-lg font-semibold">{t(`features.${f.key}`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`features.${f.key}Desc`)}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
        {children}
      </div>
    </section>
  )
}

const PLAN_PRICES = { free: 0, pro: 29, team: 99, ent: -1 }

export function PricingTable({ compact = false }: { compact?: boolean }) {
  const t = useT()
  useLang()
  const [yearly, setYearly] = useState(false)
  const plans = [
    { id: 'free', name: t('pricing.free'), price: PLAN_PRICES.free, cta: t('pricing.ctaFree'), features: i18n.tc<string[]>('plans.free') ?? [], highlight: false },
    { id: 'pro', name: t('pricing.pro'), price: PLAN_PRICES.pro, cta: t('pricing.ctaPro'), features: i18n.tc<string[]>('plans.pro') ?? [], highlight: true },
    { id: 'team', name: t('pricing.team'), price: PLAN_PRICES.team, cta: t('pricing.ctaTeam'), features: i18n.tc<string[]>('plans.team') ?? [], highlight: false },
    { id: 'ent', name: t('pricing.enterprise'), price: PLAN_PRICES.ent, cta: t('pricing.ctaEnt'), features: i18n.tc<string[]>('plans.enterprise') ?? [], highlight: false },
  ]
  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={!yearly ? 'font-bold' : 'text-muted'}>{t('pricing.monthly')}</span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative h-6 w-11 rounded-full transition ${yearly ? 'bg-primary' : 'bg-[var(--surface-2)] border border-line'}`}
          aria-label="billing period"
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${yearly ? 'start-[1.4rem]' : 'start-0.5'}`} />
        </button>
        <span className={yearly ? 'font-bold' : 'text-muted'}>{t('pricing.yearly')}</span>
        <Badge color="green">{t('pricing.save20')}</Badge>
      </div>
      <div className={`grid gap-5 md:grid-cols-2 ${compact ? '' : 'lg:grid-cols-4'}`}>
        {plans.slice(0, compact ? 3 : 4).map((p, i) => {
          const shown = p.price < 0 ? t('pricing.custom') : yearly ? `$${Math.round(p.price * 12 * 0.8)}` : `$${p.price}`
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.07 }}>
              <Card className={`relative flex h-full flex-col p-6 ${p.highlight ? 'ring-2 ring-primary' : ''}`}>
                {p.highlight && (
                  <span className="absolute -top-3 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#22d3ee)' }}>
                    {t('pricing.mostPopular')}
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{shown}</span>
                  {p.price > 0 && <span className="text-sm text-muted">{t('pricing.perMonth')}</span>}
                </div>
                <ul className="mb-6 mt-5 flex-1 space-y-2.5">
                  {p.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <FaIcon icon="fa-check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth/register" className={`btn w-full ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>{p.cta}</Link>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export function Testimonials() {
  const t = useT()
  const items = [
    { quote: t('testimonials.t1'), name: t('testimonials.t1name'), role: t('testimonials.t1role') },
    { quote: t('testimonials.t2'), name: t('testimonials.t2name'), role: t('testimonials.t2role') },
    { quote: t('testimonials.t3'), name: t('testimonials.t3name'), role: t('testimonials.t3role') },
  ]
  return (
    <section className="border-y border-line bg-[var(--surface)] py-20">
      <div className="container-x">
        <SectionTitle title={t('testimonials.title')} />
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((q, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
              <Card className="h-full p-6">
                <div className="text-amber-400">★★★★★</div>
                <p className="mt-3 text-sm leading-relaxed">"{q.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
                    {q.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{q.name}</div>
                    <div className="text-xs text-muted">{q.role}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function NewsletterSignup() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <section className="py-20">
      <div className="container-x">
        <Card className="relative overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: '#22d3ee' }} />
          <h2 className="text-2xl font-bold sm:text-3xl">{t('newsletter.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('newsletter.subtitle')}</p>
          {done ? (
            <p className="mt-6 font-semibold text-accent">✓ {t('newsletter.done')}</p>
          ) : (
            <form
              className="mx-auto mt-6 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (email.includes('@')) setDone(true)
              }}
            >
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('newsletter.placeholder')} className="input" />
              <button className="btn btn-primary shrink-0">{t('newsletter.cta')}</button>
            </form>
          )}
        </Card>
      </div>
    </section>
  )
}
