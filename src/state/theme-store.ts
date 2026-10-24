import { create } from 'zustand'
import { loadThemePreference, saveThemePreference } from '@/data/theme'
import type { ThemePreference } from '@/lib/theme'

export interface ThemeState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  preference: loadThemePreference(),
  setPreference: (preference) => {
    saveThemePreference(preference)
    set({ preference })
  },
}))
