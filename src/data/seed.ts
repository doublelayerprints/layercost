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
import { EMPTY_DRAFT_NAMES, EMPTY_LINE_NAMES } from '@/lib/quote-defaults'

export const SEED_TARIFF_ID = 'tariff-default'

/**
 * Natural-language copy of the seed data, per document language (ADR-0036).
 * The IDs and every economic value are identical across locales: only names,
 * notes, categories and the supplier are translated. The seed applies once,
 * at first creation — existing data is never renamed when the language
 * changes.
 */
interface SeedCopy {
  tariff: { label: string; notes: string }
  kobra3: {
    notes: string
    plaProfile: string
    absProfile: string
    asaProfile: string
  }
  kobraX: {
    notes: string
    plaProfile: string
    absProfile: string
    asaProfile: string
  }
  materials: {
    supplier: string
    pla: string
    petg: string
    tpu: string
    abs: string
    asa: string
    plaCf: string
    petgCf: string
    pva: string
  }
  extras: {
    zipBag: string
    box: string
    label: string
    padding: string
    shipping: string
    packagingCategory: string
    shippingCategory: string
  }
}

const SEED_COPY: Record<QuoteLocale, SeedCopy> = {
  it: {
    tariff: {
      label: 'Tariffa attuale',
      notes: 'Costo marginale indicativo. Aggiornalo con il prezzo della tua bolletta.',
    },
    kobra3: {
      notes: 'Senza sistema multicolore. Prezzo di acquisto e potenza sono stime modificabili.',
      plaProfile: 'Intervallo misurato 180–205 W in PLA.',
      absProfile: 'Test indicativo ~400 W con letto a 100 °C.',
      asaProfile: 'Test indicativo ~400 W con letto a 100 °C.',
    },
    kobraX: {
      notes: 'ACE 2 Pro, 4 colori nativi. Prezzo di acquisto e potenza sono stime modificabili.',
      plaProfile: 'Stima da verificare con una presa intelligente.',
      absProfile: 'Stima da verificare; letto a 100 °C.',
      asaProfile: 'Stima da verificare; letto a 100 °C.',
    },
    materials: {
      supplier: 'Generico',
      pla: 'Materiale di riferimento per la maggior parte delle stampe.',
      petg: 'Più resistente e meno fragile del PLA.',
      tpu: 'Flessibile; richiede velocità basse.',
      abs: 'Tasso guasti prudenziale per stampa su telaio aperto.',
      asa: 'Tasso guasti prudenziale per stampa su telaio aperto.',
      plaCf: 'Riempitivo in fibra di carbonio; ugello in acciaio consigliato.',
      petgCf: 'Riempitivo in fibra di carbonio; ugello in acciaio consigliato.',
      pva: 'Supporti solubili in acqua.',
    },
    extras: {
      zipBag: 'Sacchetto zip',
      box: 'Scatola',
      label: 'Etichetta',
      padding: 'Imbottitura',
      shipping: 'Spedizione',
      packagingCategory: 'Imballaggio',
      shippingCategory: 'Spedizione',
    },
  },
  en: {
    tariff: {
      label: 'Current tariff',
      notes: 'Indicative marginal cost. Update it with the price from your energy bill.',
    },
    kobra3: {
      notes: 'No multicolor system. Purchase price and power are editable estimates.',
      plaProfile: 'Measured range 180–205 W in PLA.',
      absProfile: 'Indicative test ~400 W with a 100 °C bed.',
      asaProfile: 'Indicative test ~400 W with a 100 °C bed.',
    },
    kobraX: {
      notes: 'ACE 2 Pro, 4 native colors. Purchase price and power are editable estimates.',
      plaProfile: 'Estimate to verify with a smart plug.',
      absProfile: 'Estimate to verify; 100 °C bed.',
      asaProfile: 'Estimate to verify; 100 °C bed.',
    },
    materials: {
      supplier: 'Generic',
      pla: 'Reference material for most prints.',
      petg: 'Tougher and less brittle than PLA.',
      tpu: 'Flexible; requires low speeds.',
      abs: 'Prudent failure rate for open-frame printing.',
      asa: 'Prudent failure rate for open-frame printing.',
      plaCf: 'Carbon fiber filler; a hardened steel nozzle is recommended.',
      petgCf: 'Carbon fiber filler; a hardened steel nozzle is recommended.',
      pva: 'Water-soluble supports.',
    },
    extras: {
      zipBag: 'Zip bag',
      box: 'Box',
      label: 'Label',
      padding: 'Padding',
      shipping: 'Shipping',
      packagingCategory: 'Packaging',
      shippingCategory: 'Shipping',
    },
  },
}

function seedTariff(copy: SeedCopy): EnergyTariff {
  return {
    id: SEED_TARIFF_ID,
    label: copy.tariff.label,
    pricePerKWh: euroToMicro(0.2),
    effectiveFrom: '2026-01-01',
    notes: copy.tariff.notes,
  }
}

function kobra3(copy: SeedCopy): Printer {
  return {
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
        note: copy.kobra3.plaProfile,
      },
      PETG: { avgWatts: asWatts(200), source: 'estimated' },
      TPU: { avgWatts: asWatts(180), source: 'estimated' },
      ABS: {
        avgWatts: asWatts(380),
        source: 'estimated',
        note: copy.kobra3.absProfile,
      },
      ASA: {
        avgWatts: asWatts(380),
        source: 'estimated',
        note: copy.kobra3.asaProfile,
      },
      PLA_CF: { avgWatts: asWatts(210), source: 'estimated' },
      PETG_CF: { avgWatts: asWatts(220), source: 'estimated' },
      PVA: { avgWatts: asWatts(190), source: 'estimated' },
    },
    notes: copy.kobra3.notes,
    archived: false,
  }
}

