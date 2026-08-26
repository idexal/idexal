import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LANGS, LANG_META, type Lang } from '@/lib/langs'
import { i18n } from '@/lib/i18n'
import { useLang, useT } from '@/lib/useI18n'
import { useUiStore } from '@/stores/uiStore'
import { FaIcon } from '@/components/shared/FaIcon'

export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useT()
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/icon.png" alt="Idexal" className="h-8 w-8 rounded-lg" />
      {!compact && <span className="text-lg font-bold tracking-tight">{t('brand')}</span>}
    </Link>
  )
}

function LangSwitcher() {
  useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="btn btn-ghost px-2.5 py-1.5" aria-label="Language">
        <FaIcon icon="fa-globe" className="h-4 w-4" />
        <span className="hidden text-xs font-semibold uppercase sm:inline">{i18n.lang}</span>
        <FaIcon icon="fa-chevron-down" className="h-3 w-3" />
      </button>
      {open && (
        <div className="card-surface absolute end-0 z-50 mt-2 w-44 overflow-hidden p-1 shadow-xl">
          {LANGS.map((code: Lang) => (
            <button
              key={code}
              onClick={() => {
                void i18n.setLang(code)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)] ${i18n.lang === code ? 'font-bold text-primary' : ''}`}
            >
              <span>{LANG_META[code].flag}</span>
              <span className="flex-1 text-start">{LANG_META[code].name}</span>
              {i18n.lang === code && <span className="text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const theme = useUiStore((s) => s.theme)
  const toggle = useUiStore((s) => s.toggleTheme)
  return (
    <button onClick={toggle} className="btn btn-ghost px-2 py-1.5" aria-label="Theme">
      {theme === 'dark' ? <FaIcon icon="fa-sun" regular className="h-4 w-4" /> : <FaIcon icon="fa-moon" regular className="h-4 w-4" />}
    </button>
  )
}

const navItems = [
  { path: '/', key: 'nav.home' },
  { path: '/features', key: 'nav.features' },
  { path: '/models', key: 'models.nav' },
  { path: '/pricing', key: 'nav.pricing' },
  { path: '/docs', key: 'nav.docs' },
  { path: '/blog', key: 'nav.blog' },
  { path: '/about', key: 'nav.about' },
]

export function MarketingHeader() {
  const t = useT()
  const [mobileOpen, setMobileOpen] = useState(false)
  useLang()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--bg)]/80 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.path === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-primary' : 'text-muted hover:text-[var(--text)]'}`
                }
              >
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LangSwitcher />
          <Link to="/auth/login" className="btn btn-ghost hidden sm:inline-flex">
            {t('nav.login')}
          </Link>
          <Link to="/dashboard" className="btn btn-primary hidden sm:inline-flex">
            {t('nav.getStarted')}
          </Link>
          <button className="btn btn-ghost px-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <FaIcon icon="fa-xmark" className="h-5 w-5" /> : <FaIcon icon="fa-bars" className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-line bg-[var(--bg)] px-4 pb-4 pt-2 lg:hidden">
          {navItems.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-blue-500/10 font-semibold text-primary' : 'text-muted'}`}
            >
              {t(n.key)}
            </NavLink>
          ))}
          <div className="mt-3 flex gap-2">
            <Link to="/auth/login" className="btn btn-secondary flex-1">{t('nav.login')}</Link>
            <Link to="/dashboard" className="btn btn-primary flex-1">{t('nav.getStarted')}</Link>
          </div>
        </nav>
      )}
    </header>
  )
}
