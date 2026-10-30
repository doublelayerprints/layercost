import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { systemPrefersDark } from '@/app/theme'
import { useLocaleStore } from '@/state/locale-store'
import { useThemeStore } from '@/state/theme-store'
import type { Locale } from '@/i18n'
import type { MessageKey } from '@/i18n/it'
import type { ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/cn'

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
    </svg>
  )
}

const LANGUAGE_OPTIONS: ReadonlyArray<{
  value: Locale
  short: string
  labelKey: MessageKey
}> = [
  { value: 'it', short: 'IT', labelKey: 'settings.languageIt' },
  { value: 'en', short: 'EN', labelKey: 'settings.languageEn' },
]

const THEME_OPTIONS: ReadonlyArray<{
  value: Exclude<ThemePreference, 'system'>
  labelKey: MessageKey
}> = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
]

const segmentClass = (selected: boolean) =>
  cn(
    'relative flex h-11 w-8 cursor-pointer items-center justify-center rounded-[4px] text-[13px] font-medium sm:h-8',
    selected ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-data',
  )

/**
 * The landing top bar carries the same two preferences as the app, as a single
 * segmented switch: language first, then theme. The options are native radios
 * covered by their labels, so arrow keys, focus and checked state are free.
 * They write the shared preferences but never touch `layercost:data`.
 */
export function PublicTopBarControls() {
  const { t, locale } = useI18n()
  const setLocale = useLocaleStore((state) => state.setLocale)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const languageGroup = useId()
  const themeGroup = useId()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemDark(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const isDark = preference === 'dark' || (preference === 'system' && systemDark)
  const activeTheme = isDark ? 'dark' : 'light'
  const languageIndex = LANGUAGE_OPTIONS.findIndex((option) => option.value === locale)
  const themeIndex = THEME_OPTIONS.findIndex((option) => option.value === activeTheme)

  return (
    <div
      role="group"
      aria-label={t('landing.footer.preferences')}
      className="flex shrink-0 items-center rounded-control bg-raised p-0.5 outline outline-1 -outline-offset-1 outline-line"
    >
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{t('settings.languageLegend')}</legend>
        <div className="relative flex">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-8 rounded-[4px] bg-surface outline outline-1 -outline-offset-1 outline-line transition-transform duration-150 ease-out motion-reduce:transition-none',
              languageIndex === 1 && 'translate-x-full',
            )}
          />
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = locale === option.value
            return (
              <label
                key={option.value}
                title={
                  selected
                    ? t(option.labelKey)
                    : t('landing.topbar.languageTo', { language: t(option.labelKey) })
                }
                className={segmentClass(selected)}
              >
                <input
                  type="radio"
                  name={languageGroup}
                  value={option.value}
                  checked={selected}
                  onChange={() => setLocale(option.value)}
                  aria-label={t(option.labelKey)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="pointer-events-none relative z-10">{option.short}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-line" />

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{t('settings.themeLegend')}</legend>
        <div className="relative flex">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-8 rounded-[4px] bg-surface outline outline-1 -outline-offset-1 outline-line transition-transform duration-150 ease-out motion-reduce:transition-none',
              themeIndex === 1 && 'translate-x-full',
            )}
          />
          {THEME_OPTIONS.map((option) => {
            const selected = activeTheme === option.value
            return (
              <label
                key={option.value}
                title={
                  selected
                    ? t(option.labelKey)
                    : t(
                        option.value === 'light'
                          ? 'landing.topbar.themeToLight'
                          : 'landing.topbar.themeToDark',
                      )
                }
                className={segmentClass(selected)}
              >
                <input
                  type="radio"
                  name={themeGroup}
                  value={option.value}
                  checked={selected}
                  onChange={() => setPreference(option.value)}
                  aria-label={t(option.labelKey)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="pointer-events-none relative z-10">
                  {option.value === 'light' ? <SunIcon /> : <MoonIcon />}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
