import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLang, useT } from '@/lib/useI18n'
import { Badge, Card, FadeIn, SectionTitle } from '@/components/ui/primitives'
import { FeaturesGrid, NewsletterSignup, PricingTable, StatsStrip, Testimonials } from '@/components/marketing/sections'
import {
  AgentArchitecture, BentoGrid, ComparisonTable, FinalCta, LogoStrip, TerminalDemo,
} from '@/components/marketing/NextSections'
import { ModelsStrip } from '@/pages/marketing/ModelsPage'
import { BLOG_POSTS } from '@/data/mock'
import { FaIcon } from '@/components/shared/FaIcon'

export function HomePage() {
  const t = useT()
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <>
      <Hero />
      <StatsStrip />
      <LogoStrip />
      <AgentArchitecture />
      <ModelsStrip />
      <TerminalDemo />
      <FeaturesGrid />
      <BentoGrid />
      <ComparisonTable />
      <section className="border-t border-line py-20">
        <div className="container-x">
          <SectionTitle title={t('pricing.title')} subtitle={t('pricing.subtitle')} />
          <PricingTable />
        </div>
      </section>
      <Testimonials />
      <section className="py-20">
        <div className="container-x">
          <SectionTitle title={t('blog.title')} subtitle={t('blog.subtitle')} />
          <div className="grid gap-5 md:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map((p, i) => (
              <FadeIn key={p.slug} delay={i * 0.07}>
                <Link to={`/blog/${p.slug}`}>
                  <Card className="h-full p-6" hover>
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">{p.category}</div>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">{ar ? p.titleAr : p.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{ar ? p.excerptAr : p.excerpt}</p>
                    <div className="mt-4 text-xs text-muted">{p.date} · {p.readMinutes} {t('blog.minRead')}</div>
                  </Card>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
      <NewsletterSignup />
    </>
  )
}

function Hero() {
  return <HomeHeroV2 />
}

function HomeHeroV2() {
  const t = useT()
  const [typed, setTyped] = useState('')
  const phrase = 'Build a REST API with auth'
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      i++
      setTyped(phrase.slice(0, i))
      if (i >= phrase.length) clearInterval(timer)
    }, 55)
    return () => clearInterval(timer)
  }, [])
  return (
    <section className="grid-bg relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute -top-40 start-1/4 h-[30rem] w-[46rem] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(closest-side,#3b82f6,transparent)' }} />
      <div className="pointer-events-none absolute -top-24 end-1/5 h-80 w-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(closest-side,#22d3ee,transparent)' }} />
      <div className="container-x relative flex flex-col items-center py-24 text-center sm:py-32">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge color="blue"><FaIcon icon="fa-wand-magic-sparkles" className="h-3 w-3" /> {t('hero.badge')}</Badge>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-6 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-7xl"
        >
          <span className="gradient-text">{t('hero.title')}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: 0.2 }} className="mt-6 max-w-2xl text-xl font-medium text-muted">
          {t('hero.subtitle')}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.28 }} className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {t('hero.desc')}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.38 }} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth/register" className="btn btn-primary px-8 py-3.5 text-base shadow-glow">{t('hero.cta')}</Link>
          <button className="btn btn-secondary px-8 py-3.5 text-base"><FaIcon icon="fa-circle-play" className="h-5 w-5" /> {t('hero.demo')}</button>
        </motion.div>

        {/* Prompt bar + agent pipeline preview */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.5 }} className="mt-16 w-full max-w-3xl">
          <div className="card-surface flex items-center gap-3 !rounded-2xl p-3 shadow-glow ring-1 ring-blue-500/20">
            <span className="ps-2 font-mono text-sm text-primary">✦</span>
            <div dir="ltr" className="flex-1 text-start font-mono text-sm">
              {typed}
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="ms-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary" />
            </div>
            <Link to="/auth/register" className="btn btn-primary shrink-0 px-4 py-2">Ask Idexal</Link>
          </div>
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
    <div className="card-surface mt-4 overflow-hidden rounded-t-2xl border-b-0" style={{ boxShadow: '0 -8px 40px rgba(59,130,246,.08)' }}>
      <div className="flex items-center gap-2 border-b border-line bg-[var(--surface)] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ms-3 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-primary">orchestrator.ts</span>
      </div>
      <div dir="ltr" className="bg-[#0b1220] px-4 py-4 font-mono text-left text-[13px] leading-6 opacity-90">
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
