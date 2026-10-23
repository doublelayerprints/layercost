import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Badge, Card, Stat } from '@/components/ui'
import { CostDetails } from '@/features/calculator/CostDetails'
import {
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPercent,
} from '@/lib/format'
import { formatDateTimeIt } from '@/lib/date'

export function QuoteOverview({ quote, result }: { quote: Quote; result?: QuoteResult }) {
  const totalGrams = result
    ? result.lines.reduce(
        (sum, line) =>
          sum + line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0),
        0,
      )
    : quote.lines.reduce(
        (sum, line) => sum + line.materials.reduce((lineSum, usage) => lineSum + usage.grams, 0),
        0,
      )

  return (
    <div className="space-y-4">
      {!result ? (
        <Alert tone="warning" title="Preventivo non ricalcolabile">
          La configurazione usata da questo preventivo non è più disponibile o contiene dati non
          validi. Puoi duplicarlo e correggere le righe.
        </Alert>
      ) : (
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Riepilogo
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                {formatCents(result.grossPriceCents)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatCents(result.netPriceCents)} netto
                {result.vatCents > 0 ? ` + ${formatCents(result.vatCents)} IVA` : ' · nessuna IVA'}
              </p>
            </div>
            <div className="text-right">
              <Badge tone={quote.archived ? 'warning' : 'success'}>
                {quote.archived ? 'Archiviato' : 'Salvato'}
              </Badge>
              <p className="mt-2 text-xs text-slate-500">
                {quote.snapshot
                  ? `Prezzi congelati al ${formatDateTimeIt(quote.snapshot.capturedAt)}`
                  : 'Prezzi dalla configurazione corrente'}
              </p>
              {quote.engineVersion ? (
                <p className="text-[11px] text-slate-400">Motore v{quote.engineVersion}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Costo totale" value={formatCurrency(result.totalCost)} />
            <Stat label="Costo diretto" value={formatCurrency(result.directTotal)} />
            <Stat label="Costi fissi" value={formatCurrency(result.jobFixedTotal)} />
            <Stat
              label="Margine effettivo"
              value={formatPercent(result.effectiveMarginBp)}
              tone={result.effectiveMarginBp < 0 ? 'warning' : 'accent'}
            />
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Righe del preventivo</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {quote.lines.length} {quote.lines.length === 1 ? 'riga' : 'righe'} ·{' '}
              {formatGrams(totalGrams)} totali
            </p>
          </div>
          {quote.customer ? <Badge tone="neutral">{quote.customer}</Badge> : null}
        </div>

        <div className="mt-3 space-y-2">
          {quote.lines.map((line) => {
            const lineResult = result?.lines.find((item) => item.lineId === line.id)
            const lineGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
            const materialNames = line.materials
              .map((usage) => {
                const material = quote.snapshot?.config.materials.find(
                  (candidate) => candidate.id === usage.materialId,
                )
                return material
                  ? `${material.name} ${formatGrams(usage.grams)}`
                  : formatGrams(usage.grams)
              })
              .join(' · ')
            return (
              <div key={line.id} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{line.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {materialNames || 'Nessun materiale'} · {line.quantity} pz
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {formatDuration(lineResult?.effectiveSeconds ?? line.timeSeconds)} ·{' '}
                      {formatGrams(lineGrams)}
                    </p>
                    {lineResult ? (
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
                        {formatCurrency(lineResult.fullyLoadedLineCost)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {line.notes ? (
                  <p className="mt-1.5 text-xs italic text-slate-500">{line.notes}</p>
                ) : null}
              </div>
            )
          })}
        </div>

        {quote.job.notes ? (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Note</p>
            <p className="mt-1 whitespace-pre-wrap">{quote.job.notes}</p>
          </div>
        ) : null}
      </Card>

      {result ? <CostDetails quote={quote} result={result} /> : null}
    </div>
  )
}
