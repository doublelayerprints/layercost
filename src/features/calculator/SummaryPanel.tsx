import { useState } from 'react'
import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Badge, Button, Card, Price } from '@/components/ui'
import { CostStack } from '@/components/cost-stack'
import { costBands } from '@/lib/cost-bands'
import { ShareQuoteButton } from '@/features/quotes/ShareQuoteButton'
import { displayCents, formatCents, formatCurrency, formatGrams, formatPercent } from '@/lib/format'

export interface QuickComparisonOption {
  id: string
  name: string
  totalCost: number
  grossPriceCents: number
}

export interface QuickComparison {
  currentId: string
  options: QuickComparisonOption[]
}

function finding(result: QuoteResult): { text: string; tone: 'default' | 'warning' } | undefined {
  if (result.totalCost <= 0) return undefined
  if (result.effectiveMarginBp < 0) {
    return {
      text: `Il prezzo è sotto il costo: margine ${formatPercent(result.effectiveMarginBp)}.`,
      tone: 'warning',
    }
  }
  const bands = costBands(result)
  const largest = bands.reduce((winner, band) => (band.value > winner.value ? band : winner))
  if (largest.value <= 0) return undefined
  const shareBp = Math.round((largest.value / result.totalCost) * 10_000)
  return {
    text: `Il ${formatPercent(shareBp)} del costo pieno è ${largest.label.toLowerCase()}.`,
    tone: 'default',
  }
}

function ComparisonLine({
  comparison,
  selectedId,
  onSelect,
}: {
  comparison: QuickComparison
  selectedId: string
  onSelect: (id: string) => void
}) {
  const current = comparison.options.find((option) => option.id === comparison.currentId)
  const selected = comparison.options.find((option) => option.id === selectedId) ?? current
  if (!current || !selected) return null

  const costDelta = displayCents(selected.totalCost) - displayCents(current.totalCost)
  const priceDelta = selected.grossPriceCents - current.grossPriceCents

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-medium text-muted">Stesso lavoro, altra stampante</p>
      <div
        role="group"
        aria-label="Confronta il costo con un'altra stampante"
        className="mt-2 inline-flex flex-wrap gap-0.5 rounded-control bg-raised p-0.5"
      >
        {comparison.options.map((option) => {
          const isSelected = option.id === selected.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
              className={
                isSelected
                  ? 'rounded-[4px] bg-surface px-2.5 py-1 text-xs font-medium text-ink'
                  : 'rounded-[4px] px-2.5 py-1 text-xs font-medium text-muted transition-feedback hover:text-ink'
              }
            >
              {option.name}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm leading-snug text-muted">
        {selected.id === current.id ? (
          <>Il preventivo è calcolato su {current.name}.</>
        ) : (
          <>
            Con {selected.name} il costo sarebbe{' '}
            <span className="tabular-nums text-ink">{formatCurrency(selected.totalCost)}</span>,{' '}
            <span
              className={
                costDelta > 0
                  ? 'tabular-nums text-negative'
                  : costDelta < 0
                    ? 'tabular-nums text-positive'
                    : 'tabular-nums text-ink'
              }
            >
              {costDelta === 0 ? 'uguale' : `${formatCents(Math.abs(costDelta))} ${costDelta > 0 ? 'in più' : 'in meno'}`}
            </span>
            . Prezzo{' '}
            <span className="tabular-nums text-ink">{formatCents(selected.grossPriceCents)}</span>
            {priceDelta === 0 ? '' : ` (${priceDelta > 0 ? '+' : '−'}${formatCents(Math.abs(priceDelta))})`}.
          </>
        )}
      </p>
    </div>
  )
}

export function SummaryPanel({
  quote,
  result,
  error,
  totalGrams,
  comparison,
  detailHref,
  onSave,
  onPrint,
  saveError,
}: {
  quote: Quote
  result?: QuoteResult
  error?: string
  totalGrams: number
  comparison?: QuickComparison
  detailHref?: string
  onSave: () => void
  onPrint: () => void
  saveError?: string
}) {
  const [selectedPrinter, setSelectedPrinter] = useState<string>()
  const insight = result ? finding(result) : undefined

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Prezzo totale</p>
          {result ? (
            <Price
              value={formatCents(result.grossPriceCents)}
              hint={
                result.vatCents > 0
                  ? `di cui IVA ${formatCents(result.vatCents)}`
                  : quote.pricing.vatMode === 'none'
                    ? 'Nessuna IVA'
                    : undefined
              }
            />
          ) : (
            <p className="mt-1 text-base text-muted">—</p>
          )}
        </div>
        <Badge tone={result ? 'success' : 'warning'}>{result ? 'Calcolato' : 'Da completare'}</Badge>
      </div>

      {error ? (
        <div className="mt-4">
          <Alert tone="warning" title="Completa i dati">
            {error}
          </Alert>
        </div>
      ) : null}

      {result ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <dt className="text-xs font-medium text-muted">Costo pieno</dt>
              <dd className="mt-0.5 text-2xl font-medium leading-tight tabular-nums text-ink">
                {formatCurrency(result.totalCost)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">Margine effettivo</dt>
              <dd
                className={
                  result.effectiveMarginBp < 0
                    ? 'mt-0.5 text-2xl font-medium leading-tight tabular-nums text-warning'
                    : 'mt-0.5 text-2xl font-medium leading-tight tabular-nums text-ink'
                }
              >
                {formatPercent(result.effectiveMarginBp)}
              </dd>
            </div>
          </dl>

          {insight ? (
            <p
              className={
                insight.tone === 'warning'
                  ? 'mt-3 text-sm leading-snug text-warning'
                  : 'mt-3 text-sm leading-snug text-muted'
              }
            >
              {insight.text}
            </p>
          ) : null}

          <div className="mt-4">
            <CostStack bands={costBands(result)} />
          </div>

          {comparison ? (
            <ComparisonLine
              comparison={comparison}
              selectedId={
                selectedPrinter &&
                comparison.options.some((option) => option.id === selectedPrinter)
                  ? selectedPrinter
                  : comparison.currentId
              }
              onSelect={setSelectedPrinter}
            />
          ) : null}

          {detailHref ? (
            <a
              href={detailHref}
              className="mt-4 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
            >
              Dettaglio costi
            </a>
          ) : null}
        </>
      ) : error ? null : (
        <p className="mt-4 text-sm leading-snug text-muted">
          Inserisci stampante, tempo e grammi per vedere il costo e il prezzo.
        </p>
      )}

      {saveError ? (
        <div className="mt-4">
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
            Stampa
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
      </div>

      {result ? (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {formatCurrency(result.totalCost)} di costo su{' '}
          {totalGrams > 0 ? formatGrams(totalGrams) : '—'} di materiale. I prezzi di riga nel
          dettaglio sono una quota del totale, non prezzi indipendenti.
        </p>
      ) : null}
    </Card>
  )
}
