import { useTranslator } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { QuoteResult } from '@/domain/types'
import { allocateLargestRemainder } from '@/domain/money'
import { quoteProfitMicroEur } from '@/lib/quote-profit'
import type { Locale } from '@/i18n'

/**
 * Splits the net price into cost and profit. The bar only appears when the quote
 * has a non-negative profit: a below-cost price cannot be shown as a two-segment
 * bar without making the margin look positive.
 */
export function PriceComposition({
  result,
  className,
  locale,
}: {
  result: Pick<QuoteResult, 'netPriceCents' | 'totalCost'>
  className?: string
  locale?: Locale
}) {
  const t = useTranslator(locale)
  const format = useFormat(locale)
  const profit = quoteProfitMicroEur(result)
  if (profit < 0 || result.netPriceCents <= 0) return null

  const widths = allocateLargestRemainder(1000, [result.totalCost, profit])
  const [costCents = 0, profitCents = 0] = allocateLargestRemainder(result.netPriceCents, [
    result.totalCost,
    profit,
  ])
  const label = t('priceComposition.aria', {
    total: format.cents(result.netPriceCents),
    cost: format.cents(costCents),
    profit: format.cents(profitCents),
  })

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-muted">{t('priceComposition.title')}</p>
        <p className="text-xs tabular-nums text-muted">{format.cents(result.netPriceCents)}</p>
      </div>

      <div
        className="mt-2 flex h-3 w-full gap-[2px] overflow-hidden bg-surface"
        role="img"
        aria-label={label}
      >
        <span
          data-stack-tone="control"
          className="h-full bg-control"
          style={{ flexBasis: 0, flexGrow: widths[0] ?? 0 }}
        />
        <span
          data-stack-tone="data"
          className="h-full bg-data"
          style={{ flexBasis: 0, flexGrow: widths[1] ?? 0 }}
        />
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex min-w-0 items-center gap-2 text-muted">
            <span
              data-stack-tone="control"
              className="h-2 w-2 shrink-0 rounded-[1px] bg-control print:border print:border-ink"
              aria-hidden="true"
            />
            <span className="truncate">{t('priceComposition.cost')}</span>
          </dt>
          <dd className="shrink-0 tabular-nums text-ink">{format.cents(costCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex min-w-0 items-center gap-2 text-muted">
            <span
              data-stack-tone="data"
              className="h-2 w-2 shrink-0 rounded-[1px] bg-data print:border print:border-ink"
              aria-hidden="true"
            />
            <span className="truncate">{t('priceComposition.profit')}</span>
          </dt>
          <dd className="shrink-0 tabular-nums text-ink">{format.cents(profitCents)}</dd>
        </div>
      </dl>
    </div>
  )
}
