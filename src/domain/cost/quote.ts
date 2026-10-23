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
import { calculatePricing } from './pricing'

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
  const pricing = calculatePricing(totalCost, quote.pricing)

  const priceWeights = computations.map((computation, index) => {
    const fixed = allocatedFixed[index] ?? 0
    return computation.directLineCost + fixed
  })
  const priceAllocations = allocateLargestRemainder(pricing.netPriceCents, priceWeights)

  const lines: LineResult[] = computations.map((computation, index) =>
    buildLineResult(
      computation,
      asMicroEur(allocatedFixed[index] ?? 0),
      priceAllocations[index] ?? 0,
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
    rawPrice: pricing.rawPrice,
    discount: pricing.discount,
    netPriceCents: pricing.netPriceCents,
    vatCents: pricing.vatCents,
    grossPriceCents: pricing.grossPriceCents,
    effectiveMarginBp: computeEffectiveMargin(totalCost, pricing.netPriceCents),
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
    discountBp: asBasisPoints(0),
    vatMode: settings.vatMode,
    vatRateBp: settings.vatRateBp,
  }
}
