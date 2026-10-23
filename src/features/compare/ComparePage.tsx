import { useMemo, useState } from 'react'
import type { PrintLine, Quote, QuoteResult } from '@/domain/types'
import { calculateQuote, pricingFromSettings } from '@/domain/cost/quote'
import { gramsToCg } from '@/domain/units'
import { useAppStore } from '@/state/app-store'
import { Alert, Card, PageHeader } from '@/components/ui'
import { DurationField, NumberField, SelectField } from '@/components/number-fields'
import {
  formatCents,
  formatCurrency,
  formatDuration,
  formatGrams,
  formatPricePerUnit,
} from '@/lib/format'
import { nowIso, todayIsoDate } from '@/lib/date'
import { newId } from '@/lib/id'

export function ComparePage() {
  const config = useAppStore((state) => state.config)
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
        return { error: 'Scegli due stampanti e un materiale.' }
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
        return { error: error instanceof Error ? error.message : 'Calcolo non riuscito.' }
      }
    }

    return { a: build(printerA), b: build(printerB) }
  }, [config, printerA, printerB, materialId, grams, timeSeconds, quantity])

  const resultA = comparison.a.result
  const resultB = comparison.b.result
  const lineA = resultA?.lines[0]
  const lineB = resultB?.lines[0]
  const deltaCost = resultA && resultB ? resultB.totalCost - resultA.totalCost : undefined
  const deltaPerUnit =
    lineA && lineB ? lineB.fullyLoadedUnitCost - lineA.fullyLoadedUnitCost : undefined

  const printerOptions = activePrinters.map((printer) => ({
    value: printer.id,
    label: printer.name,
  }))
  const materialOptions = activeMaterials.map((material) => ({
    value: material.id,
    label: `${material.name} — ${formatCurrency(material.pricePerKg)}/kg`,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Confronto"
        title="Kobra 3 vs Kobra X"
        description="Stesso lavoro, stessa quantità: confronta costo e prezzo tra due stampanti."
      />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Stampante A"
            value={printerA}
            onChange={setPrinterA}
            options={printerOptions}
            placeholder="Scegli"
          />
          <SelectField
            label="Stampante B"
            value={printerB}
            onChange={setPrinterB}
            options={printerOptions}
            placeholder="Scegli"
          />
          <SelectField
            label="Materiale"
            value={materialId}
            onChange={setMaterialId}
            options={materialOptions}
            placeholder="Scegli"
          />
          <NumberField
            label="Grammi"
            value={grams}
            onChange={setGrams}
            min={0}
            max={10_000}
            decimals={2}
            suffix="g"
          />
          <DurationField
            label="Tempo slicer"
            valueSeconds={timeSeconds}
            onChangeSeconds={setTimeSeconds}
          />
          <NumberField
            label="Quantità"
            value={quantity}
            onChange={(value) => setQuantity(Math.max(1, Math.round(value)))}
            min={1}
            max={10_000}
            decimals={0}
            suffix="pz"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Il confronto usa lo stesso tempo, gli stessi grammi e lo stesso materiale. Non include
          setup, progettazione o extra di lavoro.
        </p>
      </Card>

      {comparison.a.error || comparison.b.error ? (
        <Alert tone="warning" title="Confronto incompleto">
          {comparison.a.error ?? comparison.b.error}
        </Alert>
      ) : null}

      {resultA && resultB && lineA && lineB ? (
        <>
          <Card className="p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <PrinterColumn
                name={lineA.printerName}
                result={resultA}
                line={lineA}
                highlight={
                  deltaCost !== undefined && deltaCost > 0
                    ? 'cheaper'
                    : deltaCost === 0
                      ? 'equal'
                      : undefined
                }
              />
              <PrinterColumn
                name={lineB.printerName}
                result={resultB}
                line={lineB}
                highlight={
                  deltaCost !== undefined && deltaCost < 0
                    ? 'cheaper'
                    : deltaCost === 0
                      ? 'equal'
                      : undefined
                }
              />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-800">Differenza</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Delta
                label="Costo totale"
                value={deltaCost ?? 0}
                hint={`${formatCurrency(resultA.totalCost)} → ${formatCurrency(resultB.totalCost)}`}
              />
              <Delta
                label="Costo per pezzo"
                value={deltaPerUnit ?? 0}
                hint={`${formatCurrency(lineA.fullyLoadedUnitCost)} → ${formatCurrency(lineB.fullyLoadedUnitCost)}`}
              />
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Materiale
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {formatGrams(gramsToCg(grams))} ·{' '}
                  {lineA.material === lineB.material ? formatCurrency(lineA.material) : 'diverso'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatDuration(lineA.effectiveSeconds)} · {lineA.avgWatts} W vs {lineB.avgWatts}{' '}
                  W
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {deltaCost === 0
                ? 'Le due stampanti hanno lo stesso costo su questo lavoro.'
                : `La ${deltaCost && deltaCost < 0 ? lineB.printerName : lineA.printerName} costa ${formatCurrency(Math.abs(deltaCost ?? 0))} in meno su questo lavoro.`}
            </p>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function PrinterColumn({
  name,
  result,
  line,
  highlight,
}: {
  name: string
  result: QuoteResult
  line: QuoteResult['lines'][number]
  highlight?: 'cheaper' | 'equal'
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight === 'cheaper'
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-slate-200 bg-slate-50/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
        {highlight === 'cheaper' ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            Più conveniente
          </span>
        ) : highlight === 'equal' ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Pari
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <Row label="Costo totale" value={formatCurrency(result.totalCost)} strong />
        <Row label="Costo per pezzo" value={formatCurrency(line.fullyLoadedUnitCost)} />
        <Row label="Prezzo totale" value={formatCents(result.grossPriceCents)} strong />
        <Row label="Prezzo per pezzo" value={formatPricePerUnit(line.priceCents, line.quantity)} />
        <Row label="Materiale" value={formatCurrency(line.material)} />
        <Row label="Energia" value={formatCurrency(line.energy)} />
        <Row label="Usura" value={formatCurrency(line.depreciation + line.maintenance)} />
        <Row label="Tempo" value={formatDuration(line.effectiveSeconds)} />
        <Row label="Consumo" value={`${line.energyWh} Wh · ${line.avgWatts} W`} />
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'font-semibold text-slate-900' : 'text-slate-800'}`}
      >
        {value}
      </span>
    </div>
  )
}

function Delta({ label, value, hint }: { label: string; value: number; hint: string }) {
  const sign = value > 0 ? '+' : ''
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${value > 0 ? 'text-rose-600' : value < 0 ? 'text-emerald-700' : 'text-slate-800'}`}
      >
        {sign}
        {formatCurrency(value)}
      </p>
      <p className="text-[11px] text-slate-500">{hint}</p>
    </div>
  )
}
