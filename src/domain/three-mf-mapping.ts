import type { CostConfig, PrintLine } from './types'
import type { ThreeMfFilament, ThreeMfPlate, ThreeMfSummary } from './three-mf'
import { asCentigrams, asSeconds, DomainError } from './units'

export type ThreeMfProposalReason = 'exact' | 'contains' | 'family' | 'ambiguous' | 'missing'

export interface ThreeMfPrinterProposal {
  printerId?: string
  candidateIds: string[]
  reason: ThreeMfProposalReason
}

export interface ThreeMfMaterialProposal {
  plateIndex: number
  filamentId: number
  materialId?: string
  candidateIds: string[]
  reason: ThreeMfProposalReason
}

export interface ThreeMfMappingProposal {
  printer: ThreeMfPrinterProposal
  materials: ThreeMfMaterialProposal[]
}

export interface ThreeMfMaterialChoice {
  plateIndex: number
  filamentId: number
  materialId: string
}

export interface ThreeMfMapping {
  printerId: string
  plateIndexes: number[]
  materials: ThreeMfMaterialChoice[]
}

/**
 * Propone stampante e materiali senza creare entità.
 * L'utente conferma o corregge le scelte nell'anteprima.
 */
export function proposeThreeMfMapping(
  summary: ThreeMfSummary,
  config: CostConfig,
): ThreeMfMappingProposal {
  const printers = config.printers.filter((printer) => !printer.archived)
  const materials = config.materials.filter((material) => !material.archived)
  const proposals: ThreeMfMaterialProposal[] = []

  for (const plate of summary.plates) {
    for (const filament of plate.filaments) {
      if (filament.usedCentigrams <= 0) continue
      proposals.push(proposeMaterial(plate, filament, materials))
    }
  }

  return { printer: proposePrinter(summary, printers), materials: proposals }
}

/**
 * Converte i piatti selezionati in righe del preventivo.
 * Non modifica il riepilogo e non aggiunge supplementi per AMS/ACE.
 */
export function mapThreeMfToLines(
  summary: ThreeMfSummary,
  mapping: ThreeMfMapping,
  config: CostConfig,
  idFactory: () => string,
): PrintLine[] {
  const selected = new Set(mapping.plateIndexes)
  if (selected.size === 0) {
    throw new DomainError('THREE_MF_MAPPING_PLATE', 'Seleziona almeno un piatto da importare.')
  }

  const plates = summary.plates.filter((plate) => selected.has(plate.index))
  if (plates.length !== selected.size) {
    throw new DomainError(
      'THREE_MF_MAPPING_PLATE',
      'Uno o più piatti selezionati non sono presenti nel file.',
    )
  }

  const printer = config.printers.find((item) => item.id === mapping.printerId)
  if (!printer || printer.archived) {
    throw new DomainError(
      'THREE_MF_MAPPING_PRINTER',
      'Scegli una stampante attiva per importare il file.',
    )
  }

  const materialById = new Map(config.materials.map((material) => [material.id, material]))
  const choices = new Map<string, string>()
  for (const choice of mapping.materials) {
    const key = choiceKey(choice.plateIndex, choice.filamentId)
    if (choices.has(key)) {
      throw new DomainError(
        'THREE_MF_MAPPING_MATERIAL',
        `La mappatura del filamento ${choice.filamentId} del piatto ${choice.plateIndex} è duplicata.`,
      )
    }
    choices.set(key, choice.materialId)
  }

  const lines: PrintLine[] = []
  const usedIds = new Set<string>()

  for (const plate of plates) {
    if (plate.predictionSeconds === null) {
      throw new DomainError(
        'THREE_MF_MAPPING_PLATE',
        `Il piatto ${plate.index} non contiene un tempo di stampa valido.`,
      )
    }

    const gramsByMaterial = new Map<string, number>()
    for (const filament of plate.filaments) {
      if (filament.usedCentigrams <= 0) continue
      const materialId = choices.get(choiceKey(plate.index, filament.id))
      if (!materialId) {
        throw new DomainError(
          'THREE_MF_MAPPING_MATERIAL',
          `Mappa il materiale ${filament.type || 'sconosciuto'} del piatto ${plate.index}.`,
        )
      }
      const material = materialById.get(materialId)
      if (!material || material.archived) {
        throw new DomainError(
          'THREE_MF_MAPPING_MATERIAL',
          `Il materiale scelto per il filamento ${filament.id} del piatto ${plate.index} non è disponibile.`,
        )
      }
      gramsByMaterial.set(
        materialId,
        (gramsByMaterial.get(materialId) ?? 0) + filament.usedCentigrams,
      )
    }

    if (gramsByMaterial.size === 0) {
      throw new DomainError(
        'THREE_MF_MAPPING_MATERIAL',
        `Il piatto ${plate.index} non contiene grammi da importare.`,
      )
    }

    const id = idFactory().trim()
    if (!id || usedIds.has(id)) {
      throw new DomainError(
        'THREE_MF_MAPPING_ID',
        'Impossibile creare righe con ID univoci per l’import.',
      )
    }
    usedIds.add(id)

    lines.push({
      id,
      name: plate.name?.trim() || fallbackLineName(summary.fileName, plate.index),
      printerId: printer.id,
      timeSeconds: asSeconds(plate.predictionSeconds),
      materials: [...gramsByMaterial.entries()].map(([materialId, grams]) => ({
        materialId,
        grams: asCentigrams(grams),
      })),
      quantity: 1,
      finishingSecondsPerUnit: asSeconds(0),
      extraIds: [],
      overrides: {},
    })
  }

  return lines
}

