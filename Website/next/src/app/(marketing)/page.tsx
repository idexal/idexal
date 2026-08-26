import Link from 'next/link'
import { ArrowRight, Play, Check, Sparkles, Code2, Terminal, GitBranch, Puzzle, Monitor, Zap, Shield, Brain, Rocket, Users, Star, ChevronRight } from 'lucide-react'

// ══════════════════════════════════════════════════════════════
// Hero Section
// ══════════════════════════════════════════════════════════════
function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container-x text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-medium mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          Now with Multi-Agent AI Orchestration
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 animate-slide-up">
          The Future of{' '}
          <span className="gradient-text">Code</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          AI-Powered Development Environment for every developer. Write, review, debug, and deploy with multi-agent AI assistance — across all platforms.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl gradient-brand hover:opacity-90 transition-opacity shadow-xl shadow-brand-500/25"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <Play className="w-4 h-4" /> Watch Demo
          </Link>
        </div>

        {/* IDE Preview */}
        <div className="mt-16 mx-auto max-w-5xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative rounded-2xl border border-border bg-surface-950 overflow-hidden shadow-2xl glow-brand">
            {/* Title Bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-900 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 text-center text-xs text-surface-500 font-mono">Idexal IDE — main.ts</div>
            </div>
            {/* Editor Content */}
            <div className="p-6 font-mono text-sm text-left leading-relaxed">
              <div className="text-surface-500">{'// 🤖 AI Agent: Code Assistant'}</div>
              <div className="text-purple-400">async <span className="text-blue-400">function</span> <span className="text-yellow-300">deployApp</span>(<span className="text-orange-300">config</span>: AppConfig) {'{'}</div>
              <div className="pl-4 text-surface-300">const <span className="text-blue-300">engine</span> = <span className="text-purple-400">await</span> <span className="text-yellow-300">initEngine</span>()</div>
              <div className="pl-4 text-surface-300">const <span className="text-blue-300">agents</span> = engine.<span className="text-yellow-300">spawnAgents</span>([<span className="text-green-400">'code'</span>, <span className="text-green-400">'review'</span>, <span className="text-green-400">'test'</span>])</div>
              <div className="pl-4 text-surface-300"><span className="text-purple-400">return</span> agents.<span className="text-yellow-300">orchestrate</span>(config)</div>
              <div>{'}'}</div>
              <div className="mt-2 text-surface-500">{'// ⚡ Tree-sitter powered · 7 languages · Rust engine'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Stats Strip
// ══════════════════════════════════════════════════════════════
function StatsStrip() {
  const stats = [
    { value: '10K+', label: 'Downloads' },
    { value: '5K+', label: 'Active Users' },
    { value: '100+', label: 'Plugins' },
    { value: '7', label: 'Languages' },
    { value: '5.6K', label: 'Lines of Rust' },
    { value: '173', label: 'Tests Passing' },
  ]

  return (
    <section className="border-y border-border bg-surface-50 dark:bg-surface-900/50">
      <div className="container-x py-8">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Features Grid
// ══════════════════════════════════════════════════════════════
function FeaturesGrid() {
  const features = [
    { icon: Brain, title: 'Multi-Agent AI', description: 'Orchestrate specialized AI agents for code, review, testing, debugging, and architecture.', color: 'text-purple-500 bg-purple-500/10' },
    { icon: Code2, title: 'Tree-Sitter Parsing', description: 'Native tree-sitter grammars for Rust, TypeScript, JavaScript, Python, Go, C, and C++.', color: 'text-blue-500 bg-blue-500/10' },
    { icon: Terminal, title: 'Built-in Terminal', description: 'Real shell integration with multiple tabs, AI command suggestions, and process management.', color: 'text-green-500 bg-green-500/10' },
    { icon: GitBranch, title: 'Git Integration', description: 'Full Git workflow: staging, committing, branching, diffing, and AI-powered commit messages.', color: 'text-orange-500 bg-orange-500/10' },
    { icon: Puzzle, title: 'Extension System', description: 'Plugin marketplace with themes, language support, tools, and community contributions.', color: 'text-pink-500 bg-pink-500/10' },
    { icon: Monitor, title: 'Cross-Platform', description: 'Native installers for Windows, macOS, and Linux. One IDE, every operating system.', color: 'text-cyan-500 bg-cyan-500/10' },
    { icon: Zap, title: 'Lightning Fast', description: 'Rust-powered engine with sub-second indexing, Brotli compression, and lazy loading.', color: 'text-yellow-500 bg-yellow-500/10' },
    { icon: Shield, title: 'Secure by Design', description: 'Sandboxed Electron, context isolation, SSRF protection, and encrypted API keys.', color: 'text-red-500 bg-red-500/10' },
  ]

  return (
    <section className="py-20 lg:py-28">
      <div className="container-x">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need to <span className="gradient-text">ship faster</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built by developers, for developers. Every feature designed to eliminate friction and amplify your productivity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border hover:border-brand-300 dark:hover:border-brand-700 transition-all hover:shadow-lg hover:shadow-brand-500/5"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Pricing Preview
// ══════════════════════════════════════════════════════════════
function PricingPreview() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started',
      features: ['Basic IDE', '3 Projects', '1K API calls/mo', 'Community support', 'Core languages'],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For professional developers',
      features: ['Everything in Free', 'Unlimited projects', '50K API calls/mo', 'Priority support', 'All plugins', 'AI Chat assistant', 'Advanced analytics'],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams and organizations',
      features: ['Everything in Pro', 'Unlimited users', 'Custom API limits', 'SLA guarantee', 'On-premise option', 'SSO & SAML', 'Dedicated support', 'Training sessions'],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ]

  return (
    <section className="py-20 lg:py-28 bg-surface-50 dark:bg-surface-900/30">
      <div className="container-x">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-brand-500 shadow-xl shadow-brand-500/10 bg-white dark:bg-surface-900'
                  : 'border-border bg-white dark:bg-surface-900'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold text-white rounded-full gradient-brand">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="mt-6 mb-8">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'text-white gradient-brand hover:opacity-90 shadow-lg shadow-brand-500/25'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Testimonials
// ══════════════════════════════════════════════════════════════
function Testimonials() {
  const testimonials = [
    { name: 'Ahmed Hassan', role: 'Full-Stack Developer', country: '🇪🇬 Egypt', text: 'Idexal IDE replaced 3 tools for me. The multi-agent AI is a game changer — it writes, reviews, and tests my code simultaneously.', rating: 5 },
    { name: 'Kenji Tanaka', role: 'Systems Engineer', country: '🇯🇵 Japan', text: 'The tree-sitter integration is incredibly fast. Rust, TypeScript, Python — it handles them all natively. Best IDE I have used.', rating: 5 },
    { name: 'Marie Dubois', role: 'DevOps Lead', country: '🇫🇷 France', text: 'Cross-platform support that actually works. Our team uses Windows, Mac, and Linux — Idexal runs perfectly on all three.', rating: 5 },
  ]

  return (
    <section className="py-20 lg:py-28">
      <div className="container-x">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Loved by developers <span className="gradient-text">worldwide</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 font-semibold text-sm">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role} · {t.country}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Final CTA
// ══════════════════════════════════════════════════════════════
function FinalCta() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-x">
        <div className="relative rounded-3xl overflow-hidden p-12 lg:p-20 text-center gradient-brand">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10">
            <Rocket className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to build the future?
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
              Join thousands of developers already shipping faster with Idexal IDE.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-brand-600 bg-white rounded-xl hover:bg-surface-50 transition-colors shadow-xl"
              >
                Start Free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/idexal/idexal-ide"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// Home Page
// ══════════════════════════════════════════════════════════════
export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <FeaturesGrid />
      <PricingPreview />
      <Testimonials />
      <FinalCta />
    </>
  )
}
