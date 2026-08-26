import { useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LANGS, LANG_META, type Lang } from '@/lib/langs'
import { i18n } from '@/lib/i18n'
import { useLang, useT } from '@/lib/useI18n'
import { Logo } from '@/components/marketing/Header'
import { FaIcon } from '@/components/shared/FaIcon'
import { CommandPalette } from '@/components/shared/CommandPalette'

export interface NavItem {
  to: string
  key: string
  icon: ReactNode
  end?: boolean
}

export function LangSwitcherInline() {
  useLang()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn btn-secondary px-2.5 py-1.5">
        <FaIcon icon="fa-globe" className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase">{i18n.lang}</span>
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
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Shared dashboard shell: sidebar + topbar + content outlet. */
export function DashboardLayout({
  items,
  brandLabel,
  accent = '#3b82f6',
}: {
  items: NavItem[]
  brandLabel: string
  accent?: string
}) {
  const t = useT()
  useLang()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: `${accent}22`, color: accent }}>
          {brandLabel}
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'font-semibold' : 'text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="[&>svg]:h-4.5" style={{ width: 20 }}>{it.icon}</span>
                <span style={{ color: isActive ? accent : undefined }}>{t(it.key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-[var(--surface-2)]">
          <FaIcon icon="fa-right-from-bracket" className="h-4 w-4 rtl:-scale-x-100" /> {t('dash.logout')}
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-line bg-[var(--surface)] lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute start-0 top-0 h-full w-72 border-e border-line bg-[var(--surface)] shadow-xl">
            <button className="absolute end-3 top-4 btn btn-ghost p-1.5" onClick={() => setMobileOpen(false)} aria-label="close"><FaIcon icon="fa-xmark" className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-[var(--bg)]/85 px-4 backdrop-blur sm:px-6">
          <button className="btn btn-ghost p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="menu"><FaIcon icon="fa-bars" className="h-5 w-5" /></button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <FaIcon icon="fa-magnifying-glass" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <button onClick={() => setPaletteOpen(true)} className="input flex w-full items-center justify-between ps-9 text-start text-muted">
              {t('dash.search')}
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LangSwitcherInline />
            <div className="flex items-center gap-2 rounded-full border border-line py-1 pe-3 ps-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">AH</span>
              <span className="hidden text-sm font-semibold md:inline">Ahmed</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        {paletteOpen && (
        <CommandPalette
          items={useMemo(
            () => items.map((it) => ({ label: t(it.key), path: it.to, icon: 'fa-arrow-right', group: brandLabel })),
            [items, brandLabel, t],
          )}
        />
        )}
      </div>
    </div>
  )
}
