import { create } from 'zustand'
import type { Quote } from '@/domain/types'
import type { AppData } from '@/data/storage'
import { createInitialData, SCHEMA_VERSION } from '@/data/storage'
import { createEmptyDraft } from '@/data/seed'
import {
  hasCloudCache,
  loadCloudCache,
  migrateLegacyCloudCache,
  removeCloudCache,
} from '@/data/cloud-cache'
import { isCloudConfigured } from '@/data/cloud/client'
import {
  CloudError,
  createSupabaseCloudGateway,
  mapCloudError,
  type CloudConflictReason,
  type CloudGateway,
  type CloudPushResult,
} from '@/data/cloud/gateway'
import {
  ackOperation,
  ackPushedOperation,
  decideFirstLogin,
  diffAppData,
  dropOperation,
  emptySyncState,
  enqueueChanges,
  hasMeaningfulData,
  isCloudEmpty,
  metadataFromSnapshot,
  nextPendingOperation,
  snapshotToData,
  type CloudSnapshot,
  type SyncLocalState,
  type SyncOperation,
} from '@/data/cloud/sync'
import {
  clearSyncState,
  loadSyncState,
  migrateLegacySyncState,
  saveSyncState,
} from '@/data/cloud/sync-state'
import { consumeWorkspaceSeed, hasPendingWorkspaceSeed } from '@/data/workspace-preference'
import { newId } from '@/lib/id'
import { nowIso } from '@/lib/date'
import { useAppStore, type AppMode } from './app-store'
import { useAuthStore } from './auth-store'

export type SyncStatus =
  | 'disabled'
  | 'idle'
  | 'connecting'
  | 'firstLogin'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'offline'
  | 'conflict'
  | 'error'

export type SyncErrorCode =
  | 'network'
  | 'auth'
  | 'noWorkspace'
  | 'rateLimited'
  | 'limit'
  | 'invalidData'
  | 'backupFailed'
  | 'unknown'

export interface SyncConflict {
  operation: SyncOperation
  reason: CloudConflictReason
  remote?: unknown
  label?: string
  remoteUpdatedAt?: string
}

export type FirstLoginChoice = 'importLocal' | 'cloudWins' | 'cancel'
export type ConflictChoice = 'useRemote' | 'keepLocal' | 'duplicateLocal'

export interface SyncState {
  status: SyncStatus
  workspaceId?: string
  lastSyncedAt?: string
  pending: number
  conflict?: SyncConflict
  conflictOpen: boolean
  firstLogin?: { kind: Exclude<FirstLoginChoice, 'cancel'> }
  error?: SyncErrorCode

  connect: (workspaceId: string) => Promise<void>
  disconnect: () => Promise<void>
  syncNow: () => Promise<void>
  resolveFirstLogin: (choice: FirstLoginChoice) => Promise<void>
  resolveConflict: (choice: ConflictChoice) => Promise<void>
  openConflict: () => void
  closeConflict: () => void
  markExpired: () => void
  markOffline: () => void
}

export interface SyncStoreDeps {
  isConfigured: () => boolean
  createGateway: () => Promise<CloudGateway>
  auth: () => { status: string; userId?: string }
  app: {
    getData: () => AppData
    getDraft: () => Quote
    getMode: () => AppMode
    enterCloudMode: (data: AppData, workspaceId: string) => Promise<AppData>
    applyCloudData: (data: AppData) => Promise<AppData>
    exitCloudMode: () => Promise<AppData>
    flushPersistence: () => Promise<void>
    exportData: () => Promise<boolean>
    duplicateQuote: (quoteId: string) => void
    subscribe: (listener: () => void) => () => void
  }
  local: {
    hasCache: (workspaceId: string) => boolean
    loadCache: (workspaceId: string) => AppData | undefined
    removeCache: (workspaceId: string) => void
    migrateLegacy: (workspaceId: string) => void
  }
  syncState: {
    load: (workspaceId: string) => SyncLocalState
    save: (workspaceId: string, state: SyncLocalState) => void
    clear: (workspaceId: string) => void
    migrateLegacy: (workspaceId: string) => void
  }
  seed: {
    pending: (workspaceId: string) => boolean
    consume: (workspaceId: string) => void
  }
  now: () => string
  newId: () => string
  debounceMs?: number
}

function dataFromState(state: {
  config: AppData['config']
  quotes: Quote[]
  draft: Quote
}): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: state.config,
    quotes: state.quotes,
    draft: state.draft,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function operationLabel(operation: SyncOperation): string | undefined {
  const payload = operation.payload
  if (!payload || !isRecord(payload)) return undefined
  if (typeof payload.name === 'string') return payload.name
  if (typeof payload.label === 'string') return payload.label
  return undefined
}

