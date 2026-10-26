import { zipSync } from 'fflate'

/**
 * Minimal XLSX writer.
 *
 * An .xlsx file is an OPC/ZIP package with a workbook, one worksheet per sheet
 * and a styles part. We only need text, numbers and a handful of number formats,
 * so building the package directly keeps the bundle small and avoids a new
 * dependency. Strings are written as inline strings, so there is no shared
 * string table to maintain.
 */

export type XlsxFormat =
  | 'text'
  | 'money'
  | 'percent'
  | 'grams'
  | 'hours'
  | 'date'
  | 'kwh'
  | 'watts'

export interface XlsxColumn {
  header: string
  format?: XlsxFormat
  width?: number
}

export type XlsxCell = string | number | null | undefined

export interface XlsxSheet {
  name: string
  columns: readonly XlsxColumn[]
  rows: readonly (readonly XlsxCell[])[]
}

const MAX_CELL_TEXT = 32_767
const MAX_SHEET_NAME = 31

const FORMAT_STYLES: Record<XlsxFormat, number> = {
  text: 0,
  money: 2,
  percent: 3,
  grams: 4,
  hours: 5,
  date: 6,
  kwh: 7,
  watts: 8,
}

const TEXT_ENCODER = new TextEncoder()

function stripControlCharacters(value: string): string {
  let result = ''
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue
    result += character
  }
  return result
}

function escapeXml(value: string): string {
  return stripControlCharacters(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, '-').trim().slice(0, MAX_SHEET_NAME) || 'Sheet'
  let candidate = base
  let suffix = 2
  while (used.has(candidate.toLowerCase())) {
    const tail = ` (${suffix})`
    candidate = `${base.slice(0, MAX_SHEET_NAME - tail.length)}${tail}`
    suffix += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

export function toColumnName(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new Error('Invalid column index')
  let name = ''
  let value = index + 1
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

/** Converts an ISO date (`YYYY-MM-DD`) to the Excel serial number, or null if invalid. */
export function excelDateFromIso(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const time = Date.UTC(year, month - 1, day)
  const date = new Date(time)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  // 1970-01-01 is serial 25569 in the 1900 date system.
  return time / 86_400_000 + 25_569
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="7">
<numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/>
<numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>
<numFmt numFmtId="166" formatCode="0.00&quot; g&quot;"/>
<numFmt numFmtId="167" formatCode="0.00&quot; h&quot;"/>
<numFmt numFmtId="168" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="169" formatCode="0.000&quot; kWh&quot;"/>
<numFmt numFmtId="170" formatCode="0&quot; W&quot;"/>
</numFmts>
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDEBE5"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="169" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="170" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

function cellXml(
  reference: string,
  value: XlsxCell,
  style: number,
  isDate: boolean,
): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const styleAttribute = style === 0 ? '' : ` s="${style}"`
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`
  }

  if (isDate) return null

  const text = escapeXml(value.slice(0, MAX_CELL_TEXT))
  if (!text) return null
  const styleAttribute = style === 0 ? '' : ` s="${style}"`
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
}

function sheetXml(sheet: XlsxSheet): string {
  const columnCount = Math.max(sheet.columns.length, 1)
  const lastColumn = toColumnName(columnCount - 1)
  const lastRow = Math.max(sheet.rows.length + 1, 1)

  const columnsXml = sheet.columns
    .map((column, index) => {
      const width = column.width ?? Math.min(40, Math.max(12, column.header.length + 2))
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    })
    .join('')

  const headerCells = sheet.columns
    .map((column, index) => {
      const reference = `${toColumnName(index)}1`
      const text = escapeXml(column.header)
      return `<c r="${reference}" s="1" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
    })
    .join('')

  const dataRows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 2
      const cells = row
        .map((cell, columnIndex) => {
          const column = sheet.columns[columnIndex]
          if (!column) return null
          const format = column.format ?? 'text'
          const style = FORMAT_STYLES[format]
          return cellXml(`${toColumnName(columnIndex)}${rowNumber}`, cell, style, format === 'date')
        })
        .filter((cell): cell is string => cell !== null)
        .join('')
      return `<row r="${rowNumber}">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${lastColumn}${lastRow}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columnsXml}</cols>
<sheetData><row r="1">${headerCells}</row>${dataRows}</sheetData>
<autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`
}

function workbookXml(names: readonly string[]): string {
  const entries = names
    .map(
      (name, index) =>
        `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>${entries}</sheets>
</workbook>`
}

function workbookRelsXml(sheets: readonly XlsxSheet[]): string {
  const sheetRels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
}

function contentTypesXml(sheets: readonly XlsxSheet[]): string {
  const sheetOverrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheetOverrides}
</Types>`
}

export function buildXlsx(sheets: readonly XlsxSheet[]): Uint8Array {
  if (sheets.length === 0) throw new Error('At least one sheet is required')

  const usedNames = new Set<string>()
  const names = sheets.map((sheet) => safeSheetName(sheet.name, usedNames))

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': TEXT_ENCODER.encode(contentTypesXml(sheets)),
    '_rels/.rels': TEXT_ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': TEXT_ENCODER.encode(workbookXml(names)),
    'xl/_rels/workbook.xml.rels': TEXT_ENCODER.encode(workbookRelsXml(sheets)),
    'xl/styles.xml': TEXT_ENCODER.encode(stylesXml()),
  }

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = TEXT_ENCODER.encode(sheetXml(sheet))
  })

  return zipSync(files, { level: 6 })
}
