import { useEffect, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { systemPrefersDark } from '@/app/theme'
import { useLocaleStore } from '@/state/locale-store'
import { useThemeStore } from '@/state/theme-store'
import { cn } from '@/lib/cn'

function SunIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('h-4 w-4 transition-feedback', active ? 'text-ink' : 'text-muted')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('h-4 w-4 transition-feedback', active ? 'text-ink' : 'text-muted')}
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

/**
 * Compact top-bar switches for the public landing. They write the same
 * preferences as the app but never touch `layercost:data`.
 */
export function PublicTopBarControls() {
  const { t, locale } = useI18n()
  const setLocale = useLocaleStore((state) => state.setLocale)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemDark(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const isDark = preference === 'dark' || (preference === 'system' && systemDark)
  const themeLabel = isDark
    ? t('landing.topbar.themeToLight')
    : t('landing.topbar.themeToDark')
  const nextLanguage =
    locale === 'it' ? t('settings.languageEn') : t('settings.languageIt')
  const languageLabel = `IT / EN, ${t('landing.topbar.languageTo', { language: nextLanguage })}`

  return (
    <div
      role="group"
      aria-label={t('landing.footer.preferences')}
      className="flex shrink-0 items-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => setLocale(locale === 'it' ? 'en' : 'it')}
        aria-label={languageLabel}
        title={languageLabel}
        className="inline-flex h-11 shrink-0 items-center gap-1 rounded-control bg-raised px-2.5 text-[13px] font-medium text-muted transition-feedback hover:bg-line hover:text-ink sm:h-9"
      >
        <span className={cn(locale === 'it' ? 'font-semibold text-ink' : 'text-muted')}>
          IT
        </span>
        <span aria-hidden="true" className="text-line">
          /
        </span>
        <span className={cn(locale === 'en' ? 'font-semibold text-ink' : 'text-muted')}>
          EN
        </span>
      </button>

      <button
        type="button"
        onClick={() => setPreference(isDark ? 'light' : 'dark')}
        aria-label={themeLabel}
        title={themeLabel}
        className="inline-flex h-11 w-12 shrink-0 items-center justify-center gap-0.5 rounded-control bg-raised transition-feedback hover:bg-line sm:h-9"
      >
        <SunIcon active={!isDark} />
        <MoonIcon active={isDark} />
      </button>
    </div>
  )
}
