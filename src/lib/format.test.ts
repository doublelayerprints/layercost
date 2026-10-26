import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  displayCents,
  formatCurrency,
  formatDateOnly,
  formatGrams,
  parseLocaleNumber,
} from './format'

describe('displayCents', () => {
  it('arrotonda il mezzo centesimo in modo simmetrico', () => {
    expect(displayCents(13_965_000)).toBe(1397)
    expect(displayCents(13_964_999)).toBe(1396)
    expect(displayCents(13_955_000)).toBe(1396)
    expect(displayCents(-13_965_000)).toBe(-1397)
  })

  it('non cambia un importo già espresso in centesimi interi', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (cents) => {
        expect(displayCents(cents * 10_000)).toBe(cents)
      }),
    )
  })

  it('formatta i centesimi con la virgola italiana', () => {
    expect(formatCurrency(13_965_000)).toContain('13,97')
    expect(formatCurrency(13_963_156)).toContain('13,96')
  })

  it('formatta importi, grammi e date in inglese', () => {
    expect(formatCurrency(13_965_000, 2, 'en')).toContain('13.97')
    expect(formatGrams(7_005, 'en')).toContain('70.05')
    expect(formatDateOnly('2026-10-26', 'en')).toBe('26/10/2026')
  })
})

describe('parseLocaleNumber', () => {
  it('accetta sia la virgola sia il punto come separatore decimale', () => {
    expect(parseLocaleNumber('12,5')).toBe(12.5)
    expect(parseLocaleNumber('12.5')).toBe(12.5)
    expect(parseLocaleNumber('1.234,56')).toBe(1234.56)
    expect(parseLocaleNumber('1,234.56')).toBe(1234.56)
    expect(parseLocaleNumber('1,234')).toBe(1.234)
    expect(parseLocaleNumber('1.234.567')).toBe(1234567)
    expect(parseLocaleNumber('-12,50')).toBe(-12.5)
    expect(parseLocaleNumber(' 7,05 ')).toBe(7.05)
  })

  it('rifiuta un valore vuoto o senza cifre', () => {
    expect(parseLocaleNumber('')).toBeNaN()
    expect(parseLocaleNumber('-')).toBeNaN()
    expect(parseLocaleNumber('abc')).toBeNaN()
  })
})
