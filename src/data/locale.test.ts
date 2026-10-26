import { describe, expect, it } from 'vitest'
import { loadLocalePreference, LOCALE_STORAGE_KEY, saveLocalePreference } from './locale'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('preferenza della lingua', () => {
  it('usa l’italiano come lingua predefinita', () => {
    expect(loadLocalePreference(memoryStorage())).toBe('it')
  })

  it('legge una lingua valida salvata', () => {
    expect(loadLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'en' }))).toBe('en')
  })

  it('ignora un valore non supportato o corrotto', () => {
    expect(loadLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'fr' }))).toBe('it')
    expect(
      loadLocalePreference({
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => undefined,
      }),
    ).toBe('it')
  })

  it('salva la lingua scelta senza toccare AppData', () => {
    const storage = memoryStorage()
    saveLocalePreference('en', storage)
    expect(storage.values.get(LOCALE_STORAGE_KEY)).toBe('en')
  })
})
