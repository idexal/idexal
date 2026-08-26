import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLang, useT } from '@/lib/useI18n'
import { Badge, Card, SectionTitle } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'

/* ---------------- Multi-agent architecture diagram ---------------- */

const AGENTS = [
  { id: 'orchestrator', key: 'agentOrchestrator', label: 'Orchestrator', icon: 'fa-layer-group', color: '#3b82f6' },
  { id: 'architect', key: 'agentArchitect', label: 'Architect', icon: 'fa-wand-magic-sparkles', color: '#22d3ee' },
  { id: 'coder', key: 'agentCoder', label: 'Coder', icon: 'fa-microchip', color: '#10b981' },
  { id: 'debugger', key: 'agentDebugger', label: 'Debugger', icon: 'fa-square-terminal', color: '#f59e0b' },
  { id: 'tester', key: 'agentTester', label: 'Tester', icon: 'fa-circle-check', color: '#14b8a6' },
  { id: 'reviewer', key: 'agentReviewer', label: 'Reviewer', icon: 'fa-shield-halved', color: '#ef4444' },
]

export function AgentArchitecture() {
  const t = useT()
  useLang()
  return (
    <section className="relative overflow-hidden border-b border-line py-24">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="container-x relative">
        <SectionTitle title={t('next.archTitle')} subtitle={t('next.archSubtitle')} />
        <div className="mx-auto max-w-4xl">
          {/* Orchestrator node */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mx-auto w-fit">
            <AgentNode agent={AGENTS[0]} t={t} big />
          </motion.div>
          {/* Connector lines */}
          <div className="relative mx-auto h-12 w-full max-w-2xl" aria-hidden>
            <svg viewBox="0 0 600 48" preserveAspectRatio="none" className="h-full w-full">
              {[100, 233, 367, 500].map((x) => (
                <path key={x} d={`M300 0 C300 24 ${x} 24 ${x} 48`} fill="none" stroke="rgba(148,163,184,.35)" strokeWidth="1.5" strokeDasharray="4 4" />
              ))}
            </svg>
          </div>
          {/* Worker nodes — 5 specialist agents */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.slice(1).map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.15 + i * 0.09 }}>
                <AgentNode agent={a} t={t} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AgentNode({ agent, t, big = false }: { agent: (typeof AGENTS)[number]; t: (k: string) => string; big?: boolean }) {
  return (
    <Card
      className={big ? 'flex items-center gap-4 px-6 py-5 ring-1' : 'h-full p-5'}
      hover={!big}
    >
      <span className="flex shrink-0 items-center justify-center rounded-xl" style={{ background: `${agent.color}1f`, color: agent.color, width: big ? 46 : 40, height: big ? 46 : 40 }}>
        <FaIcon icon={agent.icon} style={{ fontSize: big ? 20 : 16 }} />
      </span>
      <div className="min-w-0">
        <div className={`font-bold ${big ? 'text-lg' : ''}`}>{big ? 'Orchestrator' : agent.label}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{t(`next.${agent.key}`)}</p>
      </div>
    </Card>
  )
}

/* ---------------- Live terminal demo ---------------- */

const TERM_SCRIPT: { prompt?: boolean; text: string; color: string }[] = [
  { prompt: true, text: 'idexal "add rate limiting to the API"', color: '#e2e8f0' },
  { text: '', color: '' },
  { text: '⟡ architect   drafted plan: middleware + Redis limiter', color: '#818cf8' },
  { text: '⟡ coder       implemented src/middleware/rateLimit.ts', color: '#34d399' },
  { text: '⟡ tester      14 tests written → all passing ✓', color: '#fbbf24' },
  { text: '⟡ reviewer    approved · no breaking changes detected', color: '#f87171' },
  { text: '', color: '' },
  { prompt: true, text: 'git commit -m "feat: API rate limiting (via Idexal)"', color: '#e2e8f0' },
  { text: '[main a1b2c3d] feat: API rate limiting — 6 files changed', color: '#94a3b8' },
]

export function TerminalDemo() {
  const t = useT()
  useLang()
  return (
    <section className="border-b border-line bg-[var(--surface)] py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
          <Badge color="blue"><FaIcon icon="fa-square-terminal" className="h-3 w-3" /> CLI + IDE</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('next.termTitle')}</h2>
          <p className="mt-4 leading-relaxed text-muted">{t('next.termSubtitle')}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {['Natural language in, real commands out', 'Every agent action is logged and replayable', 'Same engine powers the IDE panel & CLI'].map((s) => (
              <li key={s} className="flex items-center gap-2.5"><FaIcon icon="fa-circle-check" className="h-4 w-4 shrink-0 text-accent" />{s}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1 }}>
          <div dir="ltr" className="overflow-hidden rounded-2xl shadow-glow ring-1 ring-white/10">
            <div className="flex items-center gap-2 bg-[#1e293b] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-red-400/80" /><span className="h-3 w-3 rounded-full bg-amber-400/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ms-2 font-mono text-xs text-slate-400">zsh — idexal</span>
            </div>
            <div className="bg-[#0b1220] p-5 font-mono text-[13px] leading-7">
              {TERM_SCRIPT.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.25 }}
                  className="whitespace-pre-wrap"
                >
                  {l.prompt ? (
                    <>
                      <span className="text-blue-400">➜</span> <span className="text-emerald-400">~/my-app</span>{' '}
                      <span style={{ color: l.color }}>{l.text}</span>
                    </>
                  ) : (
                    <span style={{ color: l.color }}>{l.text || '\u00A0'}</span>
                  )}
                </motion.div>
              ))}
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} className="inline-block h-4 w-2 translate-y-0.5 bg-blue-400" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Bento grid ---------------- */

