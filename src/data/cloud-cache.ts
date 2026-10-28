import type { DataRepository } from './repository'
import type { AppData } from './storage'
import {
  createInitialData,
  downloadAppData,
  migrateAppData,
  parseImportFile,
  SCHEMA_VERSION,
} from './storage'
import { createEmptyDraft } from './seed'
import { parseAppData } from './schemas'
import { StorageError } from './errors'

export const CLOUD_CACHE_KEY = 'layercost:cloud-cache'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function hasCloudCache(): boolean {
  return Boolean(getStorage()?.getItem(CLOUD_CACHE_KEY))
}

/**
 * Reads the connected-mode cache. The cache is derived from the cloud, so a
 * corrupted payload is dropped instead of blocking the app; the next pull
 * rebuilds it. It never overwrites `layercost:data`.
 */
export function loadCloudCache(): AppData | undefined {
  const storage = getStorage()
  if (!storage) return undefined
  const raw = storage.getItem(CLOUD_CACHE_KEY)
  if (!raw) return undefined

  try {
    const data = parseAppData(migrateAppData(JSON.parse(raw) as unknown))
    if (!data.draft) data.draft = createEmptyDraft(data.config)
    return data
  } catch {
    storage.removeItem(CLOUD_CACHE_KEY)
    return undefined
  }
}

export function saveCloudCache(data: AppData): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(CLOUD_CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossibile salvare la cache cloud nel browser.'
    throw new StorageError('saveFailed', `Salvataggio cache cloud non riuscito: ${message}`)
  }
}

export function removeCloudCache(): void {
  getStorage()?.removeItem(CLOUD_CACHE_KEY)
}

export const cloudCacheRepository: DataRepository = {
  load: async () => ({ data: loadCloudCache() ?? createInitialData() }),
  save: async (data) => saveCloudCache(data),
  export: async (data) => downloadAppData(data),
  import: parseImportFile,
  reset: async () => {
    removeCloudCache()
    return { ...createInitialData(), schemaVersion: SCHEMA_VERSION }
  },
}
