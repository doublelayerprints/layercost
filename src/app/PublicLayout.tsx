import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { PublicFooter } from '@/features/landing/PublicFooter'
import { PublicHeader } from '@/features/landing/PublicHeader'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export function PublicLayout() {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault()
          const main = document.getElementById('main')
          main?.focus()
          main?.scrollIntoView()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-base focus:text-ink"
      >
        {t('nav.skipToContent')}
      </a>

      <ScrollToTop />
      <PublicHeader />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
