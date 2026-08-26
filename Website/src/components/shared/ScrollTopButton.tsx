import { useEffect, useState } from 'react'
import { FaIcon } from '@/components/shared/FaIcon'

/** Floating scroll-to-top button — appears after 600px of scrolling. */
export function ScrollTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-20 end-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-[var(--surface)] text-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <FaIcon icon="fa-arrow-up" className="h-4 w-4" />
    </button>
  )
}
