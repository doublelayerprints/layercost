import { describe, expect, it } from 'vitest'
import {
  configFromRows,
  extraFromRow,
  extraToRow,
  materialFromRow,
  materialToRow,
  printerFromRow,
  printerToRow,
  quoteFromRow,
  quoteToRow,
  settingsFromRow,
  settingsToRow,
  tariffFromRow,
  tariffToRow,
} from './mappers'
import type { Tables } from './database.types'

const CREATED_AT = '2026-10-28T10:00:00.000Z'
const UPDATED_AT = '2026-10-28T10:00:00.000Z'
const NOW = '2026-10-28T11:00:00.000Z'

const settingsRow: Tables<'settings'> = {
  workspace_id: 'ws-1',
  currency: 'EUR',
  locale: 'it-IT',
  labor_rate_per_hour: 0,
  failure_rate_bp: 500,
  time_overhead_bp: 0,
  pricing_mode: 'markup',
  markup_bp: 3000,
  margin_bp: 2500,
  rounding_step: 100000,
  rounding_mode: 'up',
  vat_mode: 'none',
  vat_rate_bp: 2200,
  allocation_mode: 'proportional',
  onboarding_complete: false,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
}

const tariffRow: Tables<'energy_tariffs'> = {
  id: 'tariff-1',
  workspace_id: 'ws-1',
  label: 'Tariffa',
  price_per_kwh: 200000,
  effective_from: '2026-01-01',
  notes: null,
  archived_at: null,
  deleted_at: null,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
}

const printerRow: Tables<'printers'> = {
  id: 'printer-1',
  workspace_id: 'ws-1',
  name: 'Kobra 3',
  model: 'Anycubic Kobra 3',
  purchase_price: 299000000,
  residual_value_bp: 2000,
  expected_life_hours: 15000,
  maintenance_per_hour: 10000,
  startup_minutes: 5,
  multicolor: false,
  build_volume_mm: [250, 250, 260],
  rated_power_w: 400,
  power_profiles: { PLA: { avgWatts: 190, source: 'estimated' } },
  default_avg_watts: 200,
  energy_tariff_id: 'tariff-1',
  notes: null,
  archived_at: null,
  deleted_at: null,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
}

const materialRow: Tables<'materials'> = {
  id: 'material-1',
  workspace_id: 'ws-1',
  name: 'PLA',
  family: 'PLA',
  price_per_kg: 20000000,
  spool_net_weight_g: 1000,
  supplier: null,
  color: null,
  failure_rate_bp: null,
  notes: null,
  archived_at: null,
  deleted_at: null,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
}

const extraRow: Tables<'extras'> = {
  id: 'extra-1',
  workspace_id: 'ws-1',
  name: 'Scatola',
  amount: 400000,
  unit: 'perUnit',
  category: null,
  archived_at: null,
  deleted_at: null,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
}

const quoteRow: Tables<'quotes'> = {
  id: 'quote-1',
  workspace_id: 'ws-1',
  status: 'saved',
  name: 'Preventivo',
  customer: null,
  quote_date: '2026-10-28',
  locale: 'it',
  lines: [
    {
      id: 'line-1',
      name: 'Riga',
      printerId: 'printer-1',
      timeSeconds: 3600,
      materials: [{ materialId: 'material-1', grams: 1000 }],
      quantity: 1,
      finishingSecondsPerUnit: 0,
      extraIds: [],
      overrides: {},
    },
  ],
  job: { setupSeconds: 0, designSeconds: 0, extraIds: [] },
  pricing: {
    mode: 'markup',
    markupBp: 3000,
    marginBp: 2500,
    roundingStep: 100000,
    roundingMode: 'up',
    vatMode: 'none',
    vatRateBp: 0,
  },
  snapshot: null,
  result: null,
  engine_version: null,
  schema_version: 4,
  created_by: null,
  updated_by: null,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
  archived_at: null,
  deleted_at: null,
}

