import { describe, expect, it } from 'vitest'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import type { Quote } from '@/domain/types'
import { asBasisPoints, asMicroEur } from '@/domain/units'
import { decodeSharedQuote, encodeSharedQuote } from './share'

const config = createSeedConfig()

describe('link condivisi', () => {
  it('codifica e decodifica un preventivo conservando la lingua', () => {
    const quote = createEmptyDraft(config, 'en')
    const decoded = decodeSharedQuote(encodeSharedQuote(quote))
    expect(decoded.id).toBe(quote.id)
    expect(decoded.locale).toBe('en')
  })

  it('migra un vecchio link senza locale a italiano', () => {
    const legacy = { ...createEmptyDraft(config) } as Record<string, unknown>
    delete legacy.locale
    const decoded = decodeSharedQuote(encodeSharedQuote(legacy as unknown as Quote))
    expect(decoded.locale).toBe('it')
  })

  it('migra un vecchio link con discountBp alla regola percentuale', () => {
    const legacy = structuredClone(createEmptyDraft(config)) as unknown as {
      pricing: Record<string, unknown>
    }
    delete legacy.pricing.discount
    legacy.pricing.discountBp = 1_250

    const decoded = decodeSharedQuote(encodeSharedQuote(legacy as unknown as Quote))
    expect(decoded.pricing.discount).toEqual({ mode: 'percent', valueBp: 1_250 })

    const zeroLegacy = structuredClone(legacy)
    zeroLegacy.pricing.discountBp = 0
    const zeroDecoded = decodeSharedQuote(encodeSharedQuote(zeroLegacy as unknown as Quote))
    expect(zeroDecoded.pricing.discount).toBeUndefined()
  })

  it('conserva lo sconto di riga e quello del preventivo', () => {
    const quote = createEmptyDraft(config)
    quote.lines[0]!.discount = { mode: 'amount', amount: asMicroEur(250_000) }
    quote.pricing.discount = { mode: 'percent', valueBp: asBasisPoints(1_000) }

    const decoded = decodeSharedQuote(encodeSharedQuote(quote))
    expect(decoded.lines[0]?.discount).toEqual({ mode: 'amount', amount: 250_000 })
    expect(decoded.pricing.discount).toEqual({ mode: 'percent', valueBp: 1_000 })
  })

  it('rifiuta un payload senza preventivo', () => {
    expect(() => decodeSharedQuote('not-a-valid-payload')).toThrow()
  })
})
