import { useId, type ComponentType } from 'react'
import { useI18n } from '@/app/i18n-context'
import { SyncStatusButton } from '@/features/sync/SyncStatusButton'
import { useAppStore } from '@/state/app-store'
import { useLocaleStore } from '@/state/locale-store'
import { useSyncStore } from '@/state/sync-store'
import { useThemeStore } from '@/state/theme-store'
import type { Locale } from '@/i18n'
import type { MessageKey } from '@/i18n/it'
import type { ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/cn'

function MonitorIcon() {
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
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

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
  value: ThemePreference
  labelKey: MessageKey
  Icon: ComponentType
}> = [
  { value: 'system', labelKey: 'settings.themeSystem', Icon: MonitorIcon },
  { value: 'light', labelKey: 'settings.themeLight', Icon: SunIcon },
  { value: 'dark', labelKey: 'settings.themeDark', Icon: MoonIcon },
]

const segmentClass = (selected: boolean) =>
  cn(
    'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] text-[13px] font-medium',
    selected ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-data',
  )

/**
 * Language, theme and sync in a single segmented control, matching the public
 * landing page. Sync is a status button, not a preference: its icon shape and
 * tooltip carry the state.
 */
export function TopBarControls() {
  const { t, locale } = useI18n()
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const adoptLocale = useAppStore((state) => state.adoptLocale)
  const syncStatus = useSyncStore((state) => state.status)
  const languageGroup = useId()
  const themeGroup = useId()

  const languageIndex = LANGUAGE_OPTIONS.findIndex((option) => option.value === locale)
  const themeIndex = THEME_OPTIONS.findIndex((option) => option.value === preference)
  const showSync = syncStatus !== 'idle' && syncStatus !== 'disabled'

  return (
    <div
      role="group"
      aria-label={t('app.topbarControls')}
      className="flex shrink-0 items-center rounded-control bg-raised p-0.5 outline outline-1 -outline-offset-1 outline-line"
    >
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{t('settings.languageLegend')}</legend>
        <div className="relative flex">
          <span
            aria-hidden="true"
            style={{ transform: `translateX(${languageIndex * 100}%)` }}
            className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-[4px] bg-surface outline outline-1 -outline-offset-1 outline-line transition-transform duration-150 ease-out motion-reduce:transition-none"
          />
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = locale === option.value
            return (
              <label
                key={option.value}
                title={t(option.labelKey)}
                className={segmentClass(selected)}
              >
                <input
                  type="radio"
                  name={languageGroup}
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    setLocale(option.value)
                    adoptLocale(option.value)
                  }}
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
            style={{ transform: `translateX(${themeIndex * 100}%)` }}
            className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-[4px] bg-surface outline outline-1 -outline-offset-1 outline-line transition-transform duration-150 ease-out motion-reduce:transition-none"
          />
          {THEME_OPTIONS.map((option) => {
            const selected = preference === option.value
            const Icon = option.Icon
            return (
              <label
                key={option.value}
                title={t(option.labelKey)}
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
                  <Icon />
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {showSync ? (
        <>
          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-line" />
          <SyncStatusButton />
        </>
      ) : null}
    </div>
  )
}
