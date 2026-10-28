import type {
  CostConfig,
  EnergyTariff,
  Extra,
  Material,
  Printer,
  Quote,
  Settings,
} from '@/domain/types'
import type { AppData } from '@/data/storage'
import { SCHEMA_VERSION } from '@/data/storage'
import { createSeedConfig } from '@/data/seed'
import { draftHasContent } from '@/lib/draft'
import type { Tables } from './database.types'
import { configFromRows, quoteFromRow } from './mappers'

export type CloudEntity =
  | 'settings'
  | 'energyTariff'
  | 'printer'
  | 'material'
  | 'extra'
  | 'quote'

export type SyncOperationKind = 'upsert' | 'delete'

export type SyncPayload =
  | Settings
  | EnergyTariff
  | Printer
  | Material
  | Extra
  | Quote

export interface SyncOperation {
  id: string
  entity: CloudEntity
  entityId: string
  kind: SyncOperationKind
  payload?: SyncPayload
  /** Last `updated_at` seen from the server; the update is rejected if it changed. */
  expectedUpdatedAt?: string
  /** Re-create a row that was soft-deleted remotely (only after an explicit choice). */
  resurrect?: boolean
  createdAt: string
  attempts: number
}

export interface SyncMetadataEntry {
  updatedAt: string
  deleted: boolean
}

export type SyncMetadata = Record<string, SyncMetadataEntry>

export interface SyncLocalState {
  version: 1
  /** Prevents a cache/outbox from another workspace being replayed by mistake. */
  workspaceId?: string
  operations: SyncOperation[]
  metadata: SyncMetadata
  lastSyncedAt?: string
}

export function emptySyncState(): SyncLocalState {
  return { version: 1, operations: [], metadata: {} }
}

export function syncKey(entity: CloudEntity, entityId: string): string {
  return `${entity}:${entityId}`
}

export interface DataChange {
  entity: CloudEntity
  id: string
  kind: SyncOperationKind
  payload?: SyncPayload
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function settingsWithoutTariffs(settings: Settings): Settings {
  return { ...settings, tariffs: [] }
}

type EntityPayload = Exclude<SyncPayload, Settings>

function diffEntities<T extends EntityPayload>(
  entity: CloudEntity,
  previous: T[],
  next: T[],
  changes: DataChange[],
): void {
  const before = new Map(previous.map((item) => [item.id, item]))
  const after = new Map(next.map((item) => [item.id, item]))

  for (const item of next) {
    const old = before.get(item.id)
    if (!old || !jsonEqual(old, item)) {
      changes.push({ entity, id: item.id, kind: 'upsert', payload: item })
    }
  }

  for (const item of previous) {
    if (!after.has(item.id)) {
      changes.push({ entity, id: item.id, kind: 'delete' })
    }
  }
}

/**
 * Compares the last state seen by the sync engine with the new one. The draft
 * is intentionally ignored: it stays local and never enters the outbox.
 */
export function diffAppData(previous: AppData, next: AppData): DataChange[] {
  const changes: DataChange[] = []

  if (
    !jsonEqual(
      settingsWithoutTariffs(previous.config.settings),
      settingsWithoutTariffs(next.config.settings),
    )
  ) {
    changes.push({ entity: 'settings', id: 'settings', kind: 'upsert', payload: next.config.settings })
  }

  diffEntities(
    'energyTariff',
    previous.config.settings.tariffs,
    next.config.settings.tariffs,
    changes,
  )
  diffEntities('printer', previous.config.printers, next.config.printers, changes)
  diffEntities('material', previous.config.materials, next.config.materials, changes)
  diffEntities('extra', previous.config.extras, next.config.extras, changes)
  diffEntities('quote', previous.quotes, next.quotes, changes)

  return changes
}

export interface EnqueueOptions {
  workspaceId: string
  now: string
  newId: () => string
}

export function enqueueChanges(
  state: SyncLocalState,
  changes: DataChange[],
  options: EnqueueOptions,
): SyncLocalState {
  const operations = [...state.operations]

  for (const change of changes) {
    if (change.entity === 'settings' && change.kind === 'delete') continue

    const entityId = change.entity === 'settings' ? options.workspaceId : change.id
    const key = syncKey(change.entity, entityId)
    const metadata = state.metadata[key]
    const index = operations.findIndex(
      (operation) => operation.entity === change.entity && operation.entityId === entityId,
    )
    const existing = index >= 0 ? operations[index] : undefined

    if (change.kind === 'delete' && !metadata && !existing) {
      // A local entity created and removed before its first push has nothing to delete remotely.
      continue
    }

    const operation: SyncOperation = {
      id: existing?.id ?? options.newId(),
      entity: change.entity,
      entityId,
      kind: change.kind,
      payload: change.payload,
      expectedUpdatedAt: existing?.expectedUpdatedAt ?? metadata?.updatedAt,
      resurrect: change.kind === 'upsert' && (existing?.resurrect ?? metadata?.deleted) === true,
      createdAt: existing?.createdAt ?? options.now,
      attempts: 0,
    }

    if (index >= 0) operations[index] = operation
    else operations.push(operation)
  }

  return { ...state, operations }
}

const UPSERT_PRIORITY: Record<CloudEntity, number> = {
  settings: 0,
  energyTariff: 1,
  printer: 2,
  material: 3,
  extra: 4,
  quote: 5,
}

const DELETE_PRIORITY: Record<CloudEntity, number> = {
  quote: 0,
  extra: 1,
  material: 2,
  printer: 3,
  energyTariff: 4,
  settings: 5,
}

function compareOperations(left: SyncOperation, right: SyncOperation): number {
  if (left.kind !== right.kind) return left.kind === 'upsert' ? -1 : 1
  const priorities = left.kind === 'upsert' ? UPSERT_PRIORITY : DELETE_PRIORITY
  const priority = priorities[left.entity] - priorities[right.entity]
  if (priority !== 0) return priority
  return left.createdAt.localeCompare(right.createdAt)
}

/** Upserts first (settings and tariffs before their dependants), then deletes. */
export function nextPendingOperation(state: SyncLocalState): SyncOperation | undefined {
  return [...state.operations].sort(compareOperations)[0]
}

export function ackOperation(
  state: SyncLocalState,
  operationId: string,
  updatedAt: string,
): SyncLocalState {
  const operation = state.operations.find((candidate) => candidate.id === operationId)
  if (!operation) return state
  const key = syncKey(operation.entity, operation.entityId)
  return {
    ...state,
    operations: state.operations.filter((candidate) => candidate.id !== operationId),
    metadata: {
      ...state.metadata,
      [key]: { updatedAt, deleted: operation.kind === 'delete' },
    },
  }
}

/**
 * Acknowledges a pushed operation against the latest queue. If the user changed
 * the same entity while the request was in flight, the newer payload stays
 * queued with the fresh server timestamp instead of being overwritten.
 */
export function ackPushedOperation(
  state: SyncLocalState,
  pushed: SyncOperation,
  updatedAt: string,
): SyncLocalState {
  const current = state.operations.find((operation) => operation.id === pushed.id)
  const key = syncKey(pushed.entity, pushed.entityId)
  const metadata = {
    ...state.metadata,
    [key]: { updatedAt, deleted: pushed.kind === 'delete' },
  }

  if (!current) return { ...state, metadata }

  const unchanged =
    current.kind === pushed.kind &&
    current.expectedUpdatedAt === pushed.expectedUpdatedAt &&
    current.resurrect === pushed.resurrect &&
    jsonEqual(current.payload, pushed.payload)

  if (unchanged) {
    return {
      ...state,
      operations: state.operations.filter((operation) => operation.id !== pushed.id),
      metadata,
    }
  }

  return {
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === pushed.id
        ? {
            ...operation,
            expectedUpdatedAt: updatedAt,
            resurrect:
              operation.kind === 'upsert' && pushed.kind === 'delete'
                ? true
                : operation.resurrect,
          }
        : operation,
    ),
    metadata,
  }
}