function remoteUpdatedAt(remote: unknown): string | undefined {
  return isRecord(remote) && typeof remote.updated_at === 'string' ? remote.updated_at : undefined
}

function remoteDeleted(remote: unknown): boolean {
  return isRecord(remote) && typeof remote.deleted_at === 'string'
}

function buildConflict(operation: SyncOperation, result: CloudPushResult): SyncConflict | undefined {
  if (result.ok) return undefined
  return {
    operation,
    reason: result.conflict.reason,
    remote: result.conflict.remote,
    label: operationLabel(operation),
    remoteUpdatedAt: remoteUpdatedAt(result.conflict.remote),
  }
}

function syncErrorCode(error: unknown): SyncErrorCode {
  const mapped = error instanceof CloudError ? error : mapCloudError(error)
  switch (mapped.code) {
    case 'network':
      return 'network'
    case 'auth':
      return 'auth'
    case 'noWorkspace':
      return 'noWorkspace'
    case 'rateLimited':
      return 'rateLimited'
    case 'limit':
      return 'limit'
    default:
      return 'unknown'
  }
}

export function createSyncStore(deps: SyncStoreDeps) {
  let gateway: CloudGateway | undefined
  let gatewayPromise: Promise<CloudGateway> | undefined
  let workspaceId: string | undefined
  let connectedUserId: string | undefined
  let connectChain: Promise<void> = Promise.resolve()
  let connectGeneration = 0
  let syncing: { workspaceId: string; promise: Promise<void> } | undefined
  let unsubscribe: (() => void) | undefined
  let lastSeen: AppData | undefined
  let suppress = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let pendingFirstLogin: { workspaceId: string; snapshot: CloudSnapshot } | undefined

  return create<SyncState>()((set, get) => {
    const ensureGateway = (): Promise<CloudGateway> => {
      if (gateway) return Promise.resolve(gateway)
      if (!gatewayPromise) {
        gatewayPromise = deps
          .createGateway()
          .then((created) => {
            gateway = created
            return created
          })
          .catch((error: unknown) => {
            gatewayPromise = undefined
            throw error
          })
      }
      return gatewayPromise
    }

    const persistLocalState = (target: string, state: SyncLocalState): SyncLocalState => {
      const next: SyncLocalState = { ...state, workspaceId: target }
      deps.syncState.save(target, next)
      if (workspaceId === target) {
        set({ pending: next.operations.length, lastSyncedAt: next.lastSyncedAt })
      }
      return next
    }

    const handleError = (error: unknown) => {
      set({ status: 'error', error: syncErrorCode(error) })
    }

    const schedulePush = () => {
      if (!workspaceId || get().conflict || get().firstLogin) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        void get().syncNow()
      }, deps.debounceMs ?? 600)
    }

    const startSubscription = () => {
      unsubscribe?.()
      lastSeen = deps.app.getData()
      unsubscribe = deps.app.subscribe(() => {
        const next = deps.app.getData()
        if (suppress) {
          lastSeen = next
          return
        }
        const target = workspaceId
        if (!target) return
        if (!lastSeen) {
          lastSeen = next
          return
        }
        const changes = diffAppData(lastSeen, next)
        lastSeen = next
        if (changes.length === 0) return

        const current = deps.syncState.load(target)
        const updated = enqueueChanges(current, changes, {
          workspaceId: target,
          now: deps.now(),
          newId: deps.newId,
        })
        persistLocalState(target, updated)
        const status = get().status
        set({
          pending: updated.operations.length,
          status:
            status === 'conflict' || status === 'syncing' || status === 'offline'
              ? status
              : updated.operations.length > 0
                ? 'pending'
                : status,
        })
        if (updated.operations.length > 0) schedulePush()
      })
    }

    const stopSubscription = () => {
      unsubscribe?.()
      unsubscribe = undefined
      lastSeen = undefined
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }

    const enterCloud = async (data: AppData, target: string): Promise<AppData> => {
      suppress = true
      try {
        const applied = await deps.app.enterCloudMode(data, target)
        lastSeen = applied
        return applied
      } finally {
        suppress = false
      }
    }

    const applyCloud = async (data: AppData): Promise<AppData> => {
      suppress = true
      try {
        const applied = await deps.app.applyCloudData(data)
        lastSeen = applied
        return applied
      } finally {
        suppress = false
      }
    }

    const buildCloudData = (snapshot: CloudSnapshot, mode: 'keep' | 'empty'): AppData => {
      const currentDraft = deps.app.getDraft()
      const base = snapshotToData(snapshot, currentDraft)
      if (mode === 'keep') return base
      return {
        ...base,
        draft: createEmptyDraft(base.config, currentDraft.locale),
      }
    }

    const pushQueue = async (target: string): Promise<boolean> => {
      if (!gateway) return true
      let operation = nextPendingOperation(deps.syncState.load(target))
      while (operation) {
        const result = await gateway.push(target, operation)
        if (workspaceId !== target) return false
        if (!result.ok) {
          const conflict = buildConflict(operation, result)
          if (conflict) set({ status: 'conflict', conflict, conflictOpen: true })
          return false
        }
        // Reload after the request: the subscription may have queued a newer
        // change for the same entity while the push was in flight.
        const state = ackPushedOperation(deps.syncState.load(target), operation, result.updatedAt)
        persistLocalState(target, state)
        operation = nextPendingOperation(state)
      }
      return true
    }

    const pullAndApply = async (target: string): Promise<boolean> => {
      if (!gateway) return false
      const snapshot = await gateway.pull(target)
      if (workspaceId !== target) return false
      const state = deps.syncState.load(target)
      const remoteMetadata = metadataFromSnapshot(snapshot)
      const merged: SyncLocalState = {
        ...state,
        metadata: { ...state.metadata, ...remoteMetadata },
      }
      deps.syncState.save(target, merged)

      if (state.operations.length > 0) {
        set({ pending: state.operations.length, status: 'pending' })
        schedulePush()
        return false
      }

      let data: AppData
      try {
        data = buildCloudData(snapshot, 'keep')
      } catch {
        set({ status: 'error', error: 'invalidData' })
        return false
      }

      await applyCloud(data)
      return true
    }

    const runSyncFor = async (target: string): Promise<void> => {
      if (syncing) return syncing.promise
      if (get().conflict || get().firstLogin) return
      if (!workspaceId || workspaceId !== target) return
      const auth = deps.auth()
      if (auth.status !== 'authenticated') {
        set({ status: 'idle' })
        return
      }

      const promise = (async () => {
        set({ status: 'syncing', error: undefined })
        try {
          await deps.app.flushPersistence()
          if (workspaceId !== target) return
          const pushed = await pushQueue(target)
          if (!pushed || workspaceId !== target) return
          const applied = await pullAndApply(target)
          if (!applied || workspaceId !== target) return
          const now = deps.now()
          const state = deps.syncState.load(target)
          deps.syncState.save(target, { ...state, lastSyncedAt: now })
          set({
            status: 'synced',
            lastSyncedAt: now,
            pending: state.operations.length,
            error: undefined,
          })
        } catch (error) {
          if (workspaceId === target) handleError(error)
        }
      })()

      syncing = { workspaceId: target, promise }
      try {
        await promise
      } finally {
        if (syncing?.promise === promise) syncing = undefined
      }
    }

    const doConnect = async (target: string): Promise<void> => {
      if (!deps.isConfigured()) {
        set({ status: 'disabled' })
        return
      }
      const auth = deps.auth()
      if (auth.status !== 'authenticated' || !auth.userId) {
        set({ status: 'idle' })
        return
      }
      if (workspaceId === target && connectedUserId === auth.userId) return

      const generation = ++connectGeneration
      const guard = () => generation === connectGeneration
      const activate = () => {
        workspaceId = target
        connectedUserId = auth.userId
      }

      set({ status: 'connecting', error: undefined })

      const previous = workspaceId
      const previousUser = connectedUserId
      const switching = deps.app.getMode() === 'cloud' && previous !== undefined && previous !== target
      if (previous && previous !== target) {
        // Best effort: the outbox is per workspace, so an offline switch is safe.
        await runSyncFor(previous).catch(() => undefined)
        if (!guard()) return
        stopSubscription()
        pendingFirstLogin = undefined
        set({ conflict: undefined, conflictOpen: false, firstLogin: undefined })
      }

      deps.local.migrateLegacy(target)
      deps.syncState.migrateLegacy(target)

      try {
        const client = await ensureGateway()
        if (!guard()) return

        const snapshot = await client.pull(target)
        if (!guard()) return

        const wantsSeed = deps.seed.pending(target)
        const needsSeed = wantsSeed || (switching && isCloudEmpty(snapshot))

        if (isCloudEmpty(snapshot) && needsSeed) {
          const initial = createInitialData()
          const imported = await client.importAll(target, initial)
          if (!guard()) return
          if (wantsSeed) deps.seed.consume(target)
          activate()
          await enterCloud(initial, target)
          startSubscription()
          const now = deps.now()
          persistLocalState(target, {
            ...emptySyncState(),
            metadata: metadataFromSnapshot(imported),
            lastSyncedAt: now,
          })
          set({
            status: 'synced',
            workspaceId: target,
            pending: 0,
            lastSyncedAt: now,
            firstLogin: undefined,
            error: undefined,
          })
          return
        }

        if (wantsSeed) deps.seed.consume(target)

        const cache = deps.local.hasCache(target) ? deps.local.loadCache(target) : undefined
        const decision = decideFirstLogin({
          cloudEmpty: isCloudEmpty(snapshot),
          hasCache: cache !== undefined,
          localHasData: hasMeaningfulData(deps.app.getData()),
        })

        // A workspace switch is not a first login: the data in memory belongs
        // to the previous workspace and must never be offered as "local data".
        if (
          !switching &&
          (decision === 'promptImport' || decision === 'promptCloudWins')
        ) {
          activate()
          pendingFirstLogin = { workspaceId: target, snapshot }
          set({
            status: 'firstLogin',
            workspaceId: target,
            firstLogin: {
              kind: decision === 'promptImport' ? 'importLocal' : 'cloudWins',
            },
          })
          return
        }

        let data: AppData
        if (decision === 'useCache' || decision === 'importCache') {
          data = cache ?? deps.app.getData()
        } else if (decision === 'importCurrent') {
          data = deps.app.getData()
        } else {
          data = buildCloudData(snapshot, 'empty')
        }

        if (decision === 'importCache' || decision === 'importCurrent') {
          const imported = await client.importAll(target, data)
          if (!guard()) return
          activate()
          await enterCloud(data, target)
          startSubscription()
          const now = deps.now()
          persistLocalState(target, {
            ...emptySyncState(),
            metadata: metadataFromSnapshot(imported),
            lastSyncedAt: now,
          })
          set({
            status: 'synced',
            workspaceId: target,
            pending: 0,
            lastSyncedAt: now,
            firstLogin: undefined,
            error: undefined,
          })
          return
        }

        activate()
        await enterCloud(data, target)
        startSubscription()
        const localState = deps.syncState.load(target)
        set({
          workspaceId: target,
          pending: localState.operations.length,
          firstLogin: undefined,
        })
        await runSyncFor(target)
      } catch (error) {
        if (!guard()) return
        // Never keep the target active if its data was not applied: queued
        // changes would otherwise be pushed to the wrong workspace.
        if (deps.app.getMode() !== 'cloud' || workspaceId !== target) {
          workspaceId = previous
          connectedUserId = previousUser
        }
        if (deps.app.getMode() !== 'cloud' && workspaceId !== previous) {
          workspaceId = undefined
          connectedUserId = undefined
        }
        handleError(error)
      }
    }

    const connect = (target: string): Promise<void> => {
      const run = connectChain.then(() => doConnect(target))
      connectChain = run.catch(() => undefined)
      return run
    }

    return {
      status: 'idle',
      workspaceId: undefined,
      lastSyncedAt: undefined,
      pending: 0,
      conflict: undefined,
      conflictOpen: false,
      firstLogin: undefined,
      error: undefined,

      connect,

      disconnect: async () => {
        connectGeneration += 1
        const active = workspaceId
        stopSubscription()
        const wasCloud = deps.app.getMode() === 'cloud'
        const state = active ? deps.syncState.load(active) : emptySyncState()
        workspaceId = undefined
        connectedUserId = undefined
        pendingFirstLogin = undefined
        gateway = undefined
        gatewayPromise = undefined

        if (wasCloud) {
          if (active && state.operations.length === 0) {
            deps.syncState.clear(active)
            deps.local.removeCache(active)
          }
          await deps.app.exitCloudMode()
        }

        set({
          status: 'idle',
          workspaceId: undefined,
          pending: 0,
          conflict: undefined,
          conflictOpen: false,
          firstLogin: undefined,
          error: undefined,
        })
      },

      syncNow: async () => {
        if (!workspaceId) return
        await runSyncFor(workspaceId)
      },

      resolveFirstLogin: async (choice) => {
        const pending = pendingFirstLogin
        if (!pending) return
        const target = pending.workspaceId

        if (choice === 'cancel') {
          pendingFirstLogin = undefined
          set({ status: 'idle', firstLogin: undefined })
          await useAuthStore.getState().signOut()
          return
        }

        const backup = await deps.app.exportData()
        if (!backup) {
          set({ error: 'backupFailed' })
          return
        }

        set({ status: 'syncing', error: undefined })
        try {
          const client = await ensureGateway()
          const now = deps.now()
          if (choice === 'importLocal') {
            const current = deps.app.getData()
            const imported = await client.importAll(target, current)
            await enterCloud(current, target)
            startSubscription()
            persistLocalState(target, {
              ...emptySyncState(),
              metadata: metadataFromSnapshot(imported),
              lastSyncedAt: now,
            })
            set({
              status: 'synced',
              workspaceId: target,
              pending: 0,
              lastSyncedAt: now,
              firstLogin: undefined,
              error: undefined,
            })
          } else {
            const data = buildCloudData(pending.snapshot, 'empty')
            await enterCloud(data, target)
            startSubscription()
            persistLocalState(target, {
              ...emptySyncState(),
              metadata: metadataFromSnapshot(pending.snapshot),
              lastSyncedAt: now,
            })
            set({
              status: 'synced',
              workspaceId: target,
              pending: 0,
              lastSyncedAt: now,
              firstLogin: undefined,
              error: undefined,
            })
          }
          pendingFirstLogin = undefined
        } catch (error) {
          handleError(error)
        }
      },

      resolveConflict: async (choice) => {
        const conflict = get().conflict
        const target = workspaceId
        if (!conflict || !target) return
        const latest = deps.syncState
          .load(target)
          .operations.find((operation) => operation.id === conflict.operation.id)
        const operation = latest ?? conflict.operation
        set({ status: 'syncing', conflict: undefined, conflictOpen: false })

        try {
          if (choice === 'keepLocal') {
            const client = await ensureGateway()
            const forced: SyncOperation = {
              ...operation,
              expectedUpdatedAt: conflict.remoteUpdatedAt,
              resurrect: remoteDeleted(conflict.remote) || operation.resurrect,
            }
            const result = await client.push(target, forced)
            if (workspaceId !== target) return
            if (!result.ok) {
              const next = buildConflict(operation, result)
              if (next) set({ status: 'conflict', conflict: next, conflictOpen: true })
              return
            }
            const state = ackOperation(deps.syncState.load(target), operation.id, result.updatedAt)
            persistLocalState(target, state)
            await runSyncFor(target)
            return
          }

          if (choice === 'duplicateLocal' && operation.entity === 'quote') {
            deps.app.duplicateQuote(operation.entityId)
          }

          const state = dropOperation(deps.syncState.load(target), operation.id)
          persistLocalState(target, state)
          await runSyncFor(target)
        } catch (error) {
          handleError(error)
        }
      },

      openConflict: () => set({ conflictOpen: true }),

      closeConflict: () => set({ conflictOpen: false }),

      markExpired: () => {
        // Keep workspaceId: the cache and the outbox still belong to it. Clearing
        // only the connected user forces a fresh connect after the next sign-in.
        connectedUserId = undefined
        set((state) => {
          if (state.status === 'firstLogin' || state.status === 'conflict') return state
          return { status: 'offline', error: 'auth' }
        })
      },

      markOffline: () =>
        set((state) => {
          if (state.status === 'firstLogin' || state.status === 'conflict') return state
          if (state.status === 'idle' || state.status === 'disabled') return state
          return { status: 'offline' }
        }),
    }
  })
}

