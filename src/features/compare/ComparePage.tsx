import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { plural, type InterpolationParams, type MessageKey } from '@/i18n'
import type { PrintLine, Quote, QuoteResult } from '@/domain/types'
import { calculateQuote, pricingFromSettings } from '@/domain/cost/quote'
import { gramsToCg } from '@/domain/units'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, SectionHeader } from '@/components/ui'
import { DurationField, NumberField, SelectField } from '@/components/number-fields'
import {
  displayCents,
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPricePerUnit,
} from '@/lib/format'
import { nowIso, todayIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'

type Translate = (key: MessageKey, params?: InterpolationParams) => string

export function ComparePage() {
  const { t, locale } = useI18n()
  const config = useAppStore((state) => state.config)
  const navigate = useNavigate()
  const activePrinters = config.printers.filter((printer) => !printer.archived)
  const activeMaterials = config.materials.filter((material) => !material.archived)

  const [printerA, setPrinterA] = useState(activePrinters[0]?.id ?? '')
  const [printerB, setPrinterB] = useState(activePrinters[1]?.id ?? activePrinters[0]?.id ?? '')
  const [materialId, setMaterialId] = useState(activeMaterials[0]?.id ?? '')
  const [grams, setGrams] = useState(100)
  const [timeSeconds, setTimeSeconds] = useState(3600)
  const [quantity, setQuantity] = useState(1)

  const comparison = useMemo(() => {
    const build = (printerId: string): { result?: QuoteResult; error?: string } => {
      if (!printerId || !materialId) {
        return { error: t('compare.chooseTwoPrinters') }
      }
      const line: PrintLine = {
        id: newId(),
        name: 'Confronto',
        printerId,
        timeSeconds: timeSeconds as PrintLine['timeSeconds'],
        materials: [{ materialId, grams: gramsToCg(grams) }],
        quantity: Math.max(1, Math.round(quantity)),
        finishingSecondsPerUnit: 0 as PrintLine['finishingSecondsPerUnit'],
        extraIds: [],
        overrides: {},
      }
      const quote: Quote = {
        id: newId(),
        name: 'Confronto stampanti',
        quoteDate: todayIsoDate(),
        status: 'draft',
        lines: [line],
        job: {
          setupSeconds: 0 as Quote['job']['setupSeconds'],
          designSeconds: 0 as Quote['job']['designSeconds'],
          extraIds: [],
        },
        pricing: pricingFromSettings(config.settings),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      try {
        return { result: calculateQuote(quote, config) }
      } catch (error) {
        return { error: error instanceof Error ? error.message : t('compare.calculationFailed') }
      }
    }

    return { a: build(printerA), b: build(printerB) }
  }, [config, printerA, printerB, materialId, grams, timeSeconds, quantity, t])

  const resultA = comparison.a.result
  const resultB = comparison.b.result
  const lineA = resultA?.lines[0]
  const lineB = resultB?.lines[0]
  const deltaCost =
    resultA && resultB
      ? displayCents(resultB.totalCost) - displayCents(resultA.totalCost)
      : undefined
  const deltaPerUnit =
    lineA && lineB
      ? displayCents(lineB.fullyLoadedUnitCost) - displayCents(lineA.fullyLoadedUnitCost)
      : undefined

  const printerOptions = activePrinters.map((printer) => ({
    value: printer.id,
    label: printer.name,
  }))
  const materialOptions = activeMaterials.map((material) => ({
    value: material.id,
    label: `${material.name} — ${formatCurrency(material.pricePerKg)}/kg`,
  }))
  const materialName =
    activeMaterials.find((material) => material.id === materialId)?.name ?? t('compare.material')

  const cheaper =
    deltaCost === undefined
      ? undefined
      : deltaCost > 0
        ? lineA?.printerName
        : deltaCost < 0
          ? lineB?.printerName
          : undefined

  const rows =
    resultA && resultB && lineA && lineB ? comparisonRows(resultA, resultB, lineA, lineB, t) : []

  if (activePrinters.length < 2) {
    return (
      <div>
        <PageHeader title={t('compare.title')} description={t('compare.pageDescriptionShort')} />
        <div className="mt-6">
          <EmptyState
            title={t('compare.needTwoPrintersTitle')}
            description={t('compare.needTwoPrintersDescription')}
            action={
              <Button onClick={() => navigate('/printers')}>{t('compare.goToPrinters')}</Button>
            }
          />
        </div>
      </div>
    )
  }

  if (activeMaterials.length === 0) {
    return (
      <div>
        <PageHeader title={t('compare.title')} description={t('compare.pageDescriptionShort')} />
        <div className="mt-6">
          <EmptyState
            title={t('compare.needMaterialTitle')}
            description={t('compare.needMaterialDescription')}
            action={
              <Button onClick={() => navigate('/materials')}>{t('compare.goToMaterials')}</Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('compare.title')} description={t('compare.pageDescription')} />

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeader
          id="section-lavoro-confronto"
          title={t('compare.jobTitle')}
          description={t('compare.jobDescription')}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label={t('compare.printerA')}
            value={printerA}
            onChange={setPrinterA}
            options={printerOptions}
            placeholder={t('compare.choose')}
          />
          <SelectField
            label={t('compare.printerB')}
            value={printerB}
            onChange={setPrinterB}
            options={printerOptions}
            placeholder={t('compare.choose')}
          />
          <SelectField
            label={t('compare.material')}
            value={materialId}
            onChange={setMaterialId}
            options={materialOptions}
            placeholder={t('compare.choose')}
          />
          <NumberField
            label={t('compare.grams')}
            value={grams}
            onChange={setGrams}
            min={0}
            max={10_000}
            decimals={2}
            suffix="g"
          />
          <DurationField
            label={t('compare.time')}
            valueSeconds={timeSeconds}
            onChangeSeconds={setTimeSeconds}
          />
          <NumberField
            label={t('compare.quantity')}
            value={quantity}
            onChange={(value) => setQuantity(Math.max(1, Math.round(value)))}
            min={1}
            max={10_000}
            decimals={0}
            suffix="pz"
          />
        </div>
      </Card>

      {comparison.a.error || comparison.b.error ? (
        <div className="mt-6">
          <Alert tone="warning" title={t('compare.incompleteTitle')}>
            {comparison.a.error ?? comparison.b.error}
          </Alert>
        </div>
      ) : null}

      {resultA && resultB && lineA && lineB ? (
        <Card className="mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-xs font-medium text-muted">{t('compare.costDifference')}</p>
              <p className="mt-0.5 text-price font-serif font-semibold tracking-price tabular-nums text-ink">
                {deltaCost === 0 ? '—' : formatCents(Math.abs(deltaCost ?? 0))}
              </p>
            </div>
            <p className="max-w-xl text-sm leading-snug text-muted">
              {deltaCost === 0
                ? t('compare.sameCost')
                : t('compare.cheaperBy', {
                    printer: cheaper ?? '',
                    amount: formatCents(Math.abs(deltaCost ?? 0)),
                  })}{' '}
              {formatGrams(gramsToCg(grams))} · {formatDuration(lineA.effectiveSeconds)} ·{' '}
              {plural(locale, quantity, {
                one: 'compare.pieces.one',
                other: 'compare.pieces.other',
              })}{' '}
              · {materialName}.
            </p>
          </div>

          <div className="mt-6 hidden border-t border-line pt-4 sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('compare.tableCaption')}</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-[38%] py-2 pr-4 text-left text-xs font-medium text-muted"
                  >
                    {t('compare.item')}
                  </th>
                  <th scope="col" className="py-2 pl-6 text-right text-xs font-medium text-muted">
                    <span className="inline-flex flex-wrap items-center justify-end gap-2">
                      {lineA.printerName}
                      {cheaper === lineA.printerName ? (
                        <Badge tone="success">{t('compare.cheaper')}</Badge>
                      ) : null}
                    </span>
                  </th>
                  <th scope="col" className="py-2 pl-6 text-right text-xs font-medium text-muted">
                    <span className="inline-flex flex-wrap items-center justify-end gap-2">
                      {lineB.printerName}
                      {cheaper === lineB.printerName ? (
                        <Badge tone="success">{t('compare.cheaper')}</Badge>
                      ) : null}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-rule">
                    <th scope="row" className="py-2 pr-4 text-left font-normal text-muted">
                      {row.label}
                    </th>
                    <td
                      className={
                        row.strong
                          ? 'py-2 pl-6 text-right font-medium tabular-nums text-ink'
                          : 'py-2 pl-6 text-right tabular-nums text-ink'
                      }
                    >
                      {row.a}
                    </td>
                    <td
                      className={
                        row.strong
                          ? 'py-2 pl-6 text-right font-medium tabular-nums text-ink'
                          : 'py-2 pl-6 text-right tabular-nums text-ink'
                      }
                    >
                      {row.b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 border-t border-line pt-6 sm:hidden">
            <MobileColumn
              t={t}
              name={lineA.printerName}
              isCheaper={cheaper === lineA.printerName}
              rows={rows.map((row) => ({ label: row.label, value: row.a, strong: row.strong }))}
            />
            <MobileColumn
              t={t}
              name={lineB.printerName}
              isCheaper={cheaper === lineB.printerName}
              rows={rows.map((row) => ({ label: row.label, value: row.b, strong: row.strong }))}
            />
          </div>

          <dl className="mt-6 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted">{t('compare.differencePerPiece')}</dt>
              <dd className="mt-0.5 text-sm tabular-nums text-ink">
                {deltaPerUnit === 0
                  ? t('compare.noDifference')
                  : t((deltaPerUnit ?? 0) > 0 ? 'compare.morePer' : 'compare.lessPer', {
                      amount: formatCents(Math.abs(deltaPerUnit ?? 0)),
                      printer: (deltaPerUnit ?? 0) > 0 ? lineB.printerName : lineA.printerName,
                    })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">
                {t('compare.totalPriceDifference')}
              </dt>
              <dd className="mt-0.5 text-sm tabular-nums text-ink">
                {(() => {
                  const delta = resultB.grossPriceCents - resultA.grossPriceCents
                  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
                  return `${sign}${formatCents(Math.abs(delta))}`
                })()}{' '}
                · {formatCents(resultA.grossPriceCents)} → {formatCents(resultB.grossPriceCents)}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {activePrinters.length < 2 ? (
        <div className="mt-6">
          <Alert tone="info" title={t('compare.needSecondPrinterTitle')}>
            {t('compare.needSecondPrinterBody')}
            <div className="mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigate('/printers')
                }}
              >
                {t('compare.goToPrinters')}
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}
    </div>
  )
}

interface ComparisonRow {
  label: string
  a: string
  b: string
  strong?: boolean
}

function comparisonRows(
  resultA: QuoteResult,
  resultB: QuoteResult,
  lineA: QuoteResult['lines'][number],
  lineB: QuoteResult['lines'][number],
  t: Translate,
): ComparisonRow[] {
  return [
    {
      label: t('compare.rows.totalCost'),
      a: formatCurrency(resultA.totalCost),
      b: formatCurrency(resultB.totalCost),
      strong: true,
    },
    {
      label: t('compare.rows.unitCost'),
      a: formatCurrency(lineA.fullyLoadedUnitCost),
      b: formatCurrency(lineB.fullyLoadedUnitCost),
    },
    {
      label: t('compare.rows.totalPrice'),
      a: formatCents(resultA.grossPriceCents),
      b: formatCents(resultB.grossPriceCents),
      strong: true,
    },
    {
      label: t('compare.rows.unitPrice'),
      a: formatPricePerUnit(lineA.priceCents, lineA.quantity),
      b: formatPricePerUnit(lineB.priceCents, lineB.quantity),
    },
    {
      label: t('compare.rows.material'),
      a: formatCurrency(lineA.material),
      b: formatCurrency(lineB.material),
    },
    {
      label: t('compare.rows.energy'),
      a: formatCurrency(lineA.energy),
      b: formatCurrency(lineB.energy),
    },
    {
      label: t('compare.rows.wear'),
      a: formatCurrency(lineA.depreciation + lineA.maintenance),
      b: formatCurrency(lineB.depreciation + lineB.maintenance),
    },
    {
      label: t('compare.rows.effectiveTime'),
      a: formatDuration(lineA.effectiveSeconds),
      b: formatDuration(lineB.effectiveSeconds),
    },
    {
      label: t('compare.rows.consumption'),
      a: `${lineA.energyWh} Wh · ${lineA.avgWatts} W`,
      b: `${lineB.energyWh} Wh · ${lineB.avgWatts} W`,
    },
  ]
}

function MobileColumn({
  name,
  isCheaper,
  rows,
  t,
}: {
  name: string
  isCheaper: boolean
  rows: { label: string; value: string; strong?: boolean }[]
  t: Translate
}) {
  return (
    <section aria-label={t('compare.resultFor', { printer: name })}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{name}</h2>
        {isCheaper ? <Badge tone="success">{t('compare.cheaper')}</Badge> : null}
      </div>
      <dl className="mt-2 border-t border-line text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-rule py-2"
          >
            <dt className="text-muted">{row.label}</dt>
            <dd
              className={row.strong ? 'font-medium tabular-nums text-ink' : 'tabular-nums text-ink'}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
