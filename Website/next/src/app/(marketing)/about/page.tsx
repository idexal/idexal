import type { Metadata } from 'next'
import { Target, Heart, Users, Rocket, Globe, Code2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Idexal IDE — our mission, team, and the story behind the AI-powered development environment.',
}

const VALUES = [
  { icon: Target, title: 'Developer First', description: 'Every decision starts with the developer experience. We build tools that eliminate friction.' },
  { icon: Heart, title: 'Open Source', description: 'Transparent development, community-driven features, and open governance.' },
  { icon: Rocket, title: 'Ship Fast', description: 'Rapid iteration, continuous delivery, and respect for developer time.' },
  { icon: Globe, title: 'Global Impact', description: 'Supporting developers in 195+ countries with multi-language and multi-platform support.' },
]

const TEAM = [
  { name: 'Zakariae Lahbabi', role: 'Founder & Lead Developer', url: 'https://zakariaelahbabi.com' },
]

export default function AboutPage() {
  return (
    <div className="py-20 lg:py-28">
      <div className="container-x">
        {/* Hero */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Building the IDE of the <span className="gradient-text">future</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Idexal IDE was born from a simple belief: developers deserve better tools. We are building an AI-powered development environment that works for every developer, on every platform.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We are creating the most powerful, accessible, and intelligent development environment ever built. One that combines the precision of tree-sitter parsing with the creativity of multi-agent AI — all wrapped in a beautiful, cross-platform experience.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our Rust-powered engine processes code at sub-second speeds, our AI agents collaborate in real-time, and our interface stays out of your way so you can focus on what matters: building great software.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">5,600+</div>
                <div className="text-sm text-muted-foreground">Lines of Rust</div>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">173</div>
                <div className="text-sm text-muted-foreground">Tests Passing</div>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">7</div>
                <div className="text-sm text-muted-foreground">Languages</div>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">3</div>
                <div className="text-sm text-muted-foreground">Platforms</div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon
              return (
                <div key={v.title} className="p-6 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-brand-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Team */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">The Team</h2>
          <div className="flex justify-center">
            {TEAM.map((member) => (
              <a
                key={member.name}
                href={member.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-8 rounded-2xl border border-border bg-white dark:bg-surface-900 text-center hover:shadow-lg transition-shadow max-w-sm"
              >
                <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{member.role}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Repositories */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8">Open Source</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Both our IDE and CLI are fully open source. Explore the code, contribute, or report issues.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/idexal/idexal-ide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted transition-colors font-medium"
            >
              <Code2 className="w-4 h-4" /> idexal/idexal-ide
            </a>
            <a
              href="https://github.com/idexal/idexa-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted transition-colors font-medium"
            >
              <Code2 className="w-4 h-4" /> idexal/idexa-cli
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