describe('cloud mappers', () => {
  it('mappa settings e tariffe', () => {
    const settings = settingsFromRow(settingsRow, [tariffRow])
    expect(settings.laborRatePerHour).toBe(0)
    expect(settings.tariffs).toHaveLength(1)
    expect(settings.tariffs[0]?.id).toBe('tariff-1')
    expect(settings.locale).toBe('it-IT')
  })

  it('mappa le entità di configurazione e conserva i campi opzionali', () => {
    const printer = printerFromRow(printerRow)
    expect(printer.archived).toBe(false)
    expect(printer.powerProfiles.PLA?.avgWatts).toBe(190)
    expect(printer.energyTariffId).toBe('tariff-1')

    const material = materialFromRow(materialRow)
    expect(material.failureRateBp).toBeUndefined()
    expect(material.family).toBe('PLA')

    const extra = extraFromRow(extraRow)
    expect(extra.unit).toBe('perUnit')
    expect(extra.category).toBeUndefined()

    const tariff = tariffFromRow(tariffRow)
    expect(tariff.effectiveFrom).toBe('2026-01-01')
  })

  it('mappa archivio e timestamp di archiviazione', () => {
    const printer = printerFromRow({ ...printerRow, archived_at: CREATED_AT })
    expect(printer.archived).toBe(true)

    const archived = printerToRow({ ...printer, archived: true }, 'ws-1', undefined, NOW)
    expect(archived.archived_at).toBe(NOW)

    const preserved = printerToRow(
      { ...printer, archived: true },
      'ws-1',
      { archived_at: CREATED_AT },
      NOW,
    )
    expect(preserved.archived_at).toBe(CREATED_AT)

    const active = printerToRow({ ...printer, archived: false }, 'ws-1', undefined, NOW)
    expect(active.archived_at).toBeNull()
  })

  it('mappa il preventivo e rifiuta le bozze', () => {
    const config = configFromRows({
      settings: settingsRow,
      tariffs: [tariffRow],
      printers: [printerRow],
      materials: [materialRow],
      extras: [extraRow],
    })
    const quote = quoteFromRow(quoteRow)
    expect(quote.status).toBe('saved')
    expect(quote.lines).toHaveLength(1)
    expect(quote.snapshot).toBeUndefined()
    expect(quote.result).toBeUndefined()

    const withSnapshot = {
      ...quote,
      snapshot: { config, capturedAt: CREATED_AT, engineVersion: '1.0.0' },
    }
    const row = quoteToRow(withSnapshot, 'ws-1', undefined, NOW)
    expect(row.schema_version).toBe(4)
    expect(row.created_at).toBe(CREATED_AT)
    expect(row.archived_at).toBeNull()

    const roundtrip = quoteFromRow({
      ...quoteRow,
      ...row,
      created_at: row.created_at ?? CREATED_AT,
      updated_at: UPDATED_AT,
    })
    expect(roundtrip.snapshot?.engineVersion).toBe('1.0.0')

    expect(() => quoteToRow({ ...quote, status: 'draft' }, 'ws-1')).toThrow(
      'draft_quotes_are_local_only',
    )
  })

  it('espone i metadati di audit cloud senza riscriverli', () => {
    const quote = quoteFromRow({
      ...quoteRow,
      created_by: '11111111-1111-1111-1111-111111111111',
      updated_by: '22222222-2222-2222-2222-222222222222',
    })
    expect(quote.createdBy).toBe('11111111-1111-1111-1111-111111111111')
    expect(quote.updatedBy).toBe('22222222-2222-2222-2222-222222222222')

    const row = quoteToRow(quote, 'ws-1', undefined, NOW)
    expect(row).not.toHaveProperty('created_by')
    expect(row).not.toHaveProperty('updated_by')
  })

  it('assembla la configurazione e ignora le righe cancellate', () => {
    const config = configFromRows({
      settings: settingsRow,
      tariffs: [tariffRow],
      printers: [printerRow, { ...printerRow, id: 'printer-deleted', deleted_at: CREATED_AT }],
      materials: [materialRow],
      extras: [extraRow],
    })

    expect(config.printers).toHaveLength(1)
    expect(config.materials).toHaveLength(1)
    expect(config.extras).toHaveLength(1)
    expect(config.settings.tariffs).toHaveLength(1)
  })

  it('mantiene i valori monetari e le unità intere', () => {
    const settings = settingsFromRow(settingsRow, [])
    const row = settingsToRow(settings, 'ws-1')
    expect(row.labor_rate_per_hour).toBe(0)
    expect(row.rounding_step).toBe(100000)
    expect(row.failure_rate_bp).toBe(500)

    const materialRowOut = materialToRow(materialFromRow(materialRow), 'ws-1', undefined, NOW)
    expect(materialRowOut.price_per_kg).toBe(20000000)
    expect(materialRowOut.spool_net_weight_g).toBe(1000)

    const extraRowOut = extraToRow(extraFromRow(extraRow), 'ws-1', undefined, NOW)
    expect(extraRowOut.amount).toBe(400000)

    const tariffRowOut = tariffToRow(tariffFromRow(tariffRow), 'ws-1')
    expect(tariffRowOut.price_per_kwh).toBe(200000)
  })

  it('rimappa un preventivo senza perdere i valori', () => {
    const quote = quoteFromRow(quoteRow)
    const row = quoteToRow(quote, 'ws-1', undefined, NOW)
    const roundtrip = quoteFromRow({
      ...quoteRow,
      ...row,
      created_at: row.created_at ?? CREATED_AT,
      updated_at: UPDATED_AT,
    })

    expect(roundtrip.id).toBe('quote-1')
    expect(roundtrip.lines).toEqual(quote.lines)
    expect(roundtrip.status).toBe('saved')
  })
})
