import { emptySyncState, type SyncLocalState, type SyncOperation } from './sync'

export const SYNC_STATE_KEY = 'layercost:sync-state'

const ENTITIES = new Set([
  'settings',
  'energyTariff',
  'printer',
  'material',
  'extra',
  'quote',
])

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOperation(value: unknown): value is SyncOperation {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.entity === 'string' &&
    ENTITIES.has(value.entity) &&
    typeof value.entityId === 'string' &&
    (value.kind === 'upsert' || value.kind === 'delete') &&
    typeof value.createdAt === 'string' &&
    typeof value.attempts === 'number' &&
    (value.expectedUpdatedAt === undefined || typeof value.expectedUpdatedAt === 'string') &&
    (value.resurrect === undefined || typeof value.resurrect === 'boolean')
  )
}

function parseState(raw: string): SyncLocalState | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
  if (!isRecord(parsed) || parsed.version !== 1) return undefined
  if (!Array.isArray(parsed.operations)) return undefined
  if (!isRecord(parsed.metadata)) return undefined

  const operations = parsed.operations.filter(isOperation)
  const metadata: SyncLocalState['metadata'] = {}
  for (const [key, value] of Object.entries(parsed.metadata)) {
    if (
      isRecord(value) &&
      typeof value.updatedAt === 'string' &&
      typeof value.deleted === 'boolean'
    ) {
      metadata[key] = { updatedAt: value.updatedAt, deleted: value.deleted }
    }
  }

  return {
    version: 1,
    workspaceId: typeof parsed.workspaceId === 'string' ? parsed.workspaceId : undefined,
    operations,
    metadata,
    lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : undefined,
  }
}

export function loadSyncState(): SyncLocalState {
  const storage = getStorage()
  if (!storage) return emptySyncState()
  const raw = storage.getItem(SYNC_STATE_KEY)
  if (!raw) return emptySyncState()
  const state = parseState(raw)
  if (!state) {
    storage.removeItem(SYNC_STATE_KEY)
    return emptySyncState()
  }
  return state
}

export function saveSyncState(state: SyncLocalState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
  } catch {
    // The app keeps working in local mode; the next successful write retries.
  }
}

export function clearSyncState(): void {
  getStorage()?.removeItem(SYNC_STATE_KEY)
}
