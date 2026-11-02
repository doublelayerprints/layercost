import type { Printer } from '@/domain/types'
import type { Locale } from '@/i18n'
import { asWatts, euroToMicro, percentToBp } from '@/domain/units'

/**
 * Static, lazy-loaded printer presets. Catalog entries are never persisted:
 * `catalogEntryToPrinter` copies the chosen values into a normal `Printer`.
 *
 * Prices are indicative EU prices reviewed in November 2026, including VAT and
 * excluding optional multicolor systems unless stated otherwise. Power profiles
 * are estimates; the rated power is informational and never enters the cost.
 */
export const CATALOG_REVIEWED_AT = '2026-11-02'

export const PRINTER_BRANDS = [
  'Bambu Lab',
  'Creality',
  'Anycubic',
  'Prusa',
  'Elegoo',
  'FLSUN',
  'Sovol',
  'QIDI',
] as const

export type PrinterBrand = (typeof PRINTER_BRANDS)[number]

export type CatalogSource = 'official' | 'retailer' | 'aggregator'
export type CatalogConfidence = 'high' | 'medium' | 'low'

export interface LocalizedText {
  it: string
  en: string
}

export interface CatalogPowerProfiles {
  PLA: number
  PETG: number
  ABS: number
  ASA: number
  default: number
}

export interface PrinterCatalogEntry {
  id: string
  brand: PrinterBrand
  name: string
  /** Must match the slicer `printer_model` whenever the slicer exposes one. */
  model: string
  purchasePrice: ReturnType<typeof euroToMicro>
  residualValueBp: ReturnType<typeof percentToBp>
  expectedLifeHours: number
  maintenancePerHour: ReturnType<typeof euroToMicro>
  startupMinutes: number
  multicolor: boolean
  multicolorReady: boolean
  enclosed: boolean
  buildVolumeMm: [number, number, number]
  ratedPowerW: number
  avgWatts: CatalogPowerProfiles
  notes: LocalizedText
  source: CatalogSource
  confidence: CatalogConfidence
}

interface CatalogEntryInput extends Omit<
  PrinterCatalogEntry,
  'purchasePrice' | 'residualValueBp' | 'maintenancePerHour'
> {
  priceEur: number
  residualPercent: number
  maintenanceEurPerHour: number
}

function entry({
  priceEur,
  residualPercent,
  maintenanceEurPerHour,
  ...rest
}: CatalogEntryInput): PrinterCatalogEntry {
  return {
    ...rest,
    purchasePrice: euroToMicro(priceEur),
    residualValueBp: percentToBp(residualPercent),
    maintenancePerHour: euroToMicro(maintenanceEurPerHour),
  }
}

function text(it: string, en: string): LocalizedText {
  return { it, en }
}

