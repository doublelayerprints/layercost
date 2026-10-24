import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/state/app-store'
import { Alert } from '@/components/ui'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/cn'
import { ENGINE_VERSION } from '@/domain/version'

const navGroups = [
  {
    label: 'Lavoro',
    items: [
      { to: '/', label: 'Calcolatore' },
      { to: '/quotes', label: 'Preventivi' },
      { to: '/compare', label: 'Confronto' },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { to: '/printers', label: 'Stampanti' },
      { to: '/materials', label: 'Materiali' },
      { to: '/tariffs', label: 'Tariffe energia' },
      { to: '/extras', label: 'Extra' },
      { to: '/settings', label: 'Impostazioni' },
    ],
  },
]

function NavItems({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  return (
    <>
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 pt-6 text-xs font-medium text-muted">{group.label}</p>
          <div className="space-y-px">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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
      ))}
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
          {menuOpen ? 'Chiudi' : 'Menu'}
        </button>
      </div>
      {menuOpen ? (
        <nav
          id="mobile-navigation"
          className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-line px-4 pb-6 pt-2"
          aria-label="Navigazione principale"
        >
          <NavItems mobile onNavigate={() => setMenuOpen(false)} />
          <div className="mt-6 border-t border-line pt-3 text-xs text-muted">
            <p>Dati salvati solo su questo browser.</p>
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-block text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
            >
              Esporta un backup
            </Link>
            <p className="mt-2">Motore v{ENGINE_VERSION}</p>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

export function Layout() {
  const warning = useAppStore((state) => state.warning)
  const setWarning = useAppStore((state) => state.setWarning)

  return (
    <div className="min-h-screen bg-ground text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        Vai al contenuto
      </a>

      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-ground px-3 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Navigazione principale">
          <NavItems />
        </nav>
        <div className="border-t border-line px-3 pt-3 text-xs text-muted">
          <p>Dati salvati solo su questo browser.</p>
          <Link
            to="/settings"
            className="mt-1 inline-block text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
          >
            Esporta un backup
          </Link>
          <p className="mt-2">Motore v{ENGINE_VERSION}</p>
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
              <Alert tone="warning" title="Attenzione" onClose={() => setWarning(undefined)}>
                {warning}
              </Alert>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
