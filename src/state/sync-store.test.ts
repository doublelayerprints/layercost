import { describe, expect, it } from 'vitest'
import type { AppData } from '@/data/storage'
import { createInitialData } from '@/data/storage'
import { createSeedConfig } from '@/data/seed'
import type { Tables } from '@/data/cloud/database.types'
import type { CloudGateway, CloudPushResult } from '@/data/cloud/gateway'
import { settingsToRow } from '@/data/cloud/mappers'
import {
  emptySyncState,
  type CloudSnapshot,
  type SyncLocalState,
  type SyncOperation,
} from '@/data/cloud/sync'
import type { AppMode } from './app-store'
import { createSyncStore, type SyncStoreDeps } from './sync-store'

const WS = 'ws-1'
const WS_ALT = 'ws-2'

function settingsRow(workspaceId = WS): Tables<'settings'> {
  return {
    ...settingsToRow(createSeedConfig().settings, workspaceId),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
  } as unknown as Tables<'settings'>
}

function snapshot(overrides: Partial<CloudSnapshot> = {}): CloudSnapshot {
  return {
    workspaceId: WS,
    settings: settingsRow(),
    tariffs: [],
    printers: [],
    materials: [],
    extras: [],
    quotes: [],
    ...overrides,
  }
}

function emptyCloud(workspaceId = WS): CloudSnapshot {
  return {
    workspaceId,
    settings: null,
    tariffs: [],
    printers: [],
    materials: [],
    extras: [],
    quotes: [],
  }
}

function withSavedQuote(data: AppData, name = 'Preventivo locale'): AppData {
  const next = structuredClone(data)
  const quote = structuredClone(next.draft)
  quote.id = `quote-${name}`
  quote.name = name
  quote.status = 'saved'
  next.quotes.push(quote)
  return next
}

class FakeApp {
  data: AppData
  localData: AppData
  mode: AppMode = 'guest'
  exportCalls = 0
  duplicateCalls: string[] = []
  private listeners = new Set<() => void>()

  constructor(data: AppData) {
    this.data = structuredClone(data)
    this.localData = structuredClone(data)
  }

  getData = (): AppData => this.data
  getDraft = () => this.data.draft
  getMode = (): AppMode => this.mode

  enterCloudMode = async (data: AppData, _workspaceId: string): Promise<AppData> => {
    this.mode = 'cloud'
    this.set(data)
    return this.data
  }

  applyCloudData = async (data: AppData): Promise<AppData> => {
    this.set(data)
    return this.data
  }

  exitCloudMode = async (): Promise<AppData> => {
    this.mode = 'guest'
    this.set(this.localData)
    return this.data
  }

  flushPersistence = async (): Promise<void> => {}

  exportData = async (): Promise<boolean> => {
    this.exportCalls += 1
    return true
  }

  duplicateQuote = (quoteId: string): void => {
    this.duplicateCalls.push(quoteId)
    const quote = this.data.quotes.find((candidate) => candidate.id === quoteId)
    if (!quote) return
    this.set({ ...this.data, draft: { ...structuredClone(quote), status: 'draft' } })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  update(mutator: (data: AppData) => AppData): void {
    this.set(mutator(structuredClone(this.data)))
  }

  private set(data: AppData): void {
    this.data = data
    for (const listener of this.listeners) listener()
  }
}

class FakeLocal {
  caches = new Map<string, AppData>()

  hasCache = (workspaceId: string): boolean => this.caches.has(workspaceId)
  loadCache = (workspaceId: string): AppData | undefined => {
    const cache = this.caches.get(workspaceId)
    return cache ? structuredClone(cache) : undefined
  }
  removeCache = (workspaceId: string): void => {
    this.caches.delete(workspaceId)
  }
  migrateLegacy = (): void => {}
}

class FakeSyncState {
  states = new Map<string, SyncLocalState>()

  load = (workspaceId: string): SyncLocalState =>
    structuredClone(this.states.get(workspaceId) ?? emptySyncState())
  save = (workspaceId: string, state: SyncLocalState): void => {
    this.states.set(workspaceId, structuredClone(state))
  }
  clear = (workspaceId: string): void => {
    this.states.delete(workspaceId)
  }
  migrateLegacy = (): void => {}
}

class FakeSeed {
  pendingIds = new Set<string>()

