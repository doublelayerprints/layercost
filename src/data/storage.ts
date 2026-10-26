import type { CostConfig, Quote } from '@/domain/types'
import { StorageError } from './errors'
import { createEmptyDraft, createSeedConfig } from './seed'
import { parseAppData } from './schemas'

export const STORAGE_KEY = 'layercost:data'
export const SCHEMA_VERSION = 3 as const
export const MIGRATION_BACKUP_PREFIX = 'layercost:backup:schema-'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function withQuoteLocale(value: unknown): unknown {
  if (!isRecord(value) || typeof value.locale === 'string') return value
  return { ...value, locale: 'it' }
}

function migrateV1ToV2(raw: JsonRecord): JsonRecord {
  // An export envelope wraps the app data; migrate the inner payload too.
  if (isRecord(raw.data) && 'schemaVersion' in raw.data) {
    return { ...raw, schemaVersion: 2, data: migrateV1ToV2(raw.data) }
  }
  return {
    ...raw,
    schemaVersion: 2,
    quotes: Array.isArray(raw.quotes) ? raw.quotes.map(withQuoteLocale) : raw.quotes,
    draft: withQuoteLocale(raw.draft),
  }
}

function migrateV2ToV3(raw: JsonRecord): JsonRecord {
  // v3 widens the quote status enum; existing draft and saved quotes stay valid.
  if (isRecord(raw.data) && 'schemaVersion' in raw.data) {
    return { ...raw, schemaVersion: 3, data: migrateV2ToV3(raw.data) }
  }
  return { ...raw, schemaVersion: 3 }
}

export function migrateAppData(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (version === undefined) return raw
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new StorageError('invalidSchemaVersion', 'La versione dello schema non è valida.')
  }
  if (version > SCHEMA_VERSION) {
    throw new StorageError(
      'futureSchema',
      'I dati sono stati creati con una versione più recente di LayerCost.',
    )
  }
  if (version === SCHEMA_VERSION) return raw

  let migrated = raw as JsonRecord
  let current = version
  if (current === 1) {
    migrated = migrateV1ToV2(migrated)
    current = 2
  }
  if (current === 2) {
    migrated = migrateV2ToV3(migrated)
    current = 3
  }
  if (current === SCHEMA_VERSION) return migrated
  throw new StorageError('unsupportedSchema', `Schema v${current} non supportato.`)
}

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION
  config: CostConfig
  quotes: Quote[]
  draft: Quote
}

export function createInitialData(): AppData {
  const config = createSeedConfig()
  return {
    schemaVersion: SCHEMA_VERSION,
    config,
    quotes: [],
    draft: createEmptyDraft(config),
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function saveCorruptBackup(raw: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(`layercost:corrupt:${Date.now()}`, raw)
  } catch {
    // Il backup del dato corrotto è un extra: se non entra, non blocchiamo l'app.
  }
}

function storedSchemaVersion(raw: unknown): number | undefined {
  if (!isRecord(raw)) return undefined
  const version = raw.schemaVersion
  return typeof version === 'number' && Number.isInteger(version) ? version : undefined
}

/** Keeps the raw pre-migration payload under a stable key, one per schema version. */
function saveMigrationBackup(raw: string, version: number): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(`${MIGRATION_BACKUP_PREFIX}${version}`, raw)
  } catch {
    // A full storage must not block the app: the original data is still migrated in memory.
  }
}

/** Code shown by the shell when local data needs attention. */
export type LoadWarning = 'storageUnavailable' | 'corruptData'

export function loadAppData(): { data: AppData; warning?: LoadWarning } {
  const storage = getStorage()
  if (!storage) {
    return {
      data: createInitialData(),
      warning: 'storageUnavailable',
    }
  }

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return { data: createInitialData() }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const version = storedSchemaVersion(parsed)
    if (version !== undefined && version < SCHEMA_VERSION) {
      saveMigrationBackup(raw, version)
    }
    const data = parseAppData(migrateAppData(parsed))
    if (!data.draft) {
      data.draft = createEmptyDraft(data.config)
    }
    return { data }
  } catch {
    saveCorruptBackup(raw)
    return {
      data: createInitialData(),
      warning: 'corruptData',
    }
  }
}

export function saveAppData(data: AppData): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossibile salvare i dati nel browser.'
    throw new StorageError('saveFailed', `Salvataggio non riuscito: ${message}`)
  }
}

export function buildExportEnvelope(data: AppData) {
  return {
    app: 'LayerCost',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export function downloadAppData(data: AppData): void {
  const envelope = buildExportEnvelope(data)
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`
  anchor.href = url
  anchor.download = `layercost-backup-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function parseImportFile(file: File): Promise<AppData> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new StorageError('invalidJson', 'Il file non contiene JSON valido.')
  }
  return parseAppData(migrateAppData(parsed))
}

export function resetStoredData(): AppData {
  const storage = getStorage()
  storage?.removeItem(STORAGE_KEY)
  return createInitialData()
}

export function hasStoredData(): boolean {
  return Boolean(getStorage()?.getItem(STORAGE_KEY))
}
