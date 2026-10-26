import { createContext, useContext, useMemo } from 'react'
import { translate, type InterpolationParams, type Locale, type MessageKey } from '@/i18n'

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

/**
 * Returns a translator for the interface locale or for a document locale.
 * Print and shared quotes use the language stored on the quote.
 */
export function useTranslator(localeOverride?: Locale): I18nContextValue['t'] {
  const { locale } = useI18n()
  const active = localeOverride ?? locale
  return useMemo(() => (key, params) => translate(active, key, params), [active])
}
