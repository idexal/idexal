import { useT } from '@/lib/useI18n'
import { Card, PageHeader } from '@/components/ui/primitives'

export function LegalPage({ kind }: { kind: 'terms' | 'privacy' | 'cookies' | 'careers' | 'partners' | 'changelog' | 'status' }) {
  const t = useT()
  const titles: Record<string, string> = {
    terms: t('footer.terms'),
    privacy: t('footer.privacy'),
    cookies: t('footer.cookies'),
    careers: t('footer.careers'),
    partners: t('footer.partners'),
    changelog: t('footer.changelog'),
    status: t('footer.status'),
  }
  return (
    <div className="py-14">
      <div className="container-x max-w-3xl">
        <PageHeader title={titles[kind]} />
        {kind === 'status' ? <SystemStatus /> : kind === 'changelog' ? <Changelog /> : kind === 'careers' ? <Careers /> : kind === 'partners' ? <Partners /> : (
          <Card className="space-y-4 p-6 text-sm leading-relaxed text-muted sm:p-8">
            <p>Last updated: August 25, 2026 — This is demo placeholder content for the {titles[kind]} page.</p>
            <p>Idexal respects your privacy. We collect only what is needed to provide the service, never sell personal data, and process payments exclusively through Stripe.</p>
            <p>By using Idexal you agree to fair use of the API, one account per person, and our community guidelines. Full legal text will be published before GA.</p>
          </Card>
        )}
      </div>
    </div>
  )
}

function SystemStatus() {
  const services = [
    { name: 'API Gateway', ok: true, uptime: '99.99%' },
    { name: 'Dashboard', ok: true, uptime: '99.98%' },
    { name: 'AI Providers', ok: false, uptime: '97.40%' },
    { name: 'Plugin Registry', ok: true, uptime: '100%' },
    { name: 'Downloads CDN', ok: true, uptime: '99.95%' },
  ]
  return (
    <Card className="divide-y divide-[var(--border)] p-0">
      {services.map((s) => (
        <div key={s.name} className="flex items-center justify-between px-6 py-4">
          <span className="font-medium">{s.name}</span>
          <span className="flex items-center gap-3 text-sm">
            <span className="text-xs text-muted">{s.uptime}</span>
            {s.ok ? <span className="badge bg-emerald-500/15 text-emerald-500">Operational</span> : <span className="badge bg-amber-500/15 text-amber-500">Degraded</span>}
          </span>
        </div>
      ))}
    </Card>
  )
}

function Changelog() {
  const releases = [
    { v: '1.1.0', date: '2026-08-25', notes: ['Live API playground with streaming', 'Developer docs center (API reference, webhooks, rate limits)', 'Provider hub + model registry for admins', 'Request logs & usage analytics', 'OmniRoute gateway integration (api.idexa.com)', 'Font Awesome icons + full SEO/PWA'] },
    { v: '1.0.0', date: '2026-08-25', notes: ['Initial public release', 'Multi-agent orchestration', '69 lazy-loaded panels'] },
    { v: '0.9.0-beta', date: '2026-07-14', notes: ['Rust engine rewrite', 'Tree-sitter symbol indexing', 'Vector store memory'] },
    { v: '0.8.0-alpha', date: '2026-05-30', notes: ['First internal build', 'Terminal + Git integration'] },
  ]
  return (
    <div className="space-y-4">
      {releases.map((r) => (
        <Card key={r.v} className="p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 font-mono text-sm font-bold text-primary">v{r.v}</span>
            <span className="text-sm text-muted">{r.date}</span>
          </div>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted">
            {r.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function Careers() {
  const jobs = [
    { title: 'Senior Rust Engineer', loc: 'Remote', type: 'Full-time' },
    { title: 'React Frontend Engineer', loc: 'Cairo / Remote', type: 'Full-time' },
    { title: 'AI Engineer (Agents)', loc: 'Remote', type: 'Full-time' },
    { title: 'Developer Advocate', loc: 'Dubai / Remote', type: 'Full-time' },
    { title: 'Technical Writer (Arabic/English)', loc: 'Remote', type: 'Contract' },
  ]
  return (
    <Card className="divide-y divide-[var(--border)] p-0">
      {jobs.map((j) => (
        <div key={j.title} className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="font-semibold">{j.title}</div>
            <div className="text-xs text-muted">{j.loc} · {j.type}</div>
          </div>
          <a href={`mailto:ide@idexal.com?subject=${encodeURIComponent(j.title)}`} className="btn btn-secondary shrink-0">Apply</a>
        </div>
      ))}
    </Card>
  )
}

function Partners() {
  const partners = ['Vercel', 'Neon', 'Stripe', 'Upstash', 'Cloudflare', 'Resend']
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {partners.map((p) => (
        <Card key={p} className="flex h-24 items-center justify-center p-4" hover>
          <span className="text-lg font-bold tracking-tight text-muted">{p}</span>
        </Card>
      ))}
    </div>
  )
}
