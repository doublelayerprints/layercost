import { resolveTheme, type ThemePreference } from '@/lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
}

/**
 * Resolve and apply the theme before React renders, so the first paint already
 * has the right tokens. The preference itself stays in the data layer.
 */
export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === 'undefined') return

  const resolved = resolveTheme(preference, systemPrefersDark())
  document.documentElement.dataset.theme = resolved

  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const ground = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-ground')
    .trim()
  if (ground) meta.setAttribute('content', ground)
}
