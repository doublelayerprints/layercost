import { describe, expect, it } from 'vitest'
import { appDataSchema, parseAppData } from './schemas'
import {
  createInitialData,
  loadAppData,
  migrateAppData,
  MIGRATION_BACKUP_PREFIX,
  STORAGE_KEY,
} from './storage'

function legacyData() {
  const current = createInitialData()
  const draft = { ...current.draft } as Record<string, unknown>
  delete draft.locale
  return {
    ...current,
    schemaVersion: 1,
    draft,
    quotes: [{ ...draft, id: 'quote-v1', status: 'saved' }],
  }
}

describe('dati persistiti', () => {
  it('il seed iniziale rispetta lo schema', () => {
    const data = createInitialData()
    const result = appDataSchema.safeParse(data)
    if (!result.success) {
      console.error(result.error.issues)
    }
    expect(result.success).toBe(true)
    expect(data.schemaVersion).toBe(2)
    expect(data.draft.locale).toBe('it')
  })

  it('rifiuta uno schema futuro', () => {
    expect(() => migrateAppData({ schemaVersion: 99 })).toThrow()
    expect(() => parseAppData({ schemaVersion: 99 })).toThrow()
  })

  it('rifiuta un payload non valido', () => {
    expect(() => parseAppData({ schemaVersion: 2, config: {} })).toThrow()
  })

  it('migra lo schema v1 aggiungendo locale it a bozza e preventivi', () => {
    const migrated = migrateAppData(legacyData()) as {
      schemaVersion: number
      draft: { locale?: string }
      quotes: Array<{ locale?: string }>
    }
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.draft.locale).toBe('it')
    expect(migrated.quotes[0]?.locale).toBe('it')
    expect(parseAppData(migrated).draft.locale).toBe('it')
  })

  it('migra anche un envelope di export v1', () => {
    const envelope = {
      app: 'LayerCost',
      schemaVersion: 1,
      exportedAt: '2026-10-26T10:00:00.000Z',
      data: legacyData(),
    }
    const migrated = migrateAppData(envelope) as {
      schemaVersion: number
      data: { schemaVersion: number; draft: { locale?: string } }
    }
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.data.schemaVersion).toBe(2)
    expect(migrated.data.draft.locale).toBe('it')
    expect(parseAppData(migrated).draft.locale).toBe('it')
  })

  it('salva il dato grezzo prima di migrare lo storage', () => {
    const values = new Map<string, string>()
    const localStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
    }
    const scope = globalThis as unknown as {
      window?: { localStorage: typeof localStorage }
    }
    const previous = scope.window
    scope.window = { localStorage }
    try {
      const raw = JSON.stringify(legacyData())
      values.set(STORAGE_KEY, raw)
      const { data } = loadAppData()
      expect(data.schemaVersion).toBe(2)
      expect(data.draft.locale).toBe('it')
      expect(values.get(`${MIGRATION_BACKUP_PREFIX}1`)).toBe(raw)
    } finally {
      if (previous === undefined) {
        delete scope.window
      } else {
        scope.window = previous
      }
    }
  })
})
