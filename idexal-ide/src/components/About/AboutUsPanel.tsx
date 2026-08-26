import React from 'react'
import { FaExternalLinkAlt, FaEnvelope, FaGlobe, FaGithub, FaHeart, FaCode, FaMicrochip, FaBolt } from '../Icon'

const REPOS = [
  {
    name: 'Idexal IDE',
    url: 'https://github.com/idexal/idexal-ide',
    desc: 'Full-featured AI-powered desktop IDE for Windows, macOS, and Linux',
    icon: '⌨️',
    color: '#3b82f6',
    stats: ['Electron + React', 'Monaco Editor', 'Rust Engine', '96+ Panels'],
  },
  {
    name: 'Idexa CLI',
    url: 'https://github.com/idexal/idexa-cli',
    desc: 'Powerful terminal-first AI coding assistant — compete with Claude FaCode',
    icon: '🖥️',
    color: '#22c55e',
    stats: ['21 Commands', 'Pipe Support', 'JSON Output', 'Context-Aware'],
  },
]

const CONTACTS = [
  { label: 'Personal Website', value: 'zakariaelahbabi.com', url: 'https://zakariaelahbabi.com', icon: <FaGlobe className="w-4 h-4" /> },
  { label: 'Brand Website', value: 'idexa.com', url: 'https://idexa.com', icon: <FaGlobe className="w-4 h-4" /> },
  { label: 'Personal Email', value: 'info@zakariaelahbabi.com', url: 'mailto:info@zakariaelahbabi.com', icon: <FaEnvelope className="w-4 h-4" /> },
  { label: 'Team Email', value: 'team@idexal.com', url: 'mailto:team@idexal.com', icon: <FaEnvelope className="w-4 h-4" /> },
  { label: 'IDE Support', value: 'ide@idexal.com', url: 'mailto:ide@idexal.com', icon: <FaEnvelope className="w-4 h-4" /> },
  { label: 'GitHub', value: 'github.com/idexal', url: 'https://github.com/idexal', icon: <FaGithub className="w-4 h-4" /> },
]

const VALUES = [
  { icon: '🎯', title: 'Excellence', desc: 'Every feature meets the highest standard' },
  { icon: '🔓', title: 'Transparency', desc: 'Open source, open roadmap' },
  { icon: '🚀', title: 'Speed', desc: 'Ship fast, iterate faster' },
  { icon: '🤝', title: 'Community', desc: 'Built with developers, for developers' },
]

const TECH_STACK = [
  { name: 'React', color: '#61dafb' },
  { name: 'TypeScript', color: '#3178c6' },
  { name: 'Monaco Editor', color: '#007acc' },
  { name: 'Rust', color: '#dea584' },
  { name: 'Electron', color: '#47848f' },
  { name: 'Tailwind CSS', color: '#06b6d4' },
  { name: 'Tree-sitter', color: '#f5de73' },
  { name: 'Tokio', color: '#f07d2a' },
]

