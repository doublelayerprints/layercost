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

/** One outbox and one metadata map per workspace. */
export function syncStateKey(workspaceId: string): string {
  return `${SYNC_STATE_KEY}:${workspaceId}`
}

export function loadSyncState(workspaceId: string): SyncLocalState {
  const storage = getStorage()
  if (!storage) return emptySyncState()
  const key = syncStateKey(workspaceId)
  const raw = storage.getItem(key)
  if (!raw) return emptySyncState()
  const state = parseState(raw)
  if (!state) {
    storage.removeItem(key)
    return emptySyncState()
  }
  return { ...state, workspaceId }
}

export function saveSyncState(workspaceId: string, state: SyncLocalState): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(syncStateKey(workspaceId), JSON.stringify({ ...state, workspaceId }))
  } catch {
    // The app keeps working in local mode; the next successful write retries.
  }
}

export function clearSyncState(workspaceId: string): void {
  getStorage()?.removeItem(syncStateKey(workspaceId))
}

/**
 * Moves the pre-multi-workspace outbox to the first workspace it belonged to.
 * The legacy state carries its own `workspaceId`, so it is never replayed by
 * an unrelated workspace.
 */
export function migrateLegacySyncState(workspaceId: string): void {
  const storage = getStorage()
  if (!storage) return
  const legacy = storage.getItem(SYNC_STATE_KEY)
  if (!legacy) return

  const state = parseState(legacy)
  if (!state || (state.workspaceId !== undefined && state.workspaceId !== workspaceId)) return

  const key = syncStateKey(workspaceId)
  if (!storage.getItem(key)) {
    storage.setItem(key, JSON.stringify({ ...state, workspaceId }))
  }
  storage.removeItem(SYNC_STATE_KEY)
}
