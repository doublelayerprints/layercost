import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
