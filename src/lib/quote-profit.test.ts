import { describe, expect, it } from 'vitest'
import { asMicroEur } from '@/domain/units'
import { quoteProfitMicroEur } from './quote-profit'

describe('quoteProfitMicroEur', () => {
  it('sottrae il costo pieno dal prezzo netto', () => {
    expect(quoteProfitMicroEur({ netPriceCents: 520, totalCost: asMicroEur(3_989_254) })).toBe(
      1_210_746,
    )
  })

  it('restituisce zero quando il prezzo netto copre esattamente il costo', () => {
    expect(quoteProfitMicroEur({ netPriceCents: 300, totalCost: asMicroEur(3_000_000) })).toBe(0)
  })

  it('restituisce un utile negativo quando lo sconto porta il prezzo sotto costo', () => {
    expect(quoteProfitMicroEur({ netPriceCents: 1_200, totalCost: asMicroEur(15_000_000) })).toBe(
      -3_000_000,
    )
  })

  it('resta coerente con il margine effettivo del dominio', () => {
    const netPriceCents = 520
    const totalCost = asMicroEur(3_989_254)
    const profit = quoteProfitMicroEur({ netPriceCents, totalCost })
    expect(profit).toBe(netPriceCents * 10_000 - totalCost)
  })
})
