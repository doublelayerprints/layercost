import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Badge, Button, Card, Price, Stat } from '@/components/ui'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import { ShareQuoteButton } from '@/features/quotes/ShareQuoteButton'
import { formatCents, formatCurrency, formatPercent } from '@/lib/format'

export function SummaryPanel({
  quote,
  result,
  error,
  totalGrams,
  onSave,
  onPrint,
  onNew,
  saveError,
}: {
  quote: Quote
  result?: QuoteResult
  error?: string
  totalGrams: number
  onSave: () => void
  onPrint: () => void
  onNew: () => void
  saveError?: string
}) {
  const totalHours = result
    ? result.lines.reduce((sum, line) => sum + line.effectiveSeconds, 0) / 3600
    : 0
  const materialCost = result ? result.lines.reduce((sum, line) => sum + line.material, 0) : 0
  const totalGramsKg = totalGrams / 100_000

  return (
    <Card className="p-4 sm:p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted">Riepilogo</h2>
          <Price
            value={result ? formatCents(result.grossPriceCents) : '—'}
            hint={
              result
                ? result.vatCents > 0
                  ? `di cui IVA ${formatCents(result.vatCents)}`
                  : quote.pricing.vatMode === 'none'
                    ? 'Nessuna IVA'
                    : undefined
                : undefined
            }
          />
        </div>
        <Badge tone={result ? 'success' : 'warning'}>{result ? 'Calcolato' : 'Bozza'}</Badge>
      </div>

      {error ? (
        <div className="mt-3">
          <Alert tone="warning" title="Completa i dati">
            {error}
          </Alert>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <Stat label="Costo pieno" value={formatCurrency(result.totalCost)} />
            <Stat
              label="Costo per ora"
              value={totalHours > 0 ? `${formatCurrency(result.totalCost / totalHours)}/h` : '—'}
              hint="Sulle ore effettive"
            />
            <Stat
              label="Materiale per kg"
              value={totalGramsKg > 0 ? `${formatCurrency(materialCost / totalGramsKg)}/kg` : '—'}
              hint="Solo materiale"
            />
            <Stat
              label="Margine effettivo"
              value={formatPercent(result.effectiveMarginBp)}
              hint="Sul prezzo netto"
              tone={result.effectiveMarginBp < 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-medium text-muted">Composizione del costo</h3>
            <CostStack bands={costBands(result)} className="mt-2" />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Inserisci stampante, tempo e grammi per vedere il costo e il prezzo.
        </p>
      )}

      {saveError ? (
        <div className="mt-3">
          <Alert tone="danger" title="Salvataggio non riuscito">
            {saveError}
          </Alert>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <Button className="w-full" onClick={onSave} disabled={!result}>
          Salva preventivo
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onPrint} disabled={!result}>
            Stampa / PDF
          </Button>
          {result ? (
            <ShareQuoteButton
              quote={quote}
              result={result}
              label="Condividi"
              size="md"
              variant="secondary"
            />
          ) : (
            <Button variant="secondary" disabled>
              Condividi
            </Button>
          )}
        </div>
        <Button variant="ghost" className="w-full" onClick={onNew}>
          Nuovo preventivo
        </Button>
      </div>

      {result ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Il prezzo totale è quello mostrato. Il margine effettivo è calcolato sul prezzo netto. I
          prezzi di riga nel dettaglio sono una quota del totale.
        </p>
      ) : null}
    </Card>
  )
}
