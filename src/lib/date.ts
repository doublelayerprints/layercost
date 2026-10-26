import { DEFAULT_LOCALE, type Locale } from '@/i18n'
import { formatDateOnly, formatDateTime } from './format'

export function todayIsoDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nowIso(date = new Date()): string {
  return date.toISOString()
}

/** @deprecated Use `formatDateOnly` with an explicit locale. */
export function formatDateIt(isoDate: string): string {
  return formatDateOnly(isoDate, 'it')
}

/** @deprecated Use `formatDateTime` with an explicit locale. */
export function formatDateTimeIt(iso: string): string {
  return formatDateTime(iso, 'it')
}

export function formatDate(isoDate: string, locale: Locale = DEFAULT_LOCALE): string {
  return formatDateOnly(isoDate, locale)
}
