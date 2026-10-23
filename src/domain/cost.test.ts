import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type {
  CostConfig,
  Extra,
  Material,
  PrintLine,
  Printer,
  Quote,
  QuotePricing,
  Settings,
} from './types'
import {
  asBasisPoints,
  asCentigrams,
  asMicroEur,
  asSeconds,
  asWatts,
  asWh,
  euroToMicro,
  gramsToCg,
  hoursToSeconds,
  percentToBp,
} from './units'
import { allocateLargestRemainder, roundHalfUp, roundToStep } from './money'
import { calculateQuote } from './cost/quote'
import { calculatePricing } from './cost/pricing'
import { calculateFailureReserve } from './cost/failure'
import { resolveTariff } from './cost/energy'
import { calculateMaterialCost } from './cost/material'

const eur = (value: number) => euroToMicro(value)
const pct = (value: number) => percentToBp(value)
const hours = (value: number) => hoursToSeconds(value)
const grams = (value: number) => gramsToCg(value)

function makePrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: 'printer-test',
    name: 'Test Printer',
    model: 'Test',
    purchasePrice: eur(300),
    residualValueBp: pct(0),
    expectedLifeHours: 3000,
    maintenancePerHour: eur(0.03),
    startupMinutes: 5,
    multicolor: false,
    buildVolumeMm: [250, 250, 260],
    ratedPowerW: 400,
    powerProfiles: {
      PLA: { avgWatts: asWatts(190), source: 'estimated' },
      PETG: { avgWatts: asWatts(200), source: 'estimated' },
      ABS: { avgWatts: asWatts(380), source: 'estimated' },
      ASA: { avgWatts: asWatts(380), source: 'estimated' },
    },
    defaultAvgWatts: asWatts(200),
    archived: false,
    ...overrides,
  }
}

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'material-pla',
    name: 'PLA',
    family: 'PLA',
    pricePerKg: eur(20),
    spoolNetWeightG: 1000,
    archived: false,
    ...overrides,
  }
}

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    currency: 'EUR',
    locale: 'it-IT',
    tariffs: [
      {
        id: 'tariff-test',
        label: 'Test',
        pricePerKWh: eur(0.25),
        effectiveFrom: '2026-01-01',
      },
    ],
    laborRatePerHour: eur(0),
    failureRateBp: pct(5),
    timeOverheadBp: asBasisPoints(0),
    pricingMode: 'markup',
    markupBp: pct(30),
    marginBp: pct(25),
    roundingStep: eur(0.1),
    roundingMode: 'up',
    vatMode: 'none',
    vatRateBp: pct(22),
    allocationMode: 'proportional',
    onboardingComplete: true,
    ...overrides,
  }
}

function makeExtra(overrides: Partial<Extra> = {}): Extra {
  return {
    id: 'extra-shipping',
    name: 'Spedizione',
    amount: eur(5),
    unit: 'perJob',
    archived: false,
    ...overrides,
  }
}

function makeLine(overrides: Partial<PrintLine> = {}): PrintLine {
  return {
    id: 'line-1',
    name: 'Stampa',
    printerId: 'printer-test',
    timeSeconds: hours(10),
    materials: [{ materialId: 'material-pla', grams: grams(100) }],
    quantity: 1,
    finishingSecondsPerUnit: asSeconds(0),
    extraIds: [],
    overrides: {},
    ...overrides,
  }
}

function makeQuote(
  lines: PrintLine[],
  jobOverrides: Partial<Quote['job']> = {},
  pricing?: QuotePricing,
): Quote {
  const settings = makeSettings()
  return {
    id: 'quote-test',
    name: 'Test',
    quoteDate: '2026-10-23',
    status: 'draft',
    lines,
    job: {
      setupSeconds: asSeconds(0),
      designSeconds: asSeconds(0),
      extraIds: [],
      ...jobOverrides,
    },
    pricing: pricing ?? {
      mode: settings.pricingMode,
      markupBp: settings.markupBp,
      marginBp: settings.marginBp,
      roundingStep: settings.roundingStep,
      roundingMode: settings.roundingMode,
      discountBp: asBasisPoints(0),
      vatMode: settings.vatMode,
      vatRateBp: settings.vatRateBp,
    },
    createdAt: '2026-10-23T10:00:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
  }
}

