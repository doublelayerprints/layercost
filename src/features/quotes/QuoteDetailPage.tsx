import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, EmptyState, PageHeader } from '@/components/ui'
import { ENGINE_VERSION } from '@/domain/version'
import { QuoteOverview } from './QuoteOverview'
import { QuotePrint } from './QuotePrint'
import { ShareQuoteButton } from './ShareQuoteButton'
import { formatDateOnly } from '@/lib/format'

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const quotes = useAppStore((state) => state.quotes)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const refreshQuote = useAppStore((state) => state.refreshQuote)
  const archiveQuote = useAppStore((state) => state.archiveQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const navigate = useNavigate()

  const quote = quotes.find((candidate) => candidate.id === id)

  if (!quote) {
    return (
      <div className="space-y-6">
        <PageHeader title="Preventivo non trovato" />
        <EmptyState
          title="Questo preventivo non esiste più"
          description="Potrebbe essere stato eliminato o il link non è corretto."
          action={<Button onClick={() => navigate('/quotes')}>Torna all’archivio</Button>}
        />
      </div>
    )
  }

  const handleDelete = () => {
    if (!window.confirm(`Eliminare definitivamente il preventivo “${quote.name}”?`)) return
    deleteQuote(quote.id)
    navigate('/quotes')
  }

  return (
    <>
      <div className="print:hidden space-y-6">
        <PageHeader
          title={quote.name}
          description={`${formatDateOnly(quote.quoteDate)}${
            quote.customer ? ` · ${quote.customer}` : ''
          } · ${quote.lines.length} ${quote.lines.length === 1 ? 'riga' : 'righe'}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate('/quotes')}>
                Archivio
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  duplicateQuote(quote.id)
                  navigate('/')
                }}
              >
                Duplica
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  refreshQuote(quote.id)
                  navigate('/')
                }}
              >
                Aggiorna prezzi
              </Button>
              <Button variant="secondary" onClick={() => window.print()} disabled={!quote.result}>
                Stampa / PDF
              </Button>
              {quote.result ? <ShareQuoteButton quote={quote} result={quote.result} /> : null}
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          {quote.archived ? (
            <Badge tone="warning">Archiviato</Badge>
          ) : (
            <Badge tone="success">Salvato</Badge>
          )}
          {quote.engineVersion ? <Badge tone="neutral">Motore v{quote.engineVersion}</Badge> : null}
          <Button variant="ghost" size="sm" onClick={() => archiveQuote(quote.id)}>
            {quote.archived ? 'Ripristina' : 'Archivia'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-negative hover:bg-raised"
          >
            Elimina
          </Button>
        </div>

        {quote.engineVersion && quote.engineVersion !== ENGINE_VERSION ? (
          <Alert tone="info" title="Versione del motore diversa">
            Questo preventivo è stato calcolato con il motore v{quote.engineVersion}; quello attuale
            è v{ENGINE_VERSION}. I numeri salvati restano validi come storico. Usa “Aggiorna prezzi”
            per creare una copia ricalcolata.
          </Alert>
        ) : null}

        <QuoteOverview quote={quote} result={quote.result} />
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
