import { describe, expect, it } from 'vitest'
import type { QuoteResult } from '@/domain/types'
import { costBands, displayCostBands } from './cost-bands'

const result = {
  lines: [
    {
      material: 6_000_000,
      energy: 160_000,
      depreciation: 430_000,
      maintenance: 40_000,
      labor: 0,
      extras: 0,
      failure: 350_000,
    },
    {
      material: 1_000_000,
      energy: 60_000,
      depreciation: 120_000,
      maintenance: 10_000,
      labor: 500_000,
      extras: 100_000,
      failure: 90_000,
    },
  ],
  jobLabor: 400_000,
  jobExtras: 100_000,
  jobFixedTotal: 500_000,
  directTotal: 8_860_000,
  totalCost: 9_360_000,
} as QuoteResult

describe('costBands', () => {
  it('somma esattamente il costo totale', () => {
    const bands = costBands(result)
    expect(bands.reduce((sum, band) => sum + band.value, 0)).toBe(result.totalCost)
  })

  it('espone le quattro bande nell’ordine del design system', () => {
    expect(costBands(result).map((band) => band.key)).toEqual([
      'material',
      'machine',
      'labor',
      'risk',
    ])
  })

  it('include manodopera e extra di riga e di lavoro nella banda lavoro', () => {
    const labor = costBands(result).find((band) => band.key === 'labor')
    expect(labor?.value).toBe(1_100_000)
  })
})

describe('displayCostBands', () => {
  it('nasconde le bande a zero', () => {
    expect(
      displayCostBands([
        { key: 'material', label: 'Materiale', value: 0 },
        { key: 'machine', label: 'Macchina', value: 0 },
        { key: 'labor', label: 'Lavoro ed extra', value: 0 },
        { key: 'risk', label: 'Rischio', value: 0 },
      ]),
    ).toEqual([])
  })

  it('accorpa le bande sotto il 3% in Altro, senza perdere importi', () => {
    const bands = displayCostBands([
      { key: 'material', label: 'Materiale', value: 9_600_000 },
      { key: 'machine', label: 'Macchina', value: 200_000 },
      { key: 'labor', label: 'Lavoro ed extra', value: 100_000 },
      { key: 'risk', label: 'Rischio', value: 100_000 },
    ])
    expect(bands.map((band) => band.key)).toEqual(['material', 'other'])
    expect(bands.find((band) => band.key === 'other')?.value).toBe(400_000)
    expect(bands.reduce((sum, band) => sum + band.value, 0)).toBe(10_000_000)
  })
})
