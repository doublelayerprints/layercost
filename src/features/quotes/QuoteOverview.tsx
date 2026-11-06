import type { ReactNode } from 'react'
import { useTranslator } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Card, Price, SectionHeader, TableScroll } from '@/components/ui'
import { LineColorSwatch } from '@/components/line-color'
import { CostStack } from '@/components/cost-stack'
import { PriceComposition } from '@/components/price-composition'
import { costBands } from '@/lib/cost-bands'
import { CostDetails } from '@/features/calculator/CostDetails'
import { quoteProfitMicroEur } from '@/lib/quote-profit'
import type { SharedQuote, SharedQuoteResult } from '@/lib/share-projection'
import { plural } from '@/i18n'

/** `internal` shows every cost figure; `customer` shows only the prices of the quote. */
export type QuoteAudience = 'internal' | 'customer'

/**
 * The subset both a workspace quote and a shared quote can render. `QuoteResult`
 * and the projected `SharedQuoteResult` satisfy it structurally, so the customer
 * path cannot reach a field the projection dropped.
 */
interface CustomerLineView {
  lineId: string
  printerName: string
  quantity: number
  effectiveSeconds: number
  priceCents: number
  discount: number
  materialDetails: { name: string; grams: number }[]
}

interface CustomerResultView {
  lines: CustomerLineView[]
  discount: number
  netPriceCents: number
  vatCents: number
  grossPriceCents: number
}

