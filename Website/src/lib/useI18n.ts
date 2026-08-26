import { useSyncExternalStore } from 'react'
import { i18n } from './i18n'

export function useLang(): string {
  return useSyncExternalStore(
    (cb) => i18n.subscribe(cb),
    () => i18n.getSnapshot(),
  )
}

/** Translate a dot-path using the active language; re-renders on language change. */
export function useT(): (path: string) => string {
  useSyncExternalStore(
    (cb) => i18n.subscribe(cb),
    () => i18n.getSnapshot(),
  )
  return (path: string) => i18n.t(path)
}

export { i18n }
