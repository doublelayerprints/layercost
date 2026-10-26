import type { MaterialFamily } from '@/domain/types'
import type {
  ThreeMfFilament,
  ThreeMfPlate,
  ThreeMfSlicer,
  ThreeMfSummary,
  ThreeMfWarning,
} from '@/domain/three-mf'
import { ThreeMfImportError } from './errors'
import { parseGcodeFallback } from './gcode'
import { resolveThreeMfLimits, type ThreeMfLimits } from './limits'
import {
  defaultXmlParser,
  elementsByTag,
  parseXml,
  readHeaderItems,
  readMetadataMap,
  readNamedMetadata,
  type XmlElementLike,
  type XmlParser,
} from './xml'
import { extractZipEntries, readZipIndex, type ZipIndex } from './zip'

const CONTENT_TYPES = '[Content_Types].xml'
const MODEL = '3D/3dmodel.model'
const PROJECT_SETTINGS = 'Metadata/project_settings.config'
const MODEL_SETTINGS = 'Metadata/model_settings.config'
const SLICE_INFO = 'Metadata/slice_info.config'
const PLATE_GCODE = /^Metadata\/plate_(\d+)\.gcode$/

const MATERIAL_ALIASES: Record<string, MaterialFamily> = {
  PLA: 'PLA',
  PLA_PLUS: 'PLA',
  PLA_SILK: 'PLA',
  PLA_MATTE: 'PLA',
  PLA_WOOD: 'PLA',
  PLA_METAL: 'PLA',
  PLA_GLOW: 'PLA',
  PLA_HIGH_SPEED: 'PLA',
  PLA_CF: 'PLA_CF',
  GENERIC_PLA: 'PLA',
  PETG: 'PETG',
  PETG_CF: 'PETG_CF',
  GENERIC_PETG: 'PETG',
  TPU: 'TPU',
  TPU_95A: 'TPU',
  TPU_FOR_ACE: 'TPU',
  GENERIC_TPU: 'TPU',
  ABS: 'ABS',
  GENERIC_ABS: 'ABS',
  ASA: 'ASA',
  GENERIC_ASA: 'ASA',
  PVA: 'PVA',
  PA: 'PA',
  PA6: 'PA',
  PA_CF: 'PA',
  PA6_CF: 'PA',
  PC: 'PC',
  HIPS: 'HIPS',
  OTHER: 'OTHER',
}

export interface ThreeMfParseOptions {
  xmlParser?: XmlParser
  limits?: Partial<ThreeMfLimits>
}

interface ProjectSettings {
  printerModel?: string
  printerSettingsId?: string
  filamentTypes: string[]
  filamentColours: string[]
}

interface ParsedSlicePlate {
  plate: ThreeMfPlate
  printerModelId?: string
}

interface SliceInfoResult {
  slicer: ThreeMfSlicer
  slicerVersion?: string
  printerModelId?: string
  plates: ThreeMfPlate[]
}

