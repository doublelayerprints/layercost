import { describe, expect, it } from 'vitest'
import { isThemePreference, resolveTheme } from './theme'

describe('preferenza del tema', () => {
  it('accetta solo sistema, chiaro e scuro', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('light')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('auto')).toBe(false)
    expect(isThemePreference('')).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
    expect(isThemePreference(1)).toBe(false)
  })

  it('risolve sistema con la preferenza del dispositivo', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('rispetta una scelta esplicita anche se il dispositivo preferisce il contrario', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
