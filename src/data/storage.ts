import type { CostConfig, Quote } from '@/domain/types'
import { createEmptyDraft, createSeedConfig } from './seed'
import { parseAppData } from './schemas'

export const STORAGE_KEY = 'layercost:data'
export const SCHEMA_VERSION = 1 as const

export function migrateAppData(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (version === undefined) return raw
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    throw new Error('La versione dello schema non è valida.')
  }
  if (version > SCHEMA_VERSION) {
    throw new Error('I dati sono stati creati con una versione più recente di LayerCost.')
  }
  if (version === SCHEMA_VERSION) return raw
  throw new Error(`Schema v${version} non supportato.`)
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

export function loadAppData(): { data: AppData; warning?: string } {
  const storage = getStorage()
  if (!storage) {
    return {
      data: createInitialData(),
      warning: 'Lo storage locale non è disponibile: i dati non verranno salvati.',
    }
  }

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return { data: createInitialData() }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    const data = parseAppData(migrateAppData(parsed))
    if (!data.draft) {
      data.draft = createEmptyDraft(data.config)
    }
    return { data }
  } catch (error) {
    saveCorruptBackup(raw)
    const message = error instanceof Error ? error.message : 'I dati locali non sono leggibili.'
    return {
      data: createInitialData(),
      warning: `I dati locali non sono leggibili (${message}). È stata creata una configurazione iniziale; il dato originale è stato conservato, se possibile.`,
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
    throw new Error(`Salvataggio non riuscito: ${message}`)
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
    throw new Error('Il file non contiene JSON valido.')
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
