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

/** One cache per workspace: switching spaces never overwrites another one. */
export function cloudCacheKey(workspaceId: string): string {
  return `${CLOUD_CACHE_KEY}:${workspaceId}`
}

/**
 * Moves the single-workspace cache to the workspace the user is connecting to.
 * It runs once: after the first successful connect every cache is namespaced.
 */
export function migrateLegacyCloudCache(workspaceId: string): void {
  const storage = getStorage()
  if (!storage) return
  const legacy = storage.getItem(CLOUD_CACHE_KEY)
  if (!legacy) return

  const key = cloudCacheKey(workspaceId)
  if (!storage.getItem(key)) {
    storage.setItem(key, legacy)
  }
  storage.removeItem(CLOUD_CACHE_KEY)
}

export function hasCloudCache(workspaceId: string): boolean {
  return Boolean(getStorage()?.getItem(cloudCacheKey(workspaceId)))
}

/**
 * Reads the connected-mode cache. The cache is derived from the cloud, so a
 * corrupted payload is dropped instead of blocking the app; the next pull
 * rebuilds it. It never overwrites `layercost:data`.
 */
export function loadCloudCache(workspaceId: string): AppData | undefined {
  const storage = getStorage()
  if (!storage) return undefined
  const key = cloudCacheKey(workspaceId)
  const raw = storage.getItem(key)
  if (!raw) return undefined

  try {
    const data = parseAppData(migrateAppData(JSON.parse(raw) as unknown))
    if (!data.draft) data.draft = createEmptyDraft(data.config)
    return data
  } catch {
    storage.removeItem(key)
    return undefined
  }
}

export function saveCloudCache(workspaceId: string, data: AppData): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(cloudCacheKey(workspaceId), JSON.stringify(data))
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Impossibile salvare la cache cloud nel browser.'
    throw new StorageError('saveFailed', `Salvataggio cache cloud non riuscito: ${message}`)
  }
}

export function removeCloudCache(workspaceId: string): void {
  getStorage()?.removeItem(cloudCacheKey(workspaceId))
}

/** The repository writes to the active workspace only. */
export function createCloudCacheRepository(workspaceId: string): DataRepository {
  return {
    load: async () => ({ data: loadCloudCache(workspaceId) ?? createInitialData() }),
    save: async (data) => saveCloudCache(workspaceId, data),
    export: async (data) => downloadAppData(data),
    import: parseImportFile,
    reset: async () => {
      removeCloudCache(workspaceId)
      return { ...createInitialData(), schemaVersion: SCHEMA_VERSION }
    },
  }
}
