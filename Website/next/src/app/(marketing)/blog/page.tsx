import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Technical articles, tutorials, and news from the Idexal team.',
}

const POSTS = [
  {
    slug: 'tree-sitter-pipeline',
    title: 'How We Built a Sub-Second Tree-Sitter Pipeline in Rust',
    excerpt: 'A deep dive into the tree-sitter pipeline, vector store, and memory system that powers Idexal. Indexing is the heartbeat of any modern IDE.',
    category: 'Engineering',
    date: 'Aug 20, 2026',
    readMinutes: 8,
  },
  {
    slug: 'multi-agent-orchestration',
    title: 'Multi-Agent AI Orchestration for Code: Architecture & Design',
    excerpt: 'How we designed a system where 8 specialized AI agents collaborate on your code — writing, reviewing, testing, and debugging simultaneously.',
    category: 'AI',
    date: 'Aug 15, 2026',
    readMinutes: 12,
  },
  {
    slug: 'cross-platform-installer',
    title: 'Building Professional Installers for Windows, macOS, and Linux',
    excerpt: 'From NSIS wizards to DMG backgrounds — how we created branded, professional installers for every platform.',
    category: 'DevOps',
    date: 'Aug 10, 2026',
    readMinutes: 6,
  },
  {
    slug: 'rust-engine-5600-lines',
    title: '5,600 Lines of Rust: Our High-Performance Backend',
    excerpt: 'More than 5,600 lines of Rust: sub-second tree-sitter indexing, SQLite storage, a built-in vector store and 173 passing tests.',
    category: 'Engineering',
    date: 'Aug 5, 2026',
    readMinutes: 10,
  },
  {
    slug: 'security-audit',
    title: 'Security First: How We Audited Every IPC Channel',
    excerpt: 'A systematic security review of our Electron IPC layer, SSRF protection, and sandboxed renderer.',
    category: 'Security',
    date: 'Jul 30, 2026',
    readMinutes: 7,
  },
  {
    slug: 'idexa-cli-launch',
    title: 'Introducing Idexa CLI: Your AI Pair Programmer in the Terminal',
    excerpt: 'A command-line tool that competes with Claude Code and Codex. Interactive chat, code generation, and project analysis from the terminal.',
    category: 'Product',
    date: 'Jul 25, 2026',
    readMinutes: 5,
  },
]

export default function BlogPage() {
  return (
    <div className="py-20 lg:py-28">
      <div className="container-x">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            From the <span className="gradient-text">blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Technical deep dives, product updates, and insights from the Idexal team.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post) => (
            <article
              key={post.slug}
              className="group p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-700 transition-all"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-500 mb-3">
                {post.category}
              </div>
              <h2 className="text-lg font-semibold leading-snug mb-3 group-hover:text-brand-600 transition-colors line-clamp-2">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {post.readMinutes} min
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
