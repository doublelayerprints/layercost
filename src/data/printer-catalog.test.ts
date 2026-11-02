import { describe, expect, it } from 'vitest'
import type { Printer } from '@/domain/types'
import type { ThreeMfSummary } from '@/domain/three-mf'
import { proposeThreeMfMapping } from '@/domain/three-mf-mapping'
import { t } from '@/i18n'
import { createSeedConfig } from '@/data/seed'
import { printerSchema } from '@/data/schemas'
import {
  CATALOG_REVIEWED_AT,
  PRINTER_BRANDS,
  PRINTER_CATALOG,
  catalogEntryToPrinter,
  filterCatalogEntries,
  isCatalogEntryAdded,
  normalizeCatalogModel,
  type PrinterCatalogEntry,
} from './printer-catalog'

function printerFrom(entry: PrinterCatalogEntry, id = `printer-${entry.id}`): Printer {
  return { ...catalogEntryToPrinter(entry, 'it'), id }
}

function summaryFor(model: string): ThreeMfSummary {
  return {
    fileName: 'test.3mf',
    slicer: 'unknown',
    printerModel: model,
    plates: [],
    warnings: [],
  }
}

describe('catalogo stampanti', () => {
  it('ha il numero atteso di preset e tutte le marche', () => {
    expect(PRINTER_CATALOG).toHaveLength(29)
    expect(new Set(PRINTER_CATALOG.map((entry) => entry.brand))).toEqual(new Set(PRINTER_BRANDS))
    expect(CATALOG_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('il promo della lista cita il numero di preset', () => {
    expect(t('printers.catalogPromoTitle')).toContain(String(PRINTER_CATALOG.length))
  })

  it('non duplica id, nomi o modelli', () => {
    const ids = PRINTER_CATALOG.map((entry) => entry.id)
    const models = PRINTER_CATALOG.map((entry) => normalizeCatalogModel(entry.model))
    const names = PRINTER_CATALOG.map((entry) =>
      normalizeCatalogModel(`${entry.brand} ${entry.name}`),
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(models).size).toBe(models.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('non include le due stampanti del seed', () => {
    const models = PRINTER_CATALOG.map((entry) => normalizeCatalogModel(entry.model))
    expect(models).not.toContain(normalizeCatalogModel('Anycubic Kobra 3'))
    expect(models).not.toContain(normalizeCatalogModel('Anycubic Kobra X'))
  })

  it('produce stampanti valide secondo lo schema', () => {
    for (const entry of PRINTER_CATALOG) {
      const printer = printerFrom(entry)
      const parsed = printerSchema.safeParse(printer)
      expect(parsed.success, `${entry.id}: ${parsed.error?.message ?? ''}`).toBe(true)
      expect(printer.energyTariffId).toBeUndefined()
      expect(printer.archived).toBe(false)
      expect(printer.notes?.trim()).not.toBe('')
    }
  })

  it('usa unità intere e valori positivi', () => {
    for (const entry of PRINTER_CATALOG) {
      expect(Number.isInteger(entry.purchasePrice), entry.id).toBe(true)
      expect(entry.purchasePrice).toBeGreaterThan(0)
      expect(Number.isInteger(entry.maintenancePerHour), entry.id).toBe(true)
      expect(entry.maintenancePerHour).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(entry.residualValueBp), entry.id).toBe(true)
      expect(entry.residualValueBp).toBeGreaterThanOrEqual(0)
      expect(entry.residualValueBp).toBeLessThanOrEqual(10_000)
      expect(entry.expectedLifeHours).toBeGreaterThan(0)
      expect(entry.startupMinutes).toBeGreaterThan(0)
      expect(entry.ratedPowerW).toBeGreaterThan(0)
      expect(entry.buildVolumeMm.every((value) => Number.isInteger(value) && value > 0)).toBe(true)
      for (const watts of Object.values(entry.avgWatts)) {
        expect(Number.isInteger(watts), entry.id).toBe(true)
        expect(watts).toBeGreaterThan(0)
      }
    }
  })

  it('ha note bilingui e metadati di fonte', () => {
    for (const entry of PRINTER_CATALOG) {
      expect(entry.notes.it.trim(), entry.id).not.toBe('')
      expect(entry.notes.en.trim(), entry.id).not.toBe('')
      expect(['official', 'retailer', 'aggregator']).toContain(entry.source)
      expect(['high', 'medium', 'low']).toContain(entry.confidence)
    }
  })

  it('copia solo i profili stimati delle quattro famiglie principali', () => {
    const printer = printerFrom(PRINTER_CATALOG[0]!)
    expect(Object.keys(printer.powerProfiles).sort()).toEqual(['ABS', 'ASA', 'PETG', 'PLA'])
    for (const profile of Object.values(printer.powerProfiles)) {
      expect(profile?.source).toBe('estimated')
      expect(profile?.note?.trim()).not.toBe('')
    }
  })

  it('traduce le note in base alla lingua attiva', () => {
    const entry = PRINTER_CATALOG[0]!
    expect(catalogEntryToPrinter(entry, 'it').notes).toBe(entry.notes.it)
    expect(catalogEntryToPrinter(entry, 'en').notes).toBe(entry.notes.en)
  })

  it('permette di trovare i preset per marca, nome o modello', () => {
    expect(filterCatalogEntries(PRINTER_CATALOG, '', 'Bambu Lab')).toHaveLength(11)
    expect(
      filterCatalogEntries(PRINTER_CATALOG, 'ender 3 v3', 'all').map((entry) => entry.id),
    ).toEqual(['creality-ender-3-v3-ke'])
    expect(filterCatalogEntries(PRINTER_CATALOG, 'KOBRA', 'Anycubic')).toHaveLength(3)
    expect(filterCatalogEntries(PRINTER_CATALOG, 'bambu', 'Creality')).toEqual([])
    expect(filterCatalogEntries(PRINTER_CATALOG, '  ', 'all')).toHaveLength(PRINTER_CATALOG.length)
  })

  it('riconosce una stampante già presente ignorando maiuscole e spazi', () => {
    const entry = PRINTER_CATALOG[0]!
    const printer = printerFrom(entry)
    expect(isCatalogEntryAdded([printer], entry)).toBe(true)
    expect(
      isCatalogEntryAdded([{ ...printer, model: `  ${entry.model.toUpperCase()}  ` }], entry),
    ).toBe(true)
    expect(isCatalogEntryAdded([{ ...printer, archived: true }], entry)).toBe(false)
    expect(isCatalogEntryAdded([{ ...printer, model: 'Altro modello' }], entry)).toBe(false)
  })

  it('viene proposto dall’import .3mf con il modello dello slicer', () => {
    for (const entry of PRINTER_CATALOG) {
      const printer = printerFrom(entry)
      const config = { ...createSeedConfig(), printers: [printer] }
      expect(proposeThreeMfMapping(summaryFor(entry.model), config).printer, entry.id).toEqual({
        printerId: printer.id,
        candidateIds: [printer.id],
        reason: 'exact',
      })
    }
  })
})
