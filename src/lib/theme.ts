export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