export const PRINTER_CATALOG: readonly PrinterCatalogEntry[] = [
  // Bambu Lab — EU store prices, November 2026. P1P and X1 Carbon are discontinued.
  entry({
    id: 'bambu-a1-mini',
    brand: 'Bambu Lab',
    name: 'A1 mini',
    model: 'Bambu Lab A1 mini',
    priceEur: 179,
    residualPercent: 20,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [180, 180, 180],
    ratedPowerW: 300,
    avgWatts: { PLA: 70, PETG: 85, ABS: 130, ASA: 130, default: 100 },
    notes: text(
      'Prezzo base senza AMS Lite; AMS Lite opzionale. Potenze medie stimate, verifica il consumo reale.',
      'Base price without AMS Lite; AMS Lite optional. Average power estimated, measure actual consumption.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-a1',
    brand: 'Bambu Lab',
    name: 'A1',
    model: 'Bambu Lab A1',
    priceEur: 239,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 350,
    avgWatts: { PLA: 90, PETG: 105, ABS: 150, ASA: 150, default: 120 },
    notes: text(
      'Prezzo base senza AMS Lite; AMS Lite opzionale. Potenze medie stimate, verifica il consumo reale.',
      'Base price without AMS Lite; AMS Lite optional. Average power estimated, measure actual consumption.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-p1p',
    brand: 'Bambu Lab',
    name: 'P1P',
    model: 'Bambu Lab P1P',
    priceEur: 249,
    residualPercent: 15,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 1000,
    avgWatts: { PLA: 100, PETG: 120, ABS: 180, ASA: 180, default: 140 },
    notes: text(
      'Fuori listino: prezzo indicativo dell’usato. AMS 2 Pro opzionale. Potenze medie stimate.',
      'Discontinued: indicative used price. AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'aggregator',
    confidence: 'low',
  }),
  entry({
    id: 'bambu-p1s',
    brand: 'Bambu Lab',
    name: 'P1S',
    model: 'Bambu Lab P1S',
    priceEur: 349,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 1000,
    avgWatts: { PLA: 110, PETG: 130, ABS: 200, ASA: 200, default: 150 },
    notes: text(
      'Prezzo base senza AMS 2 Pro; AMS 2 Pro opzionale. Potenze medie stimate.',
      'Base price without AMS 2 Pro; AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-x1-carbon',
    brand: 'Bambu Lab',
    name: 'X1 Carbon',
    model: 'Bambu Lab X1 Carbon',
    priceEur: 699,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 1000,
    avgWatts: { PLA: 120, PETG: 140, ABS: 210, ASA: 210, default: 160 },
    notes: text(
      'Fuori listino: prezzo indicativo dell’usato. AMS 2 Pro opzionale. Potenze medie stimate.',
      'Discontinued: indicative used price. AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'aggregator',
    confidence: 'low',
  }),
  entry({
    id: 'bambu-p2s',
    brand: 'Bambu Lab',
    name: 'P2S',
    model: 'Bambu Lab P2S',
    priceEur: 449,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 1000,
    avgWatts: { PLA: 120, PETG: 140, ABS: 210, ASA: 210, default: 160 },
    notes: text(
      'Prezzo base senza AMS 2 Pro; AMS 2 Pro opzionale. Potenze medie stimate.',
      'Base price without AMS 2 Pro; AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-x2d',
    brand: 'Bambu Lab',
    name: 'X2D',
    model: 'Bambu Lab X2D',
    priceEur: 549,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [256, 256, 260],
    ratedPowerW: 1200,
    avgWatts: { PLA: 130, PETG: 150, ABS: 220, ASA: 220, default: 170 },
    notes: text(
      'Doppio ugello; volume riferito all’ugello principale. Prezzo base senza AMS 2 Pro; AMS 2 Pro opzionale. Potenze medie stimate.',
      'Dual nozzle; volume refers to the main nozzle. Base price without AMS 2 Pro; AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-a2l',
    brand: 'Bambu Lab',
    name: 'A2L',
    model: 'Bambu Lab A2L',
    priceEur: 349,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [330, 320, 325],
    ratedPowerW: 500,
    avgWatts: { PLA: 110, PETG: 130, ABS: 190, ASA: 190, default: 150 },
    notes: text(
      'Prezzo base senza AMS Lite; AMS Lite opzionale. Potenze medie stimate.',
      'Base price without AMS Lite; AMS Lite optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-h2d',
    brand: 'Bambu Lab',
    name: 'H2D',
    model: 'Bambu Lab H2D',
    priceEur: 1399,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.03,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [325, 320, 325],
    ratedPowerW: 2200,
    avgWatts: { PLA: 180, PETG: 220, ABS: 320, ASA: 320, default: 250 },
    notes: text(
      'Doppio ugello. Prezzo base senza AMS 2 Pro; AMS 2 Pro opzionale. Potenze medie stimate.',
      'Dual nozzle. Base price without AMS 2 Pro; AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-h2s',
    brand: 'Bambu Lab',
    name: 'H2S',
    model: 'Bambu Lab H2S',
    priceEur: 999,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.03,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [340, 320, 340],
    ratedPowerW: 2200,
    avgWatts: { PLA: 160, PETG: 190, ABS: 280, ASA: 280, default: 220 },
    notes: text(
      'Prezzo base senza AMS 2 Pro; AMS 2 Pro opzionale. Potenze medie stimate.',
      'Base price without AMS 2 Pro; AMS 2 Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'bambu-h2c',
    brand: 'Bambu Lab',
    name: 'H2C',
    model: 'Bambu Lab H2C',
    priceEur: 1799,
    residualPercent: 20,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.03,
    startupMinutes: 3,
    multicolor: true,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [330, 320, 325],
    ratedPowerW: 2200,
    avgWatts: { PLA: 180, PETG: 220, ABS: 320, ASA: 320, default: 250 },
    notes: text(
      'AMS 2 Pro inclusa nella versione AMS Combo. Doppio ugello. Potenze medie stimate.',
      'AMS 2 Pro included in the AMS Combo version. Dual nozzle. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),

  // Creality — street prices, November 2026.
  entry({
    id: 'creality-ender-3',
    brand: 'Creality',
    name: 'Ender-3',
    model: 'Creality Ender-3',
    priceEur: 179,
    residualPercent: 10,
    expectedLifeHours: 8000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [220, 220, 250],
    ratedPowerW: 350,
    avgWatts: { PLA: 70, PETG: 85, ABS: 140, ASA: 140, default: 110 },
    notes: text(
      'Fuori listino: prezzo indicativo dell’usato. Bedslinger aperta. Potenze medie stimate.',
      'Discontinued: indicative used price. Open bedslinger. Average power estimated.',
    ),
    source: 'aggregator',
    confidence: 'low',
  }),
  entry({
    id: 'creality-ender-3-v2',
    brand: 'Creality',
    name: 'Ender-3 V2',
    model: 'Creality Ender-3 V2',
    priceEur: 199,
    residualPercent: 10,
    expectedLifeHours: 8000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [220, 220, 250],
    ratedPowerW: 350,
    avgWatts: { PLA: 70, PETG: 85, ABS: 140, ASA: 140, default: 110 },
    notes: text(
      'Bedslinger aperta. Potenze medie stimate, verifica il consumo reale.',
      'Open bedslinger. Average power estimated, measure actual consumption.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'creality-ender-3-v3-ke',
    brand: 'Creality',
    name: 'Ender-3 V3 KE',
    model: 'Creality Ender-3 V3 KE',
    priceEur: 229,
    residualPercent: 15,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [220, 220, 250],
    ratedPowerW: 350,
    avgWatts: { PLA: 90, PETG: 110, ABS: 170, ASA: 170, default: 130 },
    notes: text(
      'Bedslinger aperta ad alta velocità. Potenze medie stimate.',
      'High-speed open bedslinger. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'creality-ender-3-s1-pro',
    brand: 'Creality',
    name: 'Ender-3 S1 Pro',
    model: 'Creality Ender-3 S1 Pro',
    priceEur: 279,
    residualPercent: 15,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [220, 220, 270],
    ratedPowerW: 350,
    avgWatts: { PLA: 85, PETG: 100, ABS: 160, ASA: 160, default: 120 },
    notes: text(
      'Bedslinger aperta, estrusore direct drive. Potenze medie stimate.',
      'Open bedslinger with direct drive extruder. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'creality-k1',
    brand: 'Creality',
    name: 'K1',
    model: 'Creality K1',
    priceEur: 349,
    residualPercent: 20,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: false,
    enclosed: true,
    buildVolumeMm: [220, 220, 250],
    ratedPowerW: 600,
    avgWatts: { PLA: 110, PETG: 130, ABS: 200, ASA: 200, default: 150 },
    notes: text(
      'Chiusa, CoreXY. Potenze medie stimate.',
      'Enclosed CoreXY. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'creality-k1-max',
    brand: 'Creality',
    name: 'K1 Max',
    model: 'Creality K1 Max',
    priceEur: 599,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: false,
    enclosed: true,
    buildVolumeMm: [300, 300, 300],
    ratedPowerW: 1000,
    avgWatts: { PLA: 130, PETG: 150, ABS: 230, ASA: 230, default: 180 },
    notes: text(
      'Chiusa, CoreXY. Potenze medie stimate.',
      'Enclosed CoreXY. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'creality-k2-plus',
    brand: 'Creality',
    name: 'K2 Plus',
    model: 'Creality K2 Plus',
    priceEur: 999,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.03,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [350, 350, 350],
    ratedPowerW: 1200,
    avgWatts: { PLA: 150, PETG: 180, ABS: 270, ASA: 270, default: 210 },
    notes: text(
      'Chiusa, CoreXY; CFS opzionale. Potenze medie stimate.',
      'Enclosed CoreXY; CFS optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),

  // Anycubic — street prices, November 2026.
  entry({
    id: 'anycubic-kobra-2-pro',
    brand: 'Anycubic',
    name: 'Kobra 2 Pro',
    model: 'Anycubic Kobra 2 Pro',
    priceEur: 219,
    residualPercent: 15,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [220, 220, 250],
    ratedPowerW: 350,
    avgWatts: { PLA: 80, PETG: 95, ABS: 150, ASA: 150, default: 120 },
    notes: text(
      'Bedslinger aperta. Potenze medie stimate.',
      'Open bedslinger. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'anycubic-kobra-3-max',
    brand: 'Anycubic',
    name: 'Kobra 3 Max',
    model: 'Anycubic Kobra 3 Max',
    priceEur: 449,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [420, 420, 500],
    ratedPowerW: 800,
    avgWatts: { PLA: 130, PETG: 150, ABS: 230, ASA: 230, default: 180 },
    notes: text(
      'ACE Pro opzionale. Potenze medie stimate.',
      'ACE Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'anycubic-kobra-s1',
    brand: 'Anycubic',
    name: 'Kobra S1',
    model: 'Anycubic Kobra S1',
    priceEur: 349,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [250, 250, 250],
    ratedPowerW: 600,
    avgWatts: { PLA: 120, PETG: 140, ABS: 210, ASA: 210, default: 160 },
    notes: text(
      'Chiusa; ACE Pro opzionale. Potenze medie stimate.',
      'Enclosed; ACE Pro optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),

  // Prusa Research — kit prices, November 2026.
  entry({
    id: 'prusa-mk4s',
    brand: 'Prusa',
    name: 'MK4S',
    model: 'Prusa MK4S',
    priceEur: 1099,
    residualPercent: 25,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: false,
    buildVolumeMm: [250, 210, 220],
    ratedPowerW: 350,
    avgWatts: { PLA: 90, PETG: 105, ABS: 160, ASA: 160, default: 120 },
    notes: text(
      'Prezzo del kit da assemblare; la versione assemblata costa di più. MMU3 opzionale. Potenze medie stimate.',
      'Kit price; the assembled version costs more. MMU3 optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'prusa-core-one',
    brand: 'Prusa',
    name: 'Core One',
    model: 'Prusa Core One',
    priceEur: 1199,
    residualPercent: 25,
    expectedLifeHours: 15000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [250, 210, 270],
    ratedPowerW: 350,
    avgWatts: { PLA: 100, PETG: 120, ABS: 180, ASA: 180, default: 140 },
    notes: text(
      'Prezzo del kit da assemblare; chiusa, CoreXY. MMU3 opzionale. Potenze medie stimate.',
      'Kit price; enclosed CoreXY. MMU3 optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),
  entry({
    id: 'prusa-mini-plus',
    brand: 'Prusa',
    name: 'MINI+',
    model: 'Prusa MINI+',
    priceEur: 459,
    residualPercent: 25,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 3,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [180, 180, 180],
    ratedPowerW: 240,
    avgWatts: { PLA: 70, PETG: 85, ABS: 130, ASA: 130, default: 100 },
    notes: text(
      'Prezzo del kit da assemblare. Potenze medie stimate.',
      'Kit price. Average power estimated.',
    ),
    source: 'official',
    confidence: 'high',
  }),

  // Elegoo — street prices, November 2026.
  entry({
    id: 'elegoo-neptune-4-pro',
    brand: 'Elegoo',
    name: 'Neptune 4 Pro',
    model: 'Elegoo Neptune 4 Pro',
    priceEur: 259,
    residualPercent: 15,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [225, 225, 265],
    ratedPowerW: 350,
    avgWatts: { PLA: 85, PETG: 100, ABS: 160, ASA: 160, default: 120 },
    notes: text(
      'Bedslinger aperta. Potenze medie stimate.',
      'Open bedslinger. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
  entry({
    id: 'elegoo-centauri-carbon',
    brand: 'Elegoo',
    name: 'Centauri Carbon',
    model: 'Elegoo Centauri Carbon',
    priceEur: 299,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: false,
    enclosed: true,
    buildVolumeMm: [256, 256, 256],
    ratedPowerW: 350,
    avgWatts: { PLA: 100, PETG: 120, ABS: 180, ASA: 180, default: 140 },
    notes: text(
      'Chiusa, CoreXY. Potenze medie stimate.',
      'Enclosed CoreXY. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),

  // FLSUN — discontinued delta, indicative used price.
  entry({
    id: 'flsun-super-racer',
    brand: 'FLSUN',
    name: 'Super Racer',
    model: 'FLSUN Super Racer',
    priceEur: 299,
    residualPercent: 15,
    expectedLifeHours: 10000,
    maintenanceEurPerHour: 0.01,
    startupMinutes: 5,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [260, 260, 330],
    ratedPowerW: 350,
    avgWatts: { PLA: 90, PETG: 105, ABS: 160, ASA: 160, default: 120 },
    notes: text(
      'Delta aperta, volume cilindrico Ø260 × 330 mm. Fuori listino: prezzo indicativo. Potenze medie stimate.',
      'Open delta, cylindrical volume Ø260 × 330 mm. Discontinued: indicative price. Average power estimated.',
    ),
    source: 'aggregator',
    confidence: 'low',
  }),

  // Sovol — street price, November 2026.
  entry({
    id: 'sovol-sv08',
    brand: 'Sovol',
    name: 'SV08',
    model: 'Sovol SV08',
    priceEur: 489,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.02,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: false,
    enclosed: false,
    buildVolumeMm: [350, 350, 345],
    ratedPowerW: 600,
    avgWatts: { PLA: 130, PETG: 150, ABS: 230, ASA: 230, default: 180 },
    notes: text('CoreXY aperta. Potenze medie stimate.', 'Open CoreXY. Average power estimated.'),
    source: 'official',
    confidence: 'medium',
  }),

  // QIDI — street price, November 2026.
  entry({
    id: 'qidi-plus4',
    brand: 'QIDI',
    name: 'Plus4',
    model: 'QIDI Plus4',
    priceEur: 599,
    residualPercent: 20,
    expectedLifeHours: 12000,
    maintenanceEurPerHour: 0.03,
    startupMinutes: 4,
    multicolor: false,
    multicolorReady: true,
    enclosed: true,
    buildVolumeMm: [305, 305, 280],
    ratedPowerW: 600,
    avgWatts: { PLA: 140, PETG: 165, ABS: 250, ASA: 250, default: 190 },
    notes: text(
      'Chiusa; QIDI Box opzionale. Potenze medie stimate.',
      'Enclosed; QIDI Box optional. Average power estimated.',
    ),
    source: 'official',
    confidence: 'medium',
  }),
]

const POWER_PROFILE_NOTE: LocalizedText = {
  it: 'Stima indicativa del preset: misura il consumo reale con una presa intelligente.',
  en: 'Indicative preset estimate: measure actual consumption with a smart plug.',
}

/** Copies a catalog entry into a normal editable printer. */
export function catalogEntryToPrinter(
  catalogEntry: PrinterCatalogEntry,
  locale: Locale,
): Omit<Printer, 'id'> {
  const profileNote = POWER_PROFILE_NOTE[locale]
  return {
    name: catalogEntry.name,
    model: catalogEntry.model,
    purchasePrice: catalogEntry.purchasePrice,
    residualValueBp: catalogEntry.residualValueBp,
    expectedLifeHours: catalogEntry.expectedLifeHours,
    maintenancePerHour: catalogEntry.maintenancePerHour,
    startupMinutes: catalogEntry.startupMinutes,
    multicolor: catalogEntry.multicolor,
    buildVolumeMm: [
      catalogEntry.buildVolumeMm[0],
      catalogEntry.buildVolumeMm[1],
      catalogEntry.buildVolumeMm[2],
    ],
    ratedPowerW: catalogEntry.ratedPowerW,
    powerProfiles: {
      PLA: {
        avgWatts: asWatts(catalogEntry.avgWatts.PLA),
        source: 'estimated',
        note: profileNote,
      },
      PETG: {
        avgWatts: asWatts(catalogEntry.avgWatts.PETG),
        source: 'estimated',
        note: profileNote,
      },
      ABS: {
        avgWatts: asWatts(catalogEntry.avgWatts.ABS),
        source: 'estimated',
        note: profileNote,
      },
      ASA: {
        avgWatts: asWatts(catalogEntry.avgWatts.ASA),
        source: 'estimated',
        note: profileNote,
      },
    },
    defaultAvgWatts: asWatts(catalogEntry.avgWatts.default),
    notes: catalogEntry.notes[locale],
    archived: false,
  }
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeCatalogModel(value: string): string {
  return normalizeSearchText(value)
}

export type BrandFilter = PrinterBrand | 'all'

export function filterCatalogEntries(
  entries: readonly PrinterCatalogEntry[],
  query: string,
  brand: BrandFilter,
): PrinterCatalogEntry[] {
  const normalizedQuery = normalizeSearchText(query)
  return entries.filter((catalogEntry) => {
    if (brand !== 'all' && catalogEntry.brand !== brand) return false
    if (!normalizedQuery) return true
    return normalizeSearchText(
      `${catalogEntry.brand} ${catalogEntry.name} ${catalogEntry.model}`,
    ).includes(normalizedQuery)
  })
}

/** Presence is advisory: users may add several units of the same model. */
export function isCatalogEntryAdded(
  printers: readonly Printer[],
  catalogEntry: PrinterCatalogEntry,
): boolean {
  const model = normalizeCatalogModel(catalogEntry.model)
  return printers.some(
    (printer) => !printer.archived && normalizeCatalogModel(printer.model) === model,
  )
}
