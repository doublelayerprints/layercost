import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { CostConfig, Material, Printer } from './types'
import type { ThreeMfFilament, ThreeMfPlate, ThreeMfSummary } from './three-mf'
import { mapThreeMfToLines, proposeThreeMfMapping, type ThreeMfMapping } from './three-mf-mapping'
import { asBasisPoints, asMicroEur, asWatts, DomainError } from './units'

function makePrinter(overrides: Partial<Printer> = {}): Printer {
  return {
    id: 'printer-kobra3',
    name: 'Kobra 3',
    model: 'Anycubic Kobra 3',
    purchasePrice: asMicroEur(300_000_000),
    residualValueBp: asBasisPoints(0),
    expectedLifeHours: 10_000,
    maintenancePerHour: asMicroEur(0),
    startupMinutes: 5,
    multicolor: false,
    buildVolumeMm: [250, 250, 260],
    ratedPowerW: 400,
    powerProfiles: {
      PLA: { avgWatts: asWatts(190), source: 'estimated' },
      PETG: { avgWatts: asWatts(200), source: 'estimated' },
    },
    defaultAvgWatts: asWatts(200),
    archived: false,
    ...overrides,
  }
}

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'pla-black',
    name: 'PLA nero',
    family: 'PLA',
    pricePerKg: asMicroEur(20_000_000),
    spoolNetWeightG: 1000,
    archived: false,
    ...overrides,
  }
}

function makeConfig(overrides: Partial<CostConfig> = {}): CostConfig {
  return {
    settings: {
      currency: 'EUR',
      locale: 'it-IT',
      tariffs: [],
      laborRatePerHour: asMicroEur(0),
      failureRateBp: asBasisPoints(0),
      timeOverheadBp: asBasisPoints(0),
      pricingMode: 'markup',
      markupBp: asBasisPoints(0),
      marginBp: asBasisPoints(0),
      roundingStep: asMicroEur(0),
      roundingMode: 'up',
      vatMode: 'none',
      vatRateBp: asBasisPoints(0),
      allocationMode: 'proportional',
      onboardingComplete: true,
    },
    printers: [
      makePrinter(),
      makePrinter({ id: 'printer-kobrax', name: 'Kobra X', model: 'Anycubic Kobra X' }),
    ],
    materials: [
      makeMaterial(),
      makeMaterial({ id: 'pla-white', name: 'PLA bianco' }),
      makeMaterial({ id: 'petg-white', name: 'PETG bianco', family: 'PETG' }),
    ],
    extras: [],
    ...overrides,
  }
}

function makeFilament(overrides: Partial<ThreeMfFilament> = {}): ThreeMfFilament {
  return {
    id: 1,
    type: 'PLA',
    materialFamily: 'PLA',
    color: '#000000',
    usedCentigrams: 100,
    usedMeters: 1,
    ...overrides,
  }
}

function makePlate(overrides: Partial<ThreeMfPlate> = {}): ThreeMfPlate {
  return {
    index: 1,
    predictionSeconds: 600,
    weightCentigrams: 100,
    filaments: [makeFilament()],
    source: 'slice_info',
    ...overrides,
  }
}

function makeSummary(
  plates: ThreeMfPlate[],
  overrides: Partial<ThreeMfSummary> = {},
): ThreeMfSummary {
  return {
    fileName: 'test.3mf',
    slicer: 'anycubic',
    printerModel: 'Anycubic Kobra 3',
    plates,
    warnings: [],
    ...overrides,
  }
}

function makeMapping(
  summary: ThreeMfSummary,
  materialId: (plate: ThreeMfPlate, filament: ThreeMfFilament) => string = () => 'pla-black',
): ThreeMfMapping {
  return {
    printerId: 'printer-kobra3',
    plateIndexes: summary.plates.map((plate) => plate.index),
    materials: summary.plates.flatMap((plate) =>
      plate.filaments
        .filter((filament) => filament.usedCentigrams > 0)
        .map((filament) => ({
          plateIndex: plate.index,
          filamentId: filament.id,
          materialId: materialId(plate, filament),
        })),
    ),
  }
}

function idFactory(): () => string {
  let index = 0
  return () => {
    index += 1
    return `line-${index}`
  }
}

function expectDomainCode(fn: () => unknown, code: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as DomainError).code).toBe(code)
    return
  }
  throw new Error('Atteso DomainError')
}

