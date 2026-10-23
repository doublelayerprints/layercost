import type { QuotePricing } from '../types'
import type { MicroEur } from '../units'
import { DomainError, asMicroEur } from '../units'
import { roundHalfUp, roundToStep } from '../money'

export interface PricingResult {
  rawPrice: MicroEur
  discount: MicroEur
  finalPrice: MicroEur
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
}

export function calculatePricing(totalCost: MicroEur, pricing: QuotePricing): PricingResult {
  if (totalCost < 0) {
    throw new DomainError('INVALID_COST', 'Il costo totale non può essere negativo.')
  }
  if (pricing.discountBp < 0 || pricing.discountBp > 9_000) {
    throw new DomainError('INVALID_DISCOUNT', 'Lo sconto deve essere compreso tra 0% e 90%.')
  }
  if (pricing.vatRateBp < 0 || pricing.vatRateBp > 3_000) {
    throw new DomainError('INVALID_VAT', 'L’aliquota IVA non è valida.')
  }
  if (pricing.roundingStep < 10_000 || pricing.roundingStep > 10_000_000) {
    throw new DomainError(
      'INVALID_STEP',
      'Il passo di arrotondamento deve essere compreso tra €0,01 e €10,00.',
    )
  }

  let rawPrice = 0
  if (pricing.mode === 'markup') {
    if (pricing.markupBp < 0 || pricing.markupBp > 100_000) {
      throw new DomainError('INVALID_MARKUP', 'Il ricarico deve essere compreso tra 0% e 1000%.')
    }
    rawPrice = roundHalfUp((totalCost * (10_000 + pricing.markupBp)) / 10_000)
  } else {
    if (pricing.marginBp < 0 || pricing.marginBp >= 10_000) {
      throw new DomainError('INVALID_MARGIN', 'Il margine deve essere compreso tra 0% e 99%.')
    }
    rawPrice = roundHalfUp((totalCost * 10_000) / (10_000 - pricing.marginBp))
  }

  const discountAmount = roundHalfUp((rawPrice * pricing.discountBp) / 10_000)
  const discounted = rawPrice - discountAmount
  const finalPrice = roundToStep(discounted, pricing.roundingStep, pricing.roundingMode)

  if (finalPrice % 10_000 !== 0) {
    throw new DomainError('INVALID_PRICE', 'Il prezzo finale non è un numero intero di centesimi.')
  }

  const finalPriceCents = finalPrice / 10_000
  let netPriceCents = finalPriceCents
  let vatCents = 0

  if (pricing.vatMode === 'excluded') {
    vatCents = roundHalfUp((netPriceCents * pricing.vatRateBp) / 10_000)
  } else if (pricing.vatMode === 'included') {
    netPriceCents = roundHalfUp((finalPriceCents * 10_000) / (10_000 + pricing.vatRateBp))
    vatCents = finalPriceCents - netPriceCents
  }

  const grossPriceCents = netPriceCents + vatCents

  return {
    rawPrice: asMicroEur(rawPrice),
    discount: asMicroEur(discountAmount),
    finalPrice: asMicroEur(finalPrice),
    netPriceCents,
    vatCents,
    grossPriceCents,
  }
}
