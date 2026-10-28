import type {
  CostConfig,
  ExtraCostDetail,
  LineResult,
  Quote,
  QuoteResult,
  Settings,
} from '../types'
import type { BasisPoints, MicroEur } from '../units'
import { DomainError, asBasisPoints, asMicroEur } from '../units'
import { allocateLargestRemainder, roundHalfUp, sumNumbers } from '../money'
import { ENGINE_VERSION } from '../version'
import { calculateJobLabor } from './labor'
import { buildLineResult, computeLine, type LineComputation } from './line'
import { calculateDiscount, calculatePricing, calculateRawPrice, finalizePrice } from './pricing'

function resolveJobExtras(
  extraIds: string[],
  config: CostConfig,
): {
  total: MicroEur
  details: ExtraCostDetail[]
} {
  let total = 0
  const details: ExtraCostDetail[] = []

  for (const extraId of extraIds) {
    const extra = config.extras.find((candidate) => candidate.id === extraId)
    if (!extra) {
      throw new DomainError('EXTRA_NOT_FOUND', `Extra non trovato: ${extraId}.`)
    }
    if (extra.unit !== 'perJob') {
      throw new DomainError(
        'EXTRA_UNIT_MISMATCH',
        `L’extra “${extra.name}” è per pezzo e non può essere applicato al lavoro.`,
      )
    }
    total += extra.amount
    details.push({ extraId: extra.id, name: extra.name, amount: extra.amount })
  }

  return { total: asMicroEur(total), details }
}

function computeEffectiveMargin(totalCost: MicroEur, netPriceCents: number): BasisPoints {
  const netPriceMicro = netPriceCents * 10_000
  if (netPriceMicro <= 0) return asBasisPoints(0)
  return asBasisPoints(roundHalfUp(((netPriceMicro - totalCost) * 10_000) / netPriceMicro))
}

function hasLineDiscounts(quote: Quote): boolean {
  return quote.lines.some((line) => {
    const rule = line.discount
    if (!rule) return false
    return rule.mode === 'percent' ? rule.valueBp > 0 : rule.amount > 0
  })
}

interface QuoteTotals {
  rawPrice: MicroEur
  lineDiscountTotal: MicroEur
  quoteDiscount: MicroEur
  discount: MicroEur
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
  lineDiscounts: MicroEur[]
  priceWeights: number[]
}

function calculateTotals(
  computations: LineComputation[],
  quote: Quote,
  totalCost: MicroEur,
  priceWeights: number[],
): QuoteTotals {
  if (!hasLineDiscounts(quote)) {
    const priced = calculatePricing(totalCost, quote.pricing)
    return {
      rawPrice: priced.rawPrice,
      lineDiscountTotal: asMicroEur(0),
      quoteDiscount: priced.discount,
      discount: priced.discount,
      netPriceCents: priced.netPriceCents,
      vatCents: priced.vatCents,
      grossPriceCents: priced.grossPriceCents,
      lineDiscounts: computations.map(() => asMicroEur(0)),
      priceWeights,
    }
  }

  const rawPrice = calculateRawPrice(totalCost, quote.pricing)
  const rawShares = allocateLargestRemainder(rawPrice, priceWeights)
  const lineDiscounts = computations.map((_, index) =>
    calculateDiscount(asMicroEur(rawShares[index] ?? 0), quote.lines[index]?.discount),
  )
  const lineDiscountTotal = asMicroEur(sumNumbers(lineDiscounts))
  const afterLineDiscounts = asMicroEur(rawPrice - lineDiscountTotal)
  const quoteDiscount = calculateDiscount(afterLineDiscounts, quote.pricing.discount)
  const totals = finalizePrice(asMicroEur(afterLineDiscounts - quoteDiscount), quote.pricing)

  return {
    rawPrice,
    lineDiscountTotal,
    quoteDiscount,
    discount: asMicroEur(lineDiscountTotal + quoteDiscount),
    netPriceCents: totals.netPriceCents,
    vatCents: totals.vatCents,
    grossPriceCents: totals.grossPriceCents,
    lineDiscounts,
    priceWeights: rawShares.map((share, index) => Math.max(0, share - (lineDiscounts[index] ?? 0))),
  }
}

export function calculateQuote(quote: Quote, config: CostConfig): QuoteResult {
  if (quote.lines.length === 0) {
    throw new DomainError('NO_LINES', 'Aggiungi almeno una riga al preventivo.')
  }

  const computations: LineComputation[] = quote.lines.map((line) =>
    computeLine(line, config, quote.quoteDate),
  )
  const directTotal = asMicroEur(
    sumNumbers(computations.map((computation) => computation.directLineCost)),
  )
  const jobLabor = calculateJobLabor(
    quote.job.setupSeconds,
    quote.job.designSeconds,
    config.settings.laborRatePerHour,
  )
  const jobExtras = resolveJobExtras(quote.job.extraIds, config)
  const jobFixedTotal = asMicroEur(jobLabor.total + jobExtras.total)

  const weights =
    config.settings.allocationMode === 'proportional'
      ? computations.map((computation) => computation.directLineCost)
      : computations.map((computation) => computation.line.quantity)

  const allocatedFixed = allocateLargestRemainder(jobFixedTotal, weights)
  const totalCost = asMicroEur(directTotal + jobFixedTotal)
  const priceWeights = computations.map((computation, index) => {
    const fixed = allocatedFixed[index] ?? 0
    return computation.directLineCost + fixed
  })

  const totals = calculateTotals(computations, quote, totalCost, priceWeights)
  const priceAllocations = allocateLargestRemainder(totals.netPriceCents, totals.priceWeights)

  const lines: LineResult[] = computations.map((computation, index) =>
    buildLineResult(
      computation,
      asMicroEur(allocatedFixed[index] ?? 0),
      priceAllocations[index] ?? 0,
      totals.lineDiscounts[index] ?? asMicroEur(0),
    ),
  )

  return {
    engineVersion: ENGINE_VERSION,
    quoteDate: quote.quoteDate,
    lines,
    directTotal,
    jobLabor: jobLabor.total,
    jobExtras: jobExtras.total,
    jobFixedTotal,
    totalCost,
    rawPrice: totals.rawPrice,
    discount: totals.discount,
    lineDiscountTotal: totals.lineDiscountTotal,
    quoteDiscount: totals.quoteDiscount,
    netPriceCents: totals.netPriceCents,
    vatCents: totals.vatCents,
    grossPriceCents: totals.grossPriceCents,
    effectiveMarginBp: computeEffectiveMargin(totalCost, totals.netPriceCents),
    jobLaborDetails: {
      setup: jobLabor.setup,
      design: jobLabor.design,
    },
    jobExtraDetails: jobExtras.details,
  }
}

export function pricingFromSettings(settings: Settings): Quote['pricing'] {
  return {
    mode: settings.pricingMode,
    markupBp: settings.markupBp,
    marginBp: settings.marginBp,
    roundingStep: settings.roundingStep,
    roundingMode: settings.roundingMode,
    vatMode: settings.vatMode,
    vatRateBp: settings.vatRateBp,
  }
}