describe('mapping .3mf', () => {
  it('mappa un piatto con nome, tempo e materiale', () => {
    const summary = makeSummary([
      makePlate({
        name: 'Gancio',
        predictionSeconds: 200,
        filaments: [makeFilament({ usedCentigrams: 146 })],
      }),
    ])
    const [line] = mapThreeMfToLines(summary, makeMapping(summary), makeConfig(), idFactory())

    expect(line).toMatchObject({
      id: 'line-1',
      name: 'Gancio',
      printerId: 'printer-kobra3',
      timeSeconds: 200,
      materials: [{ materialId: 'pla-black', grams: 146 }],
      quantity: 1,
      finishingSecondsPerUnit: 0,
      extraIds: [],
      overrides: {},
    })
  })

  it('usa il fallback nome file + piatto', () => {
    const summary = makeSummary([makePlate({ index: 2, predictionSeconds: 100 })])
    const [line] = mapThreeMfToLines(summary, makeMapping(summary), makeConfig(), idFactory())
    expect(line?.name).toBe('test — piatto 2')
  })

  it('somma i grammi dello stesso materiale e separa quelli diversi', () => {
    const summary = makeSummary([
      makePlate({
        filaments: [
          makeFilament({ id: 1, usedCentigrams: 100 }),
          makeFilament({ id: 2, usedCentigrams: 50 }),
          makeFilament({
            id: 3,
            type: 'PETG',
            materialFamily: 'PETG',
            usedCentigrams: 30,
          }),
        ],
      }),
    ])
    const [line] = mapThreeMfToLines(
      summary,
      makeMapping(summary, (_plate, filament) =>
        filament.materialFamily === 'PETG' ? 'petg-white' : 'pla-black',
      ),
      makeConfig(),
      idFactory(),
    )
    expect(line?.materials).toEqual([
      { materialId: 'pla-black', grams: 150 },
      { materialId: 'petg-white', grams: 30 },
    ])
    expect(line?.materials.reduce((sum, usage) => sum + usage.grams, 0)).toBe(180)
  })

  it('ignora i filamenti a zero grammi', () => {
    const summary = makeSummary([
      makePlate({
        filaments: [
          makeFilament({ id: 1, usedCentigrams: 0 }),
          makeFilament({ id: 2, usedCentigrams: 50 }),
        ],
      }),
    ])
    const mapping = makeMapping(summary)
    expect(mapping.materials).toHaveLength(1)
    const [line] = mapThreeMfToLines(summary, mapping, makeConfig(), idFactory())
    expect(line?.materials).toEqual([{ materialId: 'pla-black', grams: 50 }])
  })

  it('produce una riga per piatto selezionato', () => {
    const summary = makeSummary([
      makePlate({ index: 1, predictionSeconds: 100 }),
      makePlate({ index: 2, predictionSeconds: 200 }),
    ])
    const mapping = makeMapping(summary)
    mapping.plateIndexes = [2]
    mapping.materials = mapping.materials.filter((choice) => choice.plateIndex === 2)
    const lines = mapThreeMfToLines(summary, mapping, makeConfig(), idFactory())
    expect(lines).toHaveLength(1)
    expect(lines[0]?.timeSeconds).toBe(200)
    expect(lines[0]?.name).toBe('test — piatto 2')
  })

  it('richiede la scelta del materiale', () => {
    const summary = makeSummary([makePlate()])
    const mapping = makeMapping(summary)
    mapping.materials = []
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, makeConfig(), idFactory()),
      'THREE_MF_MAPPING_MATERIAL',
    )
  })

  it('rifiuta stampante assente o archiviata', () => {
    const summary = makeSummary([makePlate()])
    const mapping = makeMapping(summary)
    mapping.printerId = 'missing'
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, makeConfig(), idFactory()),
      'THREE_MF_MAPPING_PRINTER',
    )

    const config = makeConfig({
      printers: [makePrinter({ archived: true })],
    })
    mapping.printerId = 'printer-kobra3'
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, config, idFactory()),
      'THREE_MF_MAPPING_PRINTER',
    )
  })

  it('rifiuta un piatto senza tempo o non selezionato', () => {
    const summary = makeSummary([makePlate({ predictionSeconds: null })])
    const mapping = makeMapping(summary)
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, makeConfig(), idFactory()),
      'THREE_MF_MAPPING_PLATE',
    )

    const valid = makeSummary([makePlate()])
    const missing = makeMapping(valid)
    missing.plateIndexes = [99]
    expectDomainCode(
      () => mapThreeMfToLines(valid, missing, makeConfig(), idFactory()),
      'THREE_MF_MAPPING_PLATE',
    )
  })

  it('rifiuta un materiale archiviato o una mappatura duplicata', () => {
    const summary = makeSummary([makePlate()])
    const mapping = makeMapping(summary)
    const config = makeConfig({
      materials: [makeMaterial({ archived: true })],
    })
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, config, idFactory()),
      'THREE_MF_MAPPING_MATERIAL',
    )

    mapping.materials = [...mapping.materials, ...mapping.materials]
    expectDomainCode(
      () => mapThreeMfToLines(summary, mapping, makeConfig(), idFactory()),
      'THREE_MF_MAPPING_MATERIAL',
    )
  })
})

