import { useState } from 'react'
import type { Quote, QuoteResult } from '@/domain/types'
import { useTranslator } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import { todayIsoDate } from '@/lib/date'
import { plural } from '@/i18n'

/** Document date, resolved once per mount: the print footer must not read the clock on every render. */
export function QuotePrint({ quote, result }: { quote: Quote; result?: QuoteResult }) {
  const t = useTranslator(quote.locale)
  const format = useFormat(quote.locale)
  const [printDate] = useState(() => format.dateOnly(todayIsoDate()))

  if (!result) return null

  const totalGrams = result.lines.reduce(
    (sum, line) =>
      sum +
      line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0) * line.quantity,
    0,
  )
  const totalSeconds = result.lines.reduce((sum, line) => sum + line.effectiveSeconds, 0)
  const totalPieces = result.lines.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="hidden print:block print:text-black">
      <header className="flex items-start justify-between gap-8 border-b border-black pb-3">
        <div>
          <p className="text-[9pt] font-semibold">{t('app.name')}</p>
          <p className="mt-0.5 text-[9pt]">{t('quote.print.title')}</p>
          <h1 className="mt-1 font-serif text-[18pt] font-semibold leading-tight">{quote.name}</h1>
          <p className="mt-1 text-[9pt]">
            {format.dateOnly(quote.quoteDate)}
            {quote.customer ? ` · ${t('quote.print.customer', { name: quote.customer })}` : ''}
          </p>
        </div>
        <div className="text-right text-[9pt] leading-relaxed">
          <p>{quote.status === 'draft' ? t('quote.status.draft') : t('quote.status.saved')}</p>
          <p>{t('app.engineVersion', { version: result.engineVersion })}</p>
          <p>
            {plural(quote.locale, quote.lines.length, {
              one: 'quote.lineCount.one',
              other: 'quote.lineCount.other',
            })}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-x-8 text-[9pt]">
        <div>
          <dt className="inline text-black/60">{t('quote.label.material')} </dt>
          <dd className="inline">{format.grams(totalGrams)}</dd>
        </div>
        <div>
          <dt className="inline text-black/60">{t('quote.print.effectiveTime')} </dt>
          <dd className="inline">{format.duration(totalSeconds)}</dd>
        </div>
        <div>
          <dt className="inline text-black/60">{t('quote.label.pieces')} </dt>
          <dd className="inline">{totalPieces}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full border-collapse text-[9pt]">
        <caption className="sr-only">{t('quote.lines.title')}</caption>
        <thead>
          <tr className="border-b border-black text-left">
            <th scope="col" className="py-1 pr-2 font-medium">
              {t('quote.label.print')}
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              {t('quote.label.printer')}
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              {t('quote.label.material')}
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              {t('quote.label.time')}
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              {t('quote.label.pieces')}
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              {t('quote.label.fullyLoadedCost')}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              {t('quote.label.linePrice')}
            </th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => {
            const grams = line.materialDetails.reduce((sum, detail) => sum + detail.grams, 0)
            const materials = line.materialDetails
              .map((detail) => `${detail.name} ${format.grams(detail.grams)}`)
              .join(', ')
            return (
              <tr key={line.lineId} className="print-break border-b border-black/25 align-top">
                <td className="py-1.5 pr-2 font-medium">{line.name}</td>
                <td className="py-1.5 pr-2">{line.printerName}</td>
                <td className="py-1.5 pr-2">
                  {materials || format.grams(grams)}
                  <span className="block text-[8pt] text-black/60">
                    {line.quantity > 1
                      ? t('quote.print.lineGrams', {
                          unit: format.grams(grams),
                          total: format.grams(grams * line.quantity),
                        })
                      : t('quote.print.lineGramsTotal', { total: format.grams(grams) })}
                  </span>
                </td>
                <td className="py-1.5 pr-2">{format.duration(line.effectiveSeconds)}</td>
                <td className="py-1.5 pr-2 text-right">{line.quantity}</td>
                <td className="py-1.5 pr-2 text-right">
                  {format.currency(line.fullyLoadedLineCost)}
                </td>
                <td className="py-1.5 text-right">
                  {format.cents(line.priceCents)}
                  <span className="block text-[8pt] text-black/60">
                    {format.pricePerUnit(line.priceCents, line.quantity)}
                    {t('quote.unit.pricePerPiece')}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[8pt] text-black/60">{t('quote.print.linePriceNote')}</p>

      <div className="mt-4 grid grid-cols-[1fr_72mm] gap-8">
        <div>
          <p className="text-[9pt] font-semibold">{t('quote.costComposition')}</p>
          <CostStack bands={costBands(result)} locale={quote.locale} className="mt-2" />
        </div>

        <div>
          <p className="text-[9pt] font-semibold">{t('quote.label.price')}</p>
          <p className="mt-1 font-serif text-[18pt] font-semibold leading-tight">
            {format.cents(result.grossPriceCents)}
          </p>
          <p className="text-[9pt] text-black/60">
            {result.vatCents > 0
              ? t('quote.price.netAndVat', {
                  net: format.cents(result.netPriceCents),
                  vat: format.cents(result.vatCents),
                })
              : t('quote.price.noVat')}
          </p>
          <dl className="mt-2 border-t border-black/25 pt-1 text-[9pt]">
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>{t('quote.label.fullyLoadedCost')}</dt>
              <dd className="tabular-nums">{format.currency(result.totalCost)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>{t('quote.effectiveMargin')}</dt>
              <dd className="tabular-nums">{format.percent(result.effectiveMarginBp)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>{t('quote.netPrice')}</dt>
              <dd className="tabular-nums">{format.cents(result.netPriceCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {quote.job.notes ? (
        <div className="print-break mt-4 border-t border-black/25 pt-2">
          <p className="text-[9pt] font-semibold">{t('quote.notes')}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[9pt]">{quote.job.notes}</p>
        </div>
      ) : null}

      <p className="mt-4 border-t border-black/25 pt-2 text-[8pt] text-black/60">
        {t('quote.print.footer', { date: printDate })}
      </p>
    </div>
  )
}
