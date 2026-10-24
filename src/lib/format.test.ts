import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { displayCents, formatCurrency } from './format'

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
})
