import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, EmptyState, Input, PageHeader, TableScroll } from '@/components/ui'
import { NewDraftButton } from '@/features/calculator/NewDraftButton'
import { plural } from '@/i18n'
import { quoteStatusDisplay } from './quote-status'

export function QuotesPage() {
  const { t, locale } = useI18n()
  const format = useFormat()
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
      <Button onClick={() => navigate('/')}>{t('quotes.goToCalculator')}</Button>
    ) : hasSearch ? (
      <Button variant="secondary" onClick={() => setSearch('')}>
        {t('quotes.resetSearch')}
      </Button>
    ) : hasHiddenArchived ? (
      <Button variant="secondary" onClick={() => setShowArchived(true)}>
        {t('quotes.showArchived')}
      </Button>
    ) : undefined

  return (
    <div>
      <PageHeader
        title={t('quotes.title')}
        description={t('quotes.description')}
        actions={<NewDraftButton label={t('quotes.new')} />}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('quotes.search.placeholder')}
            aria-label={t('quotes.search.label')}
          />
        </div>
        <label className="flex min-h-9 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="h-4 w-4 rounded border-control accent-data"
          />
          {t('quotes.showArchived')}
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">
        {filtered.length === visibleCount
          ? plural(locale, visibleCount, {
              one: 'quotes.count.one',
              other: 'quotes.count.other',
            })
          : t('quotes.filteredOf', { shown: filtered.length, total: visibleCount })}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={quotes.length === 0 ? t('quotes.empty.title') : t('quotes.noResults.title')}
            description={
              quotes.length === 0
                ? t('quotes.empty.description')
                : hasSearch
                  ? t('quotes.noResults.search')
                  : t('quotes.noResults.archived')
            }
            action={emptyAction}
          />
        </div>
      ) : (
        <>
          <TableScroll
            label={t('quotes.table.caption')}
            className="mt-3 hidden border-y border-line md:block"
          >
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('quotes.table.caption')}</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('quote.label.quote')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('quote.label.status')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('quote.label.lines')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('quote.label.cost')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('quote.label.price')}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">{t('quote.label.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote) => {
                  const status = quoteStatusDisplay(quote)
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
                          {format.dateOnly(quote.quoteDate)}
                          {quote.customer ? ` · ${quote.customer}` : ''}
                        </p>
                      </th>
                      <td className="py-3 pr-4">
                        <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted">
                        {quote.lines.length}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted">
                        {quote.result ? format.currency(quote.result.totalCost) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                        {quote.result ? format.cents(quote.result.grossPriceCents) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                        >
                          {t('quotes.open')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>

          <ul className="mt-3 border-t border-line md:hidden">
            {filtered.map((quote) => {
              const status = quoteStatusDisplay(quote)
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
                        {format.dateOnly(quote.quoteDate)}
                        {quote.customer ? ` · ${quote.customer}` : ''} ·{' '}
                        {plural(locale, quote.lines.length, {
                          one: 'quote.lineCount.one',
                          other: 'quote.lineCount.other',
                        })}
                      </p>
                      <div className="mt-1.5">
                        <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-medium tabular-nums text-ink">
                        {quote.result ? format.cents(quote.result.grossPriceCents) : '—'}
                      </p>
                      <p className="text-xs text-muted">
                        {quote.result ? format.currency(quote.result.totalCost) : ''}
                      </p>
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
                      >
                        {t('quotes.open')}
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
