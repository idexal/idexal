import { useEffect } from 'react'

const SITE = 'https://idexal.com'

interface SeoOptions {
  title?: string
  description?: string
  path?: string
  image?: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/** Per-page SEO: title, description, Open Graph, Twitter card, canonical. */
export function useSeo({ title, description, path = '/', image = '/icon.png' }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} — Idexal` : 'Idexal — AI Models & AI-Powered IDE'
    const desc =
      description ??
      'Frontier AI models served from api.idexa.com with pay-as-you-go pricing, plus a Rust-powered multi-agent IDE with 72 panels.'

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', `${SITE}${path}`)
    upsertMeta('property', 'og:image', `${SITE}${image}`)
    upsertMeta('property', 'og:site_name', 'Idexal')
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', `${SITE}${image}`)
    upsertLink('canonical', `${SITE}${path}`)
  }, [title, description, path, image])
}