export function QuoteOverview({
  quote,
  result,
  snapshotAction,
  audience = 'internal',
}: {
  quote: Quote | SharedQuote
  result?: QuoteResult | SharedQuoteResult
  snapshotAction?: ReactNode
  audience?: QuoteAudience
}) {
  const t = useTranslator(quote.locale)
  const format = useFormat(quote.locale)
  const internal = audience === 'internal'
  // Internal figures exist only on the workspace result; the shared projection
  // has no cost fields at all, so the cast is safe by construction.
  const internalResult = internal ? (result as QuoteResult | undefined) : undefined
  const customerResult = result as CustomerResultView | undefined
  const snapshot = 'snapshot' in quote ? quote.snapshot : undefined
  const workspaceQuote = 'status' in quote ? quote : undefined
  const profit = internalResult ? quoteProfitMicroEur(internalResult) : 0
  const totalGrams = customerResult
    ? customerResult.lines.reduce(
        (sum, line) =>
          sum +
          line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0) *
            line.quantity,
        0,
      )
    : quote.lines.reduce(
        (sum, line) =>
          sum + line.materials.reduce((lineSum, usage) => lineSum + usage.grams, 0) * line.quantity,
        0,
      )

  // Names come from the result when present (the shared projection keeps them),
  // then from the economic snapshot, then from the bare grams.
  const materialNames = (line: Quote['lines'][number], lineResult?: CustomerLineView) => {
    if (lineResult && lineResult.materialDetails.length > 0) {
      return lineResult.materialDetails
        .map((detail) => `${detail.name} ${format.grams(detail.grams)}`)
        .join(' · ')
    }
    return line.materials
      .map((usage) => {
        const material = snapshot?.config.materials.find(
          (candidate) => candidate.id === usage.materialId,
        )
        return material
          ? `${material.name} ${format.grams(usage.grams)}`
          : format.grams(usage.grams)
      })
      .join(' · ')
  }

  return (
    <div className="space-y-6">
      {!result ? (
        <Alert tone="warning" title={t('quote.notRecalculable.title')}>
          {t('quote.notRecalculable.body')}
        </Alert>
      ) : (
        <Card className="p-5 sm:p-6">
          <div className={internal ? 'grid items-start gap-6 lg:grid-cols-12' : undefined}>
            <div className={internal ? 'lg:col-span-7' : undefined}>
              <p className="text-xs font-medium text-muted">{t('quote.totalPrice')}</p>
              <Price
                value={format.cents(customerResult!.grossPriceCents)}
                hint={
                  customerResult!.vatCents > 0
                    ? t('quote.price.netAndVat', {
                        net: format.cents(customerResult!.netPriceCents),
                        vat: format.cents(customerResult!.vatCents),
                      })
                    : t('quote.price.noVat')
                }
              />
              {customerResult!.discount > 0 ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                  <span className="text-muted">{t('quote.discountTotal')}</span>
                  <span className="tabular-nums text-ink">
                    −{format.currency(customerResult!.discount)}
                  </span>
                  {internalResult &&
                  internalResult.lineDiscountTotal > 0 &&
                  internalResult.quoteDiscount > 0 ? (
                    <span className="text-xs text-muted">
                      {t('quote.discountBreakdown', {
                        lines: format.currency(internalResult.lineDiscountTotal),
                        quote: format.currency(internalResult.quoteDiscount),
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {internalResult ? (
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium text-muted">
                      {t('quote.label.fullyLoadedCost')}
                    </dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(internalResult.totalCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('quote.directCost')}</dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(internalResult.directTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('quote.fixedCosts')}</dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(internalResult.jobFixedTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('quote.profit')}</dt>
                    <dd
                      className={
                        profit < 0
                          ? 'mt-0.5 text-base font-medium tabular-nums text-warning'
                          : 'mt-0.5 text-base font-medium tabular-nums text-ink'
                      }
                    >
                      {format.currency(profit)}
                    </dd>
                    <dd className="mt-0.5 text-xs tabular-nums text-muted">
                      {t('quote.effectiveMargin')} {format.percent(internalResult.effectiveMarginBp)}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>

            {internalResult ? (
              <div className="lg:col-span-5">
                <PriceComposition result={internalResult} locale={quote.locale} />
                <h2 className="mt-4 text-sm font-semibold text-ink">
                  {t('quote.costComposition')}
                </h2>
                <CostStack
                  bands={costBands(internalResult)}
                  locale={quote.locale}
                  className="mt-3"
                />
              </div>
            ) : null}
          </div>

          {internalResult ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">
                {snapshot
                  ? t('quote.snapshot.frozen', {
                      date: format.dateTime(snapshot.capturedAt),
                      version: snapshot.engineVersion,
                    })
                  : workspaceQuote?.engineVersion
                    ? t('app.engineVersion', { version: workspaceQuote.engineVersion })
                    : t('quote.currentPrices')}
              </p>
              {snapshotAction}
            </div>
          ) : null}
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader
          id="section-righe"
          title={t('quote.lines.title')}
          description={t('quote.lines.description')}
          actions={
            <p className="text-sm text-muted">
              {plural(quote.locale, quote.lines.length, {
                one: 'quote.lineCount.one',
                other: 'quote.lineCount.other',
              })}{' '}
              · {format.grams(totalGrams)} ·{' '}
              {quote.customer ? quote.customer : t('quote.noCustomer')}
            </p>
          }
        />

        <TableScroll label={t('quote.lines.title')} className="mt-4 hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t('quote.lines.title')}</caption>
            <thead>
              <tr className="text-xs text-muted">
                <th scope="col" className="py-2 pr-4 text-left font-medium">
                  {t('quote.label.print')}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t('quote.label.pieces')}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t('quote.label.time')}
                </th>
                {internal ? (
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('quote.label.fullyLoadedCost')}
                  </th>
                ) : null}
                <th scope="col" className="py-2 text-right font-medium">
                  {t('quote.label.price')}
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line) => {
                const lineResult = result?.lines.find((item) => item.lineId === line.id)
                const internalLine = internalResult?.lines.find((item) => item.lineId === line.id)
                const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
                return (
                  <tr key={line.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex items-start gap-2">
                        <LineColorSwatch color={line.color} className="mt-1 h-3 w-3" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{line.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {materialNames(line, lineResult) || t('quote.noMaterial')} ·{' '}
                            {format.grams(lineGrams)}
                            {line.quantity > 1 ? ` ${t('quote.perPiece')}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {lineResult?.printerName ?? t('quote.printerUnavailable')}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="py-3 pr-4 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {format.duration(lineResult?.effectiveSeconds ?? line.timeSeconds)}
                    </td>
                    {internalResult ? (
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {internalLine ? format.currency(internalLine.fullyLoadedLineCost) : '—'}
                      </td>
                    ) : null}
                    <td className="py-3 text-right tabular-nums">
                      {lineResult ? (
                        <>
                          <span className="block font-medium text-ink">
                            {format.cents(lineResult.priceCents)}
                          </span>
                          <span className="block text-xs text-muted">
                            {format.pricePerUnit(lineResult.priceCents, lineResult.quantity)}
                            {t('quote.unit.pricePerPiece')}
                          </span>
                          {lineResult.discount > 0 ? (
                            <span className="block text-xs text-muted">
                              {t('quote.lineDiscountAmount', {
                                amount: format.currency(lineResult.discount),
                              })}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScroll>

        <ul className="mt-3 border-t border-line sm:hidden">
          {quote.lines.map((line) => {
            const lineResult = result?.lines.find((item) => item.lineId === line.id)
            const internalLine = internalResult?.lines.find((item) => item.lineId === line.id)
            const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
            return (
              <li key={line.id} className="border-b border-rule py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <LineColorSwatch color={line.color} className="mt-1 h-3 w-3" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{line.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {materialNames(line, lineResult) || t('quote.noMaterial')} ·{' '}
                        {format.grams(lineGrams)}
                        {line.quantity > 1 ? ` ${t('quote.perPiece')}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {line.quantity} {t('quote.unit.pieces')} ·{' '}
                        {format.duration(lineResult?.effectiveSeconds ?? line.timeSeconds)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {lineResult ? format.cents(lineResult.priceCents) : '—'}
                    </p>
                    {lineResult && lineResult.discount > 0 ? (
                      <p className="text-xs text-muted">
                        {t('quote.lineDiscountAmount', {
                          amount: format.currency(lineResult.discount),
                        })}
                      </p>
                    ) : null}
                    {internalResult ? (
                      <p className="text-xs text-muted">
                        {internalLine ? format.currency(internalLine.fullyLoadedLineCost) : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {quote.job.notes ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-sm font-medium text-ink">{t('quote.notes')}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{quote.job.notes}</p>
          </div>
        ) : null}
      </Card>

      {internalResult ? (
        <CostDetails quote={quote as Quote} result={internalResult} locale={quote.locale} />
      ) : null}
    </div>
  )
}
