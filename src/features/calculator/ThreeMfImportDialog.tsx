import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Alert, Badge, Button, Field, Modal, Select } from '@/components/ui'
import type { CostConfig, PrintLine } from '@/domain/types'
import type {
  ThreeMfFilament,
  ThreeMfPlate,
  ThreeMfSlicer,
  ThreeMfSummary,
  ThreeMfWarning,
} from '@/domain/three-mf'
import {
  mapThreeMfToLines,
  proposeThreeMfMapping,
  type ThreeMfMapping,
} from '@/domain/three-mf-mapping'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { materialFamilyLabel, type Translate } from '@/lib/labels'
import { threeMfMappingErrorMessage, threeMfWarningMessage } from './three-mf-messages'

const SLICER_LABELS: Record<Exclude<ThreeMfSlicer, 'unknown'>, string> = {
  anycubic: 'Anycubic Slicer Next',
  bambu: 'Bambu Studio',
  orca: 'OrcaSlicer',
}

interface ThreeMfImportDialogProps {
  summary: ThreeMfSummary
  config: CostConfig
  stage: 'preview' | 'confirm'
  pendingCount: number
  onClose: () => void
  onBack: () => void
  onRequestImport: (lines: PrintLine[]) => void
  onAppend: () => void
  onReplace: () => void
}

