import { Link } from 'react-router-dom'
import { useT } from '@/lib/useI18n'
import { FaIcon } from '@/components/shared/FaIcon'

export function MarketingFooter() {
  const t = useT()
  const cols: { title: string; links: { to: string; label: string }[] }[] = [
    {
      title: t('footer.product'),
      links: [
        { to: '/features', label: t('nav.features') },
        { to: '/models', label: t('models.nav') },
        { to: '/pricing', label: t('nav.pricing') },
        { to: '/docs', label: t('nav.docs') },
        { to: '/changelog', label: t('footer.changelog') },
        { to: '/status', label: t('footer.status') },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { to: '/about', label: t('nav.about') },
        { to: '/contact', label: t('nav.contact') },
        { to: '/partners', label: t('footer.partners') },
        { to: '/careers', label: t('footer.careers') },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { to: '/philosophy', label: 'Computational Elegance' },
        { to: '/security', label: t('footer.security') },
        { to: '/developers', label: 'API Reference' },
        { to: '/blog', label: t('nav.blog') },
        { to: '/docs/faq', label: 'FAQ' },
        { to: '/developer', label: t('nav.developer') },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { to: '/terms', label: t('footer.terms') },
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/cookies', label: t('footer.cookies') },
      ],
    },
  ]

  return (
    <footer className="border-t border-line bg-[var(--surface)]">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <img src="/logo-full.png" alt="Idexal" className="h-10 w-auto rounded-lg" />
          <p className="mt-3 max-w-xs text-sm text-muted">{t('hero.subtitle')}</p>
          <div className="mt-4 flex gap-2">
            {['fa-x-twitter', 'fa-github', 'fa-youtube', 'fa-linkedin'].map((ic) => (
              <a key={ic} href="#" className="btn btn-ghost rounded-lg p-2" aria-label="social">
                <FaIcon icon={ic} brand className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-sm font-semibold">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted transition hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© 2026 Idexal. {t('footer.rights')}</div>
    </footer>
  )
}
