import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Badge, Button, Card, Stat } from '@/components/ui'
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
  const components = result
    ? [
        {
          label: 'Materiale',
          value: result.lines.reduce((sum, line) => sum + line.material, 0),
          color: 'bg-emerald-500',
        },
        {
          label: 'Energia',
          value: result.lines.reduce((sum, line) => sum + line.energy, 0),
          color: 'bg-sky-500',
        },
        {
          label: 'Usura',
          value: result.lines.reduce((sum, line) => sum + line.depreciation + line.maintenance, 0),
          color: 'bg-violet-500',
        },
        {
          label: 'Manodopera',
          value: result.jobLabor + result.lines.reduce((sum, line) => sum + line.labor, 0),
          color: 'bg-amber-500',
        },
        {
          label: 'Extra',
          value: result.jobExtras + result.lines.reduce((sum, line) => sum + line.extras, 0),
          color: 'bg-orange-500',
        },
        {
          label: 'Riserva guasti',
          value: result.lines.reduce((sum, line) => sum + line.failure, 0),
          color: 'bg-rose-400',
        },
      ].filter((component) => component.value > 0)
    : []

  const totalHours = result
    ? result.lines.reduce((sum, line) => sum + line.effectiveSeconds, 0) / 3600
    : 0
  const materialCost = result ? result.lines.reduce((sum, line) => sum + line.material, 0) : 0
  const totalGramsKg = totalGrams / 100_000

  return (
    <Card className="p-4 sm:p-5 xl:sticky xl:top-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Riepilogo
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900">
            {result ? formatCents(result.grossPriceCents) : 'Da completare'}
          </h2>
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
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Costo totale" value={formatCurrency(result.totalCost)} />
            <Stat
              label="Prezzo totale"
              value={formatCents(result.grossPriceCents)}
              hint={
                result.vatCents > 0
                  ? `di cui IVA ${formatCents(result.vatCents)}`
                  : quote.pricing.vatMode === 'none'
                    ? 'Nessuna IVA'
                    : undefined
              }
              tone="accent"
            />
            <Stat
              label="Costo per ora"
              value={totalHours > 0 ? `${formatCurrency(result.totalCost / totalHours)}/h` : '—'}
              hint="Costo pieno sulle ore effettive"
            />
            <Stat
              label="Materiale per kg"
              value={totalGramsKg > 0 ? `${formatCurrency(materialCost / totalGramsKg)}/kg` : '—'}
              hint="Solo materiale"
            />
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Margine effettivo</span>
              <span className="font-semibold text-slate-700">
                {formatPercent(result.effectiveMarginBp)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.max(0, Math.min(100, result.effectiveMarginBp / 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {components.map((component) => {
              const share = result.totalCost > 0 ? (component.value / result.totalCost) * 100 : 0
              return (
                <div key={component.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{component.label}</span>
                    <span className="tabular-nums text-slate-700">
                      {formatCurrency(component.value)}
                      <span className="ml-1 text-slate-400">{share.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${component.color}`}
                      style={{ width: `${Math.max(0, Math.min(100, share))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
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
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Il prezzo totale è quello mostrato. Il margine effettivo è calcolato sul prezzo netto. I
          prezzi di riga nel dettaglio sono un’allocazione del totale.
        </p>
      ) : null}
    </Card>
  )
}