export function parseThreeMf(
  fileName: string,
  bytes: Uint8Array,
  options: ThreeMfParseOptions = {},
): ThreeMfSummary {
  const limits = resolveThreeMfLimits(options.limits)
  const xmlParser = options.xmlParser ?? defaultXmlParser
  const index = readZipIndex(bytes, limits)

  if (!index.byName.has(CONTENT_TYPES) || !index.byName.has(MODEL)) {
    throw new ThreeMfImportError(
      'NOT_A_3MF',
      'Questo file non sembra un .3mf valido. Scegli un file esportato dallo slicer.',
    )
  }

  const warnings: ThreeMfWarning[] = []
  const metadataNames: string[] = []
  for (const name of [PROJECT_SETTINGS, MODEL_SETTINGS, SLICE_INFO]) {
    if (index.byName.has(name)) metadataNames.push(name)
  }
  const modelEntry = index.byName.get(MODEL)
  if (modelEntry && modelEntry.uncompressedSize <= limits.maxMetadataBytes) {
    metadataNames.push(MODEL)
  }

  const extracted = extractZipEntries(bytes, index, metadataNames, {
    maxEntryBytes: limits.maxMetadataBytes,
    tooLargeCode: 'METADATA_TOO_LARGE',
  })

  const projectSettings = readProjectSettings(extracted.get(PROJECT_SETTINGS), warnings)
  const plateNames = readPlateNames(extracted.get(MODEL_SETTINGS), xmlParser, warnings)
  const application = readApplication(extracted.get(MODEL), xmlParser)

  const sliceInfo = extracted.has(SLICE_INFO)
    ? parseSliceInfo(
        extracted.get(SLICE_INFO),
        xmlParser,
        limits,
        projectSettings,
        plateNames,
        warnings,
      )
    : undefined

  const gcodeResult =
    !sliceInfo || sliceInfo.plates.length === 0
      ? parseGcodePlates(bytes, index, limits, plateNames, warnings, application)
      : undefined

  const plates = (sliceInfo?.plates.length ? sliceInfo.plates : gcodeResult?.plates) ?? []
  if (plates.length === 0) {
    throw new ThreeMfImportError(
      'NOT_SLICED',
      'Il file non contiene un preventivo slicato. Apri il progetto nello slicer, slica e esporta come .gcode.3mf.',
    )
  }

  const dedupedPlates = dedupePlates(plates, warnings)
  if (dedupedPlates.length === 0) {
    throw new ThreeMfImportError(
      'NO_USABLE_PLATES',
      'Nessun piatto contiene tempo e grammi validi. Riesporta il file dallo slicer.',
    )
  }

  const printerModel =
    projectSettings.printerModel ?? sliceInfo?.printerModelId ?? projectSettings.printerSettingsId
  if (!printerModel) {
    warnings.push({
      code: 'PRINTER_UNKNOWN',
      message: 'La stampante non è dichiarata nel file: scegline una nell’anteprima.',
    })
  }

  const slicer = gcodeResult ?? sliceInfo ?? { slicer: 'unknown' as const, plates: [] }
  const usable = dedupedPlates.some(
    (plate) =>
      plate.predictionSeconds !== null &&
      plate.filaments.some((filament) => filament.usedCentigrams > 0),
  )
  if (!usable) {
    throw new ThreeMfImportError(
      'NO_USABLE_PLATES',
      'Nessun piatto contiene tempo e grammi validi. Riesporta il file dallo slicer.',
    )
  }

  return {
    fileName: displayFileName(fileName),
    slicer: slicer.slicer,
    slicerVersion: slicer.slicerVersion,
    application,
    printerModel,
    printerModelId: sliceInfo?.printerModelId,
    printerSettingsId: projectSettings.printerSettingsId,
    plates: dedupedPlates,
    warnings,
  }
}

function displayFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() ?? ''
  return (base || 'file.3mf').slice(0, 200)
}

function decodeText(bytes: Uint8Array, label: string, fatal = true): string {
  try {
    const text = new TextDecoder('utf-8', { fatal }).decode(bytes)
    return text.replace(/^\uFEFF/, '')
  } catch (error) {
    throw new ThreeMfImportError('INVALID_TEXT', `Il file ${label} non è testo UTF-8 valido.`, {
      cause: error,
    })
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
  }
  if (typeof value === 'string') return [value.trim()]
  return []
}

