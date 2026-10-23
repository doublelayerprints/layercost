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
      <div className="space-y-6">
        <PageHeader eyebrow="Condivisione" title="Link non valido" />
        <EmptyState
          title="Impossibile aprire il preventivo"
          description={decoded.error ?? 'Il link è incompleto o danneggiato.'}
          action={<Button onClick={() => navigate('/')}>Vai a LayerCost</Button>}
        />
      </div>
    )
  }

  const quote = decoded.quote
  const handleImport = () => {
    try {
      const id = importSharedQuote(quote)
      navigate(`/quotes/${id}`)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Importazione non riuscita.')
    }
  }

  return (
    <>
      <div className="print:hidden space-y-6">
        <PageHeader
          eyebrow="Preventivo condiviso"
          title={quote.name}
          description="Stai vedendo una copia in sola lettura. Puoi importarla nel tuo archivio locale."
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
          <Alert tone="danger" title="Importazione non riuscita">
            {importError}
          </Alert>
        ) : null}

        <Alert tone="info" title="Link condiviso">
          Questa pagina mostra solo il preventivo contenuto nel link. Non hai accesso alla
          configurazione o agli altri dati del mittente.
        </Alert>

        <QuoteOverview quote={quote} result={quote.result} />
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
