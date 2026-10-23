import type { Quote, QuoteResult } from '@/domain/types'
import { Badge, Card } from '@/components/ui'
import {
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPercent,
  formatPricePerUnit,
} from '@/lib/format'

export function CostDetails({ quote, result }: { quote: Quote; result: QuoteResult }) {
  const totalMaterial = result.lines.reduce((sum, line) => sum + line.material, 0)
  const totalEnergy = result.lines.reduce((sum, line) => sum + line.energy, 0)
  const totalWear = result.lines.reduce(
    (sum, line) => sum + line.depreciation + line.maintenance,
    0,
  )
  const totalLabor = result.jobLabor + result.lines.reduce((sum, line) => sum + line.labor, 0)
  const totalExtras = result.jobExtras + result.lines.reduce((sum, line) => sum + line.extras, 0)
  const totalFailure = result.lines.reduce((sum, line) => sum + line.failure, 0)
  const totalGrams = result.lines.reduce(
    (sum, line) =>
      sum + line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0),
    0,
  )

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Dettaglio costi</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Componenti per riga, costi fissi ripartiti e prezzo allocato.
          </p>
        </div>
        <Badge tone="neutral">{formatGrams(totalGrams)} totali</Badge>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 bg-white py-2 pr-3 font-medium">Riga</th>
              <th className="py-2 pr-3 text-right font-medium">Materiale</th>
              <th className="py-2 pr-3 text-right font-medium">Energia</th>
              <th className="py-2 pr-3 text-right font-medium">Usura</th>
              <th className="py-2 pr-3 text-right font-medium">Mano.</th>
              <th className="py-2 pr-3 text-right font-medium">Extra</th>
              <th className="py-2 pr-3 text-right font-medium">Guasti</th>
              <th className="py-2 pr-3 text-right font-medium">Costo diretto</th>
              <th className="py-2 pr-3 text-right font-medium">Quota fissa</th>
              <th className="py-2 pr-3 text-right font-medium">Costo pieno</th>
              <th className="py-2 text-right font-medium">Prezzo</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line) => (
              <tr key={line.lineId} className="border-t border-slate-100 align-top">
                <td className="sticky left-0 bg-white py-2.5 pr-3">
                  <p className="font-medium text-slate-800">{line.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {line.printerName} · {line.quantity} pz ·{' '}
                    {formatDuration(line.effectiveSeconds)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {line.avgWatts} W · {line.tariffLabel} · guasti{' '}
                    {formatPercent(line.failureRateBp)}
                  </p>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.material)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.energy)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.depreciation + line.maintenance)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.labor)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.extras)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.failure)}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                  {formatCurrency(line.directUnitCost)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.allocatedFixed)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {formatCurrency(line.fullyLoadedLineCost)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  <span className="block font-medium text-slate-800">
                    {formatCents(line.priceCents)}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {formatPricePerUnit(line.priceCents, line.quantity)}/pz
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-medium text-slate-800">
              <td className="sticky left-0 bg-white py-3 pr-3">Totale</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalMaterial)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalEnergy)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalWear)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalLabor)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalExtras)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">{formatCurrency(totalFailure)}</td>
              <td className="py-3 pr-3 text-right tabular-nums">
                {formatCurrency(result.directTotal)}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                {formatCurrency(result.jobFixedTotal)}
              </td>
              <td className="py-3 pr-3 text-right tabular-nums">
                {formatCurrency(result.totalCost)}
              </td>
              <td className="py-3 text-right tabular-nums">{formatCents(result.netPriceCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailBox label="Setup" value={formatCurrency(result.jobLaborDetails.setup)} />
        <DetailBox label="Progettazione" value={formatCurrency(result.jobLaborDetails.design)} />
        <DetailBox
          label="Extra di lavoro"
          value={formatCurrency(result.jobExtras)}
          hint={
            result.jobExtraDetails.length > 0
              ? result.jobExtraDetails.map((extra) => extra.name).join(', ')
              : undefined
          }
        />
        <DetailBox
          label="Prezzo netto"
          value={formatCents(result.netPriceCents)}
          hint={`IVA ${formatCents(result.vatCents)} · lordo ${formatCents(result.grossPriceCents)}`}
        />
      </div>

      {quote.job.notes ? (
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Note</p>
          <p className="mt-1 whitespace-pre-wrap">{quote.job.notes}</p>
        </div>
      ) : null}
    </Card>
  )
}

function DetailBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}
