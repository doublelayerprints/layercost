import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '@/state/app-store'
import { Alert } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ENGINE_VERSION } from '@/domain/version'

const navGroups = [
  {
    label: 'Lavoro',
    items: [
      { to: '/', label: 'Calcolatore', short: 'C' },
      { to: '/quotes', label: 'Preventivi', short: 'P' },
      { to: '/compare', label: 'Confronto', short: 'C' },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { to: '/printers', label: 'Stampanti', short: 'S' },
      { to: '/materials', label: 'Materiali', short: 'M' },
      { to: '/tariffs', label: 'Tariffe energia', short: 'T' },
      { to: '/extras', label: 'Extra', short: 'E' },
      { to: '/settings', label: 'Impostazioni', short: 'I' },
    ],
  },
]

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
        <span className="flex flex-col items-center gap-[3px]">
          <span className="h-[3px] w-5 rounded-full bg-emerald-400" />
          <span className="h-[3px] w-4 rounded-full bg-emerald-400/80" />
          <span className="h-[3px] w-6 rounded-full bg-emerald-400" />
        </span>
      </span>
      {!compact ? (
        <span>
          <span className="block text-sm font-semibold tracking-tight text-white">LayerCost</span>
          <span className="block text-[11px] text-slate-400">Costo e prezzo delle stampe 3D</span>
        </span>
      ) : null}
    </Link>
  )
}

function NavItems({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {navGroups.map((group) => (
        <div key={group.label} className={mobile ? 'flex items-center gap-2' : 'space-y-1'}>
          {!mobile ? (
            <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  mobile
                    ? 'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition'
                    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? mobile
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-white/10 text-white'
                    : mobile
                      ? 'bg-white text-slate-600 hover:bg-slate-50'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {!mobile ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300">
                  {item.short}
                </span>
              ) : null}
              {item.label}
            </NavLink>
          ))}
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

export function Layout() {
  const warning = useAppStore((state) => state.warning)
  const setWarning = useAppStore((state) => state.setWarning)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-slate-950 px-4 py-5 lg:flex">
        <Logo />
        <nav className="mt-4 flex-1 overflow-y-auto">
          <NavItems />
        </nav>
        <div className="border-t border-white/10 pt-3 text-[11px] text-slate-500">
          <p>Dati salvati solo su questo browser.</p>
          <Link to="/settings" className="mt-1 inline-block text-slate-400 hover:text-white">
            Esporta un backup
          </Link>
          <p className="mt-2 text-slate-600">Motore v{ENGINE_VERSION}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="rounded-xl bg-slate-950 px-3 py-2">
              <Logo />
            </div>
            <Link
              to="/settings"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
            >
              Impostazioni
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            <NavItems mobile />
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          <ScrollToTop />
          {warning ? (
            <div className="no-print mb-4">
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
