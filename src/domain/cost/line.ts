import type {
  CostConfig,
  Extra,
  ExtraCostDetail,
  LineResult,
  Material,
  PrintLine,
  Printer,
} from '../types'
import type { MicroEur, Seconds } from '../units'
import { DomainError, asMicroEur } from '../units'
import { roundHalfUp } from '../money'
import { calculateMaterialCost } from './material'
import { calculateEnergy, effectiveSeconds } from './energy'
import { calculateWear } from './wear'
import { calculateLineLabor } from './labor'
import { calculateFailureReserve, resolveFailureRate } from './failure'

export interface LineComputation {
  line: PrintLine
  printer: Printer
  materials: Material[]
  effectiveSeconds: Seconds
  materialCost: MicroEur
  materialDetails: LineResult['materialDetails']
  energyCost: MicroEur
  energyWh: LineResult['energyWh']
  avgWatts: LineResult['avgWatts']
  tariffLabel: string
  depreciation: MicroEur
  maintenance: MicroEur
  labor: MicroEur
  extraCost: MicroEur
  extraDetails: ExtraCostDetail[]
  failure: MicroEur
  failureRateBp: LineResult['failureRateBp']
  directUnitCost: MicroEur
  directLineCost: MicroEur
}

function requirePrinter(config: CostConfig, printerId: string): Printer {
  const printer = config.printers.find((candidate) => candidate.id === printerId)
  if (!printer) {
    throw new DomainError('PRINTER_NOT_FOUND', 'Seleziona una stampante valida.')
  }
  return printer
}

function resolveLineExtras(
  extraIds: string[],
  extras: Extra[],
): {
  total: MicroEur
  details: ExtraCostDetail[]
} {
  let total = 0
  const details: ExtraCostDetail[] = []
  for (const extraId of extraIds) {
    const extra = extras.find((candidate) => candidate.id === extraId)
    if (!extra) {
      throw new DomainError('EXTRA_NOT_FOUND', `Extra non trovato: ${extraId}.`)
    }
    if (extra.unit !== 'perUnit') {
      throw new DomainError(
        'EXTRA_UNIT_MISMATCH',
        `L’extra “${extra.name}” è per lavoro e non può essere applicato a una riga.`,
      )
    }
    total += extra.amount
    details.push({ extraId: extra.id, name: extra.name, amount: extra.amount })
  }
  return { total: asMicroEur(total), details }
}

export function computeLine(
  line: PrintLine,
  config: CostConfig,
  quoteDate: string,
): LineComputation {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new DomainError('INVALID_QUANTITY', 'La quantità deve essere almeno 1.')
  }
  if (line.timeSeconds <= 0) {
    throw new DomainError('INVALID_TIME', 'Inserisci il tempo di stampa.')
  }
  if (line.materials.length === 0) {
    throw new DomainError('NO_MATERIALS', 'Aggiungi almeno un materiale alla riga.')
  }

  const activeUsages = line.materials.filter((usage) => usage.grams > 0)
  if (activeUsages.length === 0) {
    throw new DomainError('NO_GRAMS', 'Inserisci i grammi di almeno un materiale.')
  }

  const printer = requirePrinter(config, line.printerId)
  const materials = activeUsages.map((usage) => {
    const material = config.materials.find((candidate) => candidate.id === usage.materialId)
    if (!material) {
      throw new DomainError('MATERIAL_NOT_FOUND', `Materiale non trovato: ${usage.materialId}.`)
    }
    return material
  })

  const materialResult = calculateMaterialCost(activeUsages, config.materials)
  const seconds = effectiveSeconds(
    line.timeSeconds,
    config.settings.timeOverheadBp,
    printer.startupMinutes,
  )
  const energyResult = calculateEnergy(
    printer,
    activeUsages,
    config.materials,
    config.settings,
    quoteDate,
    seconds,
    line.overrides.energyOverrideWh,
    line.overrides.powerOverrideW,
  )
  const wear = calculateWear(printer, seconds)
  const labor = calculateLineLabor(line.finishingSecondsPerUnit, config.settings.laborRatePerHour)
  const lineExtras = resolveLineExtras(line.extraIds, config.extras)
  const failureRateBp = resolveFailureRate(line, activeUsages, config.materials, config.settings)
  const failureBase = asMicroEur(
    materialResult.total + energyResult.cost + wear.depreciation + wear.maintenance + labor,
  )
  const failure = calculateFailureReserve(failureBase, failureRateBp)

  const directUnitCost = asMicroEur(failureBase + lineExtras.total + failure)
  const directLineCost = asMicroEur(directUnitCost * line.quantity)

  return {
    line,
    printer,
    materials,
    effectiveSeconds: seconds,
    materialCost: materialResult.total,
    materialDetails: materialResult.details,
    energyCost: energyResult.cost,
    energyWh: energyResult.energyWh,
    avgWatts: energyResult.avgWatts,
    tariffLabel: energyResult.tariff.label,
    depreciation: wear.depreciation,
    maintenance: wear.maintenance,
    labor,
    extraCost: lineExtras.total,
    extraDetails: lineExtras.details,
    failure,
    failureRateBp,
    directUnitCost,
    directLineCost,
  }
}

export function buildLineResult(
  computation: LineComputation,
  allocatedFixed: MicroEur,
  priceCents: number,
  discount: MicroEur,
): LineResult {
  const fullyLoadedLineCost = asMicroEur(computation.directLineCost + allocatedFixed)
  const fullyLoadedUnitCost = asMicroEur(
    roundHalfUp(fullyLoadedLineCost / computation.line.quantity),
  )

  return {
    lineId: computation.line.id,
    name: computation.line.name,
    printerId: computation.printer.id,
    printerName: computation.printer.name,
    quantity: computation.line.quantity,
    effectiveSeconds: computation.effectiveSeconds,
    avgWatts: computation.avgWatts,
    energyWh: computation.energyWh,
    tariffLabel: computation.tariffLabel,
    material: computation.materialCost,
    energy: computation.energyCost,
    depreciation: computation.depreciation,
    maintenance: computation.maintenance,
    labor: computation.labor,
    extras: computation.extraCost,
    failure: computation.failure,
    failureRateBp: computation.failureRateBp,
    directUnitCost: computation.directUnitCost,
    directLineCost: computation.directLineCost,
    allocatedFixed,
    fullyLoadedLineCost,
    fullyLoadedUnitCost,
    discount,
    priceCents,
    pricePerUnitCents: priceCents / computation.line.quantity,
    materialDetails: computation.materialDetails,
    extraDetails: computation.extraDetails,
  }
}
