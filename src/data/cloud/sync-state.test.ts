import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptySyncState } from './sync'
import {
  clearSyncState,
  loadSyncState,
  migrateLegacySyncState,
  saveSyncState,
  syncStateKey,
  SYNC_STATE_KEY,
} from './sync-state'

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

describe('sync state per workspace', () => {
  it('tiene separati outbox e metadati di due spazi', () => {
    saveSyncState('ws-a', {
      ...emptySyncState(),
      operations: [
        {
          id: 'op-1',
          entity: 'printer',
          entityId: 'printer-kobra-3',
          kind: 'upsert',
          createdAt: '2026-10-30T00:00:00.000Z',
          attempts: 0,
        },
      ],
    })
    saveSyncState('ws-b', { ...emptySyncState(), lastSyncedAt: '2026-10-30T01:00:00.000Z' })

    expect(loadSyncState('ws-a').operations).toHaveLength(1)
    expect(loadSyncState('ws-a').workspaceId).toBe('ws-a')
    expect(loadSyncState('ws-b').operations).toHaveLength(0)
    expect(loadSyncState('ws-b').lastSyncedAt).toBe('2026-10-30T01:00:00.000Z')

    clearSyncState('ws-a')
    expect(loadSyncState('ws-a').operations).toHaveLength(0)
    expect(loadSyncState('ws-b').lastSyncedAt).toBe('2026-10-30T01:00:00.000Z')
  })

  it('migra la chiave legacy verso lo spazio a cui apparteneva', () => {
    values.set(
      SYNC_STATE_KEY,
      JSON.stringify({ ...emptySyncState(), workspaceId: 'ws-a' }),
    )

    migrateLegacySyncState('ws-a')

    expect(values.has(SYNC_STATE_KEY)).toBe(false)
    expect(values.has(syncStateKey('ws-a'))).toBe(true)
  })

  it('non migra la coda legacy verso uno spazio diverso', () => {
    values.set(
      SYNC_STATE_KEY,
      JSON.stringify({ ...emptySyncState(), workspaceId: 'ws-a' }),
    )

    migrateLegacySyncState('ws-b')

    expect(values.has(SYNC_STATE_KEY)).toBe(true)
    expect(values.has(syncStateKey('ws-b'))).toBe(false)
  })

  it('scarta uno stato corrotto senza bloccare lo spazio', () => {
    values.set(syncStateKey('ws-a'), '{not json')

    expect(loadSyncState('ws-a').operations).toEqual([])
    expect(values.has(syncStateKey('ws-a'))).toBe(false)
  })
})