export const useSyncStore = createSyncStore({
  isConfigured: isCloudConfigured,
  createGateway: createSupabaseCloudGateway,
  auth: () => {
    const state = useAuthStore.getState()
    return { status: state.status, userId: state.user?.id }
  },
  app: {
    getData: () => dataFromState(useAppStore.getState()),
    getDraft: () => useAppStore.getState().draft,
    getMode: () => useAppStore.getState().mode,
    enterCloudMode: (data, workspaceId) =>
      useAppStore.getState().enterCloudMode(data, workspaceId),
    applyCloudData: (data) => useAppStore.getState().applyCloudData(data),
    exitCloudMode: () => useAppStore.getState().exitCloudMode(),
    flushPersistence: () => useAppStore.getState().flushPersistence(),
    exportData: () => useAppStore.getState().exportData(),
    duplicateQuote: (quoteId) => useAppStore.getState().duplicateQuote(quoteId),
    subscribe: (listener) => useAppStore.subscribe(listener),
  },
  local: {
    hasCache: hasCloudCache,
    loadCache: loadCloudCache,
    removeCache: removeCloudCache,
    migrateLegacy: migrateLegacyCloudCache,
  },
  syncState: {
    load: loadSyncState,
    save: saveSyncState,
    clear: clearSyncState,
    migrateLegacy: migrateLegacySyncState,
  },
  seed: {
    pending: hasPendingWorkspaceSeed,
    consume: consumeWorkspaceSeed,
  },
  now: nowIso,
  newId,
  debounceMs: 600,
})
