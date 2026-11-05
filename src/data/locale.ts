import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n'

export const LOCALE_STORAGE_KEY = 'layercost:locale'

interface LocaleStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function defaultStorage(): LocaleStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * `/en/` is the public English landing (ADR-0035): opening it is an explicit
 * request for the English session, so the path wins over the stored preference.
 * Elsewhere the stored preference (or Italian) applies.
 */
export function initialLocale(pathname: string, stored: string | null): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en'
  return stored && isLocale(stored) ? stored : DEFAULT_LOCALE
}

/**
 * UI preference, separate from AppData: it must not enter quote snapshots,
 * backups or the schema migration path. The quote keeps its own locale.
 */
export function loadLocalePreference(storage = defaultStorage()): Locale {
  try {
    const pathname = typeof location === 'undefined' ? '/' : location.pathname
    const stored = storage?.getItem(LOCALE_STORAGE_KEY) ?? null
    return initialLocale(pathname, stored)
  } catch {
    return DEFAULT_LOCALE
  }
}

export function saveLocalePreference(locale: Locale, storage = defaultStorage()): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // The language is not critical data: if storage is full or blocked, keep the session preference.
  }
}
