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
import { plural } from '@/i18n'

/** `internal` shows every cost figure; `customer` shows only the prices of the quote. */
export type QuoteAudience = 'internal' | 'customer'

export function QuoteOverview({
  quote,
  result,
  snapshotAction,
  audience = 'internal',
}: {
  quote: Quote
  result?: QuoteResult
  snapshotAction?: ReactNode
  audience?: QuoteAudience
}) {
  const t = useTranslator(quote.locale)
  const format = useFormat(quote.locale)
  const internal = audience === 'internal'
  const profit = result ? quoteProfitMicroEur(result) : 0
  const totalGrams = result
    ? result.lines.reduce(
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

  const materialNames = (line: Quote['lines'][number]) =>
    line.materials
      .map((usage) => {
        const material = quote.snapshot?.config.materials.find(
          (candidate) => candidate.id === usage.materialId,
        )
        return material
          ? `${material.name} ${format.grams(usage.grams)}`
          : format.grams(usage.grams)
      })
      .join(' · ')

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
                value={format.cents(result.grossPriceCents)}
                hint={
                  result.vatCents > 0
                    ? t('quote.price.netAndVat', {
                        net: format.cents(result.netPriceCents),
                        vat: format.cents(result.vatCents),
                      })
                    : t('quote.price.noVat')
                }
              />
              {result.discount > 0 ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                  <span className="text-muted">{t('quote.discountTotal')}</span>
                  <span className="tabular-nums text-ink">
                    −{format.currency(result.discount)}
                  </span>
                  {internal && result.lineDiscountTotal > 0 && result.quoteDiscount > 0 ? (
                    <span className="text-xs text-muted">
                      {t('quote.discountBreakdown', {
                        lines: format.currency(result.lineDiscountTotal),
                        quote: format.currency(result.quoteDiscount),
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {internal ? (
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium text-muted">
                      {t('quote.label.fullyLoadedCost')}
                    </dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(result.totalCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('quote.directCost')}</dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(result.directTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('quote.fixedCosts')}</dt>
                    <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                      {format.currency(result.jobFixedTotal)}
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
                      {t('quote.effectiveMargin')} {format.percent(result.effectiveMarginBp)}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>

            {internal ? (
              <div className="lg:col-span-5">
                <PriceComposition result={result} locale={quote.locale} />
                <h2 className="mt-4 text-sm font-semibold text-ink">
                  {t('quote.costComposition')}
                </h2>
                <CostStack bands={costBands(result)} locale={quote.locale} className="mt-3" />
              </div>
            ) : null}
          </div>

          {internal ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">
                {quote.snapshot
                  ? t('quote.snapshot.frozen', {
                      date: format.dateTime(quote.snapshot.capturedAt),
                      version: quote.snapshot.engineVersion,
                    })
                  : quote.engineVersion
                    ? t('app.engineVersion', { version: quote.engineVersion })
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
                const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
                return (
                  <tr key={line.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex items-start gap-2">
                        <LineColorSwatch color={line.color} className="mt-1 h-3 w-3" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{line.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {materialNames(line) || t('quote.noMaterial')} ·{' '}
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
                    {internal ? (
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {lineResult ? format.currency(lineResult.fullyLoadedLineCost) : '—'}
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
            const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
            return (
              <li key={line.id} className="border-b border-rule py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <LineColorSwatch color={line.color} className="mt-1 h-3 w-3" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{line.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {materialNames(line) || t('quote.noMaterial')} · {format.grams(lineGrams)}
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
                    {internal ? (
                      <p className="text-xs text-muted">
                        {lineResult ? format.currency(lineResult.fullyLoadedLineCost) : ''}
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

      {result && internal ? (
        <CostDetails quote={quote} result={result} locale={quote.locale} />
      ) : null}
    </div>
  )
}
