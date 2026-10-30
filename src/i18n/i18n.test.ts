import { describe, expect, it } from 'vitest'
import { en } from './en'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale, plural, translate } from './index'
import { authIt } from './it/auth'
import { accessIt } from './it/access'
import { calculatorIt } from './it/calculator'
import { feedbackIt } from './it/feedback'
import { landingIt } from './it/landing'
import { catalogsIt } from './it/catalogs'
import { miscIt } from './it/misc'
import { quotesIt } from './it/quotes'
import { settingsIt } from './it/settings'
import { xlsxIt } from './it/xlsx'
import { baseIt, it as itDictionary } from './it'

describe('dizionari i18n', () => {
  it('italiano e inglese hanno le stesse chiavi', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(itDictionary).sort())
  })

  it('le aree non duplicano chiavi', () => {
    const parts = [
      baseIt,
      calculatorIt,
      quotesIt,
      catalogsIt,
      settingsIt,
      miscIt,
      xlsxIt,
      authIt,
      accessIt,
      landingIt,
      feedbackIt,
    ]
    const keys = parts.flatMap((part) => Object.keys(part))
    expect(new Set(keys).size).toBe(keys.length)
    expect(Object.keys(itDictionary).length).toBe(keys.length)
  })

  it('le chiavi plurali hanno sempre la forma opposta', () => {
    const keys = Object.keys(itDictionary)
    for (const key of keys) {
      if (key.endsWith('.one')) {
        expect(keys, key).toContain(key.replace(/\.one$/, '.other'))
      }
      if (key.endsWith('.other')) {
        expect(keys, key).toContain(key.replace(/\.other$/, '.one'))
      }
    }
  })

  it('i segnaposto coincidono tra italiano e inglese', () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
    for (const key of Object.keys(itDictionary) as Array<keyof typeof itDictionary>) {
      expect(placeholders(en[key]), key).toEqual(placeholders(itDictionary[key]))
    }
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