function proposePrinter(
  summary: ThreeMfSummary,
  printers: CostConfig['printers'],
): ThreeMfPrinterProposal {
  const target = summary.printerModel?.trim() || summary.printerSettingsId?.trim()
  const normalizedTarget = target ? normalizeLabel(target) : ''
  if (!normalizedTarget) return { candidateIds: [], reason: 'missing' }

  const exact = printers.filter(
    (printer) =>
      normalizeLabel(printer.name) === normalizedTarget ||
      normalizeLabel(printer.model) === normalizedTarget,
  )
  if (exact.length === 1) {
    const only = exact[0]
    if (only) return { printerId: only.id, candidateIds: [only.id], reason: 'exact' }
  }
  if (exact.length > 1) {
    return { candidateIds: exact.map((printer) => printer.id), reason: 'ambiguous' }
  }

  const contains = printers.filter((printer) => {
    const name = normalizeLabel(printer.name)
    const model = normalizeLabel(printer.model)
    return Boolean(
      (name && (name.includes(normalizedTarget) || normalizedTarget.includes(name))) ||
      (model && (model.includes(normalizedTarget) || normalizedTarget.includes(model))),
    )
  })
  if (contains.length === 1) {
    const only = contains[0]
    if (only) return { printerId: only.id, candidateIds: [only.id], reason: 'contains' }
  }
  if (contains.length > 1) {
    return { candidateIds: contains.map((printer) => printer.id), reason: 'ambiguous' }
  }

  return { candidateIds: [], reason: 'missing' }
}

function proposeMaterial(
  plate: ThreeMfPlate,
  filament: ThreeMfFilament,
  materials: CostConfig['materials'],
): ThreeMfMaterialProposal {
  if (!filament.materialFamily) {
    return {
      plateIndex: plate.index,
      filamentId: filament.id,
      candidateIds: [],
      reason: 'missing',
    }
  }

  const candidates = materials.filter((material) => material.family === filament.materialFamily)
  if (candidates.length === 1) {
    const only = candidates[0]
    if (only) {
      return {
        plateIndex: plate.index,
        filamentId: filament.id,
        materialId: only.id,
        candidateIds: [only.id],
        reason: 'family',
      }
    }
  }
  if (candidates.length > 1) {
    return {
      plateIndex: plate.index,
      filamentId: filament.id,
      candidateIds: candidates.map((material) => material.id),
      reason: 'ambiguous',
    }
  }

  return {
    plateIndex: plate.index,
    filamentId: filament.id,
    candidateIds: [],
    reason: 'missing',
  }
}

function choiceKey(plateIndex: number, filamentId: number): string {
  return `${plateIndex}:${filamentId}`
}

function fallbackLineName(fileName: string, plateIndex: number): string {
  const base = fileName.replace(/\.3mf$/i, '').trim() || 'Import .3mf'
  return `${base} — piatto ${plateIndex}`
}

function normalizeLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
