import { describe, expect, it } from 'vitest'
import LZString from 'lz-string'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import { calculateQuote } from '@/domain/cost/quote'
import type { Quote } from '@/domain/types'
import { asBasisPoints, asCentigrams, asMicroEur, asSeconds } from '@/domain/units'
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

  it('non espone i metadati di audit cloud nel link condiviso', () => {
    const quote = {
      ...createEmptyDraft(config),
      createdBy: '11111111-1111-1111-1111-111111111111',
      updatedBy: '22222222-2222-2222-2222-222222222222',
    }

    const decoded = decodeSharedQuote(encodeSharedQuote(quote)) as unknown as Record<string, unknown>
    expect(decoded.createdBy).toBeUndefined()
    expect(decoded.updatedBy).toBeUndefined()
  })

  it('non espone lo snapshot economico nel link condiviso', () => {
    const quote = createEmptyDraft(config)
    const decoded = decodeSharedQuote(encodeSharedQuote(quote)) as unknown as Record<string, unknown>
    expect(decoded.snapshot).toBeUndefined()
  })

  it('non espone lo snapshot nemmeno nel payload compresso grezzo', () => {
    // Regressione: il controllo deve essere sul payload, non solo sull'oggetto
    // decodificato, altrimenti un campo potrebbe restare nell'URL.
    const quote = createEmptyDraft(config)
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(encodeSharedQuote(quote)) as string,
    ) as { quote: Record<string, unknown> }
    expect(Object.keys(payload.quote).sort()).toEqual(
      ['id', 'job', 'lines', 'locale', 'name', 'pricing', 'quoteDate'].sort(),
    )
    expect(payload.quote.snapshot).toBeUndefined()
    expect(payload.quote.result).toBeUndefined()
    expect(JSON.stringify(payload)).not.toContain('purchasePrice')
  })

  it('proietta il risultato sui soli campi del cliente', () => {
    const base = createEmptyDraft(config)
    const valid: Quote = {
      ...base,
      lines: [
        {
          ...base.lines[0]!,
          timeSeconds: asSeconds(3_600),
          materials: [{ materialId: 'material-pla', grams: asCentigrams(100) }],
        },
      ],
    }
    const result = calculateQuote(valid, config)
    const quote = { ...valid, result }
    const payload = JSON.parse(
      LZString.decompressFromEncodedURIComponent(encodeSharedQuote(quote)) as string,
    ) as { quote: { result?: Record<string, unknown> } }

    const projected = payload.quote.result
    expect(projected).toBeDefined()
    expect(projected?.grossPriceCents).toBe(result.grossPriceCents)
    expect(projected?.totalCost).toBeUndefined()
    expect(projected?.effectiveMarginBp).toBeUndefined()
    expect(projected?.jobLabor).toBeUndefined()
    const projectedLines = (projected?.lines ?? []) as Record<string, unknown>[]
    const firstLine = projectedLines[0]
    expect(firstLine?.priceCents).toBe(result.lines[0]?.priceCents)
    expect(firstLine?.fullyLoadedLineCost).toBeUndefined()
    expect(firstLine?.avgWatts).toBeUndefined()
    expect(firstLine?.tariffLabel).toBeUndefined()
    expect(firstLine?.materialDetails).toEqual(
      result.lines[0]?.materialDetails.map((detail) => ({
        name: detail.name,
        grams: detail.grams,
      })),
    )
  })

  it('accetta un vecchio link con il preventivo completo e lo riproietta', () => {
    const full = createEmptyDraft(config)
    const legacyPayload = LZString.compressToEncodedURIComponent(
      JSON.stringify({ app: 'LayerCost', quote: full }),
    )
    const decoded = decodeSharedQuote(legacyPayload) as unknown as Record<string, unknown>
    expect(decoded.id).toBe(full.id)
    expect(decoded.snapshot).toBeUndefined()
    expect(decoded.createdBy).toBeUndefined()
  })

  it('rifiuta un payload senza preventivo', () => {
    expect(() => decodeSharedQuote('not-a-valid-payload')).toThrow()
  })
})