function readProjectSettings(
  bytes: Uint8Array | undefined,
  warnings: ThreeMfWarning[],
): ProjectSettings {
  if (!bytes) {
    warnings.push({
      code: 'PROJECT_SETTINGS_MISSING',
      message:
        'Il file non contiene project_settings.config: stampante e materiali vanno mappati a mano.',
    })
    return { filamentTypes: [], filamentColours: [] }
  }

  let raw: unknown
  try {
    raw = JSON.parse(decodeText(bytes, PROJECT_SETTINGS)) as unknown
  } catch (error) {
    if (error instanceof ThreeMfImportError) throw error
    throw new ThreeMfImportError(
      'INVALID_PROJECT_SETTINGS',
      'Le impostazioni del progetto non sono leggibili. Riesporta il file dallo slicer.',
      { cause: error },
    )
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ThreeMfImportError(
      'INVALID_PROJECT_SETTINGS',
      'Le impostazioni del progetto non sono leggibili. Riesporta il file dallo slicer.',
    )
  }

  const record = raw as Record<string, unknown>
  return {
    printerModel: readString(record.printer_model),
    printerSettingsId: readString(record.printer_settings_id),
    filamentTypes: toStringArray(record.filament_type),
    filamentColours: toStringArray(record.filament_colour),
  }
}

function readPlateNames(
  bytes: Uint8Array | undefined,
  xmlParser: XmlParser,
  warnings: ThreeMfWarning[],
): Map<number, string> {
  if (!bytes) {
    warnings.push({
      code: 'MODEL_SETTINGS_MISSING',
      message: 'Il file non contiene model_settings.config: i piatti useranno il nome del file.',
    })
    return new Map()
  }

  const root = parseXml(
    decodeText(bytes, MODEL_SETTINGS),
    xmlParser,
    'config',
    'INVALID_XML',
    MODEL_SETTINGS,
  )
  const result = new Map<number, string>()
  for (const plate of elementsByTag(root, 'plate')) {
    const metadata = readMetadataMap(plate)
    const id = parsePositiveInteger(metadata.get('plater_id'))
    const name = metadata.get('plater_name')?.trim()
    if (id !== null && name && !result.has(id)) result.set(id, name)
  }
  return result
}

function readApplication(bytes: Uint8Array | undefined, xmlParser: XmlParser): string | undefined {
  if (!bytes) return undefined
  const root = parseXml(decodeText(bytes, MODEL), xmlParser, 'model', 'INVALID_XML', MODEL)
  return readNamedMetadata(root).get('Application')?.trim() || undefined
}

function parseSliceInfo(
  bytes: Uint8Array | undefined,
  xmlParser: XmlParser,
  limits: ThreeMfLimits,
  projectSettings: ProjectSettings,
  plateNames: Map<number, string>,
  warnings: ThreeMfWarning[],
): SliceInfoResult {
  if (!bytes) return { slicer: 'unknown', plates: [] }

  const root = parseXml(
    decodeText(bytes, SLICE_INFO),
    xmlParser,
    'config',
    'INVALID_SLICE_INFO',
    SLICE_INFO,
  )
  const headers = readHeaderItems(root)
  const slicer = detectSlicer(headers)
  const plateElements = elementsByTag(root, 'plate')
  if (plateElements.length > limits.maxPlates) {
    throw new ThreeMfImportError(
      'TOO_MANY_PLATES',
      `Il file contiene più di ${limits.maxPlates} piatti. Importa un progetto più piccolo.`,
    )
  }

  const parsed: ParsedSlicePlate[] = []
  let printerModelId: string | undefined
  for (let index = 0; index < plateElements.length; index += 1) {
    const element = plateElements[index]
    if (!element) continue
    const result = parseSlicePlate(element, index + 1, projectSettings, plateNames, warnings)
    parsed.push(result)
    if (!printerModelId && result.printerModelId) printerModelId = result.printerModelId
  }

  return {
    slicer: slicer.slicer,
    slicerVersion: slicer.slicerVersion,
    printerModelId,
    plates: parsed.map((item) => item.plate).sort((a, b) => a.index - b.index),
  }
}

