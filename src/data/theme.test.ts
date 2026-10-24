import { describe, expect, it } from 'vitest'
import { loadThemePreference, saveThemePreference, THEME_STORAGE_KEY } from './theme'

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('persistenza del tema', () => {
  it('usa il tema di sistema quando non c’è una preferenza', () => {
    expect(loadThemePreference(fakeStorage())).toBe('system')
  })

  it('ignora un valore non valido', () => {
    expect(loadThemePreference(fakeStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBe('system')
  })

  it('rilegge la preferenza salvata', () => {
    const storage = fakeStorage()
    saveThemePreference('dark', storage)
    expect(storage.values.get(THEME_STORAGE_KEY)).toBe('dark')
    expect(loadThemePreference(storage)).toBe('dark')
  })

  it('non blocca l’app se lo storage non è disponibile', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadThemePreference(blocked)).toBe('system')
    expect(() => saveThemePreference('light', blocked)).not.toThrow()
  })
})
