import { useEffect, useMemo, type ReactNode } from 'react'
import { translate } from '@/i18n'
import { useLocaleStore } from '@/state/locale-store'
import { I18nContext, type I18nContextValue } from './i18n-context'

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