export function ThreeMfImportDialog({
  summary,
  config,
  stage,
  pendingCount,
  onClose,
  onBack,
  onRequestImport,
  onAppend,
  onReplace,
}: ThreeMfImportDialogProps) {
  const { t } = useI18n()
  const printerFieldId = useId()
  const proposal = useMemo(() => proposeThreeMfMapping(summary, config), [summary, config])
  const activePrinters = config.printers.filter((printer) => !printer.archived)
  const activeMaterials = config.materials.filter((material) => !material.archived)
  const usablePlates = summary.plates.filter(isPlateUsable)
  const slicerLabel =
    summary.slicer === 'unknown' ? t('import.slicerUnknown') : SLICER_LABELS[summary.slicer]

  const [printerId, setPrinterId] = useState(proposal.printer.printerId ?? '')
  const [selectedPlates, setSelectedPlates] = useState<Set<number>>(
    () => new Set(usablePlates.map((plate) => plate.index)),
  )
  const [materialChoices, setMaterialChoices] = useState<Record<string, string>>(() => {
    const choices: Record<string, string> = {}
    for (const item of proposal.materials) {
      if (item.materialId) choices[choiceKey(item.plateIndex, item.filamentId)] = item.materialId
    }
    return choices
  })
  const [mappingError, setMappingError] = useState<string>()

  useEffect(() => {
    const id = stage === 'confirm' ? 'three-mf-append' : 'three-mf-import-primary'
    document.getElementById(id)?.focus()
  }, [stage])

  const selectedPlateList = summary.plates.filter((plate) => selectedPlates.has(plate.index))
  const missingChoices = selectedPlateList.flatMap((plate) =>
    plate.filaments
      .filter(
        (filament) =>
          filament.usedCentigrams > 0 && !materialChoices[choiceKey(plate.index, filament.id)],
      )
      .map((filament) => ({ plate, filament })),
  )
  const canImport =
    activePrinters.length > 0 &&
    activeMaterials.length > 0 &&
    Boolean(printerId) &&
    selectedPlateList.length > 0 &&
    missingChoices.length === 0
  const globalWarnings = summary.warnings.filter((warning) => warning.plateIndex === undefined)

  const togglePlate = (plateIndex: number) => {
    setSelectedPlates((current) => {
      const next = new Set(current)
      if (next.has(plateIndex)) next.delete(plateIndex)
      else next.add(plateIndex)
      return next
    })
  }

  const setMaterialChoice = (plateIndex: number, filamentId: number, materialId: string) => {
    setMaterialChoices((current) => ({
      ...current,
      [choiceKey(plateIndex, filamentId)]: materialId,
    }))
    setMappingError(undefined)
  }

  const handleImport = () => {
    setMappingError(undefined)
    try {
      const mapping: ThreeMfMapping = {
        printerId,
        plateIndexes: selectedPlateList.map((plate) => plate.index),
        materials: selectedPlateList.flatMap((plate) =>
          plate.filaments
            .filter((filament) => filament.usedCentigrams > 0)
            .map((filament) => ({
              plateIndex: plate.index,
              filamentId: filament.id,
              materialId: materialChoices[choiceKey(plate.index, filament.id)] ?? '',
            })),
        ),
      }
      onRequestImport(mapThreeMfToLines(summary, mapping, config, newId))
    } catch (caught) {
      setMappingError(threeMfMappingErrorMessage(caught, t))
    }
  }

  if (stage === 'confirm') {
    return (
      <Modal
        open
        onClose={onClose}
        title={t('import.confirmTitle')}
        size="md"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="secondary" onClick={onBack}>
              {t('import.back')}
            </Button>
            <Button id="three-mf-append" onClick={onAppend}>
              {t('import.append')}
            </Button>
            <Button variant="danger" onClick={onReplace}>
              {t('import.replace')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>{t('import.draftNotSaved')}</p>
          <p>
            {t('import.importingPrefix')}{' '}
            <strong className="font-medium text-ink">
              {pendingCount}{' '}
              {t(pendingCount === 1 ? 'calculator.lineCount.one' : 'calculator.lineCount.other')}
            </strong>{' '}
            {t('import.importingFrom')}{' '}
            <strong className="font-medium text-ink">{summary.fileName}</strong>.
          </p>
          <p>{t('import.appendHint')}</p>
        </div>
      </Modal>
    )
  }

  const footerHint =
    activePrinters.length === 0
      ? t('import.addPrinterHint')
      : activeMaterials.length === 0
        ? t('import.addMaterialHint')
        : !printerId
          ? t('import.choosePrinterHint')
          : selectedPlateList.length === 0
            ? t('import.selectAtLeastOne')
            : missingChoices.length > 0
              ? t('import.completeMapping')
              : t(selectedPlateList.length === 1 ? 'import.ready.one' : 'import.ready.other', {
                  count: selectedPlateList.length,
                })

  return (
    <Modal
      open
      onClose={onClose}
      title={t('import.title')}
      size="xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted sm:max-w-sm">{footerHint}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button id="three-mf-import-primary" onClick={handleImport} disabled={!canImport}>
              {t(
                selectedPlateList.length === 1
                  ? 'import.importRows.one'
                  : 'import.importRows.other',
                { count: selectedPlateList.length },
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-all text-sm font-medium text-ink">{summary.fileName}</p>
            <p className="mt-0.5 text-xs text-muted">
              {slicerLabel}
              {summary.slicerVersion ? ` · ${summary.slicerVersion}` : ''}
              {summary.printerModel ? ` · ${summary.printerModel}` : ''}
            </p>
          </div>
          <Badge tone="info">
            {t(summary.plates.length === 1 ? 'import.plateCount.one' : 'import.plateCount.other', {
              count: summary.plates.length,
            })}
          </Badge>
        </div>

        <Field
          label={t('import.printer')}
          htmlFor={printerFieldId}
          hint={
            proposal.printer.reason === 'ambiguous'
              ? t('import.printerAmbiguous')
              : proposal.printer.reason === 'missing'
                ? t('import.printerMissing')
                : undefined
          }
        >
          <Select
            id={printerFieldId}
            value={printerId}
            onChange={(event) => setPrinterId(event.target.value)}
            disabled={activePrinters.length === 0}
          >
            <option value="">{t('import.choosePrinter')}</option>
            {activePrinters.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name} — {printer.model}
              </option>
            ))}
          </Select>
        </Field>

        {activePrinters.length === 0 ? (
          <Alert tone="danger" title={t('import.noPrintersTitle')}>
            <p>{t('import.noPrintersBody')}</p>
            <Link
              to="/printers"
              className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
            >
              {t('import.openPrinters')}
            </Link>
          </Alert>
        ) : null}

        {activeMaterials.length === 0 ? (
          <Alert tone="danger" title={t('import.noMaterialsTitle')}>
            <p>{t('import.noMaterialsBody')}</p>
            <Link
              to="/materials"
              className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
            >
              {t('import.openMaterials')}
            </Link>
          </Alert>
        ) : null}

        {globalWarnings.length > 0 ? (
          <Alert tone="warning" title={t('import.warnings')}>
            <ul className="list-disc space-y-1 pl-4">
              {globalWarnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{threeMfWarningMessage(warning, t)}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{t('import.plates')}</h3>
              <p className="mt-0.5 max-w-2xl text-sm leading-snug text-muted">
                {t('import.selectPlates')}
              </p>
            </div>
            <p className="text-xs text-muted">
              {t('import.selectedCount', {
                selected: selectedPlateList.length,
                total: usablePlates.length,
              })}
            </p>
          </div>

          <ul className="mt-3 space-y-3">
            {summary.plates.map((plate) => (
              <PlateCard
                key={plate.index}
                plate={plate}
                selected={selectedPlates.has(plate.index)}
                usable={isPlateUsable(plate)}
                warnings={summary.warnings.filter((warning) => warning.plateIndex === plate.index)}
                materialChoices={materialChoices}
                materials={activeMaterials}
                onToggle={() => togglePlate(plate.index)}
                onMaterialChange={(filamentId, materialId) =>
                  setMaterialChoice(plate.index, filamentId, materialId)
                }
              />
            ))}
          </ul>
        </div>

        {mappingError ? (
          <Alert tone="danger" title={t('import.mappingIncomplete')}>
            {mappingError}
          </Alert>
        ) : null}
      </div>
    </Modal>
  )
}

function PlateCard({
  plate,
  selected,
  usable,
  warnings,
  materialChoices,
  materials,
  onToggle,
  onMaterialChange,
}: {
  plate: ThreeMfPlate
  selected: boolean
  usable: boolean
  warnings: ThreeMfWarning[]
  materialChoices: Record<string, string>
  materials: CostConfig['materials']
  onToggle: () => void
  onMaterialChange: (filamentId: number, materialId: string) => void
}) {
  const { t } = useI18n()
  const format = useFormat()
  const name = plate.name?.trim() || t('import.plate', { index: plate.index })
  const grams =
    plate.weightCentigrams ??
    plate.filaments.reduce((sum, filament) => sum + filament.usedCentigrams, 0)
  const usedFilaments = plate.filaments.filter((filament) => filament.usedCentigrams > 0)

  return (
    <li className={cn('rounded-control border border-line p-3', selected && 'bg-raised/40')}>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={!usable}
          onChange={onToggle}
          aria-label={t('import.selectPlateAria', { name })}
          className="mt-1 h-4 w-4 shrink-0 rounded border-control accent-data"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{name}</span>
            {!usable ? <Badge tone="warning">{t('import.toComplete')}</Badge> : null}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {plate.predictionSeconds !== null
              ? format.duration(plate.predictionSeconds)
              : t('import.timeMissing')}{' '}
            · {format.grams(grams)} ·{' '}
            {t(
              usedFilaments.length === 1
                ? 'import.materialCount.one'
                : 'import.materialCount.other',
              { count: usedFilaments.length },
            )}
          </span>
        </span>
      </label>

      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 pl-7 text-xs text-warning">
          {warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{threeMfWarningMessage(warning, t)}</li>
          ))}
        </ul>
      ) : null}

      {usable ? (
        <div className="mt-3 space-y-2 pl-7">
          {usedFilaments.map((filament) => (
            <FilamentRow
              key={filament.id}
              plateIndex={plate.index}
              filament={filament}
              materialId={materialChoices[choiceKey(plate.index, filament.id)] ?? ''}
              materials={materials}
              onChange={(materialId) => onMaterialChange(filament.id, materialId)}
            />
          ))}
          {plate.filaments.some((filament) => filament.usedCentigrams <= 0) ? (
            <p className="text-xs text-muted">{t('import.zeroGrams')}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 pl-7 text-xs text-muted">{t('import.completePlate')}</p>
      )}
    </li>
  )
}

function FilamentRow({
  plateIndex,
  filament,
  materialId,
  materials,
  onChange,
}: {
  plateIndex: number
  filament: ThreeMfFilament
  materialId: string
  materials: CostConfig['materials']
  onChange: (materialId: string) => void
}) {
  const { t } = useI18n()
  const format = useFormat()
  const color = filament.color?.trim()
  const hasSwatch = Boolean(color && /^#[0-9a-f]{6}$/i.test(color))
  const filamentType = filament.type || t('import.unknownType')
  const filamentName = filament.type || t('import.filamentFallback')

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="flex min-w-0 items-center gap-2 text-sm text-ink">
        {hasSwatch ? (
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: color }}
          />
        ) : null}
        <span className="truncate">
          {filamentType} · {format.grams(filament.usedCentigrams)}
        </span>
      </div>
      <Select
        value={materialId}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t('import.filamentAria', {
          type: filamentName,
          id: filament.id,
          plate: plateIndex,
        })}
        aria-invalid={!materialId || undefined}
      >
        <option value="">{t('import.chooseMaterial')}</option>
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {materialLabel(material, t)}
          </option>
        ))}
      </Select>
    </div>
  )
}

function materialLabel(material: CostConfig['materials'][number], t: Translate): string {
  const family = materialFamilyLabel(material.family, t)
  return material.name.trim().toLowerCase() === family.toLowerCase()
    ? material.name
    : `${material.name} · ${family}`
}

function isPlateUsable(plate: ThreeMfPlate): boolean {
  return (
    plate.predictionSeconds !== null &&
    plate.filaments.some((filament) => filament.usedCentigrams > 0)
  )
}

function choiceKey(plateIndex: number, filamentId: number): string {
  return `${plateIndex}:${filamentId}`
}
