import type { LineResult, Quote, QuoteResult } from '@/domain/types'

/**
 * Customer-safe projection of a saved quote for share links and read-only views.
 *
 * A share link is public: anyone who receives it can decompress the payload. The
 * full `Quote` carries the economic snapshot (`snapshot.config`), the internal
 * result (`result` with costs, margins and supplier names) and the refresh
 * tokens of the calculator. None of that belongs in a document handed to a
 * customer, so only the fields the customer view actually renders are kept.
 *
 * The screen already hides the internal figures through `audience="customer"`;
 * this module makes the same promise at the data level, so hiding a column can
 * never silently leak a value in the URL again.
 */

/** Price, quantity, duration and material names of one line, nothing else. */
export interface SharedLineResult {
  lineId: string
  name: string
  printerName: string
  quantity: number
  effectiveSeconds: number
  priceCents: number
  discount: number
  materialDetails: { name: string; grams: number }[]
}

export interface SharedQuoteResult {
  lines: SharedLineResult[]
  discount: number
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
}

export interface SharedQuote {
  id: string
  name: string
  quoteDate: string
  customer?: string
  locale: Quote['locale']
  lines: Quote['lines']
  job: Quote['job']
  pricing: Quote['pricing']
  result?: SharedQuoteResult
}

/**
 * Narrows a computed result to the customer fields. Costs, margins, allocated
 * fixed costs, tariff labels and per-material cost figures are dropped on
 * purpose: the customer table needs names and grams, not what they cost us.
 */
export function projectSharedResult(result: QuoteResult): SharedQuoteResult {
  return {
    lines: result.lines.map(
      (line): SharedLineResult => ({
        lineId: line.lineId,
        name: line.name,
        printerName: line.printerName,
        quantity: line.quantity,
        effectiveSeconds: line.effectiveSeconds,
        priceCents: line.priceCents,
        discount: line.discount,
        materialDetails: line.materialDetails.map((detail) => ({
          name: detail.name,
          grams: detail.grams,
        })),
      }),
    ),
    discount: result.discount,
    netPriceCents: result.netPriceCents,
    vatCents: result.vatCents,
    grossPriceCents: result.grossPriceCents,
  }
}

/**
 * Removes everything the customer must not see: the economic snapshot (which
 * contains printer purchase prices, labour rates, supplier names and tariffs),
 * the internal result and the audit metadata of the workspace.
 */
export function projectSharedQuote(quote: Quote, result?: QuoteResult): SharedQuote {
  const projected: SharedQuote = {
    id: quote.id,
    name: quote.name,
    quoteDate: quote.quoteDate,
    locale: quote.locale,
    lines: quote.lines,
    job: quote.job,
    pricing: quote.pricing,
  }
  if (quote.customer) projected.customer = quote.customer
  if (result) projected.result = projectSharedResult(result)
  return projected
}

/** Line result lookup for a projected result; missing lines render as `—`. */
export function findSharedLine(
  result: SharedQuoteResult | undefined,
  lineId: string,
): SharedLineResult | undefined {
  return result?.lines.find((line) => line.lineId === lineId)
}

/** Grams of one line, from the customer projection or from the raw line. */
export function sharedLineGrams(
  line: Quote['lines'][number],
  lineResult?: SharedLineResult | Pick<LineResult, 'materialDetails'>,
): number {
  if (lineResult) {
    return lineResult.materialDetails.reduce((sum, detail) => sum + detail.grams, 0)
  }
  return line.materials.reduce((sum, usage) => sum + usage.grams, 0)
}