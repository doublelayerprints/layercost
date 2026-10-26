import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { formatDuration, formatGrams } from '@/lib/format'
import { newId } from '@/lib/id'
import { materialFamilyLabels } from '@/lib/labels'

const SLICER_LABELS: Record<ThreeMfSlicer, string> = {
  anycubic: 'Anycubic Slicer Next',
  bambu: 'Bambu Studio',
  orca: 'OrcaSlicer',
  unknown: 'Slicer sconosciuto',
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
  const printerFieldId = useId()
  const proposal = useMemo(() => proposeThreeMfMapping(summary, config), [summary, config])
  const activePrinters = config.printers.filter((printer) => !printer.archived)
  const activeMaterials = config.materials.filter((material) => !material.archived)
  const usablePlates = summary.plates.filter(isPlateUsable)

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
      setMappingError(
        caught instanceof Error
          ? caught.message
          : 'Impossibile importare i piatti selezionati. Controlla la mappatura.',
      )
    }
  }

  if (stage === 'confirm') {
    return (
      <Modal
        open
        onClose={onClose}
        title="Aggiungere o sostituire?"
        size="md"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="secondary" onClick={onBack}>
              Indietro
            </Button>
            <Button id="three-mf-append" onClick={onAppend}>
              Aggiungi alla bozza
            </Button>
            <Button variant="danger" onClick={onReplace}>
              Sostituisci le righe
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>La bozza corrente non è ancora nello storico.</p>
          <p>
            Stai importando{' '}
            <strong className="font-medium text-ink">
              {pendingCount} {pendingCount === 1 ? 'riga' : 'righe'}
            </strong>{' '}
            da <strong className="font-medium text-ink">{summary.fileName}</strong>.
          </p>
          <p>
            “Aggiungi alla bozza” mantiene le righe esistenti. “Sostituisci le righe” le scarta, ma
            conserva nome, cliente, costi di lavoro e prezzo.
          </p>
        </div>
      </Modal>
    )
  }

  const footerHint =
    activePrinters.length === 0
      ? 'Aggiungi una stampante attiva per importare.'
      : activeMaterials.length === 0
        ? 'Aggiungi un materiale attivo per importare.'
        : !printerId
          ? 'Scegli la stampante.'
          : selectedPlateList.length === 0
            ? 'Seleziona almeno un piatto.'
            : missingChoices.length > 0
              ? 'Completa la mappatura dei materiali.'
              : `${selectedPlateList.length} ${selectedPlateList.length === 1 ? 'riga pronta' : 'righe pronte'} da importare.`

  return (
    <Modal
      open
      onClose={onClose}
      title="Importa .3mf"
      size="xl"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted sm:max-w-sm">{footerHint}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button id="three-mf-import-primary" onClick={handleImport} disabled={!canImport}>
              Importa {selectedPlateList.length} {selectedPlateList.length === 1 ? 'riga' : 'righe'}
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
              {SLICER_LABELS[summary.slicer]}
              {summary.slicerVersion ? ` · ${summary.slicerVersion}` : ''}
              {summary.printerModel ? ` · ${summary.printerModel}` : ''}
            </p>
          </div>
          <Badge tone="info">
            {summary.plates.length} {summary.plates.length === 1 ? 'piatto' : 'piatti'}
          </Badge>
        </div>

        <Field
          label="Stampante"
          htmlFor={printerFieldId}
          hint={
            proposal.printer.reason === 'ambiguous'
              ? 'Più stampanti configurate corrispondono al file: scegli quella giusta.'
              : proposal.printer.reason === 'missing'
                ? 'La stampante non è dichiarata nel file: scegline una.'
                : undefined
          }
        >
          <Select
            id={printerFieldId}
            value={printerId}
            onChange={(event) => setPrinterId(event.target.value)}
            disabled={activePrinters.length === 0}
          >
            <option value="">Scegli una stampante</option>
            {activePrinters.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name} — {printer.model}
              </option>
            ))}
          </Select>
        </Field>

        {activePrinters.length === 0 ? (
          <Alert tone="danger" title="Nessuna stampante attiva">
            <p>Aggiungi o riattiva una stampante prima di importare un file.</p>
            <Link
              to="/printers"
              className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
            >
              Apri Stampanti
            </Link>
          </Alert>
        ) : null}

        {activeMaterials.length === 0 ? (
          <Alert tone="danger" title="Nessun materiale attivo">
            <p>Aggiungi o riattiva un materiale prima di importare un file.</p>
            <Link
              to="/materials"
              className="mt-1 inline-block text-sm font-medium text-data underline-offset-2 hover:underline"
            >
              Apri Materiali
            </Link>
          </Alert>
        ) : null}

        {globalWarnings.length > 0 ? (
          <Alert tone="warning" title="Avvisi sul file">
            <ul className="list-disc space-y-1 pl-4">
              {globalWarnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`}>{warning.message}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Piatti</h3>
              <p className="mt-0.5 max-w-2xl text-sm leading-snug text-muted">
                Seleziona i piatti da importare. Ogni piatto diventa una riga con quantità 1.
              </p>
            </div>
            <p className="text-xs text-muted">
              {selectedPlateList.length} di {usablePlates.length} selezionati
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
          <Alert tone="danger" title="Mappatura incompleta">
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
  const name = plate.name?.trim() || `Piatto ${plate.index}`
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
          aria-label={`Importa ${name}`}
          className="mt-1 h-4 w-4 shrink-0 rounded border-control accent-data"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{name}</span>
            {!usable ? <Badge tone="warning">Da completare</Badge> : null}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {plate.predictionSeconds !== null
              ? formatDuration(plate.predictionSeconds)
              : 'Tempo mancante'}{' '}
            · {formatGrams(grams)} · {usedFilaments.length}{' '}
            {usedFilaments.length === 1 ? 'materiale' : 'materiali'}
          </span>
        </span>
      </label>

      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 pl-7 text-xs text-warning">
          {warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`}>{warning.message}</li>
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
            <p className="text-xs text-muted">I filamenti a 0 g non vengono importati.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 pl-7 text-xs text-muted">
          Completa tempo e grammi nello slicer per importare questo piatto.
        </p>
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
  const color = filament.color?.trim()
  const hasSwatch = Boolean(color && /^#[0-9a-f]{6}$/i.test(color))

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
          {filament.type || 'Tipo sconosciuto'} · {formatGrams(filament.usedCentigrams)}
        </span>
      </div>
      <Select
        value={materialId}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Materiale per ${filament.type || 'filamento'} ${filament.id} del piatto ${plateIndex}`}
        aria-invalid={!materialId || undefined}
      >
        <option value="">Scegli materiale</option>
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {materialLabel(material)}
          </option>
        ))}
      </Select>
    </div>
  )
}

function materialLabel(material: CostConfig['materials'][number]): string {
  const family = materialFamilyLabels[material.family]
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
