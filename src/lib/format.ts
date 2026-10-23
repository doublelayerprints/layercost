export function formatCurrency(microEur: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(microEur / 1_000_000)
}

export function formatCents(cents: number, maximumFractionDigits = 2): string {
  return formatCurrency(cents * 10_000, maximumFractionDigits)
}

export function formatPercent(bp: number, maximumFractionDigits = 1): string {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(bp / 100)}%`
}

export function formatGrams(cg: number): string {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cg / 100)} g`
}

export function formatWeightKg(grams: number): string {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(grams / 1000)} kg`
}

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

export function formatHoursDecimal(seconds: number): string {
  return (
    new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(seconds / 3600) + ' h'
  )
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

export function parseLocaleNumber(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (normalized === '' || normalized === '-') return Number.NaN
  return Number(normalized)
}

export function formatInputNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('it-IT', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatPricePerUnit(cents: number, quantity: number): string {
  const perUnit = cents / Math.max(quantity, 1)
  const isWholeCent = Number.isInteger(perUnit)
  return formatCents(perUnit, isWholeCent ? 2 : 3)
}

export function formatDateOnly(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}
