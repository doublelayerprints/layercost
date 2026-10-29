import type { MessageKey } from '@/i18n'
import { ThreeMfImportError, type ThreeMfImportErrorCode } from '@/data/three-mf/errors'
import { DEFAULT_THREE_MF_LIMITS } from '@/data/three-mf/limits'
import type { ThreeMfWarning, ThreeMfWarningCode } from '@/domain/three-mf'
import { DomainError } from '@/domain/units'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

function formatLimit(bytes: number): string {
  const mebibytes = bytes / (1024 * 1024)
  return mebibytes >= 1024 && mebibytes % 1024 === 0
    ? `${mebibytes / 1024} GB`
    : `${Math.round(mebibytes)} MB`
}

const ERROR_KEYS: Record<ThreeMfImportErrorCode, MessageKey> = {
  NOT_A_ZIP: 'import.error.NOT_A_ZIP',
  NOT_A_3MF: 'import.error.NOT_A_3MF',
  ARCHIVE_TOO_LARGE: 'import.error.ARCHIVE_TOO_LARGE',
  TOO_MANY_ENTRIES: 'import.error.TOO_MANY_ENTRIES',
  UNSAFE_PATH: 'import.error.UNSAFE_PATH',
  ENCRYPTED_ENTRY: 'import.error.ENCRYPTED_ENTRY',
  UNSUPPORTED_COMPRESSION: 'import.error.UNSUPPORTED_COMPRESSION',
  UNSUPPORTED_ZIP64: 'import.error.UNSUPPORTED_ZIP64',
  UNSUPPORTED_MULTI_DISK: 'import.error.UNSUPPORTED_MULTI_DISK',
  DUPLICATE_ENTRY: 'import.error.DUPLICATE_ENTRY',
  CORRUPT_ZIP: 'import.error.CORRUPT_ZIP',
  METADATA_TOO_LARGE: 'import.error.METADATA_TOO_LARGE',
  INVALID_TEXT: 'import.error.INVALID_TEXT',
  INVALID_XML: 'import.error.INVALID_XML',
  UNSAFE_XML: 'import.error.UNSAFE_XML',
  INVALID_PROJECT_SETTINGS: 'import.error.INVALID_PROJECT_SETTINGS',
  INVALID_SLICE_INFO: 'import.error.INVALID_SLICE_INFO',
  NOT_SLICED: 'import.error.NOT_SLICED',
  TOO_MANY_PLATES: 'import.error.TOO_MANY_PLATES',
  NO_USABLE_PLATES: 'import.error.NO_USABLE_PLATES',
  GCODE_FALLBACK_TOO_LARGE: 'import.error.GCODE_FALLBACK_TOO_LARGE',
  XML_PARSER_UNAVAILABLE: 'import.error.XML_PARSER_UNAVAILABLE',
  UNKNOWN: 'import.error.UNKNOWN',
}

const WARNING_KEYS: Record<ThreeMfWarningCode, MessageKey> = {
  PROJECT_SETTINGS_MISSING: 'import.warning.PROJECT_SETTINGS_MISSING',
  MODEL_SETTINGS_MISSING: 'import.warning.MODEL_SETTINGS_MISSING',
  PRINTER_UNKNOWN: 'import.warning.PRINTER_UNKNOWN',
  PLATE_INDEX_INVALID: 'import.warning.PLATE_INDEX_INVALID',
  PLATE_INDEX_DUPLICATE: 'import.warning.PLATE_INDEX_DUPLICATE',
  PREDICTION_MISSING: 'import.warning.PREDICTION_MISSING',
  WEIGHT_MISSING: 'import.warning.WEIGHT_MISSING',
  WEIGHT_MISMATCH: 'import.warning.WEIGHT_MISMATCH',
  FILAMENTS_MISSING: 'import.warning.FILAMENTS_MISSING',
  FILAMENT_TYPE_MISSING: 'import.warning.FILAMENT_TYPE_MISSING',
  FILAMENT_GRAMS_MISSING: 'import.warning.FILAMENT_GRAMS_MISSING',
  UNKNOWN_MATERIAL: 'import.warning.UNKNOWN_MATERIAL',
  GCODE_FALLBACK: 'import.warning.GCODE_FALLBACK',
  GCODE_FALLBACK_MATERIALS: 'import.warning.GCODE_FALLBACK_MATERIALS',
}

const MAPPING_KEYS: Record<string, MessageKey> = {
  THREE_MF_MAPPING_PLATE: 'import.mapping.PLATE',
  THREE_MF_MAPPING_MATERIAL: 'import.mapping.MATERIAL',
  THREE_MF_MAPPING_PRINTER: 'import.mapping.PRINTER',
  THREE_MF_MAPPING_ID: 'import.mapping.ID',
}

export function threeMfErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof ThreeMfImportError) {
    if (error.code === 'ARCHIVE_TOO_LARGE') {
      return t('import.error.ARCHIVE_TOO_LARGE', {
        compressed: formatLimit(DEFAULT_THREE_MF_LIMITS.maxCompressedBytes),
        uncompressed: formatLimit(DEFAULT_THREE_MF_LIMITS.maxTotalUncompressedBytes),
      })
    }
    return t(ERROR_KEYS[error.code])
  }
  return t('import.fileError')
}

export function threeMfWarningMessage(warning: ThreeMfWarning, t: Translate): string {
  const key = WARNING_KEYS[warning.code]
  if (!key) return warning.message
  return t(key, warning.plateIndex === undefined ? undefined : { plate: warning.plateIndex })
}

export function threeMfMappingErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof DomainError) {
    const key = MAPPING_KEYS[error.code]
    if (key) return t(key)
  }
  return t('import.mappingError')
}