export function dropOperation(state: SyncLocalState, operationId: string): SyncLocalState {
  return {
    ...state,
    operations: state.operations.filter((operation) => operation.id !== operationId),
  }
}

export function operationMetadata(
  state: SyncLocalState,
  operation: SyncOperation,
): SyncMetadataEntry | undefined {
  return state.metadata[syncKey(operation.entity, operation.entityId)]
}

export interface CloudSnapshot {
  workspaceId: string
  settings: Tables<'settings'> | null
  tariffs: Tables<'energy_tariffs'>[]
  printers: Tables<'printers'>[]
  materials: Tables<'materials'>[]
  extras: Tables<'extras'>[]
  quotes: Tables<'quotes'>[]
}

export function isCloudEmpty(snapshot: CloudSnapshot): boolean {
  return snapshot.settings === null
}

export function snapshotToData(snapshot: CloudSnapshot, draft: Quote): AppData {
  if (!snapshot.settings) {
    throw new Error('cloud_snapshot_empty')
  }

  const config: CostConfig = configFromRows({
    settings: snapshot.settings,
    tariffs: snapshot.tariffs,
    printers: snapshot.printers,
    materials: snapshot.materials,
    extras: snapshot.extras,
  })

  const quotes = snapshot.quotes
    .filter((quote) => quote.deleted_at === null)
    .map((quote) => quoteFromRow(quote))

  return {
    schemaVersion: SCHEMA_VERSION,
    config,
    quotes,
    draft,
  }
}

export function metadataFromSnapshot(snapshot: CloudSnapshot): SyncMetadata {
  const metadata: SyncMetadata = {}
  if (snapshot.settings) {
    metadata[syncKey('settings', snapshot.workspaceId)] = {
      updatedAt: snapshot.settings.updated_at,
      deleted: false,
    }
  }
  const rows: Array<{
    entity: CloudEntity
    rows: Array<{ id: string; updated_at: string; deleted_at: string | null }>
  }> = [
    { entity: 'energyTariff', rows: snapshot.tariffs },
    { entity: 'printer', rows: snapshot.printers },
    { entity: 'material', rows: snapshot.materials },
    { entity: 'extra', rows: snapshot.extras },
    { entity: 'quote', rows: snapshot.quotes },
  ]
  for (const group of rows) {
    for (const row of group.rows) {
      metadata[syncKey(group.entity, row.id)] = {
        updatedAt: row.updated_at,
        deleted: row.deleted_at !== null,
      }
    }
  }
  return metadata
}

export function hasMeaningfulData(data: AppData): boolean {
  if (data.quotes.length > 0) return true
  if (draftHasContent(data.draft)) return true
  return !jsonEqual(data.config, createSeedConfig())
}

export type FirstLoginDecision =
  | 'importCache'
  | 'importCurrent'
  | 'promptImport'
  | 'useCache'
  | 'useCloud'
  | 'promptCloudWins'

export function decideFirstLogin(input: {
  cloudEmpty: boolean
  hasCache: boolean
  localHasData: boolean
}): FirstLoginDecision {
  if (input.cloudEmpty) {
    if (input.hasCache) return 'importCache'
    if (input.localHasData) return 'promptImport'
    return 'importCurrent'
  }
  if (input.hasCache) return 'useCache'
  if (input.localHasData) return 'promptCloudWins'
  return 'useCloud'
}
