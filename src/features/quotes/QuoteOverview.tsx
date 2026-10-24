import type { ReactNode } from 'react'
import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Card, Price, SectionHeader } from '@/components/ui'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import { CostDetails } from '@/features/calculator/CostDetails'
import {
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPercent,
  formatPricePerUnit,
} from '@/lib/format'
import { formatDateTimeIt } from '@/lib/date'

export function QuoteOverview({
  quote,
  result,
  snapshotAction,
}: {
  quote: Quote
  result?: QuoteResult
  snapshotAction?: ReactNode
}) {
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
        return material ? `${material.name} ${formatGrams(usage.grams)}` : formatGrams(usage.grams)
      })
      .join(' · ')

  return (
    <div className="space-y-6">
      {!result ? (
        <Alert tone="warning" title="Preventivo non ricalcolabile">
          La configurazione usata da questo preventivo non è più disponibile o contiene dati non
          validi. I numeri salvati restano consultabili; usa “Duplica nel calcolatore” e correggi le
          righe per ricalcolarlo.
        </Alert>
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-xs font-medium text-muted">Prezzo totale</p>
              <Price
                value={formatCents(result.grossPriceCents)}
                hint={
                  result.vatCents > 0
                    ? `${formatCents(result.netPriceCents)} netto + ${formatCents(result.vatCents)} IVA`
                    : 'Nessuna IVA'
                }
              />

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs font-medium text-muted">Costo pieno</dt>
                  <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                    {formatCurrency(result.totalCost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Costo diretto</dt>
                  <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                    {formatCurrency(result.directTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Costi fissi</dt>
                  <dd className="mt-0.5 text-base font-medium tabular-nums text-ink">
                    {formatCurrency(result.jobFixedTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">Margine effettivo</dt>
                  <dd
                    className={
                      result.effectiveMarginBp < 0
                        ? 'mt-0.5 text-base font-medium tabular-nums text-warning'
                        : 'mt-0.5 text-base font-medium tabular-nums text-ink'
                    }
                  >
                    {formatPercent(result.effectiveMarginBp)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <h2 className="text-sm font-semibold text-ink">Composizione del costo</h2>
              <CostStack bands={costBands(result)} className="mt-3" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-xs text-muted">
              {quote.snapshot
                ? `Tariffe congelate al ${formatDateTimeIt(quote.snapshot.capturedAt)} · Motore v${quote.snapshot.engineVersion}`
                : quote.engineVersion
                  ? `Motore v${quote.engineVersion}`
                  : 'Prezzi dalla configurazione corrente'}
            </p>
            {snapshotAction}
          </div>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader
          id="section-righe"
          title="Righe del preventivo"
          description="I prezzi di riga sono una quota del prezzo totale, non prezzi indipendenti."
          actions={
            <p className="text-sm text-muted">
              {quote.lines.length} {quote.lines.length === 1 ? 'riga' : 'righe'} ·{' '}
              {formatGrams(totalGrams)} · {quote.customer ? quote.customer : 'Nessun cliente'}
            </p>
          }
        />

        <div className="relative mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Righe del preventivo</caption>
            <thead>
              <tr className="text-xs text-muted">
                <th scope="col" className="py-2 pr-4 text-left font-medium">
                  Stampa
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Pezzi
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Tempo
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
              {quote.lines.map((line) => {
                const lineResult = result?.lines.find((item) => item.lineId === line.id)
                const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
                return (
                  <tr key={line.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <p className="font-medium text-ink">{line.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {materialNames(line) || 'Nessun materiale'} · {formatGrams(lineGrams)}
                        {line.quantity > 1 ? ' per pezzo' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {lineResult?.printerName ?? 'Stampante non disponibile'}
                      </p>
                    </th>
                    <td className="py-3 pr-4 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {formatDuration(lineResult?.effectiveSeconds ?? line.timeSeconds)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {lineResult ? formatCurrency(lineResult.fullyLoadedLineCost) : '—'}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {lineResult ? (
                        <>
                          <span className="block font-medium text-ink">
                            {formatCents(lineResult.priceCents)}
                          </span>
                          <span className="block text-xs text-muted">
                            {formatPricePerUnit(lineResult.priceCents, lineResult.quantity)}/pz
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
        </div>

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
                      {materialNames(line) || 'Nessun materiale'} · {formatGrams(lineGrams)}
                      {line.quantity > 1 ? ' per pezzo' : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {line.quantity} pz ·{' '}
                      {formatDuration(lineResult?.effectiveSeconds ?? line.timeSeconds)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {lineResult ? formatCents(lineResult.priceCents) : '—'}
                    </p>
                    <p className="text-xs text-muted">
                      {lineResult ? formatCurrency(lineResult.fullyLoadedLineCost) : ''}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {quote.job.notes ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-sm font-medium text-ink">Note</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{quote.job.notes}</p>
          </div>
        ) : null}
      </Card>

      {result ? <CostDetails quote={quote} result={result} /> : null}
    </div>
  )
}
