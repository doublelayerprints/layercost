import type { Quote, QuoteResult } from '@/domain/types'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import {
  formatCents,
  formatCurrency,
  formatDateOnly,
  formatDuration,
  formatGrams,
  formatPercent,
  formatPricePerUnit,
} from '@/lib/format'
import { todayIsoDate } from '@/lib/date'

/** Document date, resolved once per session: the print footer must not read the clock on every render. */
const PRINT_DATE = formatDateOnly(todayIsoDate())

export function QuotePrint({ quote, result }: { quote: Quote; result?: QuoteResult }) {
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
          <p className="text-[9pt] font-semibold">LayerCost</p>
          <p className="mt-0.5 text-[9pt]">Preventivo</p>
          <h1 className="mt-1 font-serif text-[18pt] font-semibold leading-tight">{quote.name}</h1>
          <p className="mt-1 text-[9pt]">
            {formatDateOnly(quote.quoteDate)}
            {quote.customer ? ` · Cliente: ${quote.customer}` : ''}
          </p>
        </div>
        <div className="text-right text-[9pt] leading-relaxed">
          <p>{quote.status === 'draft' ? 'Bozza' : 'Salvato'}</p>
          <p>Motore v{result.engineVersion}</p>
          <p>
            {quote.lines.length} {quote.lines.length === 1 ? 'riga' : 'righe'}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-x-8 text-[9pt]">
        <div>
          <dt className="inline text-black/60">Materiale </dt>
          <dd className="inline">{formatGrams(totalGrams)}</dd>
        </div>
        <div>
          <dt className="inline text-black/60">Tempo effettivo </dt>
          <dd className="inline">{formatDuration(totalSeconds)}</dd>
        </div>
        <div>
          <dt className="inline text-black/60">Pezzi </dt>
          <dd className="inline">{totalPieces}</dd>
        </div>
      </dl>

      <table className="mt-4 w-full border-collapse text-[9pt]">
        <caption className="sr-only">Righe del preventivo</caption>
        <thead>
          <tr className="border-b border-black text-left">
            <th scope="col" className="py-1 pr-2 font-medium">
              Stampa
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              Stampante
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              Materiale
            </th>
            <th scope="col" className="py-1 pr-2 font-medium">
              Tempo
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Pezzi
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-medium">
              Costo pieno
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Prezzo di riga
            </th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((line) => {
            const grams = line.materialDetails.reduce((sum, detail) => sum + detail.grams, 0)
            const materials = line.materialDetails
              .map((detail) => `${detail.name} ${formatGrams(detail.grams)}`)
              .join(', ')
            return (
              <tr key={line.lineId} className="print-break border-b border-black/25 align-top">
                <td className="py-1.5 pr-2 font-medium">{line.name}</td>
                <td className="py-1.5 pr-2">{line.printerName}</td>
                <td className="py-1.5 pr-2">
                  {materials || formatGrams(grams)}
                  <span className="block text-[8pt] text-black/60">
                    {line.quantity > 1
                      ? `${formatGrams(grams)} per pezzo · ${formatGrams(grams * line.quantity)} totali`
                      : `${formatGrams(grams)} totali`}
                  </span>
                </td>
                <td className="py-1.5 pr-2">{formatDuration(line.effectiveSeconds)}</td>
                <td className="py-1.5 pr-2 text-right">{line.quantity}</td>
                <td className="py-1.5 pr-2 text-right">
                  {formatCurrency(line.fullyLoadedLineCost)}
                </td>
                <td className="py-1.5 text-right">
                  {formatCents(line.priceCents)}
                  <span className="block text-[8pt] text-black/60">
                    {formatPricePerUnit(line.priceCents, line.quantity)}/pz
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[8pt] text-black/60">
        Il prezzo di riga è una quota del prezzo totale, non un prezzo indipendente.
      </p>

      <div className="mt-4 grid grid-cols-[1fr_72mm] gap-8">
        <div>
          <p className="text-[9pt] font-semibold">Composizione del costo</p>
          <CostStack bands={costBands(result)} className="mt-2" />
        </div>

        <div>
          <p className="text-[9pt] font-semibold">Prezzo</p>
          <p className="mt-1 font-serif text-[18pt] font-semibold leading-tight">
            {formatCents(result.grossPriceCents)}
          </p>
          <p className="text-[9pt] text-black/60">
            {result.vatCents > 0
              ? `${formatCents(result.netPriceCents)} netto + ${formatCents(result.vatCents)} IVA`
              : 'Nessuna IVA'}
          </p>
          <dl className="mt-2 border-t border-black/25 pt-1 text-[9pt]">
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>Costo pieno</dt>
              <dd className="tabular-nums">{formatCurrency(result.totalCost)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>Margine effettivo</dt>
              <dd className="tabular-nums">{formatPercent(result.effectiveMarginBp)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-0.5">
              <dt>Prezzo netto</dt>
              <dd className="tabular-nums">{formatCents(result.netPriceCents)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {quote.job.notes ? (
        <div className="print-break mt-4 border-t border-black/25 pt-2">
          <p className="text-[9pt] font-semibold">Note</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[9pt]">{quote.job.notes}</p>
        </div>
      ) : null}

      <p className="mt-4 border-t border-black/25 pt-2 text-[8pt] text-black/60">
        Generato con LayerCost il {PRINT_DATE}. I costi sono una stima basata sui parametri
        configurati.
      </p>
    </div>
  )
}
