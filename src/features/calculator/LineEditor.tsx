import type { CostConfig, LineResult, PrintLine } from '@/domain/types'
import { asBasisPoints, asCentigrams, asWatts, asWh } from '@/domain/units'
import { Badge, Button, Card, InfoDot, Select } from '@/components/ui'
import {
  DurationField,
  GramsField,
  NumberField,
  PercentField,
  SelectField,
} from '@/components/number-fields'
import { formatCurrency, formatDuration, formatGrams } from '@/lib/format'

interface LineEditorProps {
  line: PrintLine
  config: CostConfig
  result?: LineResult
  canRemove: boolean
  onUpdate: (patch: Partial<PrintLine>) => void
  onDuplicate: () => void
  onRemove: () => void
  onUpdateMaterial: (index: number, patch: Partial<PrintLine['materials'][number]>) => void
  onAddMaterial: () => void
  onRemoveMaterial: (index: number) => void
  onToggleExtra: (extraId: string) => void
}

export function LineEditor({
  line,
  config,
  result,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
  onUpdateMaterial,
  onAddMaterial,
  onRemoveMaterial,
  onToggleExtra,
}: LineEditorProps) {
  const printerOptions = config.printers
    .filter((printer) => !printer.archived || printer.id === line.printerId)
    .map((printer) => ({
      value: printer.id,
      label: `${printer.name}${printer.archived ? ' (archiviata)' : ''}`,
    }))

  const materialOptions = config.materials
    .filter(
      (material) =>
        !material.archived || line.materials.some((usage) => usage.materialId === material.id),
    )
    .map((material) => ({
      value: material.id,
      label: `${material.name} — ${formatCurrency(material.pricePerKg)}/kg`,
    }))

  const perUnitExtras = config.extras.filter(
    (extra) => extra.unit === 'perUnit' && (!extra.archived || line.extraIds.includes(extra.id)),
  )

  const totalGrams = line.materials.reduce((sum, usage) => sum + usage.grams, 0)
  const lineCost = result?.directLineCost

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line bg-raised/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={line.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            aria-label="Nome della stampa"
            className="min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink transition-feedback hover:border-line focus:border-data focus:bg-surface"
          />
          <Badge tone={lineCost === undefined ? 'warning' : 'neutral'}>
            {lineCost === undefined ? 'Da completare' : formatCurrency(lineCost)}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            Duplica
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={!canRemove}>
            Rimuovi
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Stampante"
          value={line.printerId}
          onChange={(value) => onUpdate({ printerId: value })}
          options={printerOptions}
          placeholder="Scegli una stampante"
        />
        <NumberField
          label="Quantità"
          value={line.quantity}
          onChange={(value) => onUpdate({ quantity: Math.max(1, Math.round(value)) })}
          min={1}
          max={10000}
          decimals={0}
          suffix="pz"
        />
        <DurationField
          label={
            <span className="inline-flex items-center gap-1">
              Tempo slicer
              <InfoDot label="Inserisci il tempo stimato dallo slicer. LayerCost aggiunge i minuti di avvio della stampante." />
            </span>
          }
          valueSeconds={line.timeSeconds}
          onChangeSeconds={(value) => onUpdate({ timeSeconds: value as PrintLine['timeSeconds'] })}
        />
        <DurationField
          label="Finitura per pezzo"
          valueSeconds={line.finishingSecondsPerUnit}
          onChangeSeconds={(value) =>
            onUpdate({ finishingSecondsPerUnit: value as PrintLine['finishingSecondsPerUnit'] })
          }
        />
      </div>

      <div className="border-t border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-ink">Materiali</h4>
            <p className="mt-0.5 text-xs text-muted">
              Usa il totale riportato dallo slicer: comprende supporti, brim, purge e prime tower.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onAddMaterial}>
            + Materiale
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {line.materials.length === 0 ? (
            <p className="rounded-control border border-dashed border-control px-3 py-4 text-center text-xs text-muted">
              Nessun materiale. Aggiungine almeno uno.
            </p>
          ) : null}
          {line.materials.map((usage, index) => (
            <div
              key={`${line.id}-material-${index}`}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_36px]"
            >
              <Select
                value={usage.materialId}
                onChange={(event) => onUpdateMaterial(index, { materialId: event.target.value })}
                aria-label={`Materiale ${index + 1}`}
              >
                <option value="">Scegli un materiale</option>
                {materialOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <GramsField
                label={undefined}
                valueCg={usage.grams}
                onChangeCg={(value) =>
                  onUpdateMaterial(index, { grams: asCentigrams(Math.round(value)) })
                }
                ariaLabel={`Grammi materiale ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMaterial(index)}
                disabled={line.materials.length <= 1}
                aria-label={`Rimuovi materiale ${index + 1}`}
                title="Rimuovi materiale"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      {perUnitExtras.length > 0 ? (
        <div className="border-t border-line p-4">
          <h4 className="text-sm font-semibold text-ink">Extra per pezzo</h4>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {perUnitExtras.map((extra) => (
              <label key={extra.id} className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={line.extraIds.includes(extra.id)}
                  onChange={() => onToggleExtra(extra.id)}
                  className="h-4 w-4 rounded border-control accent-data"
                />
                <span>{extra.name}</span>
                <span className="text-xs text-muted">{formatCurrency(extra.amount)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <details className="group border-t border-line p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
          Override avanzati
          <span className="ml-1 text-xs font-normal text-muted">
            potenza, energia misurata, tasso guasti
          </span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <OverrideNumber
            label="Potenza media"
            value={line.overrides.powerOverrideW}
            defaultValue={
              result?.avgWatts ??
              config.printers.find((printer) => printer.id === line.printerId)?.defaultAvgWatts ??
              200
            }
            onChange={(value) =>
              onUpdate({
                overrides: {
                  ...line.overrides,
                  powerOverrideW: value === undefined ? undefined : asWatts(Math.round(value)),
                },
              })
            }
            suffix="W"
            decimals={0}
            min={1}
          />
          <OverrideNumber
            label="Energia misurata"
            value={line.overrides.energyOverrideWh}
            defaultValue={result?.energyWh ?? 0}
            onChange={(value) =>
              onUpdate({
                overrides: {
                  ...line.overrides,
                  energyOverrideWh: value === undefined ? undefined : asWh(Math.round(value)),
                },
              })
            }
            suffix="Wh"
            decimals={0}
          />
          <OverrideFailure
            value={line.overrides.failureRateBp}
            defaultValue={result ? result.failureRateBp / 100 : 5}
            onChange={(value) =>
              onUpdate({
                overrides: {
                  ...line.overrides,
                  failureRateBp: value === undefined ? undefined : asBasisPoints(value),
                },
              })
            }
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Lascia disattivato per usare i valori di stampante, materiale e impostazioni. L’energia
          misurata bypassa il modello di potenza.
        </p>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-raised px-4 py-2 text-xs text-muted">
        <span>
          {formatGrams(totalGrams)}
          {result ? ` · ${formatDuration(result.effectiveSeconds)} effettivi` : ''}
        </span>
        <span>
          Costo diretto:{' '}
          <strong className="text-ink">
            {lineCost === undefined ? '—' : formatCurrency(lineCost)}
          </strong>
        </span>
      </div>
    </Card>
  )
}

function OverrideNumber({
  label,
  value,
  defaultValue,
  onChange,
  suffix,
  decimals,
  min = 0,
}: {
  label: string
  value: number | undefined
  defaultValue: number
  onChange: (value: number | undefined) => void
  suffix: string
  decimals: number
  min?: number
}) {
  const enabled = value !== undefined
  return (
    <div className="rounded-control border border-line bg-raised/60 p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? defaultValue : undefined)}
          className="h-4 w-4 rounded border-control accent-data"
        />
        {label}
      </label>
      {enabled ? (
        <div className="mt-2">
          <NumberField
            label={undefined}
            value={value ?? defaultValue}
            onChange={onChange}
            min={min}
            decimals={decimals}
            suffix={suffix}
            ariaLabel={label}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Automatico</p>
      )}
    </div>
  )
}

function OverrideFailure({
  value,
  defaultValue,
  onChange,
}: {
  value: number | undefined
  defaultValue: number
  onChange: (value: number | undefined) => void
}) {
  const defaultValueBp = Math.round(defaultValue * 100)
  const enabled = value !== undefined
  return (
    <div className="rounded-control border border-line bg-raised/60 p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? defaultValueBp : undefined)}
          className="h-4 w-4 rounded border-control accent-data"
        />
        Tasso guasti
      </label>
      {enabled ? (
        <div className="mt-2">
          <PercentField
            label={undefined}
            valueBp={value ?? defaultValueBp}
            onChangeBp={(bp) => onChange(bp)}
            decimals={1}
            max={50}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Automatico</p>
      )}
    </div>
  )
}
