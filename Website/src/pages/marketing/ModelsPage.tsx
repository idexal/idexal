import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useLang, useT } from '@/lib/useI18n'
import { Badge, Card, SectionTitle } from '@/components/ui/primitives'
import { API_ENDPOINT, IDEXAL_MODELS } from '@/data/models'
import { FaIcon } from '@/components/shared/FaIcon'
import { useSeo } from '@/lib/useSeo'

/* ---------------- Models catalog page (/models) ---------------- */

export function ModelsPage() {
  useSeo({ title: "AI Models — Pay As You Go", description: "Frontier Idexal models behind one OpenAI-compatible endpoint. $5 free credits, transparent per-token pricing." })
  const t = useT()
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <div className="grid-bg">
      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <div className="pointer-events-none absolute -top-32 start-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(closest-side,#22d3ee,transparent)' }} />
        <div className="container-x relative text-center">
          <Badge color="indigo"><FaIcon icon="fa-square-terminal" className="h-3 w-3" /> {t('models.eyebrow')}</Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            {t('models.title')} <span className="gradient-text">{t('models.titleAccent')}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted">{t('models.subtitle')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth/register" className="btn btn-primary px-7 py-3">{t('models.getKey')}</Link>
            <Link to="/docs" className="btn btn-secondary px-7 py-3"><FaIcon icon="fa-book-open" className="h-4 w-4" /> {t('models.viewDocs')}</Link>
          </div>
          <code dir="ltr" className="mt-6 inline-block rounded-lg bg-[var(--surface)] px-4 py-2 font-mono text-sm text-primary ring-1 ring-line">POST {API_ENDPOINT}/chat/completions</code>
        </div>
      </section>

      {/* Model cards */}
      <section className="container-x pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {IDEXAL_MODELS.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.07 }}>
              <Card className="flex h-full flex-col p-6" hover>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div dir="ltr" className="flex items-center gap-2 text-lg font-bold"><FaIcon icon="fa-code" className="h-4.5 w-4.5 text-primary" /> {m.name}</div>
                    <code dir="ltr" className="mt-1 block font-mono text-xs text-muted">{m.id}</code>
                  </div>
                  <Badge color="blue">{t(`models.${m.tier}`)}</Badge>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{ar ? m.blurbAr : m.blurbEn}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-center text-xs">
                  <div><div className="text-sm font-bold">{m.ctx}</div><div className="text-muted">{t('models.ctx')}</div></div>
                  <div><div className="text-sm font-bold">${m.inputPer1m}</div><div className="text-muted">{t('models.input')}</div></div>
                  <div><div className="text-sm font-bold">{m.outputPer1m > 0 ? `$${m.outputPer1m}` : '—'}</div><div className="text-muted">{t('models.output')}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.caps.map((c) => <Badge key={c} color="gray">{t(`models.${c}`)}</Badge>)}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <PayAsYouGo />
      <PlatformArchitecture />
      <UsageSnippet />
    </div>
  )
}

/* ---------------- Two-plane architecture (idexal.com ↔ api.idexa.com) ---------------- */

export function PlatformArchitecture() {
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <section className="border-t border-line py-20">
      <div className="container-x">
        <SectionTitle
          title={ar ? 'منصتان، تجربة واحدة' : 'Two platforms, one experience'}
          subtitle={ar ? 'لوحة الإدارة تدير الحسابات والمفاتيح، والبوابة تخدم الاستدلال من كل المزودين — متصلتان تلقائياً.' : 'The control plane manages accounts and keys; the gateway serves inference from every provider — connected automatically.'}
        />
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <Card className="p-6">
            <Badge color="blue">idexal.com</Badge>
            <h3 className="mt-3 text-lg font-bold">{ar ? 'لوحة الإدارة' : 'Control Plane'}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>👤 {ar ? 'حسابات المستخدمين والفرق' : 'User & team accounts'}</li>
              <li>💳 {ar ? 'الاشتراكات والدفع مقابل الاستخدام' : 'Subscriptions & pay-as-you-go'}</li>
              <li>🔑 {ar ? 'إنشاء مفاتيح API وإدارتها' : 'API key creation & management'}</li>
              <li>📚 {ar ? 'توثيق المطورين والملعب' : 'Developer docs & playground'}</li>
            </ul>
          </Card>
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-primary">
              <div className="whitespace-nowrap rounded-full bg-blue-500/10 px-4 py-2 text-xs font-bold">{ar ? 'مزامنة تلقائية' : 'Auto sync'}</div>
              <span className="text-2xl">⇄</span>
            </div>
          </div>
          <Card className="p-6">
            <Badge color="green">api.idexa.com</Badge>
            <h3 className="mt-3 text-lg font-bold">{ar ? 'بوابة الاستدلال' : 'Inference Gateway'}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>🌐 {ar ? '339+ مزود عبر نقطة وصول واحدة' : '339+ providers behind one endpoint'}</li>
              <li>🔀 {ar ? 'توجيه ذكي وتبديل فوري عند الأعطال' : 'Smart routing & instant failover'}</li>
              <li>🧠 {ar ? 'نماذج إديكسال الخاصة + نماذج الشركاء' : 'Idexal first-party + partner models'}</li>
              <li>🛡️ {ar ? 'ميزانيات إنفاق وحدود لكل مفتاح' : 'Per-key budgets & spend limits'}</li>
            </ul>
          </Card>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {ar
            ? 'عندما يولّد مطور مفتاحاً في idexal.com يُنشأ توأمه في api.idexa.com تلقائياً ويبقى مرتبطاً بحسابه.'
            : 'When a developer generates a key on idexal.com, its twin is provisioned on api.idexa.com automatically — bound to their account.'}
        </p>
      </div>
    </section>
  )
}