function parseSlicePlate(
  element: XmlElementLike,
  fallbackIndex: number,
  projectSettings: ProjectSettings,
  plateNames: Map<number, string>,
  warnings: ThreeMfWarning[],
): ParsedSlicePlate {
  const metadata = readMetadataMap(element)
  const rawIndex = parsePositiveInteger(metadata.get('index'))
  const index = rawIndex ?? fallbackIndex
  if (rawIndex === null) {
    warnings.push({
      code: 'PLATE_INDEX_INVALID',
      message: `Il piatto ${fallbackIndex} non ha un indice valido: uso l’ordine nel file.`,
      plateIndex: fallbackIndex,
    })
  }

  const predictionSeconds = parsePositiveInteger(metadata.get('prediction'))
  if (predictionSeconds === null) {
    warnings.push({
      code: 'PREDICTION_MISSING',
      message: `Il piatto ${index} non contiene un tempo di stampa valido.`,
      plateIndex: index,
    })
  }

  const weightCentigrams = parseGramsToCentigrams(metadata.get('weight'))
  if (weightCentigrams === null) {
    warnings.push({
      code: 'WEIGHT_MISSING',
      message: `Il piatto ${index} non contiene un peso valido: uso la somma dei filamenti.`,
      plateIndex: index,
    })
  }

  const filaments: ThreeMfFilament[] = []
  const filamentElements = elementsByTag(element, 'filament')
  for (let filamentIndex = 0; filamentIndex < filamentElements.length; filamentIndex += 1) {
    const filamentElement = filamentElements[filamentIndex]
    if (!filamentElement) continue
    const id =
      parsePositiveInteger(filamentElement.getAttribute('id') ?? undefined) ?? filamentIndex + 1
    const typeFromSlice = filamentElement.getAttribute('type')?.trim()
    const typeFromSettings = projectSettings.filamentTypes[id - 1]
    const type = typeFromSlice || typeFromSettings || ''
    const color =
      filamentElement.getAttribute('color')?.trim() || projectSettings.filamentColours[id - 1]
    const usedCentigrams = parseGramsToCentigrams(
      filamentElement.getAttribute('used_g') ?? undefined,
    )
    if (usedCentigrams === null) {
      warnings.push({
        code: 'FILAMENT_GRAMS_MISSING',
        message: `Il filamento ${id} del piatto ${index} non contiene grammi validi.`,
        plateIndex: index,
      })
    }
    const materialFamily = type ? mapMaterialFamily(type) : null
    if (!type) {
      warnings.push({
        code: 'FILAMENT_TYPE_MISSING',
        message: `Il filamento ${id} del piatto ${index} non dichiara il tipo: mappalo nell’anteprima.`,
        plateIndex: index,
      })
    } else if (!materialFamily) {
      warnings.push({
        code: 'UNKNOWN_MATERIAL',
        message: `Nessun materiale corrisponde a ${type}: mappalo o aggiungilo in Materiali.`,
        plateIndex: index,
      })
    }
    filaments.push({
      id,
      type: type || 'UNKNOWN',
      materialFamily,
      color: color || undefined,
      usedCentigrams: usedCentigrams ?? 0,
      usedMeters: parseNonNegativeNumber(filamentElement.getAttribute('used_m') ?? undefined) ?? 0,
    })
  }

  if (filaments.length === 0) {
    warnings.push({
      code: 'FILAMENTS_MISSING',
      message: `Il piatto ${index} non contiene filamenti.`,
      plateIndex: index,
    })
  }

  const sum = filaments.reduce((total, filament) => total + filament.usedCentigrams, 0)
  if (
    weightCentigrams !== null &&
    ((weightCentigrams === 0 && sum > 0) ||
      (weightCentigrams > 0 && Math.abs(sum - weightCentigrams) * 100 > weightCentigrams))
  ) {
    warnings.push({
      code: 'WEIGHT_MISMATCH',
      message: `Il peso del piatto ${index} non coincide con la somma dei filamenti: controlla i grammi.`,
      plateIndex: index,
    })
  }

  return {
    plate: {
      index,
      name: plateNames.get(index),
      predictionSeconds,
      weightCentigrams,
      filaments,
      source: 'slice_info',
    },
    printerModelId: metadata.get('printer_model_id')?.trim() || undefined,
  }
}

