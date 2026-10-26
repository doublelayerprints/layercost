import { describe, expect, it } from 'vitest'
import { en } from './en'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale, plural, translate } from './index'
import { it as itDictionary } from './it'

describe('dizionari i18n', () => {
  it('italiano e inglese hanno le stesse chiavi', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(itDictionary).sort())
  })

  it('nessuna traduzione è vuota', () => {
    for (const [key, value] of Object.entries(itDictionary)) {
      expect(value.trim(), `it: ${key}`).not.toBe('')
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `en: ${key}`).not.toBe('')
    }
  })

  it('supporta italiano e inglese, con italiano predefinito', () => {
    expect(SUPPORTED_LOCALES).toEqual(['it', 'en'])
    expect(DEFAULT_LOCALE).toBe('it')
    expect(isLocale('it')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })

  it('interpola i parametri', () => {
    expect(translate('it', 'app.engineVersion', { version: '1.0.0' })).toBe('Motore v1.0.0')
    expect(translate('en', 'app.engineVersion', { version: '1.0.0' })).toBe('Engine v1.0.0')
    expect(translate('it', 'app.engineVersion')).toBe('Motore v{version}')
  })

  it('sceglie la forma plurale con Intl.PluralRules', () => {
    expect(plural('it', 1, { one: 'import.ready.one', other: 'import.ready.other' })).toBe(
      '1 riga pronta da importare.',
    )
    expect(plural('it', 2, { one: 'import.ready.one', other: 'import.ready.other' })).toBe(
      '2 righe pronte da importare.',
    )
    expect(plural('en', 1, { one: 'import.ready.one', other: 'import.ready.other' })).toBe(
      '1 line ready to import.',
    )
    expect(plural('en', 2, { one: 'import.ready.one', other: 'import.ready.other' })).toBe(
      '2 lines ready to import.',
    )
  })
})
