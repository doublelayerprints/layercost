import type { DiscountRule, QuotePricing } from '../types'
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

export interface FinalPrice {
  finalPrice: MicroEur
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
}

const MAX_DISCOUNT_BP = 9_000

export function validateDiscountRule(rule: DiscountRule | undefined): void {
  if (!rule) return
  if (rule.mode === 'percent') {
    if (!Number.isInteger(rule.valueBp) || rule.valueBp < 0 || rule.valueBp > MAX_DISCOUNT_BP) {
      throw new DomainError('INVALID_DISCOUNT', 'Lo sconto deve essere compreso tra 0% e 90%.')
    }
    return
  }
  if (!Number.isInteger(rule.amount) || rule.amount < 0) {
    throw new DomainError('INVALID_DISCOUNT', 'L’importo dello sconto non è valido.')
  }
}

/**
 * Commercial discount on an amount. A fixed discount is capped at the base so
 * the result never goes below zero; the caller can compare the requested amount
 * with the applied amount to surface a warning.
 */
export function calculateDiscount(base: MicroEur, rule: DiscountRule | undefined): MicroEur {
  if (!rule) return asMicroEur(0)
  validateDiscountRule(rule)
  if (base < 0) {
    throw new DomainError('INVALID_COST', 'L’importo da scontare non può essere negativo.')
  }
  if (rule.mode === 'percent') {
    return asMicroEur(roundHalfUp((base * rule.valueBp) / 10_000))
  }
  return asMicroEur(Math.min(rule.amount, base))
}

export function calculateRawPrice(totalCost: MicroEur, pricing: QuotePricing): MicroEur {
  if (totalCost < 0) {
    throw new DomainError('INVALID_COST', 'Il costo totale non può essere negativo.')
  }

  if (pricing.mode === 'markup') {
    if (pricing.markupBp < 0 || pricing.markupBp > 100_000) {
      throw new DomainError('INVALID_MARKUP', 'Il ricarico deve essere compreso tra 0% e 1000%.')
    }
    return asMicroEur(roundHalfUp((totalCost * (10_000 + pricing.markupBp)) / 10_000))
  }

  if (pricing.marginBp < 0 || pricing.marginBp >= 10_000) {
    throw new DomainError('INVALID_MARGIN', 'Il margine deve essere compreso tra 0% e 99%.')
  }
  return asMicroEur(roundHalfUp((totalCost * 10_000) / (10_000 - pricing.marginBp)))
}

export function finalizePrice(discountedPrice: MicroEur, pricing: QuotePricing): FinalPrice {
  if (pricing.vatRateBp < 0 || pricing.vatRateBp > 3_000) {
    throw new DomainError('INVALID_VAT', 'L’aliquota IVA non è valida.')
  }
  if (pricing.roundingStep < 10_000 || pricing.roundingStep > 10_000_000) {
    throw new DomainError(
      'INVALID_STEP',
      'Il passo di arrotondamento deve essere compreso tra €0,01 e €10,00.',
    )
  }

  const finalPrice = roundToStep(
    Math.max(0, discountedPrice),
    pricing.roundingStep,
    pricing.roundingMode,
  )

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

  return {
    finalPrice: asMicroEur(finalPrice),
    netPriceCents,
    vatCents,
    grossPriceCents: netPriceCents + vatCents,
  }
}

/** Quote-level pricing without line discounts. */
export function calculatePricing(totalCost: MicroEur, pricing: QuotePricing): PricingResult {
  const rawPrice = calculateRawPrice(totalCost, pricing)
  const discount = calculateDiscount(rawPrice, pricing.discount)
  const totals = finalizePrice(asMicroEur(rawPrice - discount), pricing)

  return {
    rawPrice,
    discount,
    ...totals,
  }
}
