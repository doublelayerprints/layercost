import type { ReactNode } from 'react'
import { useTranslator } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Card, Price, SectionHeader, TableScroll } from '@/components/ui'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import { CostDetails } from '@/features/calculator/CostDetails'
import { plural } from '@/i18n'

export function QuoteOverview({
  quote,
  result,
  snapshotAction,
}: {
  quote: Quote
  result?: QuoteResult
  snapshotAction?: ReactNode
}) {
  const t = useTranslator(quote.locale)
  const format = useFormat(quote.locale)
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
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
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
                  <dt className="text-xs font-medium text-muted">{t('quote.effectiveMargin')}</dt>
                  <dd
                    className={
                      result.effectiveMarginBp < 0
                        ? 'mt-0.5 text-base font-medium tabular-nums text-warning'
                        : 'mt-0.5 text-base font-medium tabular-nums text-ink'
                    }
                  >
                    {format.percent(result.effectiveMarginBp)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <h2 className="text-sm font-semibold text-ink">{t('quote.costComposition')}</h2>
              <CostStack bands={costBands(result)} className="mt-3" />
            </div>
          </div>

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
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t('quote.label.fullyLoadedCost')}
                </th>
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
                      <p className="font-medium text-ink">{line.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {materialNames(line) || t('quote.noMaterial')} · {format.grams(lineGrams)}
                        {line.quantity > 1 ? ` ${t('quote.perPiece')}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {lineResult?.printerName ?? t('quote.printerUnavailable')}
                      </p>
                    </th>
                    <td className="py-3 pr-4 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {format.duration(lineResult?.effectiveSeconds ?? line.timeSeconds)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {lineResult ? format.currency(lineResult.fullyLoadedLineCost) : '—'}
                    </td>
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
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {lineResult ? format.cents(lineResult.priceCents) : '—'}
                    </p>
                    <p className="text-xs text-muted">
                      {lineResult ? format.currency(lineResult.fullyLoadedLineCost) : ''}
                    </p>
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

      {result ? <CostDetails quote={quote} result={result} /> : null}
    </div>
  )
}
