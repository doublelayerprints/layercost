import type { Quote, QuoteResult } from '@/domain/types'
import {
  formatCents,
  formatCurrency,
  formatDateOnly,
  formatDuration,
  formatGrams,
  formatPercent,
  formatPricePerUnit,
} from '@/lib/format'

export function QuotePrint({ quote, result }: { quote: Quote; result?: QuoteResult }) {
  if (!result) return null

  const totalGrams = result.lines.reduce(
    (sum, line) =>
      sum + line.materialDetails.reduce((lineSum, detail) => lineSum + detail.grams, 0),
    0,
  )

  return (
    <div className="hidden print:block print:text-black">
      <div className="flex items-start justify-between border-b border-black pb-4">
        <div>
          <p className="text-[10pt] font-bold uppercase tracking-widest">LayerCost</p>
          <h1 className="mt-1 text-[20pt] font-semibold">{quote.name}</h1>
          <p className="text-[10pt] text-gray-700">
            Preventivo del {formatDateOnly(quote.quoteDate)}
            {quote.customer ? ` · ${quote.customer}` : ''}
          </p>
        </div>
        <div className="text-right text-[9pt] text-gray-700">
          <p>Motore v{result.engineVersion}</p>
          <p>{result.lines.length} righe</p>
          <p>{formatGrams(totalGrams)} totali</p>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2">Stampa</th>
            <th className="py-1 pr-2">Stampante</th>
            <th className="py-1 pr-2">Tempo</th>
            <th className="py-1 pr-2">Materiale</th>
            <th className="py-1 pr-2 text-right">Q.tà</th>
            <th className="py-1 pr-2 text-right">Costo unit.</th>
            <th className="py-1 pr-2 text-right">Costo pieno</th>
            <th className="py-1 text-right">Prezzo</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => {
            const grams = line.materialDetails.reduce((sum, detail) => sum + detail.grams, 0)
            return (
              <tr key={line.lineId} className="border-b border-gray-300 align-top">
                <td className="py-1.5 pr-2 font-medium">{line.name}</td>
                <td className="py-1.5 pr-2">{line.printerName}</td>
                <td className="py-1.5 pr-2">{formatDuration(line.effectiveSeconds)}</td>
                <td className="py-1.5 pr-2">{formatGrams(grams)}</td>
                <td className="py-1.5 pr-2 text-right">{line.quantity}</td>
                <td className="py-1.5 pr-2 text-right">{formatCurrency(line.directUnitCost)}</td>
                <td className="py-1.5 pr-2 text-right">
                  {formatCurrency(line.fullyLoadedLineCost)}
                </td>
                <td className="py-1.5 text-right">
                  {formatPricePerUnit(line.priceCents, line.quantity)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div className="rounded border border-gray-300 p-3 text-[9pt]">
          <p className="mb-2 font-semibold">Composizione del costo</p>
          <Row
            label="Materiale"
            value={formatCurrency(result.lines.reduce((sum, line) => sum + line.material, 0))}
          />
          <Row
            label="Energia"
            value={formatCurrency(result.lines.reduce((sum, line) => sum + line.energy, 0))}
          />
          <Row
            label="Ammortamento"
            value={formatCurrency(result.lines.reduce((sum, line) => sum + line.depreciation, 0))}
          />
          <Row
            label="Manutenzione"
            value={formatCurrency(result.lines.reduce((sum, line) => sum + line.maintenance, 0))}
          />
          <Row
            label="Manodopera"
            value={formatCurrency(
              result.jobLabor + result.lines.reduce((sum, line) => sum + line.labor, 0),
            )}
          />
          <Row
            label="Extra"
            value={formatCurrency(
              result.jobExtras + result.lines.reduce((sum, line) => sum + line.extras, 0),
            )}
          />
          <Row
            label="Riserva guasti"
            value={formatCurrency(result.lines.reduce((sum, line) => sum + line.failure, 0))}
          />
          <div className="mt-2 border-t border-gray-400 pt-2">
            <Row label="Costo totale" value={formatCurrency(result.totalCost)} bold />
          </div>
        </div>

        <div className="rounded border border-gray-300 p-3 text-[9pt]">
          <p className="mb-2 font-semibold">Prezzo</p>
          <Row label="Prezzo netto" value={formatCents(result.netPriceCents)} />
          <Row label="IVA" value={formatCents(result.vatCents)} />
          <Row label="Prezzo totale" value={formatCents(result.grossPriceCents)} bold />
          <Row label="Margine effettivo" value={formatPercent(result.effectiveMarginBp)} />
          {quote.customer ? (
            <p className="mt-3 text-[8pt] text-gray-600">Cliente: {quote.customer}</p>
          ) : null}
          {quote.job.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-[8pt] text-gray-600">{quote.job.notes}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-[8pt] text-gray-500">
        Documento generato con LayerCost. I costi sono una stima basata sui parametri configurati.
      </p>
    </div>
  )
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-0.5 ${bold ? 'font-semibold' : ''}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
