import { describe, expect, it } from 'vitest'
import { PREVIEW_DEFAULTS, calculatePreview } from './preview'

describe('esempio dal vivo della landing', () => {
  it('calcola costo e prezzo con i valori di partenza', () => {
    const result = calculatePreview(PREVIEW_DEFAULTS.grams, PREVIEW_DEFAULTS.hours)
    expect(result).toBeDefined()
    expect(result!.totalCost).toBeGreaterThan(0)
    expect(result!.netPriceCents).toBeGreaterThan(0)
    expect(result!.gainMicro).toBeGreaterThan(0)
  })

  it('più grammi aumentano il costo pieno', () => {
    const small = calculatePreview(50, 10)
    const large = calculatePreview(200, 10)
    expect(small).toBeDefined()
    expect(large).toBeDefined()
    expect(large!.totalCost).toBeGreaterThan(small!.totalCost)
  })

  it('rifiuta grammi o ore non positivi', () => {
    expect(calculatePreview(0, 10)).toBeUndefined()
    expect(calculatePreview(100, 0)).toBeUndefined()
    expect(calculatePreview(Number.NaN, 10)).toBeUndefined()
  })
})
