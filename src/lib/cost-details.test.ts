import { describe, expect, it } from 'vitest'
import type { QuoteResult } from '@/domain/types'
import { costDetailRows, costDetailTotals } from './cost-details'

const result = {
  lines: [
    {
      lineId: 'a',
      quantity: 2,
      material: 6_000_000,
      energy: 162_766,
      depreciation: 426_900,
      maintenance: 42_833,
      labor: 0,
      extras: 0,
      failure: 349_079,
      directLineCost: 13_963_156,
      allocatedFixed: 0,
      priceCents: 1_820,
    },
    {
      lineId: 'b',
      quantity: 3,
      material: 1_250_000,
      energy: 120_000,
      depreciation: 300_000,
      maintenance: 30_000,
      labor: 250_000,
      extras: 80_000,
      failure: 100_000,
      directLineCost: 6_390_000,
      allocatedFixed: 150_000,
      priceCents: 2_100,
    },
  ],
  directTotal: 20_353_156,
  jobFixedTotal: 150_000,
  totalCost: 20_503_156,
  netPriceCents: 3_920,
} as QuoteResult

describe('costDetailRows', () => {
  it('somma i componenti esattamente al costo diretto mostrato', () => {
    for (const row of costDetailRows(result)) {
      expect(row.components.reduce((sum, value) => sum + value, 0)).toBe(row.directCents)
    }
  })

  it('deriva il costo pieno da costo diretto e quota fissa', () => {
    for (const row of costDetailRows(result)) {
      expect(row.fullCents).toBe(row.directCents + row.fixedCents)
    }
  })
})

describe('costDetailTotals', () => {
  it('somma le colonne senza perdere centesimi', () => {
    const totals = costDetailTotals(costDetailRows(result))
    expect(totals.components.reduce((sum, value) => sum + value, 0)).toBe(totals.directCents)
    expect(totals.fullCents).toBe(totals.directCents + totals.fixedCents)
  })

  it('mantiene il prezzo allocato uguale alla somma delle righe', () => {
    const totals = costDetailTotals(costDetailRows(result))
    expect(totals.priceCents).toBe(result.netPriceCents)
  })
})
