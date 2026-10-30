import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createInitialData } from './storage'
import {
  cloudCacheKey,
  hasCloudCache,
  loadCloudCache,
  migrateLegacyCloudCache,
  removeCloudCache,
  saveCloudCache,
  CLOUD_CACHE_KEY,
} from './cloud-cache'

const values = new Map<string, string>()

const storage = {
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
} as Storage

beforeEach(() => {
  values.clear()
  ;(globalThis as { window?: unknown }).window = { localStorage: storage }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('cache cloud per workspace', () => {
  it('salva una cache diversa per ogni spazio', () => {
    const first = createInitialData()
    first.draft.name = 'Spazio A'
    const second = createInitialData()
    second.draft.name = 'Spazio B'

    saveCloudCache('ws-a', first)
    saveCloudCache('ws-b', second)

    expect(hasCloudCache('ws-a')).toBe(true)
    expect(loadCloudCache('ws-a')?.draft.name).toBe('Spazio A')
    expect(loadCloudCache('ws-b')?.draft.name).toBe('Spazio B')

    removeCloudCache('ws-a')
    expect(hasCloudCache('ws-a')).toBe(false)
    expect(loadCloudCache('ws-b')?.draft.name).toBe('Spazio B')
  })

  it('sposta la cache legacy nello spazio attivo', () => {
    const data = createInitialData()
    values.set(CLOUD_CACHE_KEY, JSON.stringify(data))

    migrateLegacyCloudCache('ws-a')

    expect(values.has(CLOUD_CACHE_KEY)).toBe(false)
    expect(values.has(cloudCacheKey('ws-a'))).toBe(true)
  })

  it('non sovrascrive una cache già presente', () => {
    const current = createInitialData()
    current.draft.name = 'Attuale'
    saveCloudCache('ws-a', current)

    const legacy = createInitialData()
    legacy.draft.name = 'Legacy'
    values.set(CLOUD_CACHE_KEY, JSON.stringify(legacy))

    migrateLegacyCloudCache('ws-a')

    expect(loadCloudCache('ws-a')?.draft.name).toBe('Attuale')
    expect(values.has(CLOUD_CACHE_KEY)).toBe(false)
  })
})
