import type {
  CostConfig,
  EnergyTariff,
  Extra,
  Material,
  PrintLine,
  Printer,
  QuoteLocale,
  Settings,
} from '@/domain/types'
import {
  asBasisPoints,
  asCentigrams,
  asSeconds,
  asWatts,
  euroToMicro,
  percentToBp,
} from '@/domain/units'
import { pricingFromSettings } from '@/domain/cost/quote'
import type { Quote } from '@/domain/types'
import { nowIso, todayIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'

export const SEED_TARIFF_ID = 'tariff-default'

const seedTariff: EnergyTariff = {
  id: SEED_TARIFF_ID,
  label: 'Tariffa attuale',
  pricePerKWh: euroToMicro(0.2),
  effectiveFrom: '2026-01-01',
  notes: 'Costo marginale indicativo. Aggiornalo con il prezzo della tua bolletta.',
}

const kobra3: Printer = {
  id: 'printer-kobra-3',
  name: 'Kobra 3',
  model: 'Anycubic Kobra 3',
  purchasePrice: euroToMicro(299),
  residualValueBp: percentToBp(20),
  expectedLifeHours: 15000,
  maintenancePerHour: euroToMicro(0.01),
  startupMinutes: 5,
  multicolor: false,
  buildVolumeMm: [250, 250, 260],
  ratedPowerW: 400,
  defaultAvgWatts: asWatts(200),
  powerProfiles: {
    PLA: {
      avgWatts: asWatts(190),
      source: 'estimated',
      note: 'Intervallo misurato 180–205 W in PLA.',
    },
    PETG: { avgWatts: asWatts(200), source: 'estimated' },
    TPU: { avgWatts: asWatts(180), source: 'estimated' },
    ABS: {
      avgWatts: asWatts(380),
      source: 'estimated',
      note: 'Test indicativo ~400 W con letto a 100 °C.',
    },
    ASA: {
      avgWatts: asWatts(380),
      source: 'estimated',
      note: 'Test indicativo ~400 W con letto a 100 °C.',
    },
    PLA_CF: { avgWatts: asWatts(210), source: 'estimated' },
    PETG_CF: { avgWatts: asWatts(220), source: 'estimated' },
    PVA: { avgWatts: asWatts(190), source: 'estimated' },
  },
  notes: 'Senza sistema multicolore. Prezzo di acquisto e potenza sono stime modificabili.',
  archived: false,
}

const kobraX: Printer = {
  id: 'printer-kobra-x',
  name: 'Kobra X',
  model: 'Anycubic Kobra X',
  purchasePrice: euroToMicro(449),
  residualValueBp: percentToBp(20),
  expectedLifeHours: 20000,
  maintenancePerHour: euroToMicro(0.01),
  startupMinutes: 5,
  multicolor: true,
  buildVolumeMm: [260, 260, 260],
  ratedPowerW: 1450,
  defaultAvgWatts: asWatts(230),
  powerProfiles: {
    PLA: {
      avgWatts: asWatts(220),
      source: 'estimated',
      note: 'Stima da verificare con una presa intelligente.',
    },
    PETG: { avgWatts: asWatts(230), source: 'estimated' },
    TPU: { avgWatts: asWatts(200), source: 'estimated' },
    ABS: {
      avgWatts: asWatts(420),
      source: 'estimated',
      note: 'Stima da verificare; letto a 100 °C.',
    },
    ASA: {
      avgWatts: asWatts(420),
      source: 'estimated',
      note: 'Stima da verificare; letto a 100 °C.',
    },
    PLA_CF: { avgWatts: asWatts(240), source: 'estimated' },
    PETG_CF: { avgWatts: asWatts(250), source: 'estimated' },
    PVA: { avgWatts: asWatts(220), source: 'estimated' },
  },
  notes: 'ACE 2 Pro, 4 colori nativi. Prezzo di acquisto e potenza sono stime modificabili.',
  archived: false,
}

function material(
  id: string,
  name: string,
  family: Material['family'],
  pricePerKg: number,
  options: Partial<Pick<Material, 'supplier' | 'color' | 'failureRateBp' | 'notes'>> = {},
): Material {
  return {
    id,
    name,
    family,
    pricePerKg: euroToMicro(pricePerKg),
    spoolNetWeightG: 1000,
    supplier: options.supplier ?? 'Generico',
    color: options.color,
    failureRateBp: options.failureRateBp,
    notes: options.notes,
    archived: false,
  }
}

const materials: Material[] = [
  material('material-pla', 'PLA', 'PLA', 20, {
    notes: 'Materiale di riferimento per la maggior parte delle stampe.',
  }),
  material('material-petg', 'PETG', 'PETG', 24, {
    notes: 'Più resistente e meno fragile del PLA.',
  }),
  material('material-tpu', 'TPU', 'TPU', 30, {
    notes: 'Flessibile; richiede velocità basse.',
  }),
  material('material-abs', 'ABS', 'ABS', 25, {
    failureRateBp: percentToBp(10),
    notes: 'Tasso guasti prudenziale per stampa su telaio aperto.',
  }),
  material('material-asa', 'ASA', 'ASA', 30, {
    failureRateBp: percentToBp(10),
    notes: 'Tasso guasti prudenziale per stampa su telaio aperto.',
  }),
  material('material-pla-cf', 'PLA-CF', 'PLA_CF', 35, {
    notes: 'Riempitivo in fibra di carbonio; ugello in acciaio consigliato.',
  }),
  material('material-petg-cf', 'PETG-CF', 'PETG_CF', 35, {
    notes: 'Riempitivo in fibra di carbonio; ugello in acciaio consigliato.',
  }),
  material('material-pva', 'PVA', 'PVA', 60, {
    notes: 'Supporti solubili in acqua.',
  }),
]

const extra = (
  id: string,
  name: string,
  amountEur: number,
  unit: Extra['unit'],
  category: string,
): Extra => ({
  id,
  name,
  amount: euroToMicro(amountEur),
  unit,
  category,
  archived: false,
})

const extras: Extra[] = [
  extra('extra-zip-bag', 'Sacchetto zip', 0.08, 'perUnit', 'Imballaggio'),
  extra('extra-box', 'Scatola', 0.4, 'perUnit', 'Imballaggio'),
  extra('extra-label', 'Etichetta', 0.03, 'perUnit', 'Imballaggio'),
  extra('extra-bubble-wrap', 'Imbottitura', 0.1, 'perUnit', 'Imballaggio'),
  extra('extra-shipping', 'Spedizione', 6, 'perJob', 'Spedizione'),
]

export const seedSettings: Settings = {
  currency: 'EUR',
  locale: 'it-IT',
  tariffs: [seedTariff],
  laborRatePerHour: euroToMicro(0),
  failureRateBp: percentToBp(5),
  timeOverheadBp: asBasisPoints(0),
  pricingMode: 'markup',
  markupBp: percentToBp(30),
  marginBp: percentToBp(25),
  roundingStep: euroToMicro(0.1),
  roundingMode: 'up',
  vatMode: 'none',
  vatRateBp: percentToBp(22),
  allocationMode: 'proportional',
  onboardingComplete: false,
}

export function createSeedConfig(): CostConfig {
  return {
    settings: structuredClone(seedSettings),
    printers: structuredClone([kobra3, kobraX]),
    materials: structuredClone(materials),
    extras: structuredClone(extras),
  }
}

export function createEmptyLine(config: CostConfig, overrides: Partial<PrintLine> = {}): PrintLine {
  const printer = config.printers.find((candidate) => !candidate.archived) ?? config.printers[0]
  const material = config.materials.find((candidate) => !candidate.archived) ?? config.materials[0]

  return {
    id: newId(),
    name: 'Stampa',
    printerId: overrides.printerId ?? printer?.id ?? '',
    timeSeconds: overrides.timeSeconds ?? asSeconds(0),
    materials:
      overrides.materials ??
      (material ? [{ materialId: material.id, grams: asCentigrams(0) }] : []),
    quantity: overrides.quantity ?? 1,
    finishingSecondsPerUnit: overrides.finishingSecondsPerUnit ?? asSeconds(0),
    extraIds: overrides.extraIds ?? [],
    overrides: overrides.overrides ?? {},
    notes: overrides.notes,
  }
}

export function createEmptyDraft(
  config: CostConfig,
  locale: QuoteLocale = 'it',
  date = new Date(),
): Quote {
  const now = nowIso(date)
  return {
    id: newId(),
    name: 'Nuovo preventivo',
    quoteDate: todayIsoDate(date),
    locale,
    status: 'draft',
    lines: [createEmptyLine(config)],
    job: {
      setupSeconds: asSeconds(0),
      designSeconds: asSeconds(0),
      extraIds: [],
    },
    pricing: pricingFromSettings(config.settings),
    createdAt: now,
    updatedAt: now,
  }
}

export const seedIds = {
  kobra3: kobra3.id,
  kobraX: kobraX.id,
  pla: 'material-pla',
  petg: 'material-petg',
  tariff: seedTariff.id,
  shipping: 'extra-shipping',
}
