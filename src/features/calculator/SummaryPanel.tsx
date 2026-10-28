import { useState } from 'react'
import { useI18n, type I18nContextValue } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { Quote, QuoteResult } from '@/domain/types'
import { Alert, Badge, Button, Card, Price } from '@/components/ui'
import { CostStack } from '@/components/cost-stack'
import { costBandLabel, costBands } from '@/lib/cost-bands'
import { ShareQuoteButton } from '@/features/quotes/ShareQuoteButton'
import { displayCents, type Formatters } from '@/lib/format'

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

function finding(
  result: QuoteResult,
  t: I18nContextValue['t'],
  format: Formatters,
): { text: string; tone: 'default' | 'warning' } | undefined {
  if (result.totalCost <= 0) return undefined
  if (result.effectiveMarginBp < 0) {
    return {
      text: t('summary.belowCost', { margin: format.percent(result.effectiveMarginBp) }),
      tone: 'warning',
    }
  }
  const bands = costBands(result)
  const largest = bands.reduce((winner, band) => (band.value > winner.value ? band : winner))
  if (largest.value <= 0) return undefined
  const shareBp = Math.round((largest.value / result.totalCost) * 10_000)
  return {
    text: t('summary.largestBand', {
      share: format.percent(shareBp),
      band: costBandLabel(largest.key, t).toLowerCase(),
    }),
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
  const { t } = useI18n()
  const format = useFormat()
  const current = comparison.options.find((option) => option.id === comparison.currentId)
  const selected = comparison.options.find((option) => option.id === selectedId) ?? current
  if (!current || !selected) return null

  const costDelta = displayCents(selected.totalCost) - displayCents(current.totalCost)
  const priceDelta = selected.grossPriceCents - current.grossPriceCents

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-xs font-medium text-muted">{t('summary.sameJobOtherPrinter')}</p>
      <div
        role="group"
        aria-label={t('summary.compareAria')}
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
          <>{t('summary.calculatedOn', { printer: current.name })}</>
        ) : (
          <>
            {t('summary.withPrinter', { printer: selected.name })}{' '}
            <span className="tabular-nums text-ink">{format.currency(selected.totalCost)}</span>,{' '}
            <span
              className={
                costDelta > 0
                  ? 'tabular-nums text-negative'
                  : costDelta < 0
                    ? 'tabular-nums text-positive'
                    : 'tabular-nums text-ink'
              }
            >
              {costDelta === 0
                ? t('summary.same')
                : costDelta > 0
                  ? t('summary.more', { amount: format.cents(Math.abs(costDelta)) })
                  : t('summary.less', { amount: format.cents(Math.abs(costDelta)) })}
            </span>
            {'. '}
            {t('summary.price')}{' '}
            <span className="tabular-nums text-ink">{format.cents(selected.grossPriceCents)}</span>
            {priceDelta === 0
              ? ''
              : ` (${priceDelta > 0 ? '+' : '−'}${format.cents(Math.abs(priceDelta))})`}
            {'.'}
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
  saveLabel,
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
  saveLabel?: string
}) {
  const { t } = useI18n()
  const format = useFormat()
  const [selectedPrinter, setSelectedPrinter] = useState<string>()
  const insight = result ? finding(result, t, format) : undefined

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{t('summary.totalPrice')}</p>
          {result ? (
            <Price
              value={format.cents(result.grossPriceCents)}
              hint={
                result.vatCents > 0
                  ? t('summary.vatIncluded', { amount: format.cents(result.vatCents) })
                  : quote.pricing.vatMode === 'none'
                    ? t('pricing.vatNone')
                    : undefined
              }
            />
          ) : (
            <p className="mt-1 text-base text-muted">—</p>
          )}
        </div>
        <Badge tone={result ? 'success' : 'warning'}>
          {result ? t('summary.calculated') : t('summary.toComplete')}
        </Badge>
      </div>

      {error ? (
        <div className="mt-4">
          {/* The incomplete-data bar uses the data accent; the title carries the warning. */}
          <Alert tone="info" title={t('summary.completeData')}>
            {error}
          </Alert>
        </div>
      ) : null}

      {result ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <dt className="text-xs font-medium text-muted">{t('summary.fullCost')}</dt>
              <dd className="mt-0.5 text-2xl font-medium leading-tight tabular-nums text-ink">
                {format.currency(result.totalCost)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{t('summary.effectiveMargin')}</dt>
              <dd
                className={
                  result.effectiveMarginBp < 0
                    ? 'mt-0.5 text-2xl font-medium leading-tight tabular-nums text-warning'
                    : 'mt-0.5 text-2xl font-medium leading-tight tabular-nums text-ink'
                }
              >
                {format.percent(result.effectiveMarginBp)}
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
              {t('summary.detailsLink')}
            </a>
          ) : null}
        </>
      ) : error ? null : (
        <p className="mt-4 text-sm leading-snug text-muted">{t('summary.empty')}</p>
      )}

      {saveError ? (
        <div className="mt-4">
          <Alert tone="danger" title={t('summary.saveFailed')}>
            {saveError}
          </Alert>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <Button className="w-full" onClick={onSave} disabled={!result}>
          {saveLabel ?? t('summary.save')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onPrint} disabled={!result}>
            {t('summary.print')}
          </Button>
          {result ? (
            <ShareQuoteButton
              quote={quote}
              result={result}
              label={t('summary.share')}
              size="md"
              variant="secondary"
            />
          ) : (
            <Button variant="secondary" disabled>
              {t('summary.share')}
            </Button>
          )}
        </div>
      </div>

      {result ? (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {t('summary.footer', {
            cost: format.currency(result.totalCost),
            grams: totalGrams > 0 ? format.grams(totalGrams) : '—',
          })}
        </p>
      ) : null}
    </Card>
  )
}
