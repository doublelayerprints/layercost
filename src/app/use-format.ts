import { useMemo } from 'react'
import type { Locale } from '@/i18n'
import { createFormatters, type Formatters } from '@/lib/format'
import { useI18n } from './i18n-context'

/**
 * Formatters bound to the interface locale, or to a document locale when the
 * quote must keep the language it was created with.
 */
export function useFormat(localeOverride?: Locale): Formatters {
  const { locale } = useI18n()
  const active = localeOverride ?? locale
  return useMemo(() => createFormatters(active), [active])
}
