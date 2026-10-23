import { z } from 'zod'
import { MATERIAL_FAMILIES } from '@/domain/types'
import type { AppData } from './storage'

const integer = z.number().int()
const nonNegativeInteger = integer.nonnegative()
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timestampString = z.string().min(1)

const powerProfileSchema = z.object({
  avgWatts: nonNegativeInteger,
  source: z.enum(['measured', 'estimated', 'vendor']),
  note: z.string().optional(),
})

const powerProfilesSchema = z.object(
  Object.fromEntries(MATERIAL_FAMILIES.map((family) => [family, powerProfileSchema.optional()])),
)

export const printerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  model: z.string().min(1),
  purchasePrice: nonNegativeInteger,
  residualValueBp: nonNegativeInteger,
  expectedLifeHours: integer.positive(),
  maintenancePerHour: nonNegativeInteger,
  startupMinutes: nonNegativeInteger,
  multicolor: z.boolean(),
  buildVolumeMm: z.tuple([nonNegativeInteger, nonNegativeInteger, nonNegativeInteger]),
  ratedPowerW: nonNegativeInteger,
  powerProfiles: powerProfilesSchema.default({}),
  defaultAvgWatts: nonNegativeInteger,
  energyTariffId: z.string().optional(),
  notes: z.string().optional(),
  archived: z.boolean(),
})

export const materialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  family: z.enum(MATERIAL_FAMILIES),
  pricePerKg: nonNegativeInteger,
  spoolNetWeightG: integer.positive(),
  supplier: z.string().optional(),
  color: z.string().optional(),
  failureRateBp: nonNegativeInteger.optional(),
  notes: z.string().optional(),
  archived: z.boolean(),
})

export const tariffSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  pricePerKWh: nonNegativeInteger,
  effectiveFrom: dateString,
  notes: z.string().optional(),
})

export const extraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: nonNegativeInteger,
  unit: z.enum(['perUnit', 'perJob']),
  category: z.string().optional(),
  archived: z.boolean(),
})

export const settingsSchema = z.object({
  currency: z.literal('EUR'),
  locale: z.literal('it-IT'),
  tariffs: z.array(tariffSchema),
  laborRatePerHour: nonNegativeInteger,
  failureRateBp: nonNegativeInteger,
  timeOverheadBp: nonNegativeInteger,
  pricingMode: z.enum(['markup', 'margin']),
  markupBp: nonNegativeInteger,
  marginBp: nonNegativeInteger,
  roundingStep: nonNegativeInteger,
  roundingMode: z.enum(['up', 'nearest', 'down']),
  vatMode: z.enum(['none', 'excluded', 'included']),
  vatRateBp: nonNegativeInteger,
  allocationMode: z.enum(['proportional', 'equalPerUnit']),
  onboardingComplete: z.boolean(),
})

export const configSchema = z.object({
  settings: settingsSchema,
  printers: z.array(printerSchema),
  materials: z.array(materialSchema),
  extras: z.array(extraSchema),
})

export const materialUsageSchema = z.object({
  materialId: z.string().min(1),
  grams: nonNegativeInteger,
})

export const lineOverridesSchema = z.object({
  powerOverrideW: nonNegativeInteger.optional(),
  energyOverrideWh: nonNegativeInteger.optional(),
  failureRateBp: nonNegativeInteger.optional(),
})

export const printLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  printerId: z.string().min(1),
  timeSeconds: nonNegativeInteger,
  materials: z.array(materialUsageSchema),
  quantity: integer.positive(),
  finishingSecondsPerUnit: nonNegativeInteger,
  extraIds: z.array(z.string()),
  overrides: lineOverridesSchema,
  notes: z.string().optional(),
})

export const jobCostsSchema = z.object({
  setupSeconds: nonNegativeInteger,
  designSeconds: nonNegativeInteger,
  extraIds: z.array(z.string()),
  notes: z.string().optional(),
})

export const quotePricingSchema = z.object({
  mode: z.enum(['markup', 'margin']),
  markupBp: nonNegativeInteger,
  marginBp: nonNegativeInteger,
  roundingStep: nonNegativeInteger,
  roundingMode: z.enum(['up', 'nearest', 'down']),
  discountBp: nonNegativeInteger,
  vatMode: z.enum(['none', 'excluded', 'included']),
  vatRateBp: nonNegativeInteger,
})

export const snapshotSchema = z.object({
  config: configSchema,
  capturedAt: timestampString,
  engineVersion: z.string().min(1),
})

export const quoteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quoteDate: dateString,
  customer: z.string().optional(),
  status: z.enum(['draft', 'saved']),
  lines: z.array(printLineSchema),
  job: jobCostsSchema,
  pricing: quotePricingSchema,
  snapshot: snapshotSchema.optional(),
  result: z.unknown().optional(),
  engineVersion: z.string().optional(),
  createdAt: timestampString,
  updatedAt: timestampString,
  archived: z.boolean().optional(),
})

export const appDataSchema = z.object({
  schemaVersion: z.literal(1),
  config: configSchema,
  quotes: z.array(quoteSchema),
  draft: quoteSchema,
})

export const exportEnvelopeSchema = z.object({
  app: z.string(),
  schemaVersion: z.number().int(),
  exportedAt: timestampString,
  data: appDataSchema,
})

export type ParsedAppData = z.infer<typeof appDataSchema>

export function parseAppData(raw: unknown): AppData {
  const maybeEnvelope = exportEnvelopeSchema.safeParse(raw)
  if (maybeEnvelope.success) {
    if (maybeEnvelope.data.app !== 'LayerCost' && maybeEnvelope.data.app !== '3dCosts') {
      throw new Error('Il file non è un backup di LayerCost.')
    }
    return maybeEnvelope.data.data as unknown as AppData
  }

  const direct = appDataSchema.safeParse(raw)
  if (direct.success) {
    return direct.data as unknown as AppData
  }

  const schemaVersion =
    typeof raw === 'object' && raw !== null && 'schemaVersion' in raw
      ? (raw as { schemaVersion?: unknown }).schemaVersion
      : undefined
  if (typeof schemaVersion === 'number' && schemaVersion > 1) {
    throw new Error('Il backup è stato creato con una versione più recente di LayerCost.')
  }

  throw new Error('Il file di backup non è valido o è incompleto.')
}
