import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { Quote } from '@/domain/types'
import { Badge } from '@/components/ui'
import type { Formatters } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useQuoteAuditNames, useQuoteAuditVisible } from './use-quote-audit'

/** Creator and last-editor tags for the mobile quotes list. */
export function QuoteAuditTags({ quote, className }: { quote: Quote; className?: string }) {
  const { t } = useI18n()
  const format = useFormat()
  const visible = useQuoteAuditVisible()
  const { createdBy, updatedBy } = useQuoteAuditNames(quote)
  if (!visible || (!createdBy && !updatedBy)) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {createdBy ? (
        <Badge tone="neutral" className="max-w-full">
          <span className="truncate">
            {t('quote.audit.createdTag', { name: createdBy })}
            <span aria-hidden="true"> · </span>
            <time
              dateTime={quote.createdAt}
              title={format.dateTime(quote.createdAt)}
              className="tabular-nums"
            >
              {format.instantDate(quote.createdAt)}
            </time>
          </span>
        </Badge>
      ) : null}
      {updatedBy ? (
        <Badge tone="neutral" className="max-w-full">
          <span className="truncate">
            {t('quote.audit.updatedTag', { name: updatedBy })}
            <span aria-hidden="true"> · </span>
            <time
              dateTime={quote.updatedAt}
              title={format.dateTime(quote.updatedAt)}
              className="tabular-nums"
            >
              {format.instantDate(quote.updatedAt)}
            </time>
          </span>
        </Badge>
      ) : null}
    </div>
  )
}

function QuoteAuditValue({
  name,
  timestamp,
  format,
}: {
  name: string | undefined
  timestamp: string
  format: Formatters
}) {
  if (!name) return <span className="text-muted">—</span>

  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-ink" title={name}>
        {name}
      </p>
      <time
        dateTime={timestamp}
        title={format.dateTime(timestamp)}
        className="text-xs tabular-nums text-muted"
      >
        {format.instantDate(timestamp)}
      </time>
    </div>
  )
}

/**
 * Two narrow cells for the desktop quotes table. The header labels come from
 * the page, so the cells only carry the name and the date.
 */
export function QuoteAuditCells({ quote }: { quote: Quote }) {
  const format = useFormat()
  const { createdBy, updatedBy } = useQuoteAuditNames(quote)

  return (
    <>
      <td className="w-40 py-3 pr-4">
        <QuoteAuditValue name={createdBy} timestamp={quote.createdAt} format={format} />
      </td>
      <td className="w-40 py-3 pr-4">
        <QuoteAuditValue name={updatedBy} timestamp={quote.updatedAt} format={format} />
      </td>
    </>
  )
}
