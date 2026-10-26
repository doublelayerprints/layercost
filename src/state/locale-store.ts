import { create } from 'zustand'
import { loadLocalePreference, saveLocalePreference } from '@/data/locale'
import type { Locale } from '@/i18n'

export interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: loadLocalePreference(),
  setLocale: (locale) => {
    saveLocalePreference(locale)
    set({ locale })
  },
}))
