import type { BasisPoints, Centigrams, MicroEur, Seconds, Watts, Wh } from './units'

export const MATERIAL_FAMILIES = [
  'PLA',
  'PETG',
  'TPU',
  'ABS',
  'ASA',
  'PLA_CF',
  'PETG_CF',
  'PVA',
  'PA',
  'PC',
  'HIPS',
  'OTHER',
] as const

export type MaterialFamily = (typeof MATERIAL_FAMILIES)[number]

export type PowerSource = 'measured' | 'estimated' | 'vendor'

export interface PowerProfile {
  avgWatts: Watts
  source: PowerSource
  note?: string
}

export interface Printer {
  id: string
  name: string
  model: string
  purchasePrice: MicroEur
  residualValueBp: BasisPoints
  expectedLifeHours: number
  maintenancePerHour: MicroEur
  startupMinutes: number
  multicolor: boolean
  buildVolumeMm: [number, number, number]
  ratedPowerW: number
  powerProfiles: Partial<Record<MaterialFamily, PowerProfile>>
  defaultAvgWatts: Watts
  energyTariffId?: string
  notes?: string
  archived: boolean
}

export interface Material {
  id: string
  name: string
  family: MaterialFamily
  pricePerKg: MicroEur
  spoolNetWeightG: number
  supplier?: string
  color?: string
  failureRateBp?: BasisPoints
  notes?: string
  archived: boolean
}

export interface EnergyTariff {
  id: string
  label: string
  pricePerKWh: MicroEur
  effectiveFrom: string
  notes?: string
}

export interface Extra {
  id: string
  name: string
  amount: MicroEur
  unit: 'perUnit' | 'perJob'
  category?: string
  archived: boolean
}

export interface Settings {
  currency: 'EUR'
  locale: 'it-IT'
  tariffs: EnergyTariff[]
  laborRatePerHour: MicroEur
  failureRateBp: BasisPoints
  timeOverheadBp: BasisPoints
  pricingMode: 'markup' | 'margin'
  markupBp: BasisPoints
  marginBp: BasisPoints
  roundingStep: MicroEur
  roundingMode: 'up' | 'nearest' | 'down'
  vatMode: 'none' | 'excluded' | 'included'
  vatRateBp: BasisPoints
  allocationMode: 'proportional' | 'equalPerUnit'
  onboardingComplete: boolean
}

export interface CostConfig {
  settings: Settings
  printers: Printer[]
  materials: Material[]
  extras: Extra[]
}

export interface MaterialUsage {
  materialId: string
  grams: Centigrams
}

export interface LineOverrides {
  powerOverrideW?: Watts
  energyOverrideWh?: Wh
  failureRateBp?: BasisPoints
}

export interface PrintLine {
  id: string
  name: string
  printerId: string
  timeSeconds: Seconds
  materials: MaterialUsage[]
  quantity: number
  finishingSecondsPerUnit: Seconds
  extraIds: string[]
  overrides: LineOverrides
  notes?: string
}

export interface JobCosts {
  setupSeconds: Seconds
  designSeconds: Seconds
  extraIds: string[]
  notes?: string
}

export interface QuotePricing {
  mode: 'markup' | 'margin'
  markupBp: BasisPoints
  marginBp: BasisPoints
  roundingStep: MicroEur
  roundingMode: 'up' | 'nearest' | 'down'
  discountBp: BasisPoints
  vatMode: 'none' | 'excluded' | 'included'
  vatRateBp: BasisPoints
}

export interface MaterialCostDetail {
  materialId: string
  name: string
  grams: Centigrams
  cost: MicroEur
}

export interface ExtraCostDetail {
  extraId: string
  name: string
  amount: MicroEur
}

export interface LineResult {
  lineId: string
  name: string
  printerId: string
  printerName: string
  quantity: number
  effectiveSeconds: Seconds
  avgWatts: Watts
  energyWh: Wh
  tariffLabel: string
  material: MicroEur
  energy: MicroEur
  depreciation: MicroEur
  maintenance: MicroEur
  labor: MicroEur
  extras: MicroEur
  failure: MicroEur
  failureRateBp: BasisPoints
  directUnitCost: MicroEur
  directLineCost: MicroEur
  allocatedFixed: MicroEur
  fullyLoadedLineCost: MicroEur
  fullyLoadedUnitCost: MicroEur
  priceCents: number
  pricePerUnitCents: number
  materialDetails: MaterialCostDetail[]
  extraDetails: ExtraCostDetail[]
}

export interface QuoteResult {
  engineVersion: string
  quoteDate: string
  lines: LineResult[]
  directTotal: MicroEur
  jobLabor: MicroEur
  jobExtras: MicroEur
  jobFixedTotal: MicroEur
  totalCost: MicroEur
  rawPrice: MicroEur
  discount: MicroEur
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
  effectiveMarginBp: BasisPoints
  jobLaborDetails: {
    setup: MicroEur
    design: MicroEur
  }
  jobExtraDetails: ExtraCostDetail[]
}

export interface QuoteSnapshot {
  config: CostConfig
  capturedAt: string
  engineVersion: string
}

export type QuoteLocale = 'it' | 'en'

export interface Quote {
  id: string
  name: string
  quoteDate: string
  customer?: string
  locale: QuoteLocale
  status: 'draft' | 'saved'
  lines: PrintLine[]
  job: JobCosts
  pricing: QuotePricing
  snapshot?: QuoteSnapshot
  result?: QuoteResult
  engineVersion?: string
  createdAt: string
  updatedAt: string
  archived?: boolean
}

export type RoundingMode = QuotePricing['roundingMode']
export type PricingMode = QuotePricing['mode']
export type VatMode = QuotePricing['vatMode']
export type AllocationMode = Settings['allocationMode']
