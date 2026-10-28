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

/** Commercial discount. `amount` is a fixed amount off the discounted base. */
export type DiscountRule =
  | { mode: 'percent'; valueBp: BasisPoints }
  | { mode: 'amount'; amount: MicroEur }

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
  /** Discount on the whole line, applied after markup and before the quote discount. */
  discount?: DiscountRule
  /** Filament colour as #rrggbb. Presentation only: it never enters the cost. */
  color?: string
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
  /** Discount on the quote total, applied after line discounts. */
  discount?: DiscountRule
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
  /** Line-level discount applied before the quote discount. */
  discount: MicroEur
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
  /** Line discounts plus the quote-level discount, before rounding. */
  discount: MicroEur
  lineDiscountTotal: MicroEur
  quoteDiscount: MicroEur
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

/** Saved quotes stay editable until they are sent or completed. */
export type QuoteStatus = 'draft' | 'saved' | 'sent' | 'completed'

export interface Quote {
  id: string
  name: string
  quoteDate: string
  customer?: string
  locale: QuoteLocale
  status: QuoteStatus
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
