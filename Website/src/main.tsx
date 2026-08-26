import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from './router'
import './index.css'

// Load the active locale's dictionary before first paint completes.
const boot = async () => {
  const lang = localStorage.getItem('idexal-lang')
  if (lang) await import('@/lib/i18n').then((m) => m.i18n.load(lang as never))
}

void boot().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>,
  )
})
