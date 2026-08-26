import { LANGS, LANG_META, type Lang } from './langs'

type Dict = Record<string, unknown>

const cache: Partial<Record<Lang, Dict>> = {}
let listeners = new Set<() => void>()
let current: Lang = detect()
let dicts: Record<string, Dict> = {}
// Bumped whenever a dictionary finishes loading so useSyncExternalStore
// sees a new snapshot even when the language itself didn't change.
let version = 0

function detect(): Lang {
  try {
    const saved = localStorage.getItem('idexal-lang') as Lang | null
    if (saved && (LANGS as readonly string[]).includes(saved)) return saved
    const nav = navigator.language.slice(0, 2) as Lang
    if ((LANGS as readonly string[]).includes(nav)) return nav
  } catch {
    /* ignore */
  }
  return 'en'
}

function notify() {
  listeners.forEach((l) => l())
}

export const i18n = {
  init: (enDict: Dict) => {
    dicts.en = enDict
  },
  async load(lang: Lang): Promise<Dict> {
    if (cache[lang]) return cache[lang]!
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}locales/${lang}.json`)
      const json = (await res.json()) as Dict
      cache[lang] = json
      // Components may have rendered with raw keys while the dict was
      // loading — bump version + notify so they re-render with real strings.
      version++
      notify()
      return json
    } catch {
      return dicts.en ?? {}
    }
  },
  get lang() {
    return current
  },
  dir(): 'ltr' | 'rtl' {
    return LANG_META[current].dir
  },
  t(path: string): string {
    const dict = cache[current]
    const fallback = cache.en ?? dicts.en
    const walk = (d?: Dict): unknown =>
      d?.[path.split('.')[0]] !== undefined
        ? path
            .split('.')
            .reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Dict)[k] : undefined), d)
        : undefined
    let val = walk(dict)
    if (val === undefined || typeof val !== 'string') val = walk(fallback)
    return typeof val === 'string' ? val : path
  },
  tc<T>(path: string): T | undefined {
    const dict = cache[current]
    if (!dict) return undefined
    return path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Dict)[k] : undefined), dict) as T | undefined
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => {
      // Set.delete returns boolean; wrap to satisfy React's Destructor<void>.
      listeners.delete(fn)
    }
  },
  getSnapshot() {
    // Language + version: either changing must invalidate the snapshot.
    return `${current}:${version}`
  },
  async setLang(lang: Lang) {
    if (!(LANGS as readonly string[]).includes(lang)) return
    if (!cache[lang]) await i18n.load(lang)
    current = lang
    try {
      localStorage.setItem('idexal-lang', lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang
    document.documentElement.dir = LANG_META[lang].dir
    notify()
  },
}
