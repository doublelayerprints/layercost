import type { Quote, QuoteResult } from '@/domain/types'
import { Badge, Card, SectionHeader } from '@/components/ui'
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
        title="Dettaglio costi"
        description="Importi riferiti all’intera riga, quantità inclusa. Le componenti sono arrotondate in modo che la loro somma coincida con il costo diretto mostrato; la quota di prezzo di ogni riga è una parte del totale."
        actions={<Badge tone="neutral">{formatGrams(totalGrams)} totali</Badge>}
      />

      <div className="relative mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Componenti di costo e prezzo per ogni riga del preventivo
          </caption>
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="sticky left-0 bg-surface py-2 pr-4 text-left font-medium">
                Riga
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Materiale
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Energia
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Usura
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Manodopera
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Extra
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Guasti
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Costo diretto
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Quota fissa
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Costo pieno
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Prezzo
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
                      {line.printerName} · {line.quantity} pz ·{' '}
                      {formatDuration(line.effectiveSeconds)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {line.avgWatts} W · {line.tariffLabel} · guasti{' '}
                      {formatPercent(line.failureRateBp)}
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
                      {formatPricePerUnit(row.priceCents, line.quantity)}/pz
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-control font-medium text-ink">
              <th scope="row" className="sticky left-0 bg-surface py-3 pr-4 text-left">
                Totale
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
              <td className="py-3 pr-4 text-right tabular-nums">
                {formatCents(totals.fullCents)}
              </td>
              <td className="py-3 text-right tabular-nums">{formatCents(totals.priceCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailTerm label="Setup" value={formatCurrency(result.jobLaborDetails.setup)} />
        <DetailTerm label="Progettazione" value={formatCurrency(result.jobLaborDetails.design)} />
        <DetailTerm
          label="Extra di lavoro"
          value={formatCurrency(result.jobExtras)}
          hint={
            result.jobExtraDetails.length > 0
              ? result.jobExtraDetails.map((extra) => extra.name).join(', ')
              : undefined
          }
        />
        <DetailTerm
          label="Prezzo netto"
          value={formatCents(result.netPriceCents)}
          hint={
            result.vatCents > 0
              ? `IVA ${formatCents(result.vatCents)} · lordo ${formatCents(result.grossPriceCents)}`
              : 'Nessuna IVA'
          }
        />
      </dl>

      {quote.job.notes ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm font-medium text-ink">Note</p>
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