function kobraX(copy: SeedCopy): Printer {
  return {
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
        note: copy.kobraX.plaProfile,
      },
      PETG: { avgWatts: asWatts(230), source: 'estimated' },
      TPU: { avgWatts: asWatts(200), source: 'estimated' },
      ABS: {
        avgWatts: asWatts(420),
        source: 'estimated',
        note: copy.kobraX.absProfile,
      },
      ASA: {
        avgWatts: asWatts(420),
        source: 'estimated',
        note: copy.kobraX.asaProfile,
      },
      PLA_CF: { avgWatts: asWatts(240), source: 'estimated' },
      PETG_CF: { avgWatts: asWatts(250), source: 'estimated' },
      PVA: { avgWatts: asWatts(220), source: 'estimated' },
    },
    notes: copy.kobraX.notes,
    archived: false,
  }
}

function material(
  id: string,
  name: string,
  family: Material['family'],
  pricePerKg: number,
  supplier: string,
  options: Partial<Pick<Material, 'supplier' | 'color' | 'failureRateBp' | 'notes'>> = {},
): Material {
  return {
    id,
    name,
    family,
    pricePerKg: euroToMicro(pricePerKg),
    spoolNetWeightG: 1000,
    supplier: options.supplier ?? supplier,
    color: options.color,
    failureRateBp: options.failureRateBp,
    notes: options.notes,
    archived: false,
  }
}

function materials(copy: SeedCopy): Material[] {
  const { supplier } = copy.materials
  return [
    material('material-pla', 'PLA', 'PLA', 20, supplier, {
      notes: copy.materials.pla,
    }),
    material('material-petg', 'PETG', 'PETG', 24, supplier, {
      notes: copy.materials.petg,
    }),
    material('material-tpu', 'TPU', 'TPU', 30, supplier, {
      notes: copy.materials.tpu,
    }),
    material('material-abs', 'ABS', 'ABS', 25, supplier, {
      failureRateBp: percentToBp(10),
      notes: copy.materials.abs,
    }),
    material('material-asa', 'ASA', 'ASA', 30, supplier, {
      failureRateBp: percentToBp(10),
      notes: copy.materials.asa,
    }),
    material('material-pla-cf', 'PLA-CF', 'PLA_CF', 35, supplier, {
      notes: copy.materials.plaCf,
    }),
    material('material-petg-cf', 'PETG-CF', 'PETG_CF', 35, supplier, {
      notes: copy.materials.petgCf,
    }),
    material('material-pva', 'PVA', 'PVA', 60, supplier, {
      notes: copy.materials.pva,
    }),
  ]
}

function extra(
  id: string,
  name: string,
  amountEur: number,
  unit: Extra['unit'],
  category: string,
): Extra {
  return {
    id,
    name,
    amount: euroToMicro(amountEur),
    unit,
    category,
    archived: false,
  }
}

function extras(copy: SeedCopy): Extra[] {
  const { extras: labels } = copy
  return [
    extra('extra-zip-bag', labels.zipBag, 0.08, 'perUnit', labels.packagingCategory),
    extra('extra-box', labels.box, 0.4, 'perUnit', labels.packagingCategory),
    extra('extra-label', labels.label, 0.03, 'perUnit', labels.packagingCategory),
    extra('extra-bubble-wrap', labels.padding, 0.1, 'perUnit', labels.packagingCategory),
    extra('extra-shipping', labels.shipping, 6, 'perJob', labels.shippingCategory),
  ]
}

/**
 * The `locale` field records the app's original default value and has no
 * formatting consumers (ADR-0036 §2.4): formatting follows the UI language
 * and `Quote.locale`.
 */
function seedSettingsFor(copy: SeedCopy): Settings {
  return {
    currency: 'EUR',
    locale: 'it-IT',
    tariffs: [seedTariff(copy)],
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
}

/**
 * The seed configuration for a fresh install or a new workspace. The locale
 * localizes names, notes, categories and the supplier only (ADR-0036): the
 * IDs and every economic value are identical across locales, and existing
 * data is never renamed afterwards.
 */
export function createSeedConfig(locale: QuoteLocale = 'it'): CostConfig {
  const copy = SEED_COPY[locale]
  return {
    settings: structuredClone(seedSettingsFor(copy)),
    printers: structuredClone([kobra3(copy), kobraX(copy)]),
    materials: structuredClone(materials(copy)),
    extras: structuredClone(extras(copy)),
  }
}

export function createEmptyLine(
  config: CostConfig,
  locale: QuoteLocale = 'it',
  overrides: Partial<PrintLine> = {},
): PrintLine {
  const printer = config.printers.find((candidate) => !candidate.archived) ?? config.printers[0]
  const material = config.materials.find((candidate) => !candidate.archived) ?? config.materials[0]

  return {
    id: newId(),
    name: EMPTY_LINE_NAMES[locale],
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
    name: EMPTY_DRAFT_NAMES[locale],
    quoteDate: todayIsoDate(date),
    locale,
    status: 'draft',
    lines: [createEmptyLine(config, locale)],
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
  kobra3: 'printer-kobra-3',
  kobraX: 'printer-kobra-x',
  pla: 'material-pla',
  petg: 'material-petg',
  tariff: SEED_TARIFF_ID,
  shipping: 'extra-shipping',
}
