import type { QuoteResult } from '@/domain/types'
import { allocateLargestRemainder } from '@/domain/money'
import { displayCents } from './format'

/**
 * Display model for the cost detail table.
 * Line components are per unit in `LineResult`; here they are shown as whole-line
 * amounts in cents. The six components are allocated with the largest remainder so
 * their sum is exactly the displayed direct cost of the row.
 */
export interface CostDetailRow {
  lineId: string
  components: number[]
  directCents: number
  fixedCents: number
  fullCents: number
  priceCents: number
}

export interface CostDetailTotals {
  components: number[]
  directCents: number
  fixedCents: number
  fullCents: number
  priceCents: number
}

export function costDetailRows(result: QuoteResult): CostDetailRow[] {
  return result.lines.map((line) => {
    const exact = [
      line.material * line.quantity,
      line.energy * line.quantity,
      (line.depreciation + line.maintenance) * line.quantity,
      line.labor * line.quantity,
      line.extras * line.quantity,
      line.failure * line.quantity,
    ]
    const directCents = displayCents(line.directLineCost)
    const fixedCents = displayCents(line.allocatedFixed)
    return {
      lineId: line.lineId,
      components: allocateLargestRemainder(directCents, exact),
      directCents,
      fixedCents,
      fullCents: directCents + fixedCents,
      priceCents: line.priceCents,
    }
  })
}

export function costDetailTotals(rows: CostDetailRow[]): CostDetailTotals {
  const components = rows[0]?.components.map((_, index) =>
    rows.reduce((sum, row) => sum + (row.components[index] ?? 0), 0),
  ) ?? []
  return {
    components,
    directCents: rows.reduce((sum, row) => sum + row.directCents, 0),
    fixedCents: rows.reduce((sum, row) => sum + row.fixedCents, 0),
    fullCents: rows.reduce((sum, row) => sum + row.fullCents, 0),
    priceCents: rows.reduce((sum, row) => sum + row.priceCents, 0),
  }
}
