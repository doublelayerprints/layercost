import type { QuoteResult } from '@/domain/types'

export type CostBandKey = 'material' | 'machine' | 'labor' | 'risk'

export interface CostBand {
  key: CostBandKey
  label: string
  value: number
}

export interface DisplayCostBand {
  key: string
  label: string
  value: number
}

export const SMALL_BAND_RATIO = 0.03

/**
 * Groups the quote result into the four bands shown by the cost stack.
 * Line components are per unit in `LineResult`, so each one is multiplied by the
 * line quantity: the bands are a display-only summary of the whole quote and their
 * sum must equal `result.totalCost`.
 */
export function costBands(result: QuoteResult): CostBand[] {
  const material = result.lines.reduce(
    (sum, line) => sum + line.material * line.quantity,
    0,
  )
  const machine = result.lines.reduce(
    (sum, line) =>
      sum + (line.energy + line.depreciation + line.maintenance) * line.quantity,
    0,
  )
  const labor =
    result.jobLabor +
    result.jobExtras +
    result.lines.reduce((sum, line) => sum + (line.labor + line.extras) * line.quantity, 0)
  const risk = result.lines.reduce((sum, line) => sum + line.failure * line.quantity, 0)

  return [
    { key: 'material', label: 'Materiale', value: material },
    { key: 'machine', label: 'Macchina', value: machine },
    { key: 'labor', label: 'Lavoro ed extra', value: labor },
    { key: 'risk', label: 'Rischio', value: risk },
  ]
}

/**
 * Drops zero bands and accumulates bands under 3% into a single "Altro" band.
 * The legend keeps the exact amounts; the detail table lists every component.
 */
export function displayCostBands(bands: CostBand[]): DisplayCostBand[] {
  const visible = bands.filter((band) => band.value > 0)
  const total = visible.reduce((sum, band) => sum + band.value, 0)
  if (total <= 0) return visible

  const small = visible.filter((band) => band.value / total < SMALL_BAND_RATIO)
  if (small.length <= 1) return visible

  const main = visible.filter((band) => band.value / total >= SMALL_BAND_RATIO)
  const otherValue = small.reduce((sum, band) => sum + band.value, 0)
  return [...main, { key: 'other', label: 'Altro', value: otherValue }]
}
