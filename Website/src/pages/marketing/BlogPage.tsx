import { Link, useParams } from 'react-router-dom'
import { useLang, useT } from '@/lib/useI18n'
import { BLOG_POSTS } from '@/data/mock'
import { Badge, Card, FadeIn, PageHeader } from '@/components/ui/primitives'
import { NewsletterSignup } from '@/components/marketing/sections'
import { FaIcon } from '@/components/shared/FaIcon'
import { useSeo } from '@/lib/useSeo'

export function BlogPage() {
  useSeo({ title: "Blog", description: "News, tutorials and engineering deep-dives from the Idexal team." })
  const t = useT()
  useLang()
  const ar = document.documentElement.lang === 'ar'
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={t('blog.title')} desc={t('blog.subtitle')} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((p, i) => (
            <FadeIn key={p.slug} delay={i * 0.05}>
              <Link to={`/blog/${p.slug}`}>
                <Card className="flex h-full flex-col p-6" hover>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary">
                    {p.category}
                    <span className="font-normal normal-case text-muted">{p.date}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug">{ar ? p.titleAr : p.title}</h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{ar ? p.excerptAr : p.excerpt}</p>
                  <div className="mt-4 text-xs text-muted">{p.author} · {p.readMinutes} {t('blog.minRead')}</div>
                </Card>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BlogPostPage() {
  const { slug } = useParams()
  const t = useT()
  useLang()
  const post = BLOG_POSTS.find((p) => p.slug === slug)
  if (!post) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-2xl font-bold">404 — Post not found</h1>
        <Link to="/blog" className="btn btn-primary mt-6">{t('blog.back')}</Link>
      </div>
    )
  }
  const ar = document.documentElement.lang === 'ar'
  const body = ar ? post.bodyAr : post.body
  return (
    <div className="py-14">
      <article className="container-x max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <FaIcon icon="fa-arrow-left" className="h-4 w-4 rtl:-scale-x-100" /> {t('blog.back')}
        </Link>
        <Badge color="blue">{post.category}</Badge>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">{ar ? post.titleAr : post.title}</h1>
        <div className="mt-3 text-sm text-muted">{post.author} · {post.date} · {post.readMinutes} {t('blog.minRead')}</div>
        <div className="mt-8 space-y-5">
          {body.map((para, i) => (
            <p key={i} className="leading-relaxed text-[15px] text-[var(--text)]/90">{para}</p>
          ))}
        </div>
      </article>
      <NewsletterSignup />
    </div>
  )
}

export function BlogCategoryPage() {
  const { category } = useParams()
  const t = useT()
  useLang()
  const ar = document.documentElement.lang === 'ar'
  const cat = BLOG_POSTS.some((p) => p.category.toLowerCase() === category)
  const posts = BLOG_POSTS.filter((p) => p.category.toLowerCase() === category)
  return (
    <div className="py-14">
      <div className="container-x">
        <PageHeader title={cat ? `${category}` : t('blog.title')} desc={t('blog.subtitle')} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(cat ? posts : BLOG_POSTS).map((p) => (
            <Link key={p.slug} to={`/blog/${p.slug}`}>
              <Card className="h-full p-6" hover>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">{p.category}</div>
                <h3 className="mt-2 font-semibold leading-snug">{ar ? p.titleAr : p.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{ar ? p.excerptAr : p.excerpt}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
