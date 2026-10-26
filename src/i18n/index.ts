import { en } from './en'
import { it, type MessageKey, type Messages } from './it'

export const SUPPORTED_LOCALES = ['it', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'it'

export const INTL_LOCALES: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-GB',
}

export const dictionaries: Record<Locale, Messages> = { it, en }

export type InterpolationParams = Record<string, string | number>

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function translate(locale: Locale, key: MessageKey, params?: InterpolationParams): string {
  const template = dictionaries[locale][key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name]
    return value === undefined ? placeholder : String(value)
  })
}

/** Traduzione legata alla lingua predefinita, utile fuori dai componenti. */
export function t(key: MessageKey, params?: InterpolationParams): string {
  return translate(DEFAULT_LOCALE, key, params)
}

/**
 * Seleziona la forma singolare o plurale con `Intl.PluralRules`.
 * Le chiavi devono esistere in entrambi i dizionari con i suffissi `.one` e `.other`.
 */
export function plural(
  locale: Locale,
  count: number,
  keys: { one: MessageKey; other: MessageKey },
  params: InterpolationParams = {},
): string {
  const rule = new Intl.PluralRules(INTL_LOCALES[locale]).select(count)
  const key = rule === 'one' ? keys.one : keys.other
  return translate(locale, key, { ...params, count })
}

export type { MessageKey, Messages }
