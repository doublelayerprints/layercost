import type { CostConfig, LineResult, PrintLine } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { asBasisPoints, asCentigrams, asWatts, asWh } from '@/domain/units'
import { Badge, Button, InfoDot, Select } from '@/components/ui'
import {
  DurationField,
  GramsField,
  NumberField,
  PercentField,
  SelectField,
} from '@/components/number-fields'
import { formatCurrency, formatDuration, formatGrams } from '@/lib/format'

interface LineEditorProps {
  index: number
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
  index,
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
  const { t } = useI18n()
  const printerOptions = config.printers
    .filter((printer) => !printer.archived || printer.id === line.printerId)
    .map((printer) => ({
      value: printer.id,
      label: `${printer.name}${printer.archived ? ` (${t('line.archived')})` : ''}`,
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

  return (
    <fieldset
      id={`line-${line.id}`}
      className="mt-5 border-t border-line pt-5 first:mt-1 first:border-t-0 first:pt-0"
    >
      <legend className="sr-only">
        {t('line.legend', {
          index: index + 1,
          name: line.name.trim() || t('line.unnamed'),
        })}
      </legend>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <input
            value={line.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            aria-label={t('line.nameLabel')}
            className="w-full min-w-0 border-b border-line bg-transparent py-0.5 text-base font-semibold text-ink transition-feedback hover:border-control focus:border-control focus:bg-surface"
          />
          <p className="mt-0.5 text-sm text-muted">
            {formatGrams(totalGrams)}
            {line.quantity > 1
              ? ` ${t('line.perUnitTotal', {
                  total: formatGrams(totalGrams * line.quantity),
                })}`
              : ''}
            {result
              ? ` · ${t('line.effectiveDuration', {
                  duration: formatDuration(result.effectiveSeconds),
                })}`
              : ''}
            {line.quantity > 1 ? ` · ${t('line.pieces', { count: line.quantity })}` : ''}
            {result ? (
              <>
                {' · '}
                {t('line.directCost')}{' '}
                <span className="font-medium tabular-nums text-ink">
                  {formatCurrency(result.directLineCost)}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            {t('line.duplicate')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={!canRemove}>
            {t('line.remove')}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t('line.printer')}
          value={line.printerId}
          onChange={(value) => onUpdate({ printerId: value })}
          options={printerOptions}
          placeholder={t('line.choosePrinter')}
        />
        <NumberField
          label={t('line.quantity')}
          value={line.quantity}
          onChange={(value) => onUpdate({ quantity: Math.max(1, Math.round(value)) })}
          min={1}
          max={10000}
          decimals={0}
          suffix={t('line.unitPieces')}
        />
        <DurationField
          label={
            <span className="inline-flex items-center gap-1">
              {t('line.slicerTime')}
              <InfoDot label={t('line.slicerTimeHint')} />
            </span>
          }
          valueSeconds={line.timeSeconds}
          onChangeSeconds={(value) => onUpdate({ timeSeconds: value as PrintLine['timeSeconds'] })}
        />
        <DurationField
          label={t('line.finishing')}
          valueSeconds={line.finishingSecondsPerUnit}
          onChangeSeconds={(value) =>
            onUpdate({ finishingSecondsPerUnit: value as PrintLine['finishingSecondsPerUnit'] })
          }
        />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('line.materials')}</h3>
            <p className="mt-0.5 max-w-lg text-sm leading-snug text-muted">
              {t('line.materialsHint')}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onAddMaterial}>
            {t('line.addMaterial')}
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {line.materials.length === 0 ? (
            <p className="rounded-control border border-dashed border-control px-3 py-4 text-center text-sm text-muted">
              {t('line.noMaterials')}
            </p>
          ) : null}
          {line.materials.map((usage, materialIndex) => (
            <div
              key={`${line.id}-material-${materialIndex}`}
              className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_132px_36px]"
            >
              <Select
                value={usage.materialId}
                onChange={(event) =>
                  onUpdateMaterial(materialIndex, { materialId: event.target.value })
                }
                aria-label={t('line.materialAria', { index: materialIndex + 1 })}
              >
                <option value="">{t('line.chooseMaterial')}</option>
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
                  onUpdateMaterial(materialIndex, { grams: asCentigrams(Math.round(value)) })
                }
                ariaLabel={t('line.gramsAria', { index: materialIndex + 1 })}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveMaterial(materialIndex)}
                disabled={line.materials.length <= 1}
                aria-label={t('line.removeMaterialAria', { index: materialIndex + 1 })}
                title={t('line.removeMaterial')}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      {perUnitExtras.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">{t('line.perUnitExtras')}</h3>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2.5">
            {perUnitExtras.map((extra) => (
              <label key={extra.id} className="flex min-h-6 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={line.extraIds.includes(extra.id)}
                  onChange={() => onToggleExtra(extra.id)}
                  className="h-4 w-4 rounded border-control accent-data"
                />
                <span>{extra.name}</span>
                <span className="text-sm tabular-nums text-muted">
                  {formatCurrency(extra.amount)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <details className="group mt-5 border-t border-line pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink marker:hidden">
          <span
            aria-hidden="true"
            className="text-xs text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none"
          >
            ▸
          </span>
          {t('line.advancedOverrides')}
          <span className="text-xs font-normal text-muted">{t('line.advancedOverridesHint')}</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <OverrideNumber
            label={t('line.avgPower')}
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
            label={t('line.measuredEnergy')}
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
        <p className="mt-2 text-xs text-muted">{t('line.overridesHint')}</p>
      </details>
    </fieldset>
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
  const { t } = useI18n()
  const enabled = value !== undefined
  return (
    <div className="rounded-control border border-line p-3">
      <label className="flex min-h-6 items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? defaultValue : undefined)}
          className="h-4 w-4 rounded border-control accent-data"
        />
        {label}
        <Badge tone={enabled ? 'info' : 'neutral'}>
          {enabled ? t('line.override') : t('line.auto')}
        </Badge>
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
      ) : null}
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
  const { t } = useI18n()
  const defaultValueBp = Math.round(defaultValue * 100)
  const enabled = value !== undefined
  return (
    <div className="rounded-control border border-line p-3">
      <label className="flex min-h-6 items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? defaultValueBp : undefined)}
          className="h-4 w-4 rounded border-control accent-data"
        />
        {t('line.failureRate')}
        <Badge tone={enabled ? 'info' : 'neutral'}>
          {enabled ? t('line.override') : t('line.auto')}
        </Badge>
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
      ) : null}
    </div>
  )
}
