import { describe, expect, it } from 'vitest'
import { appDataSchema, parseAppData } from './schemas'
import { createInitialData, migrateAppData } from './storage'

describe('dati persistiti', () => {
  it('il seed iniziale rispetta lo schema', () => {
    const data = createInitialData()
    const result = appDataSchema.safeParse(data)
    if (!result.success) {
      console.error(result.error.issues)
    }
    expect(result.success).toBe(true)
  })

  it('rifiuta uno schema futuro', () => {
    expect(() => migrateAppData({ schemaVersion: 99 })).toThrow()
    expect(() => parseAppData({ schemaVersion: 99 })).toThrow()
  })

  it('rifiuta un payload non valido', () => {
    expect(() => parseAppData({ schemaVersion: 1, config: {} })).toThrow()
  })
})
