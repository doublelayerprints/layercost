import type { Locale } from '@/i18n'
import { docsEn } from '@/i18n/en/docs'
import { docsIt } from '@/i18n/it/docs'

export type DocsKey = keyof typeof docsIt

const dictionaries: Record<Locale, Record<DocsKey, string>> = {
  it: docsIt,
  en: docsEn,
}

export function translateDocs(locale: Locale, key: DocsKey): string {
  return dictionaries[locale][key]
}
