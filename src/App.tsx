import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import { useAppStore } from '@/state/app-store'
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
import { NotFoundPage } from '@/features/NotFoundPage'

export default function App() {
  const hydrate = useAppStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CalculatorPage />} />
          <Route path="quotes" element={<QuotesPage />} />
          <Route path="quotes/:id" element={<QuoteDetailPage />} />
          <Route path="share" element={<SharePage />} />
          <Route path="printers" element={<PrintersPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="tariffs" element={<TariffsPage />} />
          <Route path="extras" element={<ExtrasPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
