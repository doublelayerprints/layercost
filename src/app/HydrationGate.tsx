import type { ReactNode } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button } from '@/components/ui'
import { useAppStore } from '@/state/app-store'

/**
 * Evita di mostrare il seed iniziale mentre il repository asincrono carica i
 * dati salvati. In caso di errore lascia riprovare senza sovrascrivere nulla.
 */
export function HydrationGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const hydrated = useAppStore((state) => state.hydrated)
  const hydrating = useAppStore((state) => state.hydrating)
  const hydrateError = useAppStore((state) => state.hydrateError)
  const hydrate = useAppStore((state) => state.hydrate)

  if (hydrated) return children

  return (
    <main
      aria-busy={hydrating}
      className="flex min-h-screen items-center justify-center bg-ground px-4 text-ink"
    >
      <div className="w-full max-w-md">
        {hydrateError ? (
          <Alert tone="warning" title={t('common.warning')}>
            <p>{t('errors.storage.loadFailed')}</p>
            <Button
              className="mt-3"
              variant="secondary"
              disabled={hydrating}
              onClick={() => void hydrate()}
            >
              {t('common.retry')}
            </Button>
          </Alert>
        ) : (
          <p role="status" aria-live="polite" className="text-center text-sm text-muted">
            {t('common.loading')}
          </p>
        )}
      </div>
    </main>
  )
}
