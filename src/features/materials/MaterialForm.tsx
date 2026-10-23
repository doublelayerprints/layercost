import { useState, type FormEvent } from 'react'
import type { Material } from '@/domain/types'
import { MATERIAL_FAMILIES } from '@/domain/types'
import { asBasisPoints, asMicroEur } from '@/domain/units'
import { materialFamilyLabels } from '@/lib/labels'
import { formatCurrency } from '@/lib/format'
import { Alert, Button } from '@/components/ui'
import {
  MoneyField,
  NumberField,
  PercentField,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/number-fields'

export function MaterialForm({
  material,
  onSave,
  onCancel,
}: {
  material?: Material
  onSave: (data: Omit<Material, 'id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(material?.name ?? '')
  const [family, setFamily] = useState<Material['family']>(material?.family ?? 'PLA')
  const [pricePerKg, setPricePerKg] = useState(material?.pricePerKg ?? 0)
  const [spoolNetWeightG, setSpoolNetWeightG] = useState(material?.spoolNetWeightG ?? 1000)
  const [supplier, setSupplier] = useState(material?.supplier ?? '')
  const [color, setColor] = useState(material?.color ?? '')
  const [notes, setNotes] = useState(material?.notes ?? '')
  const [failureEnabled, setFailureEnabled] = useState(material?.failureRateBp !== undefined)
  const [failureBp, setFailureBp] = useState(material?.failureRateBp ?? 500)
  const [error, setError] = useState<string>()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Il nome del materiale è obbligatorio.')
      return
    }
    if (pricePerKg < 0) {
      setError('Il prezzo non può essere negativo.')
      return
    }
    if (spoolNetWeightG <= 0) {
      setError('Il peso netto della bobina deve essere maggiore di zero.')
      return
    }

    onSave({
      name: name.trim(),
      family,
      pricePerKg: asMicroEur(pricePerKg),
      spoolNetWeightG: Math.max(1, Math.round(spoolNetWeightG)),
      supplier: supplier.trim() || undefined,
      color: color.trim() || undefined,
      failureRateBp: failureEnabled ? asBasisPoints(failureBp) : undefined,
      notes: notes.trim() || undefined,
      archived: material?.archived ?? false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Controlla i dati">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nome"
          value={name}
          onChange={setName}
          required
          placeholder="Es. PLA bianco"
        />
        <SelectField
          label="Famiglia"
          value={family}
          onChange={(value) => setFamily(value as Material['family'])}
          options={MATERIAL_FAMILIES.map((item) => ({
            value: item,
            label: materialFamilyLabels[item],
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Prezzo al kg"
          valueMicro={pricePerKg}
          onChangeMicro={setPricePerKg}
          decimals={2}
          hint={`Prezzo al grammo: ${formatCurrency(pricePerKg / 1000, 4)}`}
        />
        <NumberField
          label="Peso netto bobina"
          value={spoolNetWeightG}
          onChange={setSpoolNetWeightG}
          min={1}
          max={100_000}
          decimals={0}
          suffix="g"
          hint="Solo filamento, senza tara."
        />
      </div>

      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Se hai il prezzo della bobina, calcola il prezzo al kg: prezzo bobina ÷ peso netto × 1000.
        Esempio: €19,90 per 1000 g → €19,90/kg.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Fornitore"
          value={supplier}
          onChange={setSupplier}
          placeholder="Opzionale"
        />
        <TextField label="Colore" value={color} onChange={setColor} placeholder="Opzionale" />
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={failureEnabled}
            onChange={(event) => setFailureEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Tasso guasti specifico per questo materiale
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Se disattivato, usa il tasso globale. Utile per ABS/ASA su telaio aperto.
        </p>
        {failureEnabled ? (
          <div className="mt-3 max-w-xs">
            <PercentField
              label="Tasso guasti"
              valueBp={failureBp}
              onChangeBp={setFailureBp}
              decimals={1}
              max={50}
            />
          </div>
        ) : null}
      </div>

      <TextareaField
        label="Note"
        value={notes}
        onChange={setNotes}
        placeholder="Essiccazione, temperatura, ugello consigliato…"
      />

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          Annulla
        </Button>
        <Button type="submit">Salva materiale</Button>
      </div>
    </form>
  )
}
