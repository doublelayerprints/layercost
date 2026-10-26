export interface ThreeMfLimits {
  /** Massimo file `.3mf` compresso accettato. */
  maxCompressedBytes: number
  /** Massimo totale dichiarato dei file decompressi nell'archivio. */
  maxTotalUncompressedBytes: number
  /** Massimo numero di entry nello ZIP. */
  maxEntries: number
  /** Massimo numero di piatti importabili. */
  maxPlates: number
  /** Massimo peso di un singolo file di metadati letto. */
  maxMetadataBytes: number
  /** Massimo peso del G-code letto nel fallback senza `slice_info.config`. */
  maxGcodeFallbackBytes: number
}

export const DEFAULT_THREE_MF_LIMITS: ThreeMfLimits = {
  maxCompressedBytes: 100 * 1024 * 1024,
  maxTotalUncompressedBytes: 500 * 1024 * 1024,
  maxEntries: 10_000,
  maxPlates: 100,
  maxMetadataBytes: 10 * 1024 * 1024,
  maxGcodeFallbackBytes: 64 * 1024 * 1024,
}

export function resolveThreeMfLimits(overrides?: Partial<ThreeMfLimits>): ThreeMfLimits {
  return { ...DEFAULT_THREE_MF_LIMITS, ...overrides }
}
