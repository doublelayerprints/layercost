import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { I18nProvider } from '@/app/I18nProvider'
import { useI18n } from '@/app/i18n-context'
import { PublicLayout } from '@/app/PublicLayout'
import { ThemeController } from '@/app/ThemeController'
import { useAuthStore } from '@/state/auth-store'
import { CalculatorPage } from '@/features/calculator/CalculatorPage'
import { QuotesPage } from '@/features/quotes/QuotesPage'
import { QuoteDetailPage } from '@/features/quotes/QuoteDetailPage'
import { SharePage } from '@/features/quotes/SharePage'
import { PrintersPage } from '@/features/printers/PrintersPage'
import { MaterialsPage } from '@/features/materials/MaterialsPage'
import { TariffsPage } from '@/features/tariffs/TariffsPage'
import { ExtrasPage } from '@/features/extras/ExtrasPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ComparePage } from '@/features/compare/ComparePage'
import { LoginPage } from '@/features/auth/LoginPage'
import { OAuthCallbackRedirect } from '@/features/auth/OAuthCallbackRedirect'
import { NotFoundPage } from '@/features/NotFoundPage'
import { LandingRoute } from '@/features/landing/LandingRoute'

const RequestAccessPage = lazy(() =>
  import('@/features/access/RequestAccessPage').then((module) => ({
    default: module.RequestAccessPage,
  })),
)

function RouteLoading() {
  const { t } = useI18n()
  return (
    <p role="status" className="text-sm text-muted">
      {t('common.loading')}
    </p>
  )
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)
  const resetOAuth = useAuthStore((state) => state.resetOAuth)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  // If the user comes back from Google with the browser back button, the
  // redirect state can survive in the bfcache; re-enable the buttons.
  useEffect(() => {
    const handlePageShow = () => resetOAuth()
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [resetOAuth])

  return (
    <I18nProvider>
      <ThemeController />
      <HashRouter>
        <OAuthCallbackRedirect />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingRoute />} />
            <Route path="welcome" element={<LandingRoute />} />
          </Route>

          <Route element={<AppShell />}>
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="quotes/:id" element={<QuoteDetailPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="printers" element={<PrintersPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="tariffs" element={<TariffsPage />} />
            <Route path="extras" element={<ExtrasPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route
              path="request-access"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <RequestAccessPage />
                </Suspense>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </I18nProvider>
  )
}
