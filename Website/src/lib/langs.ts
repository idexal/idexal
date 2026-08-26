export const LANGS = ['en', 'ar', 'fr', 'de', 'ja', 'zh'] as const

export type Lang = (typeof LANGS)[number]

export interface LangMeta {
  code: Lang
  name: string
  englishName: string
  dir: 'ltr' | 'rtl'
  flag: string
}

export const LANG_META: Record<Lang, LangMeta> = {
  en: { code: 'en', name: 'English', englishName: 'English', dir: 'ltr', flag: '🇺🇸' },
  ar: { code: 'ar', name: 'العربية', englishName: 'Arabic', dir: 'rtl', flag: '🇸🇦' },
  fr: { code: 'fr', name: 'Français', englishName: 'French', dir: 'ltr', flag: '🇫🇷' },
  de: { code: 'de', name: 'Deutsch', englishName: 'German', dir: 'ltr', flag: '🇩🇪' },
  ja: { code: 'ja', name: '日本語', englishName: 'Japanese', dir: 'ltr', flag: '🇯🇵' },
  zh: { code: 'zh', name: '中文', englishName: 'Chinese', dir: 'ltr', flag: '🇨🇳' },
}
