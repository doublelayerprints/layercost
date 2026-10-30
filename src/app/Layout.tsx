import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import type { MessageKey } from '@/i18n'
import { QuickPreferences } from '@/app/QuickPreferences'
import { useAppStore, type AppWarning } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { SyncIndicator } from '@/features/sync/SyncIndicator'
import { Alert } from '@/components/ui'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/cn'
import { ENGINE_VERSION } from '@/domain/version'

function NavItems({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useI18n()
  const groupIdPrefix = useId()
  const navGroups = [
    {
      label: t('nav.work'),
      items: [
        { to: '/welcome', label: t('nav.overview') },
        { to: '/calculator', label: t('nav.calculator') },
        { to: '/quotes', label: t('nav.quotes') },
        { to: '/compare', label: t('nav.compare') },
      ],
    },
    {
      label: t('nav.configuration'),
      items: [
        { to: '/printers', label: t('nav.printers') },
        { to: '/materials', label: t('nav.materials') },
        { to: '/tariffs', label: t('nav.tariffs') },
        { to: '/extras', label: t('nav.extras') },
        { to: '/settings', label: t('nav.settings') },
      ],
    },
    {
      label: t('nav.help'),
      items: [
        { to: '/docs', label: t('nav.docs') },
        { to: '/feedback', label: t('nav.feedback') },
      ],
    },
  ]

  return (
    <>
      {navGroups.map((group, index) => {
        const labelId = `${groupIdPrefix}-${index}`
        return (
          <div key={group.label} role="group" aria-labelledby={labelId}>
            <p
              id={labelId}
              className="flex items-center gap-3 px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
            >
              <span className="shrink-0">{group.label}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
            </p>
            <div className="space-y-px">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={
                    item.to === '/calculator' || item.to === '/welcome' || item.to === '/feedback'
                  }
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-control text-sm transition-feedback',
                      mobile ? 'px-3 py-3 font-medium' : 'px-3 py-[7px]',
                      isActive
                        ? 'bg-raised font-medium text-ink'
                        : 'text-muted hover:bg-raised hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function MobileHeader() {
  const { t } = useI18n()
  const mode = useAppStore((state) => state.mode)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-ground lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Logo tagline={false} />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? 'mobile-navigation' : undefined}
          className="inline-flex h-10 items-center rounded-control px-3 text-sm font-medium text-muted transition-feedback hover:bg-raised hover:text-ink"
        >
          {menuOpen ? t('nav.close') : t('nav.menu')}
        </button>
      </div>
      {menuOpen ? (
        <nav
          id="mobile-navigation"
          className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-line px-4 pb-6 pt-2"
          aria-label={t('nav.main')}
        >
          <NavItems mobile onNavigate={() => setMenuOpen(false)} />
          <div className="mt-3 border-t border-line pt-2">
            <SyncIndicator mobile />
          </div>
          <div className="mt-3 border-t border-line pt-4">
            <QuickPreferences mobile />
          </div>
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            <p>{mode === 'cloud' ? t('sync.accountMode') : t('app.dataLocal')}</p>
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-block text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
            >
              {t('app.exportBackup')}
            </Link>
            <p className="mt-2">{t('app.engineVersion', { version: ENGINE_VERSION })}</p>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

const warningKeys: Record<AppWarning, MessageKey> = {
  storageUnavailable: 'errors.storage.storageUnavailable',
  corruptData: 'errors.storage.corruptData',
  saveFailed: 'errors.storage.saveFailed',
  loadFailed: 'errors.storage.loadFailed',
  exportFailed: 'errors.storage.exportFailed',
  resetFailed: 'errors.storage.resetFailed',
}

export function Layout() {
  const { t } = useI18n()
  const warning = useAppStore((state) => state.warning)
  const setWarning = useAppStore((state) => state.setWarning)
  const mode = useAppStore((state) => state.mode)
  const authStatus = useAuthStore((state) => state.status)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-ground text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t('nav.skipToContent')}
      </a>

      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-ground px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto" aria-label={t('nav.main')}>
          <NavItems />
        </nav>
        <div className="border-t border-line px-3 pt-2">
          <SyncIndicator />
        </div>
        <div className="mt-2 border-t border-line px-3 pt-3">
          <QuickPreferences />
        </div>
        <div className="mt-3 border-t border-line px-3 pt-3 text-xs text-muted">
          <p>{mode === 'cloud' ? t('sync.accountMode') : t('app.dataLocal')}</p>
          <Link
            to="/settings"
            className="mt-1 inline-block text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
          >
            {t('app.exportBackup')}
          </Link>
          <p className="mt-2">{t('app.engineVersion', { version: ENGINE_VERSION })}</p>
        </div>
      </aside>

      <div className="lg:pl-64 print:pl-0">
        <MobileHeader />

        <main
          id="main"
          className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0"
        >
          <ScrollToTop />
          {warning ? (
            <div className="no-print mb-6">
              <Alert
                tone="warning"
                title={t('common.warning')}
                onClose={() => setWarning(undefined)}
              >
                {t(warningKeys[warning])}
              </Alert>
            </div>
          ) : null}
          {authStatus === 'expired' && location.pathname !== '/login' ? (
            <div className="no-print mb-6">
              <Alert tone="warning" title={t('auth.expired.title')}>
                <p>
                  {t('auth.expired.body')}{' '}
                  <Link
                    to="/login"
                    className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                  >
                    {t('auth.loginAction')}
                  </Link>
                </p>
              </Alert>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
