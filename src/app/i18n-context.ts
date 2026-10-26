import { createContext, useContext } from 'react'
import type { InterpolationParams, Locale, MessageKey } from '@/i18n'

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: InterpolationParams) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used inside an I18nProvider.')
  }
  return value
}
