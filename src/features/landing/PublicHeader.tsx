import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { landingButtonClassName } from './button'
import { Logo } from '@/components/logo'
import { LANDING_SECTIONS } from './content'
import { scrollToSection } from './scroll'
import { cn } from '@/lib/cn'

export function PublicHeader() {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const goToSection = (id: string) => {
    scrollToSection(id)
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-ground">
      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo to="/welcome" tagline={false} onClick={() => setMenuOpen(false)} />

        <nav className="hidden items-center gap-7 lg:flex" aria-label={t('nav.main')}>
          {LANDING_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => goToSection(section.id)}
              className="rounded-control text-base text-muted transition-feedback hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-data"
            >
              {t(section.labelKey)}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/calculator"
            className={landingButtonClassName({ size: 'md', className: 'max-sm:hidden' })}
          >
            {t('landing.nav.open')}
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? 'public-mobile-navigation' : undefined}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-control px-3 text-base font-medium text-muted transition-feedback hover:bg-raised hover:text-ink lg:hidden"
          >
            {menuOpen ? t('nav.close') : t('nav.menu')}
          </button>
        </div>

        {menuOpen ? (
          <nav
            id="public-mobile-navigation"
            aria-label={t('nav.main')}
            className={cn(
              'absolute inset-x-4 top-[4.25rem] z-50 rounded-card bg-surface p-3 shadow-overlay',
              'lg:hidden',
            )}
          >
            <div className="space-y-1">
              {LANDING_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => goToSection(section.id)}
                  className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-base font-medium text-ink transition-feedback hover:bg-raised"
                >
                  {t(section.labelKey)}
                </button>
              ))}
            </div>
            <Link
              to="/calculator"
              onClick={() => setMenuOpen(false)}
              className={landingButtonClassName({ className: 'mt-3 w-full' })}
            >
              {t('landing.nav.open')}
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  )
}
