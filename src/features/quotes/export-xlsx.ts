import { calculateMaterialCost } from '@/domain/cost/material'
import type { CostConfig, LineResult, PrintLine, Quote } from '@/domain/types'
import { translate, type Locale, type MessageKey } from '@/i18n'
import { materialFamilyLabel } from '@/lib/labels'
import { todayIsoDate } from '@/lib/date'
import {
  buildXlsx,
  excelDateFromIso,
  type XlsxCell,
  type XlsxColumn,
  type XlsxFormat,
  type XlsxSheet,
} from '@/lib/xlsx'
import { quoteStatusDisplay } from './quote-status'

interface ExportColumn<T> {
  column: XlsxColumn
  value: (row: T) => XlsxCell
}

interface QuoteExportRow {
  quote: Quote
  status: string
}

interface LineExportRow {
  quote: Quote
  line: PrintLine
  status: string
  result?: LineResult
  printerName: string
  totalGramsCg: number
  materialNames: string
  materialCostMicro?: number
}

interface MaterialExportRow {
  quote: Quote
  line: PrintLine
  materialName: string
  family: string
  gramsCg: number
  costMicro?: number
  pricePerKgMicro?: number
}

function microToEuro(value: number): number {
  return value / 1_000_000
}

function centsToEuro(value: number): number {
  return value / 100
}

function sheetFrom<T>(
  name: string,
  columns: readonly ExportColumn<T>[],
  rows: readonly T[],
): XlsxSheet {
  return {
    name,
    columns: columns.map((item) => item.column),
    rows: rows.map((row) => columns.map((item) => item.value(row))),
  }
}

function materialRowsFor(
  quote: Quote,
  config: CostConfig,
  line: PrintLine,
  locale: Locale,
): { rows: MaterialExportRow[]; totalGramsCg: number; materialNames: string; costMicro?: number } {
  const rows: MaterialExportRow[] = []
  const names: string[] = []
  let totalGramsCg = 0
  let costMicro: number | undefined = 0

  for (const usage of line.materials) {
    totalGramsCg += usage.grams
    if (usage.grams === 0) continue

    const material = config.materials.find((candidate) => candidate.id === usage.materialId)
    if (!material) {
      names.push(usage.materialId)
      costMicro = undefined
      rows.push({
        quote,
        line,
        materialName: usage.materialId,
        family: '',
        gramsCg: usage.grams,
      })
      continue
    }

    const detail = calculateMaterialCost([usage], config.materials).details[0]
    const usageCost = detail?.cost ?? 0
    if (costMicro !== undefined) costMicro += usageCost
    names.push(material.name)
    rows.push({
      quote,
      line,
      materialName: material.name,
      family: materialFamilyLabel(material.family, (key) => translate(locale, key)),
      gramsCg: usage.grams,
      costMicro: usageCost,
      pricePerKgMicro: material.pricePerKg,
    })
  }

  return {
    rows,
    totalGramsCg,
    materialNames: names.join('; '),
    costMicro,
  }
}