export function BentoGrid() {
  const t = useT()
  useLang()
  const items = [
    { key: 'rust', icon: 'fa-microchip', emoji: '⚡', metric: '<1s', metricLabel: 'indexing 100k files', span: 'lg:col-span-2' },
    { key: 'privacy', icon: 'fa-shield-halved', emoji: '🔒', metric: '100%', metricLabel: 'local embeddings', span: '' },
    { key: 'pluginsB', icon: 'fa-code-branch', emoji: '🧩', metric: '100+', metricLabel: 'community plugins', span: '' },
  ]
  return (
    <section className="py-24">
      <div className="container-x">
        <SectionTitle title={t('next.bentoTitle')} />
        <div className="grid gap-4 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div key={it.key} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }} className={it.span}>
              <Card className="group relative h-full overflow-hidden p-7" hover>
                <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-30" style={{ background: '#3b82f6' }} />
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{it.emoji}</span>
                  <FaIcon icon={it.icon} className="text-muted/50" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{t(`next.${it.key}Title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`next.${it.key}Desc`)}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold gradient-text">{it.metric}</span>
                  <span className="text-xs text-muted">{it.metricLabel}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Competitor comparison table ---------------- */

const COMPARE_COLS = [
  { name: 'Cursor', vals: ['partial', 'partial', 'yes', 'no', 'no', 'no', 'partial'] },
  { name: 'Claude Code', vals: ['yes', 'no', 'yes', 'partial', 'no', 'no', 'partial'] },
  { name: 'GitHub Copilot', vals: ['no', 'no', 'no', 'no', 'no', 'partial', 'yes'] },
  { name: 'Idexal', vals: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'yes'], us: true },
]

const ROW_KEYS = ['rowMultiAgent', 'rowLocalIndex', 'rowBringKey', 'rowOffline', 'rowArabic', 'rowOpenPlugin', 'rowPrice']

export function ComparisonTable() {
  const t = useT()
  useLang()
  const cellText: Record<string, string> = { yes: t('next.yes'), no: '—', partial: t('next.partial') }
  const cellColor: Record<string, string> = { yes: 'text-accent', partial: 'text-amber-500', no: 'text-muted/40' }
  return (
    <section className="border-y border-line bg-[var(--surface)] py-24">
      <div className="container-x">
        <SectionTitle title={t('next.compareTitle')} subtitle={t('next.compareSubtitle')} />
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-[var(--surface-2)]">
                <th className="px-6 py-4 text-start font-semibold" />
                {COMPARE_COLS.map((c) => (
                  <th key={c.name} className={`px-4 py-4 text-center font-bold ${c.us ? 'text-primary' : ''}`}>
                    {c.us && <FaIcon icon="fa-brain" className="mx-auto mb-1 h-4 w-4 text-primary" />}
                    {c.name}
                    {c.us && <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">Ours</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_KEYS.map((rk, ri) => (
                <tr key={rk} className="border-b border-line last:border-0 hover:bg-[var(--surface-2)]/50">
                  <td className="px-6 py-3.5 font-medium">{t(`next.${rk}`)}</td>
                  {COMPARE_COLS.map((c) => (
                    <td key={c.name} className={`px-4 py-3.5 text-center ${c.us ? 'bg-sky-500/[0.06] font-semibold' : ''}`} style={c.us ? { boxShadow: 'inset 2px 0 0 rgba(59,130,246,.25), inset -2px 0 0 rgba(59,130,246,.25)' } : undefined}>
                      {ri === 0 && c.us ? null : null}
                      <span className={cellColor[c.vals[ri]]}>{cellText[c.vals[ri]]}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-4 text-center text-xs text-muted">Comparison reflects publicly available features as of Aug 2026.</p>
      </div>
    </section>
  )
}

/* ---------------- Trusted-by logo strip ---------------- */

const LOGOS = ['Vercel', 'Neon', 'Stripe', 'Cloudflare', 'Upstash', 'Resend', 'Algolia']

export function LogoStrip() {
  const t = useT()
  useLang()
  return (
    <section className="py-14">
      <div className="container-x">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">{t('next.logosTitle')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
          {LOGOS.map((l) => (
            <span key={l} className="text-lg font-bold tracking-tight text-muted transition hover:text-[var(--text)]">{l}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Final CTA banner ---------------- */

export function FinalCta() {
  const t = useT()
  useLang()
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute start-1/2 top-1/2 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(closest-side,#22d3ee,transparent)' }} />
      <div className="container-x relative text-center">
        <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ready to code at the speed of <span className="gradient-text">thought?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">Free forever for individual developers. No credit card required.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth/register" className="btn btn-primary px-8 py-3.5 text-base">{t('hero.cta')}</Link>
          <Link to="/pricing" className="btn btn-secondary px-8 py-3.5 text-base">{t('nav.pricing')}</Link>
        </div>
      </div>
    </section>
  )
}
