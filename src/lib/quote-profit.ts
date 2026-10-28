import type { QuoteResult } from '@/domain/types'

/**
 * Profit of a quote in micro-euro: the net price (VAT excluded) minus the fully
 * loaded cost. It is the absolute counterpart of `effectiveMarginBp` and can be
 * negative when the discount pushes the price below cost.
 *
 * Display only: it is never persisted and never changes the engine result.
 */
export function quoteProfitMicroEur(
  result: Pick<QuoteResult, 'netPriceCents' | 'totalCost'>,
): number {
  return result.netPriceCents * 10_000 - result.totalCost
}
