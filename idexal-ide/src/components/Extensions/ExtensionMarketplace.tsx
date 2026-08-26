/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                  EXTENSION MARKETPLACE                         ║
 * ║         Browse, install, and manage IDE extensions             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useMemo } from 'react'
import {
  FaSearch, FaDownload, FaStar, FaCheckCircle, FaShieldAlt,
  FaPalette, FaCode, FaRobot, FaPuzzlePiece, FaLanguage,
  FaPaintBrush, FaBolt, FaChartLine, FaUsers, FaExternalLinkAlt,
  FaToggleOn, FaToggleOff, FaTrash, FaArrowUp, FaFire,
  FaCrown, FaPlug, FaTerminal, FaDatabase, FaLock,
} from 'react-icons/fa'
import type { MarketplaceExtension } from '../../services/pluginSDK'

// ── Mock Marketplace Data ─────────────────────────────

const MOCK_EXTENSIONS: MarketplaceExtension[] = [
  {
    id: 'idexal.theme-tokyo-night', name: 'Tokyo Night Theme',
    description: 'A dark theme inspired by the beautiful colors of the Tokyo night cityscape.',
    author: 'Enkia', version: '1.8.2', downloads: 245000, rating: 4.9,
    ratingCount: 1842, icon: '🌙', category: 'Themes', tags: ['dark', 'theme'],
    installed: false, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-20',
  },
  {
    id: 'idexal.theme-catppuccin', name: 'Catppuccin Mocha',
    description: 'Soothing pastel theme with a eye-catchingly comfortable palette.',
    author: 'Catppuccin', version: '2.1.0', downloads: 189000, rating: 4.8,
    ratingCount: 1203, icon: '🐱', category: 'Themes', tags: ['dark', 'theme', 'pastel'],
    installed: false, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-18',
  },
  {
    id: 'idexal.git-lens', name: 'GitLens Pro',
    description: 'Supercharge Git — blame annotations, line history, visual diffs, and branch comparison.',
    author: 'Idexal Team', version: '3.2.1', downloads: 520000, rating: 4.9,
    ratingCount: 3102, icon: '🔍', category: 'DevOps', tags: ['git', 'blame', 'history'],
    installed: true, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-22',
  },
  {
    id: 'idexal.docker-explorer', name: 'Docker Explorer',
    description: 'Manage Docker containers, images, and compose files from inside the IDE.',
    author: 'CloudTools', version: '2.0.0', downloads: 145000, rating: 4.6,
    ratingCount: 892, icon: '🐳', category: 'DevOps', tags: ['docker', 'containers', 'kubernetes'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-15',
  },
  {
    id: 'idexal.rest-client', name: 'REST Client',
    description: 'Send HTTP requests and view responses directly in the editor. Supports GraphQL.',
    author: 'Idexal Team', version: '1.5.0', downloads: 312000, rating: 4.7,
    ratingCount: 1567, icon: '🌐', category: 'API', tags: ['http', 'rest', 'graphql'],
    installed: true, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-10',
  },
  {
    id: 'idexal.prettier-formatter', name: 'Prettier Formatter',
    description: 'Format code on save with Prettier. Supports JS, TS, CSS, HTML, MD, and more.',
    author: 'Idexal Team', version: '4.1.0', downloads: 890000, rating: 4.8,
    ratingCount: 4201, icon: '✨', category: 'Formatting', tags: ['formatter', 'prettier'],
    installed: true, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-21',
  },
  {
    id: 'idexal.error-lens', name: 'Error Lens',
    description: 'Inline error and warning decorations — see problems right in the editor gutter.',
    author: ' usernamehw', version: '3.0.0', downloads: 670000, rating: 4.8,
    ratingCount: 2891, icon: '🔴', category: 'Diagnostics', tags: ['errors', 'warnings', 'linter'],
    installed: false, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-19',
  },
  {
    id: 'idexal.snippets-react', name: 'React Snippets',
    description: 'Essential React, Hooks, and JSX snippets for faster development.',
    author: 'Community', version: '2.3.0', downloads: 421000, rating: 4.5,
    ratingCount: 1102, icon: '⚛️', category: 'Snippets', tags: ['react', 'jsx', 'snippets'],
    installed: false, enabled: true, featured: false, verified: false,
    lastUpdated: '2026-07-30',
  },
  {
    id: 'idexal.python-plus', name: 'Python Plus',
    description: 'Enhanced Python support — type hints, virtual env manager, Jupyter integration.',
    author: 'PythonTools', version: '1.2.0', downloads: 298000, rating: 4.6,
    ratingCount: 987, icon: '🐍', category: 'Languages', tags: ['python', 'jupyter'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-12',
  },
  {
    id: 'idexal.rust-enhanced', name: 'Rust Enhanced',
    description: 'Cargo integration, clippy diagnostics, and inlay hints for Rust projects.',
    author: 'RustCommunity', version: '2.5.0', downloads: 187000, rating: 4.7,
    ratingCount: 756, icon: '🦀', category: 'Languages', tags: ['rust', 'cargo'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-08',
  },
  {
    id: 'idexal.code-review', name: 'Code Review Assistant',
    description: 'AI-powered code review with inline suggestions, security checks, and best practices.',
    author: 'Idexal Team', version: '1.0.0', downloads: 95000, rating: 4.4,
    ratingCount: 421, icon: '📋', category: 'AI', tags: ['review', 'ai', 'code-quality'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-23',
  },
  {
    id: 'idexal.sql-tools', name: 'SQL Tools',
    description: 'Database explorer, query runner, and schema viewer for PostgreSQL, MySQL, SQLite.',
    author: 'DBWorks', version: '3.1.0', downloads: 210000, rating: 4.5,
    ratingCount: 834, icon: '🗃️', category: 'Database', tags: ['sql', 'database', 'postgresql'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-05',
  },
  {
    id: 'idexal.material-icons', name: 'Material Icon Theme',
    description: 'Beautiful file and folder icons based on Material Design.',
    author: 'PKief', version: '5.0.0', downloads: 1200000, rating: 4.9,
    ratingCount: 5120, icon: '🎨', category: 'Themes', tags: ['icons', 'material'],
    installed: true, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-24',
  },
  {
    id: 'idexal.remote-ssh', name: 'Remote SSH',
    description: 'Develop on remote machines via SSH — edit files, run terminals, debug remotely.',
    author: 'Idexal Team', version: '1.3.0', downloads: 340000, rating: 4.6,
    ratingCount: 1230, icon: '🔌', category: 'Platform', tags: ['ssh', 'remote'],
    installed: false, enabled: true, featured: false, verified: true,
    lastUpdated: '2026-08-14',
  },
  {
    id: 'idexal.copilot-chat', name: 'AI Chat Assistant',
    description: 'Multi-model AI chat with code generation, refactoring, and explanation.',
    author: 'Idexal Team', version: '2.0.0', downloads: 567000, rating: 4.8,
    ratingCount: 3401, icon: '🤖', category: 'AI', tags: ['ai', 'chat', 'code-generation'],
    installed: true, enabled: true, featured: true, verified: true,
    lastUpdated: '2026-08-25',
  },
  {
    id: 'idexal.terminal-plus', name: 'Terminal Plus',
    description: 'Enhanced terminal with split panes, profiles, and command history search.',
    author: 'Idexal Team', version: '1.1.0', downloads: 280000, rating: 4.5,
    ratingCount: 987, icon: '💻', category: 'Platform', tags: ['terminal', 'shell'],
    installed: true, enabled: false, featured: false, verified: true,
    lastUpdated: '2026-08-11',
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All', icon: FaPuzzlePiece, count: MOCK_EXTENSIONS.length },
  { id: 'installed', label: 'Installed', icon: FaCheckCircle, count: MOCK_EXTENSIONS.filter(e => e.installed).length },
  { id: 'Themes', label: 'Themes', icon: FaPalette, count: MOCK_EXTENSIONS.filter(e => e.category === 'Themes').length },
  { id: 'AI', label: 'AI & Agents', icon: FaRobot, count: MOCK_EXTENSIONS.filter(e => e.category === 'AI').length },
  { id: 'Languages', label: 'Languages', icon: FaLanguage, count: MOCK_EXTENSIONS.filter(e => e.category === 'Languages').length },
  { id: 'DevOps', label: 'DevOps', icon: FaTerminal, count: MOCK_EXTENSIONS.filter(e => e.category === 'DevOps').length },
  { id: 'API', label: 'API', icon: FaPlug, count: MOCK_EXTENSIONS.filter(e => e.category === 'API').length },
  { id: 'Snippets', label: 'Snippets', icon: FaCode, count: MOCK_EXTENSIONS.filter(e => e.category === 'Snippets').length },
  { id: 'Formatting', label: 'Formatting', icon: FaPaintBrush, count: MOCK_EXTENSIONS.filter(e => e.category === 'Formatting').length },
  { id: 'Diagnostics', label: 'Diagnostics', icon: FaBolt, count: MOCK_EXTENSIONS.filter(e => e.category === 'Diagnostics').length },
  { id: 'Database', label: 'Database', icon: FaDatabase, count: MOCK_EXTENSIONS.filter(e => e.category === 'Database').length },
  { id: 'Platform', label: 'Platform', icon: FaPlug, count: MOCK_EXTENSIONS.filter(e => e.category === 'Platform').length },
]

// ── Main Component ────────────────────────────────────

export default function ExtensionMarketplace() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [extensions, setExtensions] = useState(MOCK_EXTENSIONS)
  const [selectedExt, setSelectedExt] = useState<MarketplaceExtension | null>(null)
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular')

  const filtered = useMemo(() => {
    let list = [...extensions]
    if (activeCategory === 'installed') list = list.filter(e => e.installed)
    else if (activeCategory !== 'all') list = list.filter(e => e.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q)) ||
        e.author.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'popular') list.sort((a, b) => b.downloads - a.downloads)
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating)
    else list.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    return list
  }, [search, activeCategory, extensions, sortBy])

  const featured = extensions.filter(e => e.featured)

  const toggleInstall = (id: string) => {
    setExtensions(prev => prev.map(e =>
      e.id === id ? { ...e, installed: !e.installed, enabled: !e.installed ? true : e.enabled } : e
    ))
    if (selectedExt?.id === id) {
      setSelectedExt(prev => prev ? { ...prev, installed: !prev.installed, enabled: !prev.installed ? true : prev.enabled } : null)
    }
  }

  const toggleEnabled = (id: string) => {
    setExtensions(prev => prev.map(e =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ))
  }

  const formatDownloads = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` :
    n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString()

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 13 }}>
      {/* ── Sidebar ───────────────────────────────── */}
      <div style={{ width: 220, borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #21262d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <FaPlug size={14} style={{ color: '#58a6ff' }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Extensions</span>
          </div>
          <div style={{ position: 'relative' }}>
            <FaSearch size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#484f58' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search extensions..."
              style={{
                width: '100%', padding: '5px 8px 5px 26px', background: '#161b22',
                border: '1px solid #30363d', borderRadius: 6, color: '#c9d1d9',
                fontSize: 11, outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: isActive ? 'rgba(56,139,253,0.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
                  color: isActive ? '#58a6ff' : '#8b949e', fontSize: 12,
                }}
              >
                <Icon size={12} />
                <span style={{ flex: 1 }}>{cat.label}</span>
                <span style={{ fontSize: 10, color: '#484f58', background: '#21262d', padding: '1px 6px', borderRadius: 10 }}>{cat.count}</span>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #21262d', fontSize: 10, color: '#484f58' }}>
          {extensions.filter(e => e.installed).length} installed · {extensions.length} available
        </div>
      </div>

      {/* ── Main Content ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', borderBottom: '1px solid #21262d', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: '#8b949e' }}>
            {filtered.length} extension{filtered.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['popular', FaFire, 'Popular'], ['rating', FaStar, 'Top Rated'], ['newest', FaArrowUp, 'Newest']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  background: sortBy === key ? 'rgba(56,139,253,0.15)' : 'transparent',
                  border: `1px solid ${sortBy === key ? '#58a6ff' : '#30363d'}`,
                  borderRadius: 4, color: sortBy === key ? '#58a6ff' : '#8b949e',
                  fontSize: 11, cursor: 'pointer',
                }}
              >
                <Icon size={10} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Featured section (only when showing all) */}
          {activeCategory === 'all' && !search && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <FaCrown size={13} style={{ color: '#f0883e' }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Featured Extensions</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {featured.slice(0, 3).map(ext => (
                  <div
                    key={ext.id}
                    onClick={() => setSelectedExt(ext)}
                    style={{
                      padding: 14, background: 'linear-gradient(135deg, #161b22 0%, #1c2333 100%)',
                      border: '1px solid #30363d', borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#58a6ff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#f0883e', color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>FEATURED</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 28 }}>{ext.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{ext.name}</div>
                        <div style={{ fontSize: 11, color: '#8b949e' }}>by {ext.author}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10, lineHeight: 1.4 }}>{ext.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                      <span style={{ color: '#f0883e' }}>★ {ext.rating}</span>
                      <span style={{ color: '#8b949e' }}>↓ {formatDownloads(ext.downloads)}</span>
                      {ext.verified && <FaShieldAlt size={10} style={{ color: '#3fb950' }} />}
                      {ext.installed && <FaCheckCircle size={10} style={{ color: '#3fb950' }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extension list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(ext => (
              <div
                key={ext.id}
                onClick={() => setSelectedExt(selectedExt?.id === ext.id ? null : ext)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 12px', background: selectedExt?.id === ext.id ? '#161b22' : 'transparent',
                  border: `1px solid ${selectedExt?.id === ext.id ? '#30363d' : 'transparent'}`,
                  borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (selectedExt?.id !== ext.id) e.currentTarget.style.background = '#161b2280' }}
                onMouseLeave={e => { if (selectedExt?.id !== ext.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>{ext.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{ext.name}</span>
                    {ext.verified && <FaShieldAlt size={10} style={{ color: '#3fb950' }} />}
                    <span style={{ fontSize: 10, color: '#484f58' }}>v{ext.version}</span>
                    {ext.installed && (
                      <span style={{ fontSize: 9, padding: '1px 5px', background: '#238636', color: '#fff', borderRadius: 3 }}>INSTALLED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ext.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                    <span style={{ color: '#f0883e' }}>★ {ext.rating}</span>
                    <span style={{ color: '#484f58' }}>·</span>
                    <span style={{ color: '#8b949e' }}>↓ {formatDownloads(ext.downloads)}</span>
                    <span style={{ color: '#484f58' }}>·</span>
                    <span style={{ color: '#8b949e' }}>{ext.author}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {ext.installed ? (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); toggleEnabled(ext.id) }}
                        title={ext.enabled ? 'Disable' : 'Enable'}
                        style={{
                          padding: '3px 8px', borderRadius: 4, border: '1px solid #30363d',
                          background: ext.enabled ? '#238636' : '#21262d',
                          color: ext.enabled ? '#fff' : '#8b949e', cursor: 'pointer', fontSize: 11,
                        }}
                      >
                        {ext.enabled ? <FaToggleOn size={12} /> : <FaToggleOff size={12} />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); toggleInstall(ext.id) }}
                        title="Uninstall"
                        style={{
                          padding: '3px 8px', borderRadius: 4, border: '1px solid #f85149',
                          background: 'transparent', color: '#f85149', cursor: 'pointer', fontSize: 11,
                        }}
                      >
                        <FaTrash size={11} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); toggleInstall(ext.id) }}
                      style={{
                        padding: '5px 14px', borderRadius: 6, border: 'none',
                        background: '#238636', color: '#fff', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <FaDownload size={10} /> Install
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#484f58' }}>
                <FaSearch size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>No extensions found</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Try a different search or category</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Panel ──────────────────────────── */}
      {selectedExt && (
        <div style={{
          width: 320, borderLeft: '1px solid #21262d', display: 'flex', flexDirection: 'column',
          background: '#0d1117', flexShrink: 0,
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid #21262d' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 36 }}>{selectedExt.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedExt.name}</div>
                <div style={{ fontSize: 11, color: '#8b949e' }}>by {selectedExt.author}</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5, margin: '0 0 12px' }}>{selectedExt.description}</p>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 12 }}>
              <span style={{ color: '#f0883e' }}>★ {selectedExt.rating} ({selectedExt.ratingCount.toLocaleString()})</span>
              <span>↓ {formatDownloads(selectedExt.downloads)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedExt.installed ? (
                <>
                  <button
                    onClick={() => toggleEnabled(selectedExt.id)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, border: '1px solid #30363d',
                      background: selectedExt.enabled ? '#23863620' : '#21262d',
                      color: selectedExt.enabled ? '#3fb950' : '#8b949e', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {selectedExt.enabled ? '✓ Enabled' : 'Enable'}
                  </button>
                  <button
                    onClick={() => toggleInstall(selectedExt.id)}
                    style={{
                      padding: '7px 14px', borderRadius: 6, border: '1px solid #f85149',
                      background: 'transparent', color: '#f85149', cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <button
                  onClick={() => toggleInstall(selectedExt.id)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
                    background: '#238636', color: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <FaDownload size={12} /> Install
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                ['Version', selectedExt.version],
                ['Updated', selectedExt.lastUpdated],
                ['Category', selectedExt.category],
                ['License', selectedExt.license || 'MIT'],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: 8, background: '#161b22', borderRadius: 6, border: '1px solid #21262d' }}>
                  <div style={{ fontSize: 10, color: '#484f58', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedExt.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '2px 8px', background: '#21262d', borderRadius: 10,
                    fontSize: 10, color: '#8b949e',
                  }}>{tag}</span>
                ))}
              </div>
            </div>

            {selectedExt.homepage && (
              <a
                href={selectedExt.homepage} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                  color: '#58a6ff', fontSize: 12, textDecoration: 'none',
                }}
              >
                <FaExternalLinkAlt size={11} /> View Homepage
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
