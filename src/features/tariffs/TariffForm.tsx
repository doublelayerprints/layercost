import { useId, useState, type FormEvent } from 'react'
import type { EnergyTariff } from '@/domain/types'
import { asMicroEur } from '@/domain/units'
import { todayIsoDate } from '@/lib/date'
import { Alert, Button, Field, Input } from '@/components/ui'
import { MoneyField, TextareaField, TextField } from '@/components/number-fields'

export function TariffForm({
  tariff,
  onSave,
  onCancel,
}: {
  tariff?: EnergyTariff
  onSave: (data: Omit<EnergyTariff, 'id'>) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(tariff?.label ?? '')
  const [pricePerKWh, setPricePerKWh] = useState(tariff?.pricePerKWh ?? 0)
  const [effectiveFrom, setEffectiveFrom] = useState(tariff?.effectiveFrom ?? todayIsoDate())
  const [notes, setNotes] = useState(tariff?.notes ?? '')
  const [error, setError] = useState<string>()
  const dateFieldId = useId()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!label.trim()) {
      setError('L’etichetta è obbligatoria.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      setError('Inserisci una data di decorrenza valida.')
      return
    }
    if (pricePerKWh < 0) {
      setError('Il prezzo non può essere negativo.')
      return
    }

    onSave({
      label: label.trim(),
      pricePerKWh: asMicroEur(pricePerKWh),
      effectiveFrom,
      notes: notes.trim() || undefined,
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
          label="Etichetta"
          value={label}
          onChange={setLabel}
          required
          placeholder="Es. Contratto casa 2026"
        />
        <MoneyField
          label="Prezzo al kWh"
          valueMicro={pricePerKWh}
          onChangeMicro={setPricePerKWh}
          decimals={4}
          hint="Costo marginale, comprensivo di oneri e IVA al kWh."
        />
      </div>

      <Field
        label="Decorrenza"
        htmlFor={dateFieldId}
        hint="La tariffa vale per i preventivi con data uguale o successiva."
      >
        <Input
          id={dateFieldId}
          type="date"
          value={effectiveFrom}
          onChange={(event) => setEffectiveFrom(event.target.value)}
        />
      </Field>

      <Alert tone="info" title="Quale prezzo inserire">
        Usa il costo variabile al kWh della bolletta, non il totale diviso i kWh: i costi fissi non
        cambiano se stampi un pezzo in più.
      </Alert>

      <TextareaField
        label="Note"
        value={notes}
        onChange={setNotes}
        placeholder="Fornitore, tipo di contratto, fasce…"
      />

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          Annulla
        </Button>
        <Button type="submit">Salva tariffa</Button>
      </div>
    </form>
  )
}