function makeConfig(overrides: Partial<CostConfig> = {}): CostConfig {
  return {
    settings: makeSettings(),
    printers: [makePrinter()],
    materials: [makeMaterial()],
    extras: [],
    ...overrides,
  }
}

describe('unità e arrotondamenti', () => {
  it('converte euro, percentuali, grammi e ore', () => {
    expect(eur(0.25)).toBe(250_000)
    expect(pct(30)).toBe(3000)
    expect(hours(10)).toBe(36_000)
    expect(grams(100)).toBe(10_000)
    expect(asWh(1800)).toBe(1800)
  })

  it('arrotonda half-up anche sui negativi', () => {
    expect(roundHalfUp(2.4)).toBe(2)
    expect(roundHalfUp(2.5)).toBe(3)
    expect(roundHalfUp(2.6)).toBe(3)
    expect(roundHalfUp(-2.5)).toBe(-3)
  })

  it('arrotonda al passo richiesto', () => {
    expect(roundToStep(eur(5.04), eur(0.1), 'nearest')).toBe(eur(5))
    expect(roundToStep(eur(5.05), eur(0.1), 'nearest')).toBe(eur(5.1))
    expect(roundToStep(eur(5.09), eur(0.1), 'down')).toBe(eur(5))
    expect(roundToStep(eur(5.01), eur(0.1), 'up')).toBe(eur(5.1))
  })

  it('ripartisce con resti più grandi e somma esatta', () => {
    const shares = allocateLargestRemainder(100, [1, 1, 1])
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100)
    expect(shares).toEqual([34, 33, 33])

    const zeroWeights = allocateLargestRemainder(10, [0, 0])
    expect(zeroWeights).toEqual([5, 5])
    expect(allocateLargestRemainder(0, [1, 2])).toEqual([0, 0])
  })
})