function parseGcodePlates(
  bytes: Uint8Array,
  index: ZipIndex,
  limits: ThreeMfLimits,
  plateNames: Map<number, string>,
  warnings: ThreeMfWarning[],
  application: string | undefined,
): SliceInfoResult {
  const entries = index.entries
    .map((entry) => {
      const match = PLATE_GCODE.exec(entry.name)
      return match ? { entry, plateIndex: Number(match[1]) } : undefined
    })
    .filter((item): item is { entry: ZipIndex['entries'][number]; plateIndex: number } =>
      Boolean(item),
    )
    .filter((item) => Number.isSafeInteger(item.plateIndex) && item.plateIndex > 0)
    .sort((a, b) => a.plateIndex - b.plateIndex)

  if (entries.length === 0) {
    throw new ThreeMfImportError(
      'NOT_SLICED',
      'Il file non contiene un preventivo slicato. Apri il progetto nello slicer, slica e esporta come .gcode.3mf.',
    )
  }
  if (entries.length > limits.maxPlates) {
    throw new ThreeMfImportError(
      'TOO_MANY_PLATES',
      `Il file contiene più di ${limits.maxPlates} piatti. Importa un progetto più piccolo.`,
    )
  }

  const plates: ThreeMfPlate[] = []
  let generatedBy: string | undefined
  for (const { entry, plateIndex } of entries) {
    if (entry.uncompressedSize > limits.maxGcodeFallbackBytes) {
      throw new ThreeMfImportError(
        'GCODE_FALLBACK_TOO_LARGE',
        `Il G-code del piatto ${plateIndex} è troppo grande per la lettura di emergenza. Riesporta il file dallo slicer con le informazioni di slicing.`,
      )
    }
    const extracted = extractZipEntries(bytes, index, [entry.name], {
      maxEntryBytes: limits.maxGcodeFallbackBytes,
      tooLargeCode: 'GCODE_FALLBACK_TOO_LARGE',
    })
    const data = extracted.get(entry.name)
    if (!data) {
      throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
    }
    const fallback = parseGcodeFallback(decodeText(data, entry.name, false))
    if (!generatedBy && fallback.generatedBy) generatedBy = fallback.generatedBy

    const grams =
      fallback.filamentCentigrams.length > 0
        ? fallback.filamentCentigrams
        : fallback.totalWeightCentigrams !== null
          ? [fallback.totalWeightCentigrams]
          : []
    if (fallback.predictionSeconds === null) {
      warnings.push({
        code: 'PREDICTION_MISSING',
        message: `Il G-code del piatto ${plateIndex} non contiene un tempo di stampa valido.`,
        plateIndex,
      })
    }
    if (grams.length === 0) {
      warnings.push({
        code: 'FILAMENTS_MISSING',
        message: `Il G-code del piatto ${plateIndex} non contiene grammi validi.`,
        plateIndex,
      })
    }
    const filaments: ThreeMfFilament[] = grams.map((centigrams, filamentIndex) => ({
      id: filamentIndex + 1,
      type: 'UNKNOWN',
      materialFamily: null,
      usedCentigrams: centigrams,
      usedMeters: 0,
    }))
    const sum = filaments.reduce((total, filament) => total + filament.usedCentigrams, 0)
    const weightCentigrams = fallback.totalWeightCentigrams ?? (sum > 0 ? sum : null)
    if (weightCentigrams === null) {
      warnings.push({
        code: 'WEIGHT_MISSING',
        message: `Il G-code del piatto ${plateIndex} non contiene un peso valido.`,
        plateIndex,
      })
    } else if (
      (weightCentigrams === 0 && sum > 0) ||
      (weightCentigrams > 0 && Math.abs(sum - weightCentigrams) * 100 > weightCentigrams)
    ) {
      warnings.push({
        code: 'WEIGHT_MISMATCH',
        message: `Il peso del piatto ${plateIndex} non coincide con i filamenti del G-code: controlla i grammi.`,
        plateIndex,
      })
    }
    plates.push({
      index: plateIndex,
      name: plateNames.get(plateIndex),
      predictionSeconds: fallback.predictionSeconds,
      weightCentigrams,
      filaments,
      source: 'gcode',
    })
  }

  warnings.push({
    code: 'GCODE_FALLBACK',
    message:
      'Tempo e grammi sono stati letti dal G-code: controlla l’anteprima e mappa i materiali.',
  })
  if (plates.some((plate) => plate.filaments.length > 0)) {
    warnings.push({
      code: 'GCODE_FALLBACK_MATERIALS',
      message: 'Il G-code non dichiara i materiali: mappali nell’anteprima.',
    })
  }

  const slicer = detectSlicerFromText(application, generatedBy)
  return {
    slicer: slicer.slicer,
    slicerVersion: slicer.slicerVersion,
    plates,
  }
}