export function buildQuotesXlsx(
  quotes: readonly Quote[],
  fallbackConfig: CostConfig,
  locale: Locale,
): Uint8Array {
  const tr = (key: MessageKey) => translate(locale, key)
  const col = <T>(
    key: MessageKey,
    format: XlsxFormat,
    value: (row: T) => XlsxCell,
    width?: number,
  ): ExportColumn<T> => ({
    column: { header: tr(key), format, width },
    value,
  })

  const sortedQuotes = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const quoteRows: QuoteExportRow[] = sortedQuotes.map((quote) => ({
    quote,
    status: tr(quoteStatusDisplay(quote).labelKey),
  }))

  const lineRows: LineExportRow[] = []
  const materialRows: MaterialExportRow[] = []

  for (const quote of sortedQuotes) {
    const config = quote.snapshot?.config ?? fallbackConfig
    const status = tr(quoteStatusDisplay(quote).labelKey)
    for (const line of quote.lines) {
      const result = quote.result?.lines.find((candidate) => candidate.lineId === line.id)
      const printer = config.printers.find((candidate) => candidate.id === line.printerId)
      const materials = materialRowsFor(quote, config, line, locale)
      materialRows.push(...materials.rows)
      lineRows.push({
        quote,
        line,
        status,
        result,
        printerName: result?.printerName ?? printer?.name ?? '',
        totalGramsCg: materials.totalGramsCg,
        materialNames: materials.materialNames,
        materialCostMicro: result ? result.material : materials.costMicro,
      })
    }
  }

  const quoteColumns: Array<ExportColumn<QuoteExportRow>> = [
    col('xlsx.column.quoteId', 'text', (row) => row.quote.id, 38),
    col('xlsx.column.quoteName', 'text', (row) => row.quote.name, 30),
    col('xlsx.column.customer', 'text', (row) => row.quote.customer ?? '', 24),
    col('xlsx.column.quoteDate', 'date', (row) => excelDateFromIso(row.quote.quoteDate), 14),
    col('xlsx.column.status', 'text', (row) => row.status, 18),
    col(
      'xlsx.column.archived',
      'text',
      (row) => tr(row.quote.archived ? 'xlsx.archivedYes' : 'xlsx.archivedNo'),
      12,
    ),
    col('xlsx.column.language', 'text', (row) => row.quote.locale, 10),
    col('xlsx.column.lineCount', 'text', (row) => row.quote.lines.length, 8),
    col(
      'xlsx.column.totalCost',
      'money',
      (row) => (row.quote.result ? microToEuro(row.quote.result.totalCost) : null),
      16,
    ),
    col(
      'xlsx.column.fixedCosts',
      'money',
      (row) => (row.quote.result ? microToEuro(row.quote.result.jobFixedTotal) : null),
      16,
    ),
    col(
      'xlsx.column.netPrice',
      'money',
      (row) => (row.quote.result ? centsToEuro(row.quote.result.netPriceCents) : null),
      16,
    ),
    col(
      'xlsx.column.vat',
      'money',
      (row) => (row.quote.result ? centsToEuro(row.quote.result.vatCents) : null),
      14,
    ),
    col(
      'xlsx.column.grossPrice',
      'money',
      (row) => (row.quote.result ? centsToEuro(row.quote.result.grossPriceCents) : null),
      16,
    ),
    col(
      'xlsx.column.effectiveMargin',
      'percent',
      (row) => (row.quote.result ? row.quote.result.effectiveMarginBp / 100 : null),
      18,
    ),
    col(
      'xlsx.column.discount',
      'money',
      (row) => (row.quote.result ? microToEuro(row.quote.result.discount) : null),
      14,
    ),
    col('xlsx.column.createdAt', 'text', (row) => row.quote.createdAt, 24),
    col('xlsx.column.updatedAt', 'text', (row) => row.quote.updatedAt, 24),
    col('xlsx.column.engineVersion', 'text', (row) => row.quote.engineVersion ?? '', 12),
  ]

  const lineColumns: Array<ExportColumn<LineExportRow>> = [
    col('xlsx.column.quoteId', 'text', (row) => row.quote.id, 38),
    col('xlsx.column.quoteName', 'text', (row) => row.quote.name, 30),
    col('xlsx.column.customer', 'text', (row) => row.quote.customer ?? '', 24),
    col('xlsx.column.quoteDate', 'date', (row) => excelDateFromIso(row.quote.quoteDate), 14),
    col('xlsx.column.status', 'text', (row) => row.status, 18),
    col('xlsx.column.lineName', 'text', (row) => row.line.name, 30),
    col('xlsx.column.printer', 'text', (row) => row.printerName, 20),
    col('xlsx.column.quantity', 'text', (row) => row.line.quantity, 10),
    col('xlsx.column.timeHours', 'hours', (row) => row.line.timeSeconds / 3600, 14),
    col(
      'xlsx.column.effectiveTimeHours',
      'hours',
      (row) => (row.result ? row.result.effectiveSeconds / 3600 : null),
      18,
    ),
    col('xlsx.column.grams', 'grams', (row) => row.totalGramsCg / 100, 12),
    col('xlsx.column.materials', 'text', (row) => row.materialNames, 28),
    col('xlsx.column.color', 'text', (row) => row.line.color ?? '', 12),
    col(
      'xlsx.column.materialCost',
      'money',
      (row) => (row.materialCostMicro === undefined ? null : microToEuro(row.materialCostMicro)),
      16,
    ),
    col(
      'xlsx.column.energyCost',
      'money',
      (row) => (row.result ? microToEuro(row.result.energy) : null),
      14,
    ),
    col(
      'xlsx.column.depreciation',
      'money',
      (row) => (row.result ? microToEuro(row.result.depreciation) : null),
      16,
    ),
    col(
      'xlsx.column.maintenance',
      'money',
      (row) => (row.result ? microToEuro(row.result.maintenance) : null),
      16,
    ),
    col(
      'xlsx.column.labor',
      'money',
      (row) => (row.result ? microToEuro(row.result.labor) : null),
      14,
    ),
    col(
      'xlsx.column.extras',
      'money',
      (row) => (row.result ? microToEuro(row.result.extras) : null),
      14,
    ),
    col(
      'xlsx.column.failureReserve',
      'money',
      (row) => (row.result ? microToEuro(row.result.failure) : null),
      16,
    ),
    col(
      'xlsx.column.directUnitCost',
      'money',
      (row) => (row.result ? microToEuro(row.result.directUnitCost) : null),
      20,
    ),
    col(
      'xlsx.column.directLineCost',
      'money',
      (row) => (row.result ? microToEuro(row.result.directLineCost) : null),
      18,
    ),
    col(
      'xlsx.column.fullyLoadedUnitCost',
      'money',
      (row) => (row.result ? microToEuro(row.result.fullyLoadedUnitCost) : null),
      22,
    ),
    col(
      'xlsx.column.fullyLoadedLineCost',
      'money',
      (row) => (row.result ? microToEuro(row.result.fullyLoadedLineCost) : null),
      20,
    ),
    col(
      'xlsx.column.linePrice',
      'money',
      (row) => (row.result ? centsToEuro(row.result.priceCents) : null),
      16,
    ),
    col(
      'xlsx.column.unitPrice',
      'money',
      (row) => (row.result ? centsToEuro(row.result.pricePerUnitCents) : null),
      16,
    ),
    col(
      'xlsx.column.energyKwh',
      'kwh',
      (row) => (row.result ? row.result.energyWh / 1000 : null),
      16,
    ),
    col(
      'xlsx.column.avgWatts',
      'watts',
      (row) => (row.result ? row.result.avgWatts : null),
      18,
    ),
  ]

  const materialColumns: Array<ExportColumn<MaterialExportRow>> = [
    col('xlsx.column.quoteId', 'text', (row) => row.quote.id, 38),
    col('xlsx.column.quoteName', 'text', (row) => row.quote.name, 30),
    col('xlsx.column.lineName', 'text', (row) => row.line.name, 30),
    col('xlsx.column.materialName', 'text', (row) => row.materialName, 24),
    col('xlsx.column.family', 'text', (row) => row.family, 12),
    col('xlsx.column.grams', 'grams', (row) => row.gramsCg / 100, 12),
    col(
      'xlsx.column.cost',
      'money',
      (row) => (row.costMicro === undefined ? null : microToEuro(row.costMicro)),
      14,
    ),
    col(
      'xlsx.column.pricePerKg',
      'money',
      (row) => (row.pricePerKgMicro === undefined ? null : microToEuro(row.pricePerKgMicro)),
      16,
    ),
  ]

  return buildXlsx([
    sheetFrom(tr('xlsx.sheet.quotes'), quoteColumns, quoteRows),
    sheetFrom(tr('xlsx.sheet.lines'), lineColumns, lineRows),
    sheetFrom(tr('xlsx.sheet.materials'), materialColumns, materialRows),
  ])
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function downloadQuotesXlsx(
  quotes: readonly Quote[],
  config: CostConfig,
  locale: Locale,
  now = new Date(),
): void {
  const bytes = buildQuotesXlsx(quotes, config, locale)
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const blob = new Blob([buffer], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `layercost-quotes-${todayIsoDate(now)}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
