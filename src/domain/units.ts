export type MicroEur = number & { readonly __brand: 'MicroEur' }
export type BasisPoints = number & { readonly __brand: 'BasisPoints' }
export type Seconds = number & { readonly __brand: 'Seconds' }
export type Centigrams = number & { readonly __brand: 'Centigrams' }
export type Watts = number & { readonly __brand: 'Watts' }
export type Wh = number & { readonly __brand: 'Wh' }

export const EURO_MICRO = 1_000_000
export const BP_SCALE = 10_000
export const HOUR_SECONDS = 3_600
export const GRAM_CG = 100
export const KWH_WH = 1_000

export class DomainError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

export function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError('INVALID_NUMBER', `${label} deve essere un numero intero sicuro.`)
  }
}

export function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainError('INVALID_NUMBER', `${label} non può essere negativo.`)
  }
}

export function asMicroEur(value: number): MicroEur {
  assertSafeInteger(value, 'Importo in micro-euro')
  assertNonNegative(value, 'Importo in micro-euro')
  return value as MicroEur
}

export function asBasisPoints(value: number): BasisPoints {
  assertSafeInteger(value, 'Percentuale in basis point')
  return value as BasisPoints
}

export function asSeconds(value: number): Seconds {
  assertSafeInteger(value, 'Tempo in secondi')
  assertNonNegative(value, 'Tempo in secondi')
  return value as Seconds
}

export function asCentigrams(value: number): Centigrams {
  assertSafeInteger(value, 'Massa in centigrammi')
  assertNonNegative(value, 'Massa in centigrammi')
  return value as Centigrams
}

export function asWatts(value: number): Watts {
  assertSafeInteger(value, 'Potenza in watt')
  assertNonNegative(value, 'Potenza in watt')
  return value as Watts
}

export function asWh(value: number): Wh {
  assertSafeInteger(value, 'Energia in wattora')
  assertNonNegative(value, 'Energia in wattora')
  return value as Wh
}

export function euroToMicro(eur: number): MicroEur {
  return asMicroEur(Math.round(eur * EURO_MICRO))
}

export function microToEuro(micro: number): number {
  return micro / EURO_MICRO
}

export function percentToBp(percent: number): BasisPoints {
  return asBasisPoints(Math.round(percent * 100))
}

export function bpToPercent(bp: number): number {
  return bp / 100
}

export function hoursToSeconds(hours: number): Seconds {
  return asSeconds(Math.round(hours * HOUR_SECONDS))
}

export function minutesToSeconds(minutes: number): Seconds {
  return asSeconds(Math.round(minutes * 60))
}

export function secondsToHours(seconds: number): number {
  return seconds / HOUR_SECONDS
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60
}

export function gramsToCg(grams: number): Centigrams {
  return asCentigrams(Math.round(grams * GRAM_CG))
}

export function cgToGrams(cg: number): number {
  return cg / GRAM_CG
}

export function kwhToWh(kwh: number): Wh {
  return asWh(Math.round(kwh * KWH_WH))
}

export function whToKwh(wh: number): number {
  return wh / KWH_WH
}
