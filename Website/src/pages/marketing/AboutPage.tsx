import { FaIcon } from '@/components/shared/FaIcon'
import { useLang, useT } from '@/lib/useI18n'
import { Badge, Card, FadeIn, PageHeader } from '@/components/ui/primitives'
import { NewsletterSignup } from '@/components/marketing/sections'
import { useSeo } from '@/lib/useSeo'

const REPOS = [
  {
    href: 'https://github.com/idexal/idexal-ide',
    icon: 'fa-code',
    name: 'idexal/idexal-ide',
    descKey: 'repo1Desc',
    tags: ['Rust', 'TypeScript', 'Electron'],
  },
  {
    href: 'https://github.com/idexal/idexa-cli',
    icon: 'fa-square-terminal',
    name: 'idexal/idexa-cli',
    descKey: 'repo2Desc',
    tags: ['Rust', 'CLI', 'Open Source'],
  },
]

export function AboutPage() {
  useSeo({ title: "About Us", description: "Idexal is an independent software company crafting frontier AI models, a multi-agent IDE and a developer CLI." })
  const t = useT()
  useLang()
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={t('nav.about')} desc={t('about.heroDesc')} />

        {/* Mission */}
        <FadeIn>
          <Card className="p-8 sm:p-10">
            <h2 className="text-xl font-bold">{t('about.missionTitle')}</h2>
            <p className="mt-3 leading-relaxed text-muted">{t('about.missionText')}</p>
          </Card>
        </FadeIn>

        {/* Values */}
        <h2 className="mt-14 text-center text-2xl font-bold sm:text-3xl">{t('about.valuesTitle')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: 'fa-shield-halved', title: t('about.val1Title'), desc: t('about.val1Desc') },
            { icon: 'fa-layer-group', title: t('about.val2Title'), desc: t('about.val2Desc') },
            { icon: 'fa-code-branch', title: t('about.val3Title'), desc: t('about.val3Desc') },
          ].map((v, i) => (
            <FadeIn key={v.title} delay={i * 0.07}>
              <Card className="h-full p-6" hover>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-primary">
                  <FaIcon icon={v.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
              </Card>
            </FadeIn>
          ))}
        </div>

        {/* Founder */}
        <h2 className="mt-14 text-center text-2xl font-bold sm:text-3xl">{t('about.founderBadge')}</h2>
        <FadeIn>
          <Card className="mx-auto mt-8 max-w-3xl overflow-hidden p-0">
            <div className="h-24" style={{ background: 'linear-gradient(135deg,#3b82f6,#22d3ee)' }} />
            <div className="-mt-12 px-8 pb-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 text-3xl font-extrabold text-white ring-4 ring-[var(--surface)]">
                ZL
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-extrabold tracking-tight">{t('about.founderName')}</h3>
                <Badge color="blue">{t('about.founderRole')}</Badge>
              </div>
              <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t('about.founderBio')}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href="https://zakariaelahbabi.com" target="_blank" rel="noreferrer" className="btn btn-primary">
                  <FaIcon icon="fa-globe" className="h-4 w-4" /> {t('about.founderSite')}
                </a>
                <a href="mailto:info@zakariaelahbabi.com" className="btn btn-secondary">
                  <FaIcon icon="fa-envelope" className="h-4 w-4" /> info@zakariaelahbabi.com
                </a>
                <a href="https://github.com/idexal" target="_blank" rel="noreferrer" className="btn btn-ghost">
                  <FaIcon icon="fa-github" brand className="h-4 w-4" /> github.com/idexal
                </a>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Repos */}
        <h2 className="mt-14 text-center text-2xl font-bold sm:text-3xl">{t('about.reposTitle')}</h2>
        <p className="mt-2 text-center text-sm text-muted">{t('about.reposSubtitle')}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {REPOS.map((r, i) => (
            <FadeIn key={r.name} delay={i * 0.07}>
              <Card className="flex h-full flex-col p-6" hover>
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-400/15 text-primary">
                    <FaIcon icon={r.icon} className="h-5 w-5" />
                  </span>
                  <FaIcon icon="fa-github" brand className="h-5 w-5 text-muted" />
                </div>
                <a href={r.href} target="_blank" rel="noreferrer" dir="ltr" className="mt-4 text-start font-mono text-lg font-bold hover:text-primary">
                  {r.name}
                </a>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t(`about.${r.descKey}`)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-1.5">
                    {r.tags.map((tag) => (
                      <Badge key={tag} color="gray">{tag}</Badge>
                    ))}
                  </div>
                  <a href={r.href} target="_blank" rel="noreferrer" className="btn btn-secondary px-3 py-1.5 text-xs">
                    <FaIcon icon="fa-star" className="h-3.5 w-3.5 text-amber-400" /> {t('about.repoStar')}
                  </a>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>

        {/* Contact */}
        <h2 className="mt-14 text-center text-2xl font-bold sm:text-3xl">{t('about.contactTitle')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-bold">
              <FaIcon icon="fa-building" className="text-primary" /> {t('about.contactBrand')}
            </h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <a href="mailto:team@idexal.com" className="flex items-center gap-2.5 text-muted transition hover:text-primary">
                <FaIcon icon="fa-users" className="w-4" /> team@idexal.com
              </a>
              <a href="mailto:ide@idexal.com" className="flex items-center gap-2.5 text-muted transition hover:text-primary">
                <FaIcon icon="fa-code" className="w-4" /> ide@idexal.com
              </a>
              <a href="https://idexa.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-muted transition hover:text-primary">
                <FaIcon icon="fa-globe" className="w-4" /> idexa.com
              </a>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-bold">
              <FaIcon icon="fa-user" className="text-primary" /> {t('about.contactFounder')}
            </h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <a href="mailto:info@zakariaelahbabi.com" className="flex items-center gap-2.5 text-muted transition hover:text-primary">
                <FaIcon icon="fa-envelope" className="w-4" /> info@zakariaelahbabi.com
              </a>
              <a href="https://zakariaelahbabi.com" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-muted transition hover:text-primary">
                <FaIcon icon="fa-globe" className="w-4" /> zakariaelahbabi.com
              </a>
            </div>
          </Card>
        </div>
      </div>
      <NewsletterSignup />
    </div>
  )
}
