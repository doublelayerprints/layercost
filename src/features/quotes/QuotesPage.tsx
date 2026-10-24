import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, EmptyState, Input, PageHeader } from '@/components/ui'
import { NewDraftButton } from '@/features/calculator/NewDraftButton'
import { formatCents, formatCurrency, formatDateOnly } from '@/lib/format'
import type { Quote } from '@/domain/types'

function quoteStatus(quote: Quote): {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
} {
  if (!quote.result) return { label: 'Non ricalcolabile', tone: 'danger' }
  if (quote.archived) return { label: 'Archiviato', tone: 'warning' }
  return { label: 'Salvato', tone: 'success' }
}

export function QuotesPage() {
  const quotes = useAppStore((state) => state.quotes)
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

  const visibleCount = quotes.filter((quote) => showArchived || !quote.archived).length
  const hasHiddenArchived = !showArchived && quotes.some((quote) => quote.archived)
  const hasSearch = search.trim().length > 0

  const emptyAction =
    quotes.length === 0 ? (
      <Button onClick={() => navigate('/')}>Vai al calcolatore</Button>
    ) : hasSearch ? (
      <Button variant="secondary" onClick={() => setSearch('')}>
        Azzera la ricerca
      </Button>
    ) : hasHiddenArchived ? (
      <Button variant="secondary" onClick={() => setShowArchived(true)}>
        Mostra archiviati
      </Button>
    ) : undefined

  return (
    <div>
      <PageHeader
        title="Preventivi"
        description="Ogni preventivo conserva i prezzi usati al momento del salvataggio."
        actions={<NewDraftButton label="Nuovo preventivo" />}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca per nome o cliente…"
            aria-label="Cerca preventivi"
          />
        </div>
        <label className="flex min-h-9 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="h-4 w-4 rounded border-control accent-data"
          />
          Mostra archiviati
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">
        {filtered.length === visibleCount
          ? `${visibleCount} ${visibleCount === 1 ? 'preventivo' : 'preventivi'}`
          : `${filtered.length} di ${visibleCount}`}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={quotes.length === 0 ? 'Nessun preventivo salvato' : 'Nessun risultato'}
            description={
              quotes.length === 0
                ? 'Calcola una stampa o un lotto e salvalo per ritrovarlo qui.'
                : hasSearch
                  ? 'Nessun preventivo corrisponde alla ricerca.'
                  : 'Gli unici preventivi presenti sono archiviati.'
            }
            action={emptyAction}
          />
        </div>
      ) : (
        <>
          <div className="relative mt-3 hidden overflow-x-auto border-y border-line md:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Preventivi salvati</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Preventivo
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Stato
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Righe
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Costo
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Prezzo
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote) => {
                  const status = quoteStatus(quote)
                  return (
                    <tr key={quote.id} className="border-t border-rule align-middle">
                      <th scope="row" className="py-3 pr-4 text-left font-normal">
                        <Link
                          to={`/quotes/${quote.id}`}
                          className="font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {quote.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDateOnly(quote.quoteDate)}
                          {quote.customer ? ` · ${quote.customer}` : ''}
                        </p>
                      </th>
                      <td className="py-3 pr-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted">
                        {quote.lines.length}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted">
                        {quote.result ? formatCurrency(quote.result.totalCost) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                        {quote.result ? formatCents(quote.result.grossPriceCents) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                        >
                          Apri
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 border-t border-line md:hidden">
            {filtered.map((quote) => {
              const status = quoteStatus(quote)
              return (
                <li key={quote.id} className="border-b border-rule py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="block truncate text-sm font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {quote.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDateOnly(quote.quoteDate)}
                        {quote.customer ? ` · ${quote.customer}` : ''} · {quote.lines.length}{' '}
                        {quote.lines.length === 1 ? 'riga' : 'righe'}
                      </p>
                      <div className="mt-1.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-medium tabular-nums text-ink">
                        {quote.result ? formatCents(quote.result.grossPriceCents) : '—'}
                      </p>
                      <p className="text-xs text-muted">
                        {quote.result ? formatCurrency(quote.result.totalCost) : ''}
                      </p>
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
                      >
                        Apri
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
