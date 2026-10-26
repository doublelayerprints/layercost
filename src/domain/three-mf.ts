import type { MaterialFamily } from './types'

/**
 * Riepilogo normalizzato di un file `.3mf` già slicato.
 * Questo tipo è puro: non conosce ZIP, XML, browser o storage.
 */
export type ThreeMfSlicer = 'anycubic' | 'bambu' | 'orca' | 'unknown'

export type ThreeMfWarningCode =
  | 'PROJECT_SETTINGS_MISSING'
  | 'MODEL_SETTINGS_MISSING'
  | 'PRINTER_UNKNOWN'
  | 'PLATE_INDEX_INVALID'
  | 'PLATE_INDEX_DUPLICATE'
  | 'PREDICTION_MISSING'
  | 'WEIGHT_MISSING'
  | 'WEIGHT_MISMATCH'
  | 'FILAMENTS_MISSING'
  | 'FILAMENT_TYPE_MISSING'
  | 'FILAMENT_GRAMS_MISSING'
  | 'UNKNOWN_MATERIAL'
  | 'GCODE_FALLBACK'
  | 'GCODE_FALLBACK_MATERIALS'

export interface ThreeMfWarning {
  code: ThreeMfWarningCode
  message: string
  plateIndex?: number
}

export interface ThreeMfFilament {
  id: number
  type: string
  materialFamily: MaterialFamily | null
  color?: string
  usedCentigrams: number
  usedMeters: number
}

export interface ThreeMfPlate {
  index: number
  name?: string
  predictionSeconds: number | null
  weightCentigrams: number | null
  filaments: ThreeMfFilament[]
  source: 'slice_info' | 'gcode'
}

export interface ThreeMfSummary {
  fileName: string
  slicer: ThreeMfSlicer
  slicerVersion?: string
  application?: string
  printerModel?: string
  printerModelId?: string
  printerSettingsId?: string
  plates: ThreeMfPlate[]
  warnings: ThreeMfWarning[]
}
