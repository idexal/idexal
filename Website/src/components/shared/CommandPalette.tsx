import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaIcon } from '@/components/shared/FaIcon'

interface Cmd {
  label: string
  path: string
  icon: string
  group: string
}

export function CommandPalette({ items }: { items: Cmd[] }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // Ignore outside-clicks for 200ms after opening — otherwise the same click
  // that opened the palette bubbles to the backdrop and closes it instantly.
  const openedAt = useRef(0)

  const openPalette = () => {
    openedAt.current = Date.now()
    setOpen(true)
    setQ('')
    setIdx(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) setOpen(false)
        else openPalette()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = useMemo(() => {
    const q2 = q.toLowerCase()
    return items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(q2)).slice(0, 12)
  }, [items, q])

  const run = (path: string) => {
    setOpen(false)
    nav(path)
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]"
      onClick={() => {
        if (Date.now() - openedAt.current > 200) setOpen(false)
      }}
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="card-surface relative w-full max-w-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <FaIcon icon="fa-magnifying-glass" className="text-muted" />
          <input
            ref={inputRef}
            autoFocus
            data-testid="command-input"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && filtered[idx]) run(filtered[idx].path)
            }}
            placeholder="Type a page or action…"
            className="w-full bg-transparent py-3.5 text-sm outline-none"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2" data-testid="command-results">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted">No results for "{q}"</p>}
          {filtered.map((c, i) => (
            <button
              key={c.path + c.label}
              onClick={() => run(c.path)}
              onMouseEnter={() => setIdx(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm ${i === idx ? 'bg-blue-500/10 text-primary' : 'text-muted hover:bg-[var(--surface-2)]'}`}
            >
              <FaIcon icon={c.icon} className="w-4" />
              <span className="flex-1 font-medium">{c.label}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-60">{c.group}</span>
              {i === idx && <span className="text-[10px]">↵</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-line px-4 py-2 text-[10px] text-muted">
          ↑↓ navigate · ↵ open · ⌘K toggle
        </div>
      </div>
    </div>
  )
}
