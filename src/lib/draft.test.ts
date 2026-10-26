import { describe, expect, it } from 'vitest'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import { asSeconds, asCentigrams, asWatts } from '@/domain/units'
import { draftHasContent } from './draft'

const config = createSeedConfig()

function emptyDraft() {
  return createEmptyDraft(config)
}

describe('contenuto della bozza', () => {
  it('una bozza appena creata è vuota', () => {
    expect(draftHasContent(emptyDraft())).toBe(false)
  })

  it('riconosce i nomi predefiniti inglesi', () => {
    const english = createEmptyDraft(config, 'en')
    expect(english.name).toBe('New quote')
    expect(english.lines[0]?.name).toBe('Print')
    expect(draftHasContent(english)).toBe(false)
    expect(draftHasContent({ ...english, name: 'Pen holder' })).toBe(true)
    expect(
      draftHasContent({
        ...english,
        lines: [{ ...english.lines[0]!, name: 'Print' }],
      }),
    ).toBe(false)
  })

  it('riconosce un preventivo rinominato o con cliente', () => {
    expect(draftHasContent({ ...emptyDraft(), name: 'Portapenne' })).toBe(true)
    expect(draftHasContent({ ...emptyDraft(), customer: 'Anna' })).toBe(true)
  })

  it('riconosce tempo, grammi, quantità ed extra di riga', () => {
    const base = emptyDraft()
    const line = base.lines[0]!
    expect(draftHasContent({ ...base, lines: [{ ...line, timeSeconds: asSeconds(600) }] })).toBe(
      true,
    )
    expect(
      draftHasContent({
        ...base,
        lines: [
          {
            ...line,
            materials: line.materials.map((usage) => ({ ...usage, grams: asCentigrams(100) })),
          },
        ],
      }),
    ).toBe(true)
    expect(draftHasContent({ ...base, lines: [{ ...line, quantity: 2 }] })).toBe(true)
    expect(draftHasContent({ ...base, lines: [{ ...line, extraIds: ['extra-1'] }] })).toBe(true)
    expect(draftHasContent({ ...base, lines: [{ ...line, color: '#ff0000' }] })).toBe(true)
  })

  it('riconosce costi di lavoro e note', () => {
    const base = emptyDraft()
    expect(draftHasContent({ ...base, job: { ...base.job, setupSeconds: asSeconds(300) } })).toBe(
      true,
    )
    expect(draftHasContent({ ...base, job: { ...base.job, notes: 'Consegna sabato' } })).toBe(true)
  })

  it('riconosce una modifica di prezzo anche senza righe compilate', () => {
    const base = emptyDraft()
    const edited = {
      ...base,
      updatedAt: new Date(Date.parse(base.createdAt) + 1000).toISOString(),
    }
    expect(draftHasContent(edited)).toBe(true)
  })

  it('non considera vuota una bozza con righe aggiuntive o override', () => {
    const base = emptyDraft()
    expect(
      draftHasContent({ ...base, lines: [...base.lines, { ...base.lines[0]!, id: 'line-2' }] }),
    ).toBe(true)
    expect(
      draftHasContent({
        ...base,
        lines: [{ ...base.lines[0]!, overrides: { powerOverrideW: asWatts(0) } }],
      }),
    ).toBe(true)
  })
})
