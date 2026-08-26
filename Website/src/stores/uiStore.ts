import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface UiState {
  theme: Theme
  toasts: { id: number; msg: string; kind: 'success' | 'error' | 'info' }[]
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  toast: (msg: string, kind?: 'success' | 'error' | 'info') => void
  dismissToast: (id: number) => void
}

const saved = (() => {
  try {
    return localStorage.getItem('idexal-theme') as Theme | null
  } catch {
    return null
  }
})()

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: saved ?? 'dark',
  toasts: [],
  setTheme: (t) => {
    try {
      localStorage.setItem('idexal-theme', t)
    } catch { /* ignore */ }
    applyTheme(t)
    set({ theme: t })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  toast: (msg, kind = 'info') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, msg, kind }] })
    setTimeout(() => get().dismissToast(id), 3500)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

// Apply on module load so the first paint matches the stored preference.
applyTheme((saved ?? 'dark') as Theme)
