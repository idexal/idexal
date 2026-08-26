import type { Metadata } from 'next'
import { Brain, Code2, Terminal, GitBranch, Puzzle, Monitor, Zap, Shield, Users, Rocket, Sparkles, Database } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features',
  description: 'Explore every feature of Idexal IDE — multi-agent AI, tree-sitter parsing, built-in terminal, Git integration, and more.',
}

const FEATURES = [
  {
    icon: Brain,
    title: 'Multi-Agent AI Orchestration',
    description: 'Deploy specialized AI agents that collaborate on your code. Code Agent writes, Review Agent critiques, Test Agent validates, Debug Agent fixes — all working together in real-time.',
    details: ['8 specialized agents', 'Collaborative workflows', 'Smart auto-orchestration', 'Custom agent creation'],
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: Code2,
    title: 'Tree-Sitter Code Intelligence',
    description: 'Powered by native tree-sitter grammars compiled in Rust. Sub-second indexing, precise symbol extraction, and real-time diagnostics for 7 languages.',
    details: ['Rust, TypeScript, JavaScript', 'Python, Go, C, C++', 'AST-based analysis', 'Syntax error detection'],
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description: 'Full shell integration with multiple tabs, AI command suggestions, and process management. Run builds, tests, and deployments without leaving the IDE.',
    details: ['Multiple tabs', 'AI command suggestions', 'Process management', 'Split view support'],
    color: 'text-green-500 bg-green-500/10 border-green-500/20',
  },
  {
    icon: GitBranch,
    title: 'Git Integration',
    description: 'Complete Git workflow with staging, committing, branching, diffing, and AI-powered commit messages. Visual branch management and conflict resolution.',
    details: ['Visual staging', 'AI commit messages', 'Branch management', 'Diff viewer'],
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
  {
    icon: Puzzle,
    title: 'Extension Marketplace',
    description: 'Browse and install extensions from a growing marketplace. Themes, language packs, tools, and community contributions.',
    details: ['100+ extensions', 'One-click install', 'Auto-updates', 'Community-driven'],
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: Monitor,
    title: 'Cross-Platform',
    description: 'Native installers for Windows (NSIS), macOS (DMG), and Linux (AppImage, DEB, RPM). Consistent experience everywhere.',
    details: ['Windows, macOS, Linux', 'Native installers', 'Auto-updates', 'Consistent UI'],
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: Zap,
    title: 'Blazing Performance',
    description: 'Rust-powered engine with Brotli compression, code splitting, lazy loading, and sub-second file operations.',
    details: ['Rust NAPI engine', 'Brotli compression', 'Lazy-loaded modules', 'Sub-second indexing'],
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  },
  {
    icon: Shield,
    title: 'Security First',
    description: 'Sandboxed Electron, context isolation, SSRF protection, encrypted API keys, and input validation at every layer.',
    details: ['Sandboxed renderer', 'Context isolation', 'SSRF protection', 'Encrypted secrets'],
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
]

export default function FeaturesPage() {
  return (
    <div className="py-20 lg:py-28">
      <div className="container-x">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Features
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Built for developers who{' '}
            <span className="gradient-text">demand more</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature in Idexal IDE is designed to eliminate friction and amplify your productivity. No bloat, no compromise.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-12">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
                <div className="flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${feature.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">{feature.title}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">{feature.description}</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {feature.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="aspect-video rounded-2xl border border-border bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
                    <Icon className="w-24 h-24 text-muted-foreground/20" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