  pending = (workspaceId: string): boolean => this.pendingIds.has(workspaceId)
  consume = (workspaceId: string): void => {
    this.pendingIds.delete(workspaceId)
  }
}

interface FakeGateway {
  gateway: CloudGateway
  pushes: SyncOperation[]
  imports: Array<{ workspaceId: string; data: AppData }>
  setPushResult: (result: (operation: SyncOperation) => CloudPushResult) => void
  setCloud: (workspaceId: string, cloud: CloudSnapshot) => void
  setPullFailing: (workspaceId: string, failing: boolean) => void
}

function createGateway(clouds: Record<string, CloudSnapshot>, initial = WS): FakeGateway {
  const pushes: SyncOperation[] = []
  const imports: Array<{ workspaceId: string; data: AppData }> = []
  const store: Record<string, CloudSnapshot> = { [initial]: clouds[initial] ?? snapshot() }
  const failingPulls = new Set<string>()
  for (const [id, cloud] of Object.entries(clouds)) store[id] = cloud
  let pushResult: (operation: SyncOperation) => CloudPushResult = () => ({
    ok: true,
    updatedAt: '2026-01-01T00:00:01.000Z',
  })

  const gateway: CloudGateway = {
    listWorkspaces: async () => [],
    ensurePersonalWorkspace: async () => null,
    createWorkspace: async () => WS,
    renameWorkspace: async () => {},
    listMembers: async () => [],
    listInvites: async () => [],
    createInvite: async () => 'token',
    revokeInvite: async () => {},
    redeemInvite: async () => WS,
    leaveWorkspace: async () => {},
    pull: async (workspaceId) => {
      if (failingPulls.has(workspaceId)) throw new Error('network')
      return structuredClone(store[workspaceId] ?? emptyCloud(workspaceId))
    },
    push: async (_workspaceId, operation) => {
      pushes.push(operation)
      return pushResult(operation)
    },
    importAll: async (workspaceId, data) => {
      imports.push({ workspaceId, data: structuredClone(data) })
      return structuredClone(store[workspaceId] ?? emptyCloud(workspaceId))
    },
  }

  return {
    gateway,
    pushes,
    imports,
    setPushResult: (result) => {
      pushResult = result
    },
    setCloud: (workspaceId, cloud) => {
      store[workspaceId] = cloud
    },
    setPullFailing: (workspaceId, failing) => {
      if (failing) failingPulls.add(workspaceId)
      else failingPulls.delete(workspaceId)
    },
  }
}

function createDeps(
  app: FakeApp,
  gateway: FakeGateway,
  local: FakeLocal,
  syncState: FakeSyncState,
  seed: FakeSeed,
): SyncStoreDeps {
  let nextId = 0
  return {
    isConfigured: () => true,
    createGateway: async () => gateway.gateway,
    auth: () => ({ status: 'authenticated', userId: 'u1' }),
    app: {
      getData: app.getData,
      getDraft: app.getDraft,
      getMode: app.getMode,
      enterCloudMode: app.enterCloudMode,
      applyCloudData: app.applyCloudData,
      exitCloudMode: app.exitCloudMode,
      flushPersistence: app.flushPersistence,
      exportData: app.exportData,
      duplicateQuote: app.duplicateQuote,
      subscribe: app.subscribe,
    },
    local: {
      hasCache: local.hasCache,
      loadCache: local.loadCache,
      removeCache: local.removeCache,
      migrateLegacy: local.migrateLegacy,
    },
    syncState: {
      load: syncState.load,
      save: syncState.save,
      clear: syncState.clear,
      migrateLegacy: syncState.migrateLegacy,
    },
    seed: {
      pending: seed.pending,
      consume: seed.consume,
    },
    now: () => '2026-01-01T00:00:02.000Z',
    newId: () => `op-${++nextId}`,
    debounceMs: 60_000,
  }
}

function setup(input: {
  localData?: AppData
  cache?: AppData
  clouds?: Record<string, CloudSnapshot>
  seed?: string[]
}) {
  const app = new FakeApp(input.localData ?? createInitialData())
  const local = new FakeLocal()
  if (input.cache) local.caches.set(WS, structuredClone(input.cache))
  const syncState = new FakeSyncState()
  const seed = new FakeSeed()
  for (const id of input.seed ?? []) seed.pendingIds.add(id)
  const gateway = createGateway(input.clouds ?? { [WS]: snapshot() })
  const store = createSyncStore(createDeps(app, gateway, local, syncState, seed))
  return { app, local, syncState, seed, gateway, store }
}

describe('sync store', () => {
  it('importa i dati iniziali quando il cloud è vuoto e il browser non ha dati', async () => {
    const { app, gateway, store } = setup({ clouds: { [WS]: emptyCloud() } })

    await store.getState().connect(WS)

    expect(gateway.imports).toHaveLength(1)
    expect(gateway.imports[0]?.data.config.printers.length).toBeGreaterThan(0)
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().pending).toBe(0)
  })

  it('chiede conferma prima di importare dati locali nel cloud vuoto', async () => {
    const localData = withSavedQuote(createInitialData())
    const { app, gateway, store } = setup({
      localData,
      clouds: { [WS]: emptyCloud() },
    })

    await store.getState().connect(WS)

    expect(store.getState().status).toBe('firstLogin')
    expect(store.getState().firstLogin).toEqual({ kind: 'importLocal' })
    expect(gateway.imports).toHaveLength(0)

    await store.getState().resolveFirstLogin('importLocal')

    expect(app.exportCalls).toBe(1)
    expect(gateway.imports).toHaveLength(1)
    expect(gateway.imports[0]?.data.quotes).toHaveLength(1)
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().firstLogin).toBeUndefined()
  })

