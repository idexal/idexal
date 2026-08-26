import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useT } from '@/lib/useI18n'
import { Card, PageHeader } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'

const SECTIONS = [
  { id: 'getting-started', icon: 'fa-rocket', title: 'Getting Started' },
  { id: 'philosophy', icon: 'fa-gem', title: 'Design Philosophy' },
  { id: 'security', icon: 'fa-shield-halved', title: 'Security Audit' },
  { id: 'api', icon: 'fa-code', title: 'API Reference' },
  { id: 'plugins', icon: 'fa-puzzle-piece', title: 'Plugin Development' },
  { id: 'faq', icon: 'fa-book-open', title: 'FAQ' },
]

const CODE_SAMPLE = `# Install Idexal IDE
curl -fsSL https://idexal.com/install | sh

# Sign in and open a project
idexal login
idexal open ./my-project`

const API_SAMPLE = `POST /api/v1/chat
Authorization: Bearer <your_api_key>

{
  "model": "idexal-pro",
  "messages": [{ "role": "user", "content": "Hi" }]
}`

export function DocsPage() {
  const t = useT()
  // Deep-linkable sections: /docs#api opens the API tab directly.
  const [active, setActive] = useState(() => {
    const hash = window.location.hash.replace('#', '')
    return SECTIONS.some((s) => s.id === hash) ? hash : 'getting-started'
  })
  useEffect(() => {
    window.history.replaceState(null, '', `#${active}`)
  }, [active])
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={t('nav.docs')} desc="API reference, user guides and tutorials." />
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition ${
                  active === s.id ? 'bg-blue-500/10 text-primary' : 'text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
                }`}
              >
                <FaIcon icon={s.icon} className="h-4 w-4" /> {s.title}
              </button>
            ))}
          </aside>
          <Card className="p-6 sm:p-8">
            {active === 'getting-started' && (
              <>
                <h2 className="text-xl font-bold">Getting Started</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">Install the CLI, sign in, and open your first project. The IDE auto-indexes your codebase in seconds.</p>
                <pre dir="ltr" className="mt-5 overflow-x-auto rounded-xl bg-[#0b1220] p-4 font-mono text-[13px] leading-6 text-slate-200">{CODE_SAMPLE}</pre>
              </>
            )}
            {active === 'api' && (
              <>
                <h2 className="text-xl font-bold">API Reference</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">Base URL <code dir="ltr" className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">https://api.idexa.com/v1</code> — OpenAI-compatible. First-party models: <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">idexal-pro</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">idexal-lite</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">idexal-code</code>, <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">idexal-embed</code>. Pay-as-you-go with $5 free credits.</p>
                <pre dir="ltr" className="mt-5 overflow-x-auto rounded-xl bg-[#0b1220] p-4 font-mono text-[13px] leading-6 text-slate-200">{API_SAMPLE}</pre>
                <div className="mt-5 flex gap-2">
                  <Link to="/models" className="btn btn-secondary">Model pricing</Link>
                  <Link to="/developers" className="btn btn-primary">Full API reference</Link>
                  <Link to="/developer/playground" className="btn btn-secondary">Try in Playground</Link>
                </div>
              </>
            )}
            {active === 'plugins' && (
              <>
                <h2 className="text-xl font-bold">Plugin Development</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">Scaffold with <code className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-xs text-primary">npx create-idexal-plugin</code>, hook into commands, editors and panels through a typed API, then publish from the CLI.</p>
              </>
            )}
            {active === 'faq' && (
              <>
                <h2 className="text-xl font-bold">FAQ</h2>
                <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-muted">
                  <li>Which platforms are supported? Windows 10+, macOS 12+ (Intel &amp; Apple Silicon), Linux (AppImage / DEB).</li>
                  <li>Does it work offline? Yes — local models via Ollama keep core AI features available offline.</li>
                  <li>Is there an education plan? Free Pro access for verified students and teachers.</li>
                </ul>
              </>
            )}
            {active === 'philosophy' && (
              <>
                <h2 className="text-xl font-bold">Design Philosophy — Computational Elegance</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  The aesthetic of invisible intelligence made visible: midnight-navy voids, luminous cyan pathways of thought, and typography as texture. Our design language treats data as beauty — never decoration.
                </p>
                <Link to="/philosophy" className="btn btn-secondary mt-5">Read the full philosophy</Link>
              </>
            )}
            {active === 'security' && (
              <>
                <h2 className="text-xl font-bold">Security Audit</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Full audit of the Electron main process and preload bridge: 5 critical + 5 high issues found and fixed — sandbox enforced, arbitrary shell execution removed, Git injection eliminated. Threat model: fully renderer-compromise via XSS.
                </p>
                <Link to="/security" className="btn btn-secondary mt-5">Read the audit report</Link>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export function SimplePage({ titleKey, children }: { titleKey?: string; children?: React.ReactNode }) {
  const t = useT()
  return (
    <div className="py-14">
      <div className="container-x max-w-3xl">
        <PageHeader title={titleKey ? t(titleKey) : 'Idexal'} />
        <Card className="p-6 sm:p-10">{children}</Card>
      </div>
    </div>
  )
}
