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
 * UI preference, separate from AppData: it must not enter quote snapshots,
 * backups or the schema migration path. The quote keeps its own locale.
 */
export function loadLocalePreference(storage = defaultStorage()): Locale {
  try {
    const raw = storage?.getItem(LOCALE_STORAGE_KEY)
    return raw && isLocale(raw) ? raw : DEFAULT_LOCALE
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