export default function AboutUsPanel() {
  return (
    <div className="h-full overflow-y-auto bg-ide-editor">
      <div className="max-w-2xl mx-auto p-6 space-y-8">

        {/* Hero */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-3xl font-bold text-white">ZL</span>
          </div>
          <h1 className="text-2xl font-bold text-ide-text mb-1">
            Idexal IDE
          </h1>
          <p className="text-ide-text-muted text-sm">
            AI-Powered Multi-Agent Development Environment
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-ide-text-muted">
            <span className="px-2 py-1 bg-ide-surface rounded border border-ide-border">v1.0.0</span>
            <span className="px-2 py-1 bg-ide-surface rounded border border-ide-border">MIT License</span>
            <span className="px-2 py-1 bg-ide-surface rounded border border-ide-border">Open Source</span>
          </div>
        </div>

        {/* Founder */}
        <div className="bg-ide-surface rounded-xl border border-ide-border p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              ZL
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-ide-text">Zakariae Lahbabi</div>
              <div className="text-xs text-blue-400 font-medium">Founder, CEO & Lead Developer</div>
              <p className="text-xs text-ide-text-muted mt-2 leading-relaxed">
                Passionate about building world-class developer tools. Founded Idexal with the mission of creating
                an open-source, AI-powered IDE that competes with the best proprietary solutions — accessible to
                every developer on every platform.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href="https://zakariaelahbabi.com" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-ide-bg border border-ide-border rounded-md text-ide-text-muted hover:text-blue-400 hover:border-blue-400/50 transition-colors">
                  <FaGlobe className="w-3 h-3" /> zakariaelahbabi.com
                </a>
                <a href="mailto:info@zakariaelahbabi.com"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-ide-bg border border-ide-border rounded-md text-ide-text-muted hover:text-blue-400 hover:border-blue-400/50 transition-colors">
                  <FaEnvelope className="w-3 h-3" /> info@zakariaelahbabi.com
                </a>
                <a href="https://github.com/idexal" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-ide-bg border border-ide-border rounded-md text-ide-text-muted hover:text-blue-400 hover:border-blue-400/50 transition-colors">
                  <FaGithub className="w-3 h-3" /> GitHub @idexal
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Repositories */}
        <div>
          <h2 className="text-sm font-bold text-ide-text mb-3 flex items-center gap-2">
            <FaCode className="w-4 h-4 text-ide-accent" /> Repositories
          </h2>
          <div className="space-y-3">
            {REPOS.map(repo => (
              <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                className="block bg-ide-surface rounded-xl border border-ide-border p-4 hover:border-ide-accent/50 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${repo.color}20`, color: repo.color }}>
                    {repo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ide-text group-hover:text-ide-accent transition-colors">{repo.name}</span>
                      <FaExternalLinkAlt className="w-3 h-3 text-ide-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-ide-text-muted mt-0.5">{repo.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {repo.stats.map(stat => (
                        <span key={stat} className="px-2 py-0.5 text-[10px] bg-ide-bg border border-ide-border rounded text-ide-text-muted">
                          {stat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-sm font-bold text-ide-text mb-3 flex items-center gap-2">
            <FaHeart className="w-4 h-4 text-pink-400" /> Values
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {VALUES.map(v => (
              <div key={v.title} className="bg-ide-surface rounded-lg border border-ide-border p-3">
                <span className="text-lg">{v.icon}</span>
                <div className="text-xs font-bold text-ide-text mt-1">{v.title}</div>
                <div className="text-[11px] text-ide-text-muted">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <h2 className="text-sm font-bold text-ide-text mb-3 flex items-center gap-2">
            <FaMicrochip className="w-4 h-4 text-purple-400" /> Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map(tech => (
              <span key={tech.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-ide-surface border border-ide-border rounded-lg"
                style={{ borderColor: `${tech.color}30` }}>
                <span className="w-2 h-2 rounded-full" style={{ background: tech.color }} />
                <span className="text-ide-text">{tech.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-bold text-ide-text mb-3 flex items-center gap-2">
            <FaBolt className="w-4 h-4 text-yellow-400" /> Project Stats
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Files', value: '343+' },
              { label: 'Lines', value: '240K+' },
              { label: 'Panels', value: '96+' },
              { label: 'AI Models', value: '18' },
            ].map(s => (
              <div key={s.label} className="bg-ide-surface rounded-lg border border-ide-border p-3 text-center">
                <div className="text-lg font-bold text-ide-accent">{s.value}</div>
                <div className="text-[10px] text-ide-text-muted uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-sm font-bold text-ide-text mb-3 flex items-center gap-2">
            <FaEnvelope className="w-4 h-4 text-green-400" /> Contact
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {CONTACTS.map(c => (
              <a key={c.label} href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-ide-surface rounded-lg border border-ide-border hover:border-ide-accent/50 transition-colors group">
                <span className="text-ide-text-muted group-hover:text-ide-accent transition-colors">{c.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-ide-text-muted uppercase tracking-wider">{c.label}</div>
                  <div className="text-xs text-ide-text font-medium truncate">{c.value}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 border-t border-ide-border">
          <p className="text-[11px] text-ide-text-muted">
            © 2025 <span className="text-ide-text">Zakariae Lahbabi</span> &
            <span className="text-ide-text"> Idexal</span> · Open Source under MIT License
          </p>
          <p className="text-[10px] text-ide-text-muted mt-1">
            Built with ❤️ for developers worldwide
          </p>
        </div>

      </div>
    </div>
  )
}
