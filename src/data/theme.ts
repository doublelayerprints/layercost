import { isThemePreference, type ThemePreference } from '@/lib/theme'

export const THEME_STORAGE_KEY = 'layercost:theme'

interface ThemeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function defaultStorage(): ThemeStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * UI preference, separate from AppData: it must not enter quote snapshots,
 * backups or the schema migration path.
 */
export function loadThemePreference(storage = defaultStorage()): ThemePreference {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY)
    return isThemePreference(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePreference(preference: ThemePreference, storage = defaultStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // The theme is not critical data: if storage is full or blocked, keep the session preference.
  }
}
