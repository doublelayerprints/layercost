import type { Quote, QuoteResult } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { Badge, Card, SectionHeader, TableScroll } from '@/components/ui'
import { costDetailRows, costDetailTotals } from '@/lib/cost-details'
import {
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPercent,
  formatPricePerUnit,
} from '@/lib/format'

export function CostDetails({ quote, result }: { quote: Quote; result: QuoteResult }) {
  const { t } = useI18n()
  const rows = costDetailRows(result)
  const totals = costDetailTotals(rows)
  const rowsById = new Map(rows.map((row) => [row.lineId, row]))
  const totalGrams = result.lines.reduce(
    (sum, line) =>
      sum +
      line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0) * line.quantity,
    0,
  )

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        id="section-dettaglio"
        title={t('details.title')}
        description={t('details.description')}
        actions={
          <Badge tone="neutral">
            {t('details.totalGrams', { grams: formatGrams(totalGrams) })}
          </Badge>
        }
      />

      <TableScroll label={t('details.tableLabel')} className="mt-4">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t('details.caption')}</caption>
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="sticky left-0 bg-surface py-2 pr-4 text-left font-medium">
                {t('details.colLine')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colMaterial')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colEnergy')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colWear')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colLabor')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colExtras')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colFailures')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colDirectCost')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colFixedShare')}
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t('details.colFullCost')}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {t('details.colPrice')}
              </th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line) => {
              const row = rowsById.get(line.lineId)
              if (!row) return null
              return (
                <tr key={line.lineId} className="border-t border-rule align-top">
                  <th
                    scope="row"
                    className="sticky left-0 bg-surface py-3 pr-4 text-left font-normal"
                  >
                    <p className="font-medium text-ink">{line.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t('details.lineMeta', {
                        printer: line.printerName,
                        count: line.quantity,
                        duration: formatDuration(line.effectiveSeconds),
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {t('details.lineTechnical', {
                        power: line.avgWatts,
                        tariff: line.tariffLabel,
                        percent: formatPercent(line.failureRateBp),
                      })}
                    </p>
                  </th>
                  {row.components.map((cents, index) => (
                    <td key={index} className="py-3 pr-4 text-right tabular-nums">
                      {formatCents(cents)}
                    </td>
                  ))}
                  <td className="py-3 pr-4 text-right font-medium tabular-nums">
                    {formatCents(row.directCents)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCents(row.fixedCents)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCents(row.fullCents)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    <span className="block font-medium text-ink">
                      {formatCents(row.priceCents)}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatPricePerUnit(row.priceCents, line.quantity)}
                      {t('details.perPiece')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-control font-medium text-ink">
              <th scope="row" className="sticky left-0 bg-surface py-3 pr-4 text-left">
                {t('details.total')}
              </th>
              {totals.components.map((cents, index) => (
                <td key={index} className="py-3 pr-4 text-right tabular-nums">
                  {formatCents(cents)}
                </td>
              ))}
              <td className="py-3 pr-4 text-right tabular-nums">
                {formatCents(totals.directCents)}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">
                {formatCents(totals.fixedCents)}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatCents(totals.fullCents)}</td>
              <td className="py-3 text-right tabular-nums">{formatCents(totals.priceCents)}</td>
            </tr>
          </tfoot>
        </table>
      </TableScroll>

      <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailTerm label={t('job.setup')} value={formatCurrency(result.jobLaborDetails.setup)} />
        <DetailTerm label={t('job.design')} value={formatCurrency(result.jobLaborDetails.design)} />
        <DetailTerm
          label={t('details.jobExtras')}
          value={formatCurrency(result.jobExtras)}
          hint={
            result.jobExtraDetails.length > 0
              ? result.jobExtraDetails.map((extra) => extra.name).join(', ')
              : undefined
          }
        />
        <DetailTerm
          label={t('details.netPrice')}
          value={formatCents(result.netPriceCents)}
          hint={
            result.vatCents > 0
              ? t('details.vatAndGross', {
                  vat: formatCents(result.vatCents),
                  gross: formatCents(result.grossPriceCents),
                })
              : t('pricing.vatNone')
          }
        />
      </dl>

      {quote.job.notes ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm font-medium text-ink">{t('details.notes')}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{quote.job.notes}</p>
        </div>
      ) : null}
    </Card>
  )
}

function DetailTerm({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</dd>
      {hint ? <dd className="mt-0.5 text-xs text-muted">{hint}</dd> : null}
    </div>
  )
}