describe('proposta di mapping .3mf', () => {
  const config = makeConfig()

  it('propone la stampante con match esatto', () => {
    const summary = makeSummary([], { printerModel: 'Anycubic Kobra 3' })
    expect(proposeThreeMfMapping(summary, config).printer).toEqual({
      printerId: 'printer-kobra3',
      candidateIds: ['printer-kobra3'],
      reason: 'exact',
    })
  })

  it('propone la stampante per contenimento', () => {
    const summary = makeSummary([], {
      printerModel: undefined,
      printerSettingsId: 'Anycubic Kobra X 0.4 nozzle',
    })
    expect(proposeThreeMfMapping(summary, config).printer).toEqual({
      printerId: 'printer-kobrax',
      candidateIds: ['printer-kobrax'],
      reason: 'contains',
    })
  })

  it('segnala stampante ambigua o assente', () => {
    const ambiguous = makeConfig({
      printers: [
        makePrinter({ id: 'p1', name: 'Kobra 3' }),
        makePrinter({ id: 'p2', name: 'Kobra 3' }),
      ],
    })
    const summary = makeSummary([], { printerModel: 'Kobra 3' })
    expect(proposeThreeMfMapping(summary, ambiguous).printer).toMatchObject({
      candidateIds: ['p1', 'p2'],
      reason: 'ambiguous',
    })
    expect(
      proposeThreeMfMapping(makeSummary([], { printerModel: undefined }), config).printer,
    ).toEqual({ candidateIds: [], reason: 'missing' })
  })

  it('propone materiali per famiglia e segnala ambiguità', () => {
    const summary = makeSummary([
      makePlate({
        filaments: [
          makeFilament({ id: 1, materialFamily: 'PLA' }),
          makeFilament({ id: 2, type: 'PETG', materialFamily: 'PETG' }),
          makeFilament({ id: 3, type: 'PEEK', materialFamily: null }),
          makeFilament({ id: 4, usedCentigrams: 0 }),
        ],
      }),
    ])
    const proposal = proposeThreeMfMapping(summary, config)
    expect(proposal.materials).toEqual([
      {
        plateIndex: 1,
        filamentId: 1,
        candidateIds: ['pla-black', 'pla-white'],
        reason: 'ambiguous',
      },
      {
        plateIndex: 1,
        filamentId: 2,
        materialId: 'petg-white',
        candidateIds: ['petg-white'],
        reason: 'family',
      },
      {
        plateIndex: 1,
        filamentId: 3,
        candidateIds: [],
        reason: 'missing',
      },
    ])
  })

  it('non propone materiali archiviati', () => {
    const archivedOnly = makeConfig({
      materials: [makeMaterial({ archived: true })],
    })
    const summary = makeSummary([makePlate()])
    expect(proposeThreeMfMapping(summary, archivedOnly).materials[0]).toEqual({
      plateIndex: 1,
      filamentId: 1,
      candidateIds: [],
      reason: 'missing',
    })
  })
})

describe('proprietà del mapping .3mf', () => {
  it('una riga per piatto, somma esatta e nessun supplemento', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 3 }), {
          minLength: 1,
          maxLength: 4,
        }),
        (platesGrams) => {
          const plates = platesGrams.map((grams, plateIndex) =>
            makePlate({
              index: plateIndex + 1,
              predictionSeconds: 100 + plateIndex * 10,
              weightCentigrams: grams.reduce((sum, value) => sum + value, 0),
              filaments: grams.map((value, filamentIndex) =>
                makeFilament({
                  id: filamentIndex + 1,
                  usedCentigrams: value,
                  usedMeters: 0,
                }),
              ),
            }),
          )
          const summary = makeSummary(plates)
          const mapping = makeMapping(summary, (_plate, filament) =>
            filament.id % 2 === 0 ? 'pla-white' : 'pla-black',
          )
          const lines = mapThreeMfToLines(summary, mapping, makeConfig(), idFactory())

          expect(lines).toHaveLength(plates.length)
          expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length)
          lines.forEach((line, index) => {
            const grams = platesGrams[index]
            expect(grams).toBeDefined()
            if (!grams) return
            const expected = grams.reduce((sum, value) => sum + value, 0)
            const actual = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
            expect(actual).toBe(expected)
            expect(line.timeSeconds).toBe(100 + index * 10)
            expect(line.printerId).toBe('printer-kobra3')
            expect(line.quantity).toBe(1)
            expect(line.materials.every((usage) => usage.grams >= 0)).toBe(true)
          })
        },
      ),
      { numRuns: 50 },
    )
  })
})
