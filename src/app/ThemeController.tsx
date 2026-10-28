import { useEffect } from 'react'
import { applyThemePreference } from '@/app/theme'
import { useThemeStore } from '@/state/theme-store'

/** Keeps the document attribute and the meta theme-color in sync with the preference. */
export function ThemeController() {
  const preference = useThemeStore((state) => state.preference)

  useEffect(() => {
    applyThemePreference(preference)
  }, [preference])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (useThemeStore.getState().preference === 'system') applyThemePreference('system')
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  // The print stylesheet forces ink on white; make sure the screen theme is restored afterwards.
  useEffect(() => {
    const reapply = () => applyThemePreference(useThemeStore.getState().preference)
    window.addEventListener('afterprint', reapply)
    return () => window.removeEventListener('afterprint', reapply)
  }, [])

  return null
}
