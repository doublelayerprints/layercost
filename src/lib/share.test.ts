import { describe, expect, it } from 'vitest'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import type { Quote } from '@/domain/types'
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

  it('rifiuta un payload senza preventivo', () => {
    expect(() => decodeSharedQuote('not-a-valid-payload')).toThrow()
  })
})
