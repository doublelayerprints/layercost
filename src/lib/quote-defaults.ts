import type { QuoteLocale } from '@/domain/types'

/** Default names for a new quote and its first line, per document language. */
export const EMPTY_DRAFT_NAMES: Record<QuoteLocale, string> = {
  it: 'Nuovo preventivo',
  en: 'New quote',
}

export const EMPTY_LINE_NAMES: Record<QuoteLocale, string> = {
  it: 'Stampa',
  en: 'Print',
}

export const QUOTE_COPY_SUFFIX: Record<QuoteLocale, string> = {
  it: ' (copia)',
  en: ' (copy)',
}

export const QUOTE_REFRESH_SUFFIX: Record<QuoteLocale, string> = {
  it: ' (prezzi aggiornati)',
  en: ' (updated prices)',
}

export const QUOTE_IMPORT_SUFFIX: Record<QuoteLocale, string> = {
  it: ' (importato)',
  en: ' (imported)',
}
