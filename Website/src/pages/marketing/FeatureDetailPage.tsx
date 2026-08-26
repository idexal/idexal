import { Link, useParams } from 'react-router-dom'
import { useT } from '@/lib/useI18n'
import { Badge, Card } from '@/components/ui/primitives'
import { FaIcon } from '@/components/shared/FaIcon'
import { useSeo } from '@/lib/useSeo'

interface FeatureDetail {
  emoji: string
  bullets: [string, string][]
  code?: string
}

const FEATURES: Record<string, FeatureDetail> = {
  'ai-assistant': {
    emoji: '🤖',
    bullets: [
      ['Multi-agent orchestration', 'Architect, coder, tester and reviewer agents collaborate on a shared plan.'],
      ['Full project context', 'The Rust engine indexes every symbol, so answers cite your real code.'],
      ['Interruptible at any step', 'Agents propose; you approve. Every diff is reviewable before it lands.'],
      ['Provider of your choice', 'OpenAI, Anthropic, Google, Groq or fully local via Ollama.'],
    ],
  },
  'multi-language': {
    emoji: '🌐',
    bullets: [
      ['Tree-sitter grammars', 'Accurate parsing for TypeScript, JavaScript, Python, Rust, Go and more.'],
      ['Symbol-level intelligence', 'Find references, rename safely, and jump to definition across the repo.'],
      ['Semantic search', 'Embeddings power natural-language search over your entire codebase.'],
    ],
  },
  terminal: {
    emoji: '⌨️',
    bullets: [
      ['Real shell, zero setup', 'A full PTY-based terminal — bash, zsh, PowerShell or fish.'],
      ['Split panes', 'Run dev server and tests side by side without leaving the editor.'],
      ['Command palette integration', 'Every terminal command is one keystroke away.'],
    ],
  },
  git: {
    emoji: '🌿',
    bullets: [
      ['Visual staging & diffs', 'Stage hunks, resolve conflicts and read history in a clean UI.'],
      ['Branch management', 'Create, switch and merge branches without touching the CLI.'],
      ['AI-reviewed commits', 'The reviewer agent summarizes and checks every commit message.'],
    ],
  },
  plugins: {
    emoji: '🧩',
    bullets: [
      ['Typed plugin API', 'Hook into commands, editors, panels and agents with full TypeScript support.'],
      ['Marketplace built-in', 'Publish once, reach every Idexal user — free or paid.'],
      ['Hot reload', 'Edit, save and see your plugin update instantly.'],
    ],
    code: `npx create-idexal-plugin hello-world
cd hello-world
npm run dev   # hot-reloads inside the IDE`,
  },
  'cross-platform': {
    emoji: '🖥️',
    bullets: [
      ['Native on all desktops', 'Windows 10+, macOS 12+ (Intel & Apple Silicon), Linux (AppImage/DEB).'],
      ['One codebase', 'Electron shell + Rust core behave identically everywhere.'],
      ['Under 300MB memory', 'Lazy-loaded panels and virtualized trees keep it light.'],
    ],
  },
}

export function FeatureDetailPage() {
  useSeo({ title: "Features", description: "Everything inside the Idexal IDE — agents, terminal, Git, plugins." })
  const { slug } = useParams()
  const t = useT()
  const feature = slug ? FEATURES[slug] : undefined

  if (!feature) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold">Feature not found</h1>
        <Link to="/features" className="btn btn-primary mt-6">{t('nav.features')}</Link>
      </div>
    )
  }

  return (
    <div className="py-14">
      <div className="container-x max-w-3xl">
        <Link to="/features" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <FaIcon icon="fa-arrow-left" className="h-4 w-4 rtl:-scale-x-100" /> {t('nav.features')}
        </Link>
        <Badge color="blue">Idexal IDE</Badge>
        <h1 className="mt-3 flex items-center gap-3 text-4xl font-extrabold tracking-tight">
          <span>{feature.emoji}</span> {slug && t(`features.${slug.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}`)}
        </h1>
        <p className="mt-3 text-lg text-muted">{slug && t(`features.${slug.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}Desc`)}</p>

        <Card className="mt-8 divide-y divide-[var(--border)] p-0">
          {feature.bullets.map(([title, desc]) => (
            <div key={title} className="flex gap-4 p-5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15"><FaIcon icon="fa-check" className="h-4 w-4 text-accent" /></span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </Card>

        {feature.code && (
          <pre dir="ltr" className="mt-6 overflow-x-auto rounded-xl bg-[#0b1220] p-5 font-mono text-[13px] leading-6 text-slate-200">
            {feature.code}
          </pre>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth/register" className="btn btn-primary px-6 py-3">{t('hero.cta')}</Link>
          <Link to="/docs" className="btn btn-secondary px-6 py-3">{t('nav.docs')}</Link>
        </div>
      </div>
    </div>
  )
}
