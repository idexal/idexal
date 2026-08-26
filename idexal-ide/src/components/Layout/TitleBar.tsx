import React, { useEffect, useState, useRef } from 'react'
import { FaTimes, FaTerminal, FaComments, FaCog, FaQuestionCircle, FaSearch, FaSun, FaMoon, FaBook, FaKeyboard, FaRocket, FaGithub, FaExternalLinkAlt, FaBug, FaChartBar } from '../Icon'

interface TitleBarProps {
  onToggleSidebar: () => void
  onToggleTerminal: () => void
  onToggleChat: () => void
  onOpenCommandPalette: () => void
  onOpenSettings?: () => void
  onOpenAbout?: () => void
  onOpenDocs?: () => void
  onOpenFeatureDashboard?: () => void
  onOpenShortcuts?: () => void
}

export default function TitleBar({
  onToggleSidebar,
  onToggleTerminal,
  onToggleChat,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenAbout,
  onOpenDocs,
  onOpenFeatureDashboard,
  onOpenShortcuts,
}: TitleBarProps) {
  const [isLight, setIsLight] = React.useState(() => {
    return localStorage.getItem('ide-theme') === 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (isLight) {
      root.classList.remove('dark')
      root.classList.add('light')
      localStorage.setItem('ide-theme', 'light')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      localStorage.setItem('ide-theme', 'dark')
    }
  }, [isLight])

  return (
    <div className="relative h-11 bg-ide-titlebar flex items-center justify-between px-4 select-none brand-line-bottom">
      {/* Left Section */}
      <div className="flex items-center gap-5">
        {/* Logo + Brand */}
        <div className="flex items-center gap-2.5 group cursor-default">
          <div className="relative">
            <img src="/icon.png" alt="Idexal" className="w-6 h-6 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-110" />
            <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-0 blur-md group-hover:opacity-30 transition-opacity duration-300" />
          </div>
          <span className="text-sm font-bold text-gradient tracking-tight">Idexal IDE</span>
          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-ide-brand-100 text-ide-brand-light border border-ide-brand-200 font-medium">v1.0.0</span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-ide-border opacity-50" />

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          <TitleBarButton onClick={onToggleSidebar} title="Toggle Sidebar (Ctrl+B)" icon={<FaTimes className="w-4 h-4" />} />
          <TitleBarButton onClick={onToggleTerminal} title="Toggle Terminal (Ctrl+`)" icon={<FaTerminal className="w-4 h-4" />} />
          <TitleBarButton onClick={onToggleChat} title="Toggle AI Chat (Ctrl+Shift+A)" icon={<FaComments className="w-4 h-4" />} accent />
          <TitleBarButton onClick={onOpenSettings} title="Settings (Ctrl+,)" icon={<FaCog className="w-4 h-4" />} />
          <HelpMenu onOpenAbout={onOpenAbout} onOpenDocs={onOpenDocs} onOpenFeatureDashboard={onOpenFeatureDashboard} onOpenShortcuts={onOpenShortcuts} />
        </div>
      </div>

      {/* Center - Command Palette Trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="group flex items-center gap-2.5 px-5 py-1.5 rounded-xl bg-ide-surface border border-ide-border hover:border-ide-brand/40 transition-all duration-300 text-sm text-ide-text-muted hover:text-ide-text-secondary hover:shadow-brand-sm"
      >
        <FaSearch className="w-3.5 h-3.5 text-ide-text-dim group-hover:text-ide-brand transition-colors" />
        <span>Search or run a command...</span>
        <div className="flex items-center gap-1 ml-3">
          <kbd className="!h-5 !px-1.5 !text-2xs">⌘</kbd>
          <kbd className="!h-5 !px-1.5 !text-2xs">K</kbd>
        </div>
      </button>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsLight(!isLight)}
          className="p-2 rounded-lg text-ide-text-dim hover:text-ide-text-secondary hover:bg-ide-surface-alt transition-all duration-200"
          title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
        >
          {isLight ? <FaMoon className="w-4 h-4" /> : <FaSun className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-ide-success animate-brand-pulse" />
          <span className="text-2xs text-ide-text-dim font-medium">AI Ready</span>
        </div>
      </div>
    </div>
  )
}

function HelpMenu({ onOpenAbout, onOpenDocs, onOpenFeatureDashboard, onOpenShortcuts }: { onOpenAbout?: () => void; onOpenDocs?: () => void; onOpenFeatureDashboard?: () => void; onOpenShortcuts?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const items = [
    { icon: <FaQuestionCircle className="w-4 h-4" />, label: 'About Idexal IDE', action: onOpenAbout, shortcut: '' },
    { icon: <FaBook className="w-4 h-4" />, label: 'Documentation', action: onOpenDocs, shortcut: 'Ctrl+M' },
    { icon: <FaChartBar className="w-4 h-4" />, label: 'Feature Dashboard', action: onOpenFeatureDashboard, shortcut: '' },
    { icon: <FaKeyboard className="w-4 h-4" />, label: 'Keyboard Shortcuts', action: onOpenShortcuts, shortcut: 'Ctrl+/' },
    { type: 'separator' as const },
    { icon: <FaRocket className="w-4 h-4" />, label: "What's New", action: () => window.open('https://github.com/idexal/idexal-ide/releases', '_blank'), shortcut: '' },
    { icon: <FaBug className="w-4 h-4" />, label: 'Report Issue', action: () => window.open('https://github.com/idexal/idexal-ide/issues', '_blank'), shortcut: '' },
    { icon: <FaGithub className="w-4 h-4" />, label: 'GitHub Repository', action: () => window.open('https://github.com/idexal/idexal-ide', '_blank'), shortcut: '' },
    { type: 'separator' as const },
    { icon: <FaExternalLinkAlt className="w-4 h-4" />, label: 'idexa.com', action: () => window.open('https://idexa.com', '_blank'), shortcut: '' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-all duration-200 text-ide-text-dim hover:text-ide-text-secondary hover:bg-ide-surface-alt"
        title="Help"
      >
        <FaQuestionCircle className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-ide-surface border border-ide-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-ide-border">
            <div className="text-[10px] font-semibold text-ide-text-dim uppercase tracking-wider">Help</div>
          </div>
          {items.map((item, i) => {
            if ('type' in item && item.type === 'separator') {
              return <div key={i} className="my-1 border-t border-ide-border" />
            }
            return (
              <button
                key={i}
                onClick={() => { item.action?.(); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ide-text-secondary hover:bg-ide-brand/10 hover:text-ide-brand-light transition-colors text-left"
              >
                <span className="text-ide-text-dim shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] text-ide-text-dim bg-ide-bg border border-ide-border rounded px-1.5 py-0.5 font-mono">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            )
          })}
          <div className="px-3 py-2 border-t border-ide-border">
            <div className="text-[10px] text-ide-text-dim">© 2026 Idexal · v1.0.0</div>
          </div>
        </div>
      )}
    </div>
  )
}

function TitleBarButton({ onClick, title, icon, accent }: {
  onClick?: () => void
  title: string
  icon: React.ReactNode
  accent?: boolean
}) {
  if (!onClick) return null
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-all duration-200 group/btn ${
        accent
          ? 'text-ide-brand hover:text-ide-brand-light hover:bg-ide-brand-50'
          : 'text-ide-text-dim hover:text-ide-text-secondary hover:bg-ide-surface-alt'
      }`}
      title={title}
    >
      {icon}
      {accent && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ide-brand opacity-0 group-hover/btn:opacity-100 transition-opacity" />
      )}
    </button>
  )
}