describe('motore di costo', () => {
  it('calcola l’esempio 1 al micro-euro', () => {
    const config = makeConfig()
    const result = calculateQuote(makeQuote([makeLine()]), config)
    const line = result.lines[0]!

    expect(line.material).toBe(2_000_000)
    expect(line.energy).toBe(478_958)
    expect(line.depreciation).toBe(1_008_333)
    expect(line.maintenance).toBe(302_500)
    expect(line.failure).toBe(199_463)
    expect(line.directUnitCost).toBe(3_989_254)
    expect(result.totalCost).toBe(3_989_254)
    expect(result.netPriceCents).toBe(520)
    expect(result.grossPriceCents).toBe(520)
    expect(result.effectiveMarginBp).toBe(2328)
  })

  it('calcola un lotto con costi fissi e allocazione', () => {
    const config = makeConfig({
      printers: [
        makePrinter({
          purchasePrice: eur(0),
          maintenancePerHour: eur(0),
          expectedLifeHours: 1000,
          defaultAvgWatts: asWatts(100),
          powerProfiles: { PLA: { avgWatts: asWatts(100), source: 'estimated' } },
        }),
      ],
      settings: makeSettings({
        laborRatePerHour: eur(1),
        failureRateBp: pct(0),
        tariffs: [
          {
            id: 'tariff-free',
            label: 'Gratis',
            pricePerKWh: eur(0),
            effectiveFrom: '2026-01-01',
          },
        ],
      }),
      extras: [makeExtra()],
    })

    const quote = makeQuote(
      [
        makeLine({
          id: 'line-a',
          name: 'A',
          materials: [{ materialId: 'material-pla', grams: grams(100) }],
          quantity: 2,
          timeSeconds: hours(1),
        }),
        makeLine({
          id: 'line-b',
          name: 'B',
          materials: [{ materialId: 'material-pla', grams: grams(250) }],
          quantity: 1,
          timeSeconds: hours(1),
        }),
      ],
      { setupSeconds: hours(1), extraIds: ['extra-shipping'] },
    )

    const result = calculateQuote(quote, config)
    expect(result.directTotal).toBe(9_000_000)
    expect(result.jobLabor).toBe(1_000_000)
    expect(result.jobExtras).toBe(5_000_000)
    expect(result.jobFixedTotal).toBe(6_000_000)
    expect(result.totalCost).toBe(15_000_000)
    expect(result.lines[0]!.allocatedFixed).toBe(2_666_667)
    expect(result.lines[1]!.allocatedFixed).toBe(3_333_333)
    expect(result.lines[0]!.fullyLoadedLineCost).toBe(6_666_667)
    expect(result.lines[1]!.fullyLoadedLineCost).toBe(8_333_333)
    expect(result.netPriceCents).toBe(1950)
    expect(result.lines[0]!.priceCents).toBe(867)
    expect(result.lines[1]!.priceCents).toBe(1083)
    expect(result.lines[0]!.priceCents + result.lines[1]!.priceCents).toBe(1950)
  })

  it('calcola margine, sconto e IVA', () => {
    const pricing: QuotePricing = {
      mode: 'margin',
      markupBp: pct(30),
      marginBp: pct(25),
      roundingStep: eur(0.1),
      roundingMode: 'nearest',
      discountBp: pct(10),
      vatMode: 'excluded',
      vatRateBp: pct(22),
    }
    const result = calculatePricing(asMicroEur(10_000_000), pricing)
    expect(result.netPriceCents).toBe(1200)
    expect(result.vatCents).toBe(264)
    expect(result.grossPriceCents).toBe(1464)
  })

  it('applica la riserva guasti come valore atteso', () => {
    expect(calculateFailureReserve(asMicroEur(1_000_000), pct(5))).toBe(52_632)
    expect(calculateFailureReserve(asMicroEur(1_000_000), pct(0))).toBe(0)
    expect(calculateFailureReserve(asMicroEur(1_000_000), pct(20))).toBe(250_000)
  })

  it('sceglie la tariffa valida alla data del preventivo', () => {
    const printer = makePrinter()
    const settings = makeSettings({
      tariffs: [
        { id: 't-2025', label: '2025', pricePerKWh: eur(0.2), effectiveFrom: '2025-01-01' },
        { id: 't-2026', label: '2026', pricePerKWh: eur(0.3), effectiveFrom: '2026-01-01' },
      ],
    })
    expect(resolveTariff(printer, settings, '2025-06-01').id).toBe('t-2025')
    expect(resolveTariff(printer, settings, '2026-06-01').id).toBe('t-2026')
    expect(resolveTariff({ ...printer, energyTariffId: 't-2025' }, settings, '2026-06-01').id).toBe(
      't-2025',
    )
  })

  it('non usa la potenza nominale e gestisce più materiali', () => {
    const config = makeConfig({
      printers: [
        makePrinter({
          ratedPowerW: 1450,
          powerProfiles: {
            PLA: { avgWatts: asWatts(190), source: 'estimated' },
            ABS: { avgWatts: asWatts(380), source: 'estimated' },
          },
        }),
      ],
      materials: [
        makeMaterial(),
        makeMaterial({ id: 'material-abs', name: 'ABS', family: 'ABS', pricePerKg: eur(25) }),
      ],
    })
    const quote = makeQuote([
      makeLine({
        materials: [
          { materialId: 'material-pla', grams: grams(100) },
          { materialId: 'material-abs', grams: grams(100) },
        ],
      }),
    ])
    const result = calculateQuote(quote, config)
    expect(result.lines[0]!.avgWatts).toBe(380)
    expect(result.lines[0]!.material).toBe(4_500_000)
  })

  it('calcola il materiale con arrotondamento e ignora le righe a zero grammi', () => {
    const result = calculateMaterialCost(
      [
        { materialId: 'material-pla', grams: grams(0) },
        { materialId: 'material-pla', grams: grams(100) },
      ],
      [makeMaterial()],
    )
    expect(result.total).toBe(2_000_000)
    expect(result.details).toHaveLength(1)
  })
})

describe('proprietà', () => {
  it('la ripartizione conserva il totale', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 1, maxLength: 20 }),
        (total, weights) => {
          const shares = allocateLargestRemainder(total, weights)
          expect(shares.reduce((sum, share) => sum + share, 0)).toBe(total)
          expect(shares.every((share) => share >= 0)).toBe(true)
        },
      ),
    )
  })

  it('raddoppiare i grammi raddoppia il costo del materiale con prezzo esatto', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100_000 }), (cg) => {
        const base = calculateMaterialCost(
          [{ materialId: 'material-pla', grams: asCentigrams(cg) }],
          [makeMaterial({ pricePerKg: eur(20) })],
        ).total
        const doubled = calculateMaterialCost(
          [{ materialId: 'material-pla', grams: asCentigrams(cg * 2) }],
          [makeMaterial({ pricePerKg: eur(20) })],
        ).total
        expect(doubled).toBe(base * 2)
      }),
    )
  })
})
