import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Alert, Button, EmptyState, PageHeader } from '@/components/ui'
import { decodeSharedQuote } from '@/lib/share'
import { QuoteOverview } from './QuoteOverview'
import { QuotePrint } from './QuotePrint'

export function SharePage() {
  const [searchParams] = useSearchParams()
  const payload = searchParams.get('d')
  const importSharedQuote = useAppStore((state) => state.importSharedQuote)
  const navigate = useNavigate()
  const [importError, setImportError] = useState<string>()

  const decoded = useMemo(() => {
    if (!payload) {
      return { error: 'Il link non contiene un preventivo.' }
    }
    try {
      return { quote: decodeSharedQuote(payload) }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Il link non è valido.',
      }
    }
  }, [payload])

  if (!decoded.quote) {
    return (
      <div>
        <PageHeader title="Link non valido" />
        <div className="mt-6">
          <EmptyState
            title="Impossibile aprire il preventivo"
            description={decoded.error ?? 'Il link è incompleto o danneggiato.'}
            action={<Button onClick={() => navigate('/')}>Vai a LayerCost</Button>}
          />
        </div>
      </div>
    )
  }

  const quote = decoded.quote
  const handleImport = () => {
    try {
      const id = importSharedQuote(quote)
      navigate(`/quotes/${id}`, { state: { saved: true } })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Importazione non riuscita.')
    }
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={quote.name}
          description="Preventivo condiviso in sola lettura. I numeri sono quelli salvati dal mittente."
          meta={<span className="text-xs text-muted">Link condiviso</span>}
          actions={
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                Stampa / PDF
              </Button>
              <Button onClick={handleImport}>Importa nel mio archivio</Button>
            </>
          }
        />

        {importError ? (
          <div className="mt-5">
            <Alert tone="danger" title="Importazione non riuscita">
              {importError}
            </Alert>
          </div>
        ) : null}

        <div className="mt-5">
          <Alert tone="info" title="Cosa stai vedendo">
            Questa pagina mostra solo il preventivo contenuto nel link. Non hai accesso alla
            configurazione o agli altri dati del mittente.
          </Alert>
        </div>

        <div className="mt-6">
          <QuoteOverview quote={quote} result={quote.result} />
        </div>
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
