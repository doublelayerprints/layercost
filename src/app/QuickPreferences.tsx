import { useId } from 'react'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { useLocaleStore } from '@/state/locale-store'
import { useThemeStore } from '@/state/theme-store'
import type { Locale } from '@/i18n'
import type { MessageKey } from '@/i18n/it'
import type { ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/cn'

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: MessageKey }> = [
  { value: 'system', label: 'settings.themeSystem' },
  { value: 'light', label: 'settings.themeLight' },
  { value: 'dark', label: 'settings.themeDark' },
]

const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: Locale
  short: string
  label: MessageKey
}> = [
  { value: 'it', short: 'IT', label: 'settings.languageIt' },
  { value: 'en', short: 'EN', label: 'settings.languageEn' },
]

/**
 * Compact theme and language controls for the sidebar. They write the same
 * preferences as Settings and stay available from the mobile menu.
 */
export function QuickPreferences({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n()
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const adoptLocale = useAppStore((state) => state.adoptLocale)
  const themeGroupName = useId()
  const languageGroupName = useId()

  const changeLocale = (next: Locale) => {
    setLocale(next)
    adoptLocale(next)
  }

  const optionClass = (selected: boolean) =>
    cn(
      'relative flex flex-1 cursor-pointer items-center justify-center rounded-[4px] px-2 text-xs font-medium transition-feedback',
      mobile ? 'min-h-11' : 'min-h-8',
      selected ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-data',
    )

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="text-xs font-medium text-muted">{t('settings.themeLegend')}</legend>
        <div className="mt-1.5 flex rounded-control bg-raised p-0.5">
          {THEME_OPTIONS.map((option) => (
            <label key={option.value} className={optionClass(themePreference === option.value)}>
              <input
                type="radio"
                name={themeGroupName}
                value={option.value}
                checked={themePreference === option.value}
                onChange={() => setThemePreference(option.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {t(option.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-medium text-muted">{t('settings.languageLegend')}</legend>
        <div className="mt-1.5 flex rounded-control bg-raised p-0.5">
          {LANGUAGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={optionClass(locale === option.value)}
              title={t(option.label)}
            >
              <input
                type="radio"
                name={languageGroupName}
                value={option.value}
                checked={locale === option.value}
                onChange={() => changeLocale(option.value)}
                aria-label={t(option.label)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {option.short}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
