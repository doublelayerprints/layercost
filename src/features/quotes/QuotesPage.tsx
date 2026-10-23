import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui'
import { formatCents, formatCurrency, formatDateOnly } from '@/lib/format'

export function QuotesPage() {
  const quotes = useAppStore((state) => state.quotes)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const refreshQuote = useAppStore((state) => state.refreshQuote)
  const archiveQuote = useAppStore((state) => state.archiveQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...quotes]
      .filter((quote) => showArchived || !quote.archived)
      .filter(
        (quote) =>
          !term ||
          quote.name.toLowerCase().includes(term) ||
          (quote.customer ?? '').toLowerCase().includes(term),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [quotes, search, showArchived])

  const handleDuplicate = (id: string) => {
    duplicateQuote(id)
    navigate('/')
  }

  const handleRefresh = (id: string) => {
    refreshQuote(id)
    navigate('/')
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Eliminare definitivamente il preventivo “${name}”?`)) return
    deleteQuote(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archivio"
        title="Preventivi"
        description="Ogni preventivo conserva i prezzi usati al momento del salvataggio."
        actions={<Button onClick={() => navigate('/')}>Nuovo preventivo</Button>}
      />

      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca per nome o cliente…"
              aria-label="Cerca preventivi"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Mostra archiviati
          </label>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title={quotes.length === 0 ? 'Nessun preventivo salvato' : 'Nessun risultato'}
          description={
            quotes.length === 0
              ? 'Calcola una stampa o un lotto e salvalo per ritrovarlo qui.'
              : 'Prova a cambiare la ricerca o a mostrare gli archiviati.'
          }
          action={
            quotes.length === 0 ? (
              <Button onClick={() => navigate('/')}>Vai al calcolatore</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((quote) => (
            <Card key={quote.id} className="p-4 transition hover:border-slate-300">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/quotes/${quote.id}`}
                      className="truncate text-base font-semibold text-slate-900 hover:text-emerald-700"
                    >
                      {quote.name}
                    </Link>
                    {quote.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                    {!quote.result ? <Badge tone="danger">Non ricalcolabile</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateOnly(quote.quoteDate)}
                    {quote.customer ? ` · ${quote.customer}` : ''}
                    {' · '}
                    {quote.lines.length} {quote.lines.length === 1 ? 'riga' : 'righe'}
                    {quote.result ? ` · costo ${formatCurrency(quote.result.totalCost)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-2 text-right">
                    <p className="text-lg font-semibold tabular-nums text-slate-900">
                      {quote.result ? formatCents(quote.result.grossPriceCents) : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">prezzo totale</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                  >
                    Apri
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(quote.id)}>
                    Duplica
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRefresh(quote.id)}>
                    Aggiorna prezzi
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveQuote(quote.id)}>
                    {quote.archived ? 'Ripristina' : 'Archivia'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(quote.id, quote.name)}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    Elimina
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
