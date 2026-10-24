import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { ENGINE_VERSION } from '@/domain/version'
import { draftHasContent } from '@/lib/draft'
import { QuoteOverview } from './QuoteOverview'
import { QuotePrint } from './QuotePrint'
import { ShareQuoteButton } from './ShareQuoteButton'
import { formatDateOnly } from '@/lib/format'

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const quotes = useAppStore((state) => state.quotes)
  const draft = useAppStore((state) => state.draft)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const refreshQuote = useAppStore((state) => state.refreshQuote)
  const archiveQuote = useAppStore((state) => state.archiveQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const navigate = useNavigate()
  const location = useLocation()
  const cameFromSave = Boolean((location.state as { saved?: boolean } | null)?.saved)
  const [savedFor, setSavedFor] = useState<string | undefined>(cameFromSave ? id : undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDraftAction, setPendingDraftAction] = useState<'duplicate' | 'refresh'>()

  // The confirmation is for this visit only: drop it from history so a reload does not repeat it.
  useEffect(() => {
    if (cameFromSave) navigate(location.pathname, { replace: true, state: null })
  }, [cameFromSave, location.pathname, navigate])

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

  const runDraftAction = (action: 'duplicate' | 'refresh') => {
    if (action === 'duplicate') {
      duplicateQuote(quote.id)
    } else {
      refreshQuote(quote.id)
    }
    setPendingDraftAction(undefined)
    navigate('/')
  }

  const requestDraftAction = (action: 'duplicate' | 'refresh') => {
    if (draftHasContent(draft)) {
      setPendingDraftAction(action)
      return
    }
    runDraftAction(action)
  }

  const confirmDelete = () => {
    deleteQuote(quote.id)
    setDeleteOpen(false)
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

        {savedFor === quote.id ? (
          <div className="mt-5">
            <Alert tone="success" title="Preventivo salvato" onClose={() => setSavedFor(undefined)}>
              È nello storico e conserva i prezzi usati adesso.
            </Alert>
          </div>
        ) : null}

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
                <Button variant="ghost" size="sm" onClick={() => requestDraftAction('refresh')}>
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
            <Button variant="secondary" onClick={() => requestDraftAction('duplicate')}>
              Duplica nel calcolatore
            </Button>
            <Button variant="secondary" onClick={() => archiveQuote(quote.id)}>
              {quote.archived ? 'Ripristina' : 'Archivia'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-negative hover:bg-raised"
            >
              Elimina definitivamente
            </Button>
          </div>
        </Card>

        <Modal
          open={pendingDraftAction !== undefined}
          onClose={() => setPendingDraftAction(undefined)}
          title="Sostituire la bozza corrente?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingDraftAction(undefined)}>
                Annulla
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (pendingDraftAction) runDraftAction(pendingDraftAction)
                }}
              >
                Sostituisci la bozza
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-muted">
            <p>“{quote.name}” verrà aperto nel calcolatore come nuova bozza.</p>
            <p>
              La bozza corrente non è ancora nello storico e verrà sostituita. Se vuoi conservarla,
              annulla e salvala prima di continuare.
            </p>
          </div>
        </Modal>

        <Modal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Eliminare il preventivo?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                Annulla
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Elimina definitivamente
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-muted">
            <p>“{quote.name}” verrà rimosso dallo storico. L’operazione non è reversibile.</p>
            <p>Se vuoi solo toglierlo dalla lista, usa “Archivia”: resta consultabile.</p>
          </div>
        </Modal>
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