  it('chiede conferma prima di usare il cloud quando entrambi hanno dati', async () => {
    const localData = withSavedQuote(createInitialData())
    const { app, store } = setup({ localData, clouds: { [WS]: snapshot() } })

    await store.getState().connect(WS)

    expect(store.getState().status).toBe('firstLogin')
    expect(store.getState().firstLogin).toEqual({ kind: 'cloudWins' })

    // A focus/online event must not apply the cloud before the user chooses.
    await store.getState().syncNow()
    expect(store.getState().status).toBe('firstLogin')
    expect(store.getState().firstLogin).toEqual({ kind: 'cloudWins' })
    expect(app.data.quotes).toHaveLength(1)

    await store.getState().resolveFirstLogin('cloudWins')

    expect(app.exportCalls).toBe(1)
    expect(app.mode).toBe('cloud')
    expect(app.data.config.printers).toEqual([])
    expect(app.data.quotes).toEqual([])
    expect(store.getState().status).toBe('synced')
  })

  it('accoda le modifiche e apre un conflitto senza sovrascrivere', async () => {
    const localData = createInitialData()
    const { app, gateway, syncState, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot() },
    })

    await store.getState().connect(WS)
    expect(store.getState().status).toBe('synced')

    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-nuovo'
    quote.name = 'Nuovo preventivo'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [...data.quotes, quote] }))

    expect(store.getState().pending).toBe(1)
    expect(syncState.load(WS).operations).toHaveLength(1)

    gateway.setPushResult((operation) => ({
      ok: false,
      conflict: {
        reason: 'updated',
        remote: {
          ...settingsRow(),
          id: operation.entityId,
          updated_at: '2026-01-01T00:00:03.000Z',
        },
      },
    }))

    await store.getState().syncNow()

    expect(store.getState().status).toBe('conflict')
    expect(store.getState().conflictOpen).toBe(true)
    expect(store.getState().pending).toBe(1)

    await store.getState().resolveConflict('useRemote')

    expect(store.getState().status).toBe('synced')
    expect(store.getState().pending).toBe(0)
    expect(app.data.quotes).toEqual([])
    await store.getState().disconnect()
  })

  it('duplica le modifiche locali di un preventivo in conflitto', async () => {
    const localData = createInitialData()
    const { app, gateway, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot() },
    })
    await store.getState().connect(WS)

    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-conflitto'
    quote.name = 'Versione locale'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [quote] }))

    gateway.setPushResult(() => ({
      ok: false,
      conflict: { reason: 'updated', remote: { ...settingsRow(), id: quote.id } },
    }))
    await store.getState().syncNow()

    await store.getState().resolveConflict('duplicateLocal')

    expect(app.duplicateCalls).toEqual([quote.id])
    expect(app.data.draft.name).toBe('Versione locale')
    expect(store.getState().status).toBe('synced')
    await store.getState().disconnect()
  })

  it('conserva la cache al logout se restano modifiche in sospeso', async () => {
    const localData = createInitialData()
    const { app, local, syncState, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot() },
    })
    await store.getState().connect(WS)

    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-pending'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [quote] }))
    expect(syncState.load(WS).operations).toHaveLength(1)

    await store.getState().disconnect()

    expect(app.mode).toBe('guest')
    expect(local.caches.get(WS)).toBeDefined()
    expect(syncState.load(WS).operations).toHaveLength(1)
  })

  it('si riconnette dopo una sessione scaduta senza perdere la cache', async () => {
    const localData = createInitialData()
    const { app, local, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot() },
    })
    await store.getState().connect(WS)
    expect(store.getState().status).toBe('synced')

    store.getState().markExpired()
    expect(store.getState().status).toBe('offline')
    expect(store.getState().error).toBe('auth')
    expect(app.mode).toBe('cloud')

    await store.getState().connect(WS)

    expect(local.caches.get(WS)).toBeDefined()
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().error).toBeUndefined()
  })

  it('semina un nuovo spazio con i valori predefiniti e non copia lo spazio precedente', async () => {
    const localData = withSavedQuote(createInitialData(), 'Dello spazio uno')
    const { app, gateway, local, seed, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot(), [WS_ALT]: emptyCloud(WS_ALT) },
      seed: [WS_ALT],
    })

    await store.getState().connect(WS)
    expect(store.getState().workspaceId).toBe(WS)
    expect(store.getState().status).toBe('synced')

    await store.getState().connect(WS_ALT)

    expect(store.getState().workspaceId).toBe(WS_ALT)
    expect(store.getState().status).toBe('synced')
    expect(seed.pending(WS_ALT)).toBe(false)
    const seeded = gateway.imports.find((entry) => entry.workspaceId === WS_ALT)
    expect(seeded?.data.config.printers.length).toBeGreaterThan(0)
    expect(seeded?.data.quotes).toEqual([])
    expect(app.data.quotes).toEqual([])
    expect(local.caches.get(WS)).toBeDefined()
  })

  it('mantiene cache e coda separate quando si cambia spazio', async () => {
    const localData = createInitialData()
    const { app, local, syncState, gateway, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot(), [WS_ALT]: snapshot({ workspaceId: WS_ALT }) },
    })
    local.caches.set(WS_ALT, createInitialData())

    await store.getState().connect(WS)
    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-ws-1'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [quote] }))
    expect(syncState.load(WS).operations).toHaveLength(1)

    gateway.setPushResult(() => ({
      ok: false,
      conflict: { reason: 'updated', remote: { ...settingsRow(), id: quote.id } },
    }))
    await store.getState().connect(WS_ALT)

    expect(store.getState().workspaceId).toBe(WS_ALT)
    expect(local.caches.get(WS)).toBeDefined()
    expect(local.caches.get(WS_ALT)).toBeDefined()
    expect(syncState.load(WS).operations).toHaveLength(1)
    expect(syncState.load(WS_ALT).operations).toHaveLength(0)
    expect(store.getState().pending).toBe(0)
  })

  it('se il pull del nuovo spazio fallisce, resta attivo lo spazio precedente', async () => {
    const localData = createInitialData()
    const { app, gateway, local, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot(), [WS_ALT]: snapshot({ workspaceId: WS_ALT }) },
    })
    local.caches.set(WS_ALT, createInitialData())

    await store.getState().connect(WS)
    expect(store.getState().workspaceId).toBe(WS)

    gateway.setPullFailing(WS_ALT, true)
    await store.getState().connect(WS_ALT)

    expect(store.getState().workspaceId).toBe(WS)
    expect(store.getState().status).toBe('error')
    expect(app.mode).toBe('cloud')
    // Nothing from the previous workspace was pushed into the target.
    expect(gateway.pushes.filter((operation) => operation.entity === 'quote')).toHaveLength(0)
  })

  it('rimuove la cache al logout senza modifiche in sospeso', async () => {
    const localData = createInitialData()
    const { app, local, syncState, store } = setup({
      localData,
      cache: localData,
      clouds: { [WS]: snapshot() },
    })
    await store.getState().connect(WS)

    await store.getState().disconnect()

    expect(app.mode).toBe('guest')
    expect(local.caches.get(WS)).toBeUndefined()
    expect(syncState.load(WS).operations).toEqual([])
  })
})
