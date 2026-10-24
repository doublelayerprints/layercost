import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui'
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
      <div>
        <PageHeader title="Preventivo non trovato" />
        <div className="mt-6">
          <EmptyState
            title="Questo preventivo non esiste più"
            description="Potrebbe essere stato eliminato o il link non è corretto."
            action={<Button onClick={() => navigate('/quotes')}>Torna all’archivio</Button>}
          />
        </div>
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
      <div className="print:hidden">
        <Link
          to="/quotes"
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-muted transition-feedback hover:text-ink"
        >
          <span aria-hidden="true">‹</span> Preventivi
        </Link>

        <div className="mt-2">
          <PageHeader
            title={quote.name}
            description={`${formatDateOnly(quote.quoteDate)}${
              quote.customer ? ` · ${quote.customer}` : ''
            } · ${quote.lines.length} ${quote.lines.length === 1 ? 'riga' : 'righe'}`}
            meta={
              <>
                {quote.archived ? (
                  <Badge tone="warning">Archiviato</Badge>
                ) : (
                  <Badge tone="success">Salvato</Badge>
                )}
                {quote.engineVersion ? (
                  <span className="text-xs text-muted">Motore v{quote.engineVersion}</span>
                ) : null}
              </>
            }
            actions={
              <>
                {quote.result ? (
                  <ShareQuoteButton quote={quote} result={quote.result} variant="secondary" />
                ) : null}
                <Button onClick={() => window.print()} disabled={!quote.result}>
                  Stampa / PDF
                </Button>
              </>
            }
          />
        </div>

        {quote.engineVersion && quote.engineVersion !== ENGINE_VERSION ? (
          <div className="mt-5">
            <Alert tone="info" title="Versione del motore diversa">
              Questo preventivo è stato calcolato con il motore v{quote.engineVersion}; quello
              attuale è v{ENGINE_VERSION}. I numeri salvati restano validi come storico. Usa
              “Aggiorna ai prezzi correnti” per creare una copia ricalcolata.
            </Alert>
          </div>
        ) : null}

        <div className="mt-6">
          <QuoteOverview
            quote={quote}
            result={quote.result}
            snapshotAction={
              quote.snapshot ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    refreshQuote(quote.id)
                    navigate('/')
                  }}
                >
                  Aggiorna ai prezzi correnti
                </Button>
              ) : undefined
            }
          />
        </div>

        <Card className="mt-6 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Gestione del preventivo</h2>
          <p className="mt-0.5 text-sm text-muted">
            Archiviare non cancella nulla: il preventivo resta consultabile con “Mostra archiviati”.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                duplicateQuote(quote.id)
                navigate('/')
              }}
            >
              Duplica nel calcolatore
            </Button>
            <Button variant="secondary" onClick={() => archiveQuote(quote.id)}>
              {quote.archived ? 'Ripristina' : 'Archivia'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-negative hover:bg-raised"
            >
              Elimina definitivamente
            </Button>
          </div>
        </Card>
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
