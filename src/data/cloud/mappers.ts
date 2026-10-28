import type {
  CostConfig,
  EnergyTariff,
  Extra,
  Material,
  Printer,
  Quote,
  Settings,
} from '@/domain/types'
import {
  configSchema,
  extraSchema,
  materialSchema,
  printerSchema,
  quoteSchema,
  settingsSchema,
  tariffSchema,
} from '@/data/schemas'
import { SCHEMA_VERSION } from '@/data/storage'
import type { Json, Tables, TablesInsert } from './database.types'

type SettingsRow = Tables<'settings'>
type TariffRow = Tables<'energy_tariffs'>
type PrinterRow = Tables<'printers'>
type MaterialRow = Tables<'materials'>
type ExtraRow = Tables<'extras'>
type QuoteRow = Tables<'quotes'>

type WithArchivedAt = Pick<{ archived_at: string | null }, 'archived_at'>

type JsonValue = NonNullable<Json>

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function archivedAt(
  archived: boolean,
  existing: WithArchivedAt | undefined,
  now: string,
): string | null {
  if (!archived) return null
  return existing?.archived_at ?? now
}

export function settingsFromRow(row: SettingsRow, tariffs: TariffRow[]): Settings {
  const parsed = settingsSchema.parse({
    currency: row.currency,
    locale: row.locale,
    tariffs: tariffs.filter((tariff) => tariff.deleted_at === null).map(tariffFromRow),
    laborRatePerHour: row.labor_rate_per_hour,
    failureRateBp: row.failure_rate_bp,
    timeOverheadBp: row.time_overhead_bp,
    pricingMode: row.pricing_mode,
    markupBp: row.markup_bp,
    marginBp: row.margin_bp,
    roundingStep: row.rounding_step,
    roundingMode: row.rounding_mode,
    vatMode: row.vat_mode,
    vatRateBp: row.vat_rate_bp,
    allocationMode: row.allocation_mode,
    onboardingComplete: row.onboarding_complete,
  })
  return parsed as unknown as Settings
}

export function settingsToRow(settings: Settings, workspaceId: string): TablesInsert<'settings'> {
  return {
    workspace_id: workspaceId,
    currency: settings.currency,
    locale: settings.locale,
    labor_rate_per_hour: settings.laborRatePerHour,
    failure_rate_bp: settings.failureRateBp,
    time_overhead_bp: settings.timeOverheadBp,
    pricing_mode: settings.pricingMode,
    markup_bp: settings.markupBp,
    margin_bp: settings.marginBp,
    rounding_step: settings.roundingStep,
    rounding_mode: settings.roundingMode,
    vat_mode: settings.vatMode,
    vat_rate_bp: settings.vatRateBp,
    allocation_mode: settings.allocationMode,
    onboarding_complete: settings.onboardingComplete,
  }
}

export function tariffFromRow(row: TariffRow): EnergyTariff {
  const parsed = tariffSchema.parse({
    id: row.id,
    label: row.label,
    pricePerKWh: row.price_per_kwh,
    effectiveFrom: row.effective_from,
    notes: row.notes ?? undefined,
  })
  return parsed as unknown as EnergyTariff
}

export function tariffToRow(
  tariff: EnergyTariff,
  workspaceId: string,
): TablesInsert<'energy_tariffs'> {
  return {
    id: tariff.id,
    workspace_id: workspaceId,
    label: tariff.label,
    price_per_kwh: tariff.pricePerKWh,
    effective_from: tariff.effectiveFrom,
    notes: tariff.notes ?? null,
  }
}

export function printerFromRow(row: PrinterRow): Printer {
  const parsed = printerSchema.parse({
    id: row.id,
    name: row.name,
    model: row.model,
    purchasePrice: row.purchase_price,
    residualValueBp: row.residual_value_bp,
    expectedLifeHours: row.expected_life_hours,
    maintenancePerHour: row.maintenance_per_hour,
    startupMinutes: row.startup_minutes,
    multicolor: row.multicolor,
    buildVolumeMm: row.build_volume_mm,
    ratedPowerW: row.rated_power_w,
    powerProfiles: row.power_profiles,
    defaultAvgWatts: row.default_avg_watts,
    energyTariffId: row.energy_tariff_id ?? undefined,
    notes: row.notes ?? undefined,
    archived: row.archived_at !== null,
  })
  return parsed as unknown as Printer
}

