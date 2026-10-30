import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cloudCacheKey } from '@/data/cloud-cache'
import { localRepository } from '@/data/repository'
import { createEmptyDraft, createSeedConfig } from '@/data/seed'
import { createInitialData, STORAGE_KEY, type AppData } from '@/data/storage'
import { useAppStore } from './app-store'

let values: Map<string, string>

function installLocalStorage() {
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  }
  vi.stubGlobal('window', { localStorage })
}

function resetStore() {
  const config = createSeedConfig()
  useAppStore.setState({
    config,
    quotes: [],
    draft: createEmptyDraft(config),
    mode: 'guest',
    hydrated: true,
    hydrating: false,
    hydrateError: undefined,
    warning: undefined,
  })
}

beforeEach(async () => {
  values = new Map()
  installLocalStorage()
  await useAppStore.getState().flushPersistence()
  await useAppStore.getState().exitCloudMode()
  resetStore()
})

afterEach(async () => {
  await useAppStore.getState().flushPersistence()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('app store async', () => {
  it('idrata dal repository e passa a hydrated', async () => {
    const data = createInitialData()
    data.draft.name = 'Dal disco'
    values.set(STORAGE_KEY, JSON.stringify(data))
    useAppStore.setState({ hydrated: false, hydrating: false, hydrateError: undefined })

    await useAppStore.getState().hydrate()

    const state = useAppStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.hydrating).toBe(false)
    expect(state.hydrateError).toBeUndefined()
    expect(state.draft.name).toBe('Dal disco')
  })

  it('non idrata due volte in parallelo', async () => {
    const load = vi.spyOn(localRepository, 'load')
    useAppStore.setState({ hydrated: false, hydrating: false, hydrateError: undefined })

    await Promise.all([useAppStore.getState().hydrate(), useAppStore.getState().hydrate()])

    expect(load).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().hydrated).toBe(true)
  })

  it('espone un errore di idratazione senza sovrascrivere i dati', async () => {
    vi.spyOn(localRepository, 'load').mockRejectedValueOnce(new Error('storage rotto'))
    useAppStore.setState({ hydrated: false, hydrating: false, hydrateError: undefined })

    await useAppStore.getState().hydrate()

    const state = useAppStore.getState()
    expect(state.hydrated).toBe(false)
    expect(state.hydrating).toBe(false)
    expect(state.hydrateError).toBe('loadFailed')
    expect(state.warning).toBeUndefined()
  })

  it('scrive subito in locale e completa con flushPersistence', async () => {
    useAppStore.getState().updateSettings({ onboardingComplete: true })

    expect(values.has(STORAGE_KEY)).toBe(true)
    await useAppStore.getState().flushPersistence()

    const saved = JSON.parse(values.get(STORAGE_KEY) ?? '{}') as AppData
    expect(saved.config.settings.onboardingComplete).toBe(true)
  })

  it('esporta tramite il repository asincrono', async () => {
    const exportSpy = vi.spyOn(localRepository, 'export').mockResolvedValue(undefined)

    const ok = await useAppStore.getState().exportData()

    expect(ok).toBe(true)
    expect(exportSpy).toHaveBeenCalledTimes(1)
  })

  it('ripristina i dati iniziali e svuota lo storage', async () => {
    const data = createInitialData()
    data.draft.name = 'Da rimuovere'
    values.set(STORAGE_KEY, JSON.stringify(data))
    useAppStore.setState({
      config: data.config,
      quotes: data.quotes,
      draft: data.draft,
      hydrated: true,
    })

    const ok = await useAppStore.getState().reset()

    expect(ok).toBe(true)
    expect(values.has(STORAGE_KEY)).toBe(false)
    expect(useAppStore.getState().quotes).toEqual([])
    expect(useAppStore.getState().draft.name).toBe('Nuovo preventivo')
  })

  it('segnala un reset fallito senza mostrare lo stato iniziale', async () => {
    vi.spyOn(localRepository, 'reset').mockRejectedValueOnce(new Error('storage rotto'))

    const ok = await useAppStore.getState().reset()

    expect(ok).toBe(false)
    expect(useAppStore.getState().warning).toBe('resetFailed')
  })

  it('passa alla cache cloud senza sovrascrivere i dati locali', async () => {
    const local = createInitialData()
    local.draft.name = 'Bozza locale'
    values.set(STORAGE_KEY, JSON.stringify(local))
    useAppStore.setState({
      config: local.config,
      quotes: local.quotes,
      draft: local.draft,
      hydrated: true,
      mode: 'guest',
    })

    const cloud = createInitialData()
    cloud.draft.name = 'Bozza cloud'
    const applied = await useAppStore.getState().enterCloudMode(cloud, 'ws-test')

    const localRaw = JSON.parse(values.get(STORAGE_KEY) ?? '{}') as AppData
    const cloudRaw = JSON.parse(values.get(cloudCacheKey('ws-test')) ?? '{}') as AppData
    expect(applied.draft.name).toBe('Bozza cloud')
    expect(useAppStore.getState().mode).toBe('cloud')
    expect(useAppStore.getState().draft.name).toBe('Bozza cloud')
    expect(localRaw.draft.name).toBe('Bozza locale')
    expect(cloudRaw.draft.name).toBe('Bozza cloud')

    const updated = structuredClone(cloud)
    updated.quotes = [
      {
        ...structuredClone(updated.draft),
        id: 'quote-cloud',
        name: 'Preventivo cloud',
        status: 'saved',
      },
    ]
    await useAppStore.getState().applyCloudData(updated)

    const updatedRaw = JSON.parse(values.get(cloudCacheKey('ws-test')) ?? '{}') as AppData
    expect(useAppStore.getState().quotes[0]?.name).toBe('Preventivo cloud')
    expect(updatedRaw.quotes).toHaveLength(1)

    const restored = await useAppStore.getState().exitCloudMode()

    expect(restored.draft.name).toBe('Bozza locale')
    expect(useAppStore.getState().mode).toBe('guest')
    expect(useAppStore.getState().draft.name).toBe('Bozza locale')
  })

  it('non trascina i metadati di audit nelle copie e nelle modifiche', () => {
    const config = useAppStore.getState().config
    const quote = {
      ...createEmptyDraft(config),
      status: 'saved' as const,
      createdBy: 'user-a',
      updatedBy: 'user-b',
    }
    useAppStore.setState({ quotes: [quote] })

    useAppStore.getState().duplicateQuote(quote.id)
    expect(useAppStore.getState().draft.createdBy).toBeUndefined()
    expect(useAppStore.getState().draft.updatedBy).toBeUndefined()

    useAppStore.getState().editQuote(quote.id)
    expect(useAppStore.getState().draft.createdBy).toBe('user-a')
    expect(useAppStore.getState().draft.updatedBy).toBeUndefined()
  })
})
