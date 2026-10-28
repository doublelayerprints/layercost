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

function settingsRow(): Tables<'settings'> {
  return {
    ...settingsToRow(createSeedConfig().settings, 'ws-1'),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
  } as unknown as Tables<'settings'>
}

function snapshot(overrides: Partial<CloudSnapshot> = {}): CloudSnapshot {
  return {
    workspaceId: 'ws-1',
    settings: settingsRow(),
    tariffs: [],
    printers: [],
    materials: [],
    extras: [],
    quotes: [],
    ...overrides,
  }
}

function withSavedQuote(data: AppData): AppData {
  const next = structuredClone(data)
  const quote = structuredClone(next.draft)
  quote.id = 'quote-1'
  quote.name = 'Preventivo locale'
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

  enterCloudMode = async (data: AppData): Promise<AppData> => {
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
  cache?: AppData

  hasCache = (): boolean => this.cache !== undefined
  loadCache = (): AppData | undefined =>
    this.cache ? structuredClone(this.cache) : undefined
  removeCache = (): void => {
    this.cache = undefined
  }
}

class FakeSyncState {
  state: SyncLocalState = emptySyncState()

  load = (): SyncLocalState => structuredClone(this.state)
  save = (state: SyncLocalState): void => {
    this.state = structuredClone(state)
  }
  clear = (): void => {
    this.state = emptySyncState()
  }
}

interface FakeGateway {
  gateway: CloudGateway
  pushes: SyncOperation[]
  imports: AppData[]
  setPushResult: (result: (operation: SyncOperation) => CloudPushResult) => void
}

function createGateway(cloud: CloudSnapshot): FakeGateway {
  const pushes: SyncOperation[] = []
  const imports: AppData[] = []
  let pushResult: (operation: SyncOperation) => CloudPushResult = () => ({
    ok: true,
    updatedAt: '2026-01-01T00:00:01.000Z',
  })

  return {
    gateway: {
      resolveWorkspace: async () => cloud.workspaceId,
      pull: async () => structuredClone(cloud),
      push: async (_workspaceId, operation) => {
        pushes.push(operation)
        return pushResult(operation)
      },
      importAll: async (_workspaceId, data) => {
        imports.push(structuredClone(data))
        return structuredClone(cloud)
      },
    },
    pushes,
    imports,
    setPushResult: (result) => {
      pushResult = result
    },
  }
}

function createDeps(
  app: FakeApp,
  gateway: FakeGateway,
  local: FakeLocal,
  syncState: FakeSyncState,
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
    },
    syncState: {
      load: syncState.load,
      save: syncState.save,
      clear: syncState.clear,
    },
    now: () => '2026-01-01T00:00:02.000Z',
    newId: () => `op-${++nextId}`,
    debounceMs: 60_000,
  }
}

function setup(input: {
  localData?: AppData
  cache?: AppData
  cloud?: CloudSnapshot
}) {
  const app = new FakeApp(input.localData ?? createInitialData())
  const local = new FakeLocal()
  local.cache = input.cache ? structuredClone(input.cache) : undefined
  const syncState = new FakeSyncState()
  const gateway = createGateway(input.cloud ?? snapshot())
  const store = createSyncStore(createDeps(app, gateway, local, syncState))
  return { app, local, syncState, gateway, store }
}

describe('sync store', () => {
  it('importa i dati iniziali quando il cloud è vuoto e il browser non ha dati', async () => {
    const { app, gateway, store } = setup({ cloud: snapshot({ settings: null }) })

    await store.getState().connect()

    expect(gateway.imports).toHaveLength(1)
    expect(gateway.imports[0]?.config.printers.length).toBeGreaterThan(0)
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().pending).toBe(0)
  })

  it('chiede conferma prima di importare dati locali nel cloud vuoto', async () => {
    const localData = withSavedQuote(createInitialData())
    const { app, gateway, store } = setup({
      localData,
      cloud: snapshot({ settings: null }),
    })

    await store.getState().connect()

    expect(store.getState().status).toBe('firstLogin')
    expect(store.getState().firstLogin).toEqual({ kind: 'importLocal' })
    expect(gateway.imports).toHaveLength(0)

    await store.getState().resolveFirstLogin('importLocal')

    expect(app.exportCalls).toBe(1)
    expect(gateway.imports).toHaveLength(1)
    expect(gateway.imports[0]?.quotes).toHaveLength(1)
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().firstLogin).toBeUndefined()
  })

  it('chiede conferma prima di usare il cloud quando entrambi hanno dati', async () => {
    const localData = withSavedQuote(createInitialData())
    const cloud = snapshot()
    const { app, store } = setup({ localData, cloud })

    await store.getState().connect()

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
      cloud: snapshot(),
    })

    await store.getState().connect()
    expect(store.getState().status).toBe('synced')

    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-nuovo'
    quote.name = 'Nuovo preventivo'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [...data.quotes, quote] }))

    expect(store.getState().pending).toBe(1)
    expect(syncState.state.operations).toHaveLength(1)

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
      cloud: snapshot(),
    })
    await store.getState().connect()

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
      cloud: snapshot(),
    })
    await store.getState().connect()

    const quote = structuredClone(app.data.draft)
    quote.id = 'quote-pending'
    quote.status = 'saved'
    app.update((data) => ({ ...data, quotes: [quote] }))
    expect(syncState.state.operations).toHaveLength(1)

    await store.getState().disconnect()

    expect(app.mode).toBe('guest')
    expect(local.cache).toBeDefined()
    expect(syncState.state.operations).toHaveLength(1)
  })

  it('si riconnette dopo una sessione scaduta senza perdere la cache', async () => {
    const localData = createInitialData()
    const { app, local, store } = setup({
      localData,
      cache: localData,
      cloud: snapshot(),
    })
    await store.getState().connect()
    expect(store.getState().status).toBe('synced')

    store.getState().markExpired()
    expect(store.getState().status).toBe('offline')
    expect(store.getState().error).toBe('auth')
    expect(app.mode).toBe('cloud')

    await store.getState().connect()

    expect(local.cache).toBeDefined()
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
    expect(store.getState().error).toBeUndefined()
  })

  it('scarta cache e outbox di un workspace diverso', async () => {
    const localData = createInitialData()
    const { app, local, syncState, store } = setup({
      localData,
      cache: localData,
      cloud: snapshot(),
    })
    syncState.state = {
      ...emptySyncState(),
      workspaceId: 'ws-altro',
      operations: [
        {
          id: 'op-vecchia',
          entity: 'printer',
          entityId: 'printer-vecchia',
          kind: 'upsert',
          createdAt: '2026-01-01T00:00:00.000Z',
          attempts: 0,
        },
      ],
    }

    await store.getState().connect()

    expect(local.cache).toBeUndefined()
    expect(syncState.state.workspaceId).toBe('ws-1')
    expect(syncState.state.operations).toEqual([])
    expect(app.mode).toBe('cloud')
    expect(store.getState().status).toBe('synced')
  })

  it('rimuove la cache al logout senza modifiche in sospeso', async () => {
    const localData = createInitialData()
    const { app, local, syncState, store } = setup({
      localData,
      cache: localData,
      cloud: snapshot(),
    })
    await store.getState().connect()

    await store.getState().disconnect()

    expect(app.mode).toBe('guest')
    expect(local.cache).toBeUndefined()
    expect(syncState.state.operations).toEqual([])
  })
})