export function printerToRow(
  printer: Printer,
  workspaceId: string,
  existing?: WithArchivedAt,
  now = new Date().toISOString(),
): TablesInsert<'printers'> {
  return {
    id: printer.id,
    workspace_id: workspaceId,
    name: printer.name,
    model: printer.model,
    purchase_price: printer.purchasePrice,
    residual_value_bp: printer.residualValueBp,
    expected_life_hours: printer.expectedLifeHours,
    maintenance_per_hour: printer.maintenancePerHour,
    startup_minutes: printer.startupMinutes,
    multicolor: printer.multicolor,
    build_volume_mm: printer.buildVolumeMm,
    rated_power_w: printer.ratedPowerW,
    power_profiles: toJson(printer.powerProfiles),
    default_avg_watts: printer.defaultAvgWatts,
    energy_tariff_id: printer.energyTariffId ?? null,
    notes: printer.notes ?? null,
    archived_at: archivedAt(printer.archived, existing, now),
  }
}

export function materialFromRow(row: MaterialRow): Material {
  const parsed = materialSchema.parse({
    id: row.id,
    name: row.name,
    family: row.family,
    pricePerKg: row.price_per_kg,
    spoolNetWeightG: row.spool_net_weight_g,
    supplier: row.supplier ?? undefined,
    color: row.color ?? undefined,
    failureRateBp: row.failure_rate_bp ?? undefined,
    notes: row.notes ?? undefined,
    archived: row.archived_at !== null,
  })
  return parsed as unknown as Material
}

export function materialToRow(
  material: Material,
  workspaceId: string,
  existing?: WithArchivedAt,
  now = new Date().toISOString(),
): TablesInsert<'materials'> {
  return {
    id: material.id,
    workspace_id: workspaceId,
    name: material.name,
    family: material.family,
    price_per_kg: material.pricePerKg,
    spool_net_weight_g: material.spoolNetWeightG,
    supplier: material.supplier ?? null,
    color: material.color ?? null,
    failure_rate_bp: material.failureRateBp ?? null,
    notes: material.notes ?? null,
    archived_at: archivedAt(material.archived, existing, now),
  }
}

export function extraFromRow(row: ExtraRow): Extra {
  const parsed = extraSchema.parse({
    id: row.id,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    category: row.category ?? undefined,
    archived: row.archived_at !== null,
  })
  return parsed as unknown as Extra
}

export function extraToRow(
  extra: Extra,
  workspaceId: string,
  existing?: WithArchivedAt,
  now = new Date().toISOString(),
): TablesInsert<'extras'> {
  return {
    id: extra.id,
    workspace_id: workspaceId,
    name: extra.name,
    amount: extra.amount,
    unit: extra.unit,
    category: extra.category ?? null,
    archived_at: archivedAt(extra.archived, existing, now),
  }
}

export function quoteFromRow(row: QuoteRow): Quote {
  const parsed = quoteSchema.parse({
    id: row.id,
    name: row.name,
    quoteDate: row.quote_date,
    customer: row.customer ?? undefined,
    locale: row.locale,
    status: row.status,
    lines: row.lines,
    job: row.job,
    pricing: row.pricing,
    snapshot: row.snapshot ?? undefined,
    result: row.result ?? undefined,
    engineVersion: row.engine_version ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived_at !== null,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
  })
  return parsed as unknown as Quote
}

export function quoteToRow(
  quote: Quote,
  workspaceId: string,
  existing?: WithArchivedAt,
  now = new Date().toISOString(),
): TablesInsert<'quotes'> {
  if (quote.status === 'draft') {
    throw new Error('draft_quotes_are_local_only')
  }

  return {
    id: quote.id,
    workspace_id: workspaceId,
    status: quote.status,
    name: quote.name,
    customer: quote.customer ?? null,
    quote_date: quote.quoteDate,
    locale: quote.locale,
    lines: toJson(quote.lines),
    job: toJson(quote.job),
    pricing: toJson(quote.pricing),
    snapshot: quote.snapshot === undefined ? null : toJson(quote.snapshot),
    result: quote.result === undefined ? null : toJson(quote.result),
    engine_version: quote.engineVersion ?? null,
    schema_version: SCHEMA_VERSION,
    created_at: quote.createdAt,
    archived_at: archivedAt(quote.archived === true, existing, now),
  }
}

export interface ConfigRows {
  settings: SettingsRow
  tariffs: TariffRow[]
  printers: PrinterRow[]
  materials: MaterialRow[]
  extras: ExtraRow[]
}

export function configFromRows(rows: ConfigRows): CostConfig {
  const parsed = configSchema.parse({
    settings: settingsFromRow(rows.settings, rows.tariffs),
    printers: rows.printers
      .filter((printer) => printer.deleted_at === null)
      .map(printerFromRow),
    materials: rows.materials
      .filter((material) => material.deleted_at === null)
      .map(materialFromRow),
    extras: rows.extras.filter((extra) => extra.deleted_at === null).map(extraFromRow),
  })
  return parsed as unknown as CostConfig
}