/* ---------------- Pay-as-you-go benefits ---------------- */

export function PayAsYouGo() {
  const t = useT()
  useLang()
  const items = [
    { icon: 'fa-wallet', titleKey: 'creditsTitle', descKey: 'creditsDesc' },
    { icon: 'fa-gauge-high', titleKey: 'rateTitle', descKey: 'rateDesc' },
    { icon: 'fa-badge-check', titleKey: 'compatTitle', descKey: 'compatDesc' },
  ]
  return (
    <section className="border-t border-line py-20">
      <div className="container-x">
        <SectionTitle title={t('models.paygTitle')} subtitle={t('models.paygSubtitle')} />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div key={it.titleKey} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.08 }}>
              <Card className="h-full p-6" hover>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-primary"><FaIcon icon={it.icon} className="h-5 w-5" /></span>
                <h3 className="mt-4 font-bold">{t(`models.${it.titleKey}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`models.${it.descKey}`)}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/auth/register" className="btn btn-primary px-7 py-3">{t('models.getKey')} <FaIcon icon="fa-arrow-right" className="h-4 w-4 rtl:-scale-x-100" /></Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Quickstart snippet ---------------- */

const SNIPPET = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.idexa.com/v1",
    api_key="idexal_..."
)

resp = client.chat.completions.create(
    model="idexal-pro",
    messages=[{"role": "user", "content": "Refactor this module"}]
)
print(resp.choices[0].message.content)`

export function UsageSnippet() {
  const t = useT()
  useLang()
  const [copied, setCopied] = useState(false)
  return (
    <section className="border-t border-line bg-[var(--surface)] py-20">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <Badge color="green"><FaIcon icon="fa-bolt" className="h-3 w-3" /> {t('models.usageTitle')}</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight">{t('models.usageTitle')}</h2>
          <p className="mt-3 leading-relaxed text-muted">{t('models.usageSubtitle')}</p>
          <Link to="/developer/playground" className="btn btn-secondary mt-6">{t('models.playground')} <FaIcon icon="fa-arrow-right" className="h-4 w-4 rtl:-scale-x-100" /></Link>
        </div>
        <div dir="ltr" className="overflow-hidden rounded-2xl shadow-glow ring-1 ring-white/10">
          <div className="flex items-center justify-between bg-[#1e293b] px-4 py-2.5">
            <span className="font-mono text-xs text-slate-400">quickstart.py</span>
            <button
              className="btn btn-ghost p-1 text-slate-400"
              aria-label="copy snippet"
              onClick={() => setCopied(true)}
            >
              {copied ? <FaIcon icon="fa-check" className="h-4 w-4 text-accent" /> : <FaIcon icon="fa-copy" regular className="h-4 w-4" />}
            </button>
          </div>
          <pre className="overflow-x-auto bg-[#0b1220] p-5 font-mono text-[13px] leading-6 text-slate-200">{SNIPPET}</pre>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Homepage section (models strip) ---------------- */

export function ModelsStrip() {
  const t = useT()
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <section className="border-b border-line py-24">
      <div className="container-x">
        <SectionTitle title={t('models.title')} subtitle={t('models.subtitle')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IDEXAL_MODELS.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.07 }}>
              <Card className="h-full p-5" hover>
                <div className="flex items-center justify-between">
                  <span dir="ltr" className="font-mono text-sm font-bold text-primary">{m.id}</span>
                  <FaIcon icon="fa-coins" className="h-4 w-4 text-muted" />
                </div>
                <div className="mt-3 text-2xl font-extrabold tracking-tight">
                  ${m.inputPer1m}<span className="text-xs font-medium text-muted"> / 1M</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{ar ? m.blurbAr : m.blurbEn}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/models" className="btn btn-primary px-6 py-3">{t('models.nav')} <FaIcon icon="fa-arrow-right" className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <Link to="/developer/playground" className="btn btn-secondary px-6 py-3">{t('models.playground')}</Link>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          <FaIcon icon="fa-key" className="mx-1 inline h-3.5 w-3.5" />{t('models.creditsDesc')}
        </p>
      </div>
    </section>
  )
}
