import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from '@/i18n'

/** Display rounding for money, symmetric for negative deltas. Avoids float noise at half cents. */
export function displayCents(microEur: number): number {
  return microEur >= 0 ? Math.floor(microEur / 10_000 + 0.5) : Math.ceil(microEur / 10_000 - 0.5)
}

export function formatCurrency(
  microEur: number,
  maximumFractionDigits = 2,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const euros = maximumFractionDigits <= 2 ? displayCents(microEur) / 100 : microEur / 1_000_000
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(euros)
}

export function formatCents(
  cents: number,
  maximumFractionDigits = 2,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return formatCurrency(cents * 10_000, maximumFractionDigits, locale)
}

export function formatPercent(
  bp: number,
  maximumFractionDigits = 1,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(bp / 100)}%`
}

export function formatGrams(cg: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cg / 100)} g`
}

export function formatWeightKg(grams: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(grams / 1000)} kg`
}

/** Durations use the same abbreviated units in Italian and English. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—'
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function formatDurationShort(seconds: number): string {
  if (seconds <= 0) return '0 min'
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function formatHoursDecimal(seconds: number, locale: Locale = DEFAULT_LOCALE): string {
  return (
    new Intl.NumberFormat(INTL_LOCALES[locale], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(seconds / 3600) + ' h'
  )
}

export function formatNumber(
  value: number,
  maximumFractionDigits = 2,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

/**
 * Parses a number typed by the user. Both comma and dot are accepted as decimal
 * separators: the last separator wins when both are present, and repeated
 * separators are treated as digit grouping.
 */
export function parseLocaleNumber(raw: string): number {
  const value = raw.trim().replace(/[\s\u00a0\u202f]/g, '')
  if (value === '' || value === '-' || value === '+') return Number.NaN

  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')

  if (lastComma < 0 && lastDot < 0) {
    return Number(value)
  }

  let decimalIndex: number
  if (lastComma >= 0 && lastDot >= 0) {
    decimalIndex = Math.max(lastComma, lastDot)
  } else {
    const separator = lastComma >= 0 ? ',' : '.'
    const occurrences = value.split(separator).length - 1
    if (occurrences > 1) {
      return Number(value.replace(/[.,]/g, ''))
    }
    decimalIndex = lastComma >= 0 ? lastComma : lastDot
  }

  const integerPart = value.slice(0, decimalIndex).replace(/[.,]/g, '') || '0'
  const fractionPart = value.slice(decimalIndex + 1).replace(/[.,]/g, '')
  return Number(`${integerPart}.${fractionPart}`)
}

export function formatInputNumber(
  value: number,
  decimals = 2,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatPricePerUnit(
  cents: number,
  quantity: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const perUnit = cents / Math.max(quantity, 1)
  const isWholeCent = Number.isInteger(perUnit)
  return formatCents(perUnit, isWholeCent ? 2 : 3, locale)
}

export function formatDateOnly(isoDate: string, locale: Locale = DEFAULT_LOCALE): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatDateTime(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export interface Formatters {
  currency: (microEur: number, maximumFractionDigits?: number) => string
  cents: (cents: number, maximumFractionDigits?: number) => string
  percent: (bp: number, maximumFractionDigits?: number) => string
  grams: (cg: number) => string
  weightKg: (grams: number) => string
  duration: (seconds: number) => string
  durationShort: (seconds: number) => string
  hoursDecimal: (seconds: number) => string
  number: (value: number, maximumFractionDigits?: number) => string
  inputNumber: (value: number, decimals?: number) => string
  pricePerUnit: (cents: number, quantity: number) => string
  dateOnly: (isoDate: string) => string
  dateTime: (iso: string) => string
}

/** Binds every formatter to one locale so components do not repeat the argument. */
export function createFormatters(locale: Locale = DEFAULT_LOCALE): Formatters {
  return {
    currency: (microEur, maximumFractionDigits) =>
      formatCurrency(microEur, maximumFractionDigits, locale),
    cents: (cents, maximumFractionDigits) => formatCents(cents, maximumFractionDigits, locale),
    percent: (bp, maximumFractionDigits) => formatPercent(bp, maximumFractionDigits, locale),
    grams: (cg) => formatGrams(cg, locale),
    weightKg: (grams) => formatWeightKg(grams, locale),
    duration: formatDuration,
    durationShort: formatDurationShort,
    hoursDecimal: (seconds) => formatHoursDecimal(seconds, locale),
    number: (value, maximumFractionDigits) => formatNumber(value, maximumFractionDigits, locale),
    inputNumber: (value, decimals) => formatInputNumber(value, decimals, locale),
    pricePerUnit: (cents, quantity) => formatPricePerUnit(cents, quantity, locale),
    dateOnly: (isoDate) => formatDateOnly(isoDate, locale),
    dateTime: (iso) => formatDateTime(iso, locale),
  }
}
