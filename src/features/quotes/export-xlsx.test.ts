import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { calculateQuote } from '@/domain/cost/quote'
import type { CostConfig, Quote } from '@/domain/types'
import { asCentigrams, asSeconds } from '@/domain/units'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import { buildQuotesXlsx } from './export-xlsx'

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes) as Record<string, Uint8Array>
}

function text(files: Record<string, Uint8Array>, name: string): string {
  const file = files[name]
  if (!file) throw new Error(`Missing ${name}`)
  return strFromU8(file)
}

function rowCount(xml: string): number {
  return xml.match(/<row r=/g)?.length ?? 0
}

function fixture(): { config: CostConfig; quote: Quote; withoutResult: Quote } {
  const config = createSeedConfig()
  const date = new Date('2026-10-26T10:00:00.000Z')
  const draft = createEmptyDraft(config, 'it', date)
  draft.id = 'quote-1'
  draft.name = 'Gancio & bacinella'
  draft.customer = 'Mario "Rossi"'
  draft.quoteDate = '2026-10-26'
  draft.lines = [
    {
      ...draft.lines[0]!,
      id: 'line-1',
      name: 'Piatto <1>',
      timeSeconds: asSeconds(36_000),
      materials: [{ materialId: 'material-pla', grams: asCentigrams(10_000) }],
      color: '#ff0000',
    },
  ]
  const result = calculateQuote(draft, config)
  const quote: Quote = {
    ...draft,
    status: 'saved',
    snapshot: {
      config: structuredClone(config),
      capturedAt: date.toISOString(),
      engineVersion: result.engineVersion,
    },
    result,
    engineVersion: result.engineVersion,
    archived: true,
  }

  const withoutResult: Quote = {
    ...createEmptyDraft(config, 'it', date),
    id: 'quote-2',
    name: 'Senza risultato',
    status: 'saved',
    lines: [],
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  }

  return { config, quote, withoutResult }
}

describe('export XLSX dei preventivi', () => {
  it('produce i tre fogli con preventivi, righe e materiali', () => {
    const { config, quote, withoutResult } = fixture()
    const files = unzip(buildQuotesXlsx([withoutResult, quote], config, 'it'))

    const workbook = text(files, 'xl/workbook.xml')
    expect(workbook).toContain('name="Preventivi"')
    expect(workbook).toContain('name="Righe"')
    expect(workbook).toContain('name="Materiali"')

    const quotes = text(files, 'xl/worksheets/sheet1.xml')
    expect(rowCount(quotes)).toBe(3)
    expect(quotes).toContain('Gancio &amp; bacinella')
    expect(quotes).toContain('Mario &quot;Rossi&quot;')
    expect(quotes).toContain('Sì')
    expect(quotes).toContain('Non ricalcolabile')
    expect(quotes).toContain('<v>46321</v>')
    expect(quotes.indexOf('Gancio &amp; bacinella')).toBeLessThan(
      quotes.indexOf('Senza risultato'),
    )

    const lines = text(files, 'xl/worksheets/sheet2.xml')
    expect(rowCount(lines)).toBe(2)
    expect(lines).toContain('Piatto &lt;1&gt;')
    expect(lines).toContain('Kobra 3')
    expect(lines).toContain('#ff0000')
    expect(lines).toContain('<c r="I2" s="5"><v>10</v></c>')
    expect(lines).toContain('<c r="K2" s="4"><v>100</v></c>')
    expect(lines).toContain('<c r="N2" s="2"><v>2</v></c>')

    const materials = text(files, 'xl/worksheets/sheet3.xml')
    expect(rowCount(materials)).toBe(2)
    expect(materials).toContain('PLA')
    expect(materials).toContain('<c r="F2" s="4"><v>100</v></c>')
    expect(materials).toContain('<c r="G2" s="2"><v>2</v></c>')
    expect(materials).toContain('<c r="H2" s="2"><v>20</v></c>')
  })

  it('usa intestazioni e nomi dei fogli in inglese', () => {
    const { config, quote } = fixture()
    const files = unzip(buildQuotesXlsx([quote], config, 'en'))
    const workbook = text(files, 'xl/workbook.xml')
    expect(workbook).toContain('name="Quotes"')
    expect(workbook).toContain('name="Lines"')
    expect(workbook).toContain('name="Materials"')

    const quotes = text(files, 'xl/worksheets/sheet1.xml')
    expect(quotes).toContain('Quote ID')
    expect(quotes).toContain('Gross price')
    expect(quotes).toContain('Archived')
    expect(quotes).toContain('Yes')
  })

  it('esporta anche un preventivo senza risultato senza valori inventati', () => {
    const { config, withoutResult } = fixture()
    const files = unzip(buildQuotesXlsx([withoutResult], config, 'it'))
    const quotes = text(files, 'xl/worksheets/sheet1.xml')
    expect(quotes).toContain('Senza risultato')
    expect(quotes).toContain('Non ricalcolabile')
    const lines = text(files, 'xl/worksheets/sheet2.xml')
    expect(rowCount(lines)).toBe(1)
    const materials = text(files, 'xl/worksheets/sheet3.xml')
    expect(rowCount(materials)).toBe(1)
  })
})
