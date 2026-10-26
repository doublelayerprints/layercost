import { DOMParser as XmlDomParser, onErrorStopParsing } from '@xmldom/xmldom'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildXlsx, excelDateFromIso, toColumnName, type XlsxSheet } from './xlsx'

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes) as Record<string, Uint8Array>
}

function text(files: Record<string, Uint8Array>, name: string): string {
  const file = files[name]
  if (!file) throw new Error(`Missing ${name}`)
  return strFromU8(file)
}

function expectWellFormed(xml: string) {
  const document = new XmlDomParser({ onError: onErrorStopParsing }).parseFromString(
    xml,
    'application/xml',
  )
  expect(document.getElementsByTagName('parsererror')).toHaveLength(0)
}

const baseSheet: XlsxSheet = {
  name: 'Preventivi',
  columns: [
    { header: 'Nome', width: 24 },
    { header: 'Costo', format: 'money' },
  ],
  rows: [
    ['A & B <test> "quote"', 12.5],
    [null, null],
  ],
}

describe('writer XLSX', () => {
  it('crea un pacchetto OPC valido con fogli, stili e celle', () => {
    const files = unzip(buildXlsx([baseSheet]))

    expect(Object.keys(files).sort()).toEqual(
      [
        '[Content_Types].xml',
        '_rels/.rels',
        'xl/_rels/workbook.xml.rels',
        'xl/styles.xml',
        'xl/workbook.xml',
        'xl/worksheets/sheet1.xml',
      ].sort(),
    )

    for (const name of Object.keys(files)) {
      expectWellFormed(text(files, name))
    }

    const workbook = text(files, 'xl/workbook.xml')
    expect(workbook).toContain('name="Preventivi"')
    expect(workbook).toContain('sheetId="1"')

    const sheet = text(files, 'xl/worksheets/sheet1.xml')
    expect(sheet).toContain('A &amp; B &lt;test&gt; &quot;quote&quot;')
    expect(sheet).toContain('<c r="B2" s="2"><v>12.5</v></c>')
    expect(sheet).toContain('t="inlineStr"')
    expect(sheet).not.toContain('NaN')
  })

  it('scrive date Excel, formati numerici e riferimenti oltre la Z', () => {
    const sheet: XlsxSheet = {
      name: 'Date',
      columns: [
        { header: 'Data', format: 'date' },
        { header: 'Ore', format: 'hours' },
        { header: 'Percentuale', format: 'percent' },
        { header: 'Grammi', format: 'grams' },
        { header: 'kWh', format: 'kwh' },
        { header: 'Watt', format: 'watts' },
      ],
      rows: [[excelDateFromIso('2020-01-01'), 1.5, 12.5, 100, 0.25, 190]],
    }
    const files = unzip(buildXlsx([sheet]))
    const xml = text(files, 'xl/worksheets/sheet1.xml')

    expect(xml).toContain('<c r="A2" s="6"><v>43831</v></c>')
    expect(xml).toContain('<c r="B2" s="5"><v>1.5</v></c>')
    expect(xml).toContain('<c r="C2" s="3"><v>12.5</v></c>')
    expect(xml).toContain('<c r="D2" s="4"><v>100</v></c>')
    expect(xml).toContain('<c r="E2" s="7"><v>0.25</v></c>')
    expect(xml).toContain('<c r="F2" s="8"><v>190</v></c>')

    expect(toColumnName(0)).toBe('A')
    expect(toColumnName(25)).toBe('Z')
    expect(toColumnName(26)).toBe('AA')
    expect(toColumnName(51)).toBe('AZ')
    expect(toColumnName(52)).toBe('BA')
    expect(toColumnName(701)).toBe('ZZ')
    expect(toColumnName(702)).toBe('AAA')
  })

  it('rifiuta date non valide e valori non finiti', () => {
    expect(excelDateFromIso('2026-02-31')).toBeNull()
    expect(excelDateFromIso('2026-13-01')).toBeNull()
    expect(excelDateFromIso('26/10/2026')).toBeNull()
    expect(excelDateFromIso('2026-10-26')).toBe(46_321)

    const sheet: XlsxSheet = {
      name: 'Vuoto',
      columns: [{ header: 'Valore', format: 'money' }],
      rows: [[Number.NaN], [Number.POSITIVE_INFINITY], [undefined]],
    }
    const files = unzip(buildXlsx([sheet]))
    const xml = text(files, 'xl/worksheets/sheet1.xml')
    expect(xml).not.toContain('NaN')
    expect(xml).not.toContain('Infinity')
    expect(xml).toContain('<row r="4"></row>')
  })

  it('sanifica e rende univoci i nomi dei fogli', () => {
    const sheets: XlsxSheet[] = [
      { name: 'A/B:C*D?E[F]', columns: [{ header: 'X' }], rows: [] },
      { name: 'A/B:C*D?E[F]', columns: [{ header: 'X' }], rows: [] },
      { name: 'x'.repeat(40), columns: [{ header: 'X' }], rows: [] },
    ]
    const workbook = text(unzip(buildXlsx(sheets)), 'xl/workbook.xml')
    expect(workbook).toContain('name="A-B-C-D-E-F-"')
    expect(workbook).toContain('name="A-B-C-D-E-F- (2)"')
    expect(workbook).toMatch(/name="x{31}"/)
  })

  it('richiede almeno un foglio', () => {
    expect(() => buildXlsx([])).toThrow('At least one sheet is required')
  })
})