function dedupePlates(plates: ThreeMfPlate[], warnings: ThreeMfWarning[]): ThreeMfPlate[] {
  const seen = new Set<number>()
  const result: ThreeMfPlate[] = []
  for (const plate of plates) {
    if (seen.has(plate.index)) {
      warnings.push({
        code: 'PLATE_INDEX_DUPLICATE',
        message: `Il piatto ${plate.index} compare più volte: tengo il primo.`,
        plateIndex: plate.index,
      })
      continue
    }
    seen.add(plate.index)
    result.push(plate)
  }
  return result.sort((a, b) => a.index - b.index)
}

function detectSlicer(headers: Map<string, string>): {
  slicer: ThreeMfSlicer
  slicerVersion?: string
} {
  const find = (name: string): string | undefined => {
    const lower = name.toLowerCase()
    for (const [key, value] of headers) {
      if (key.toLowerCase() === lower) return value.trim() || undefined
    }
    return undefined
  }

  const anycubic = find('X-ACNext-Client-Version')
  if (anycubic) return { slicer: 'anycubic', slicerVersion: anycubic }
  const orca =
    find('X-Orca-Client-Version') ??
    find('X-ORCA-Client-Version') ??
    find('X-OrcaSlicer-Client-Version')
  if (orca) return { slicer: 'orca', slicerVersion: orca }
  const bambu = find('X-BBL-Client-Version')
  if (bambu) return { slicer: 'bambu', slicerVersion: bambu }
  return { slicer: 'unknown' }
}

function detectSlicerFromText(
  application: string | undefined,
  generatedBy: string | undefined,
): { slicer: ThreeMfSlicer; slicerVersion?: string } {
  const text = `${application ?? ''} ${generatedBy ?? ''}`.toLowerCase()
  if (text.includes('anycubic') || text.includes('acnext')) {
    return { slicer: 'anycubic', slicerVersion: generatedBy ?? application }
  }
  if (text.includes('orca')) return { slicer: 'orca', slicerVersion: generatedBy ?? application }
  if (text.includes('bambu')) return { slicer: 'bambu', slicerVersion: generatedBy ?? application }
  return { slicer: 'unknown' }
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (value === undefined) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

function parseNonNegativeNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function parseGramsToCentigrams(value: string | undefined): number | null {
  if (value === undefined) return null
  const grams = Number(value)
  if (!Number.isFinite(grams) || grams < 0) return null
  const centigrams = Math.round(grams * 100)
  return Number.isSafeInteger(centigrams) ? centigrams : null
}

function mapMaterialFamily(type: string): MaterialFamily | null {
  const normalized = type
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/\+/g, '_PLUS')
  return MATERIAL_ALIASES[normalized] ?? null
}
