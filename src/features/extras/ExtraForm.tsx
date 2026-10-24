import { useState, type FormEvent } from 'react'
import type { Extra } from '@/domain/types'
import { asMicroEur } from '@/domain/units'
import { Alert, Button } from '@/components/ui'
import { MoneyField, SelectField, TextField } from '@/components/number-fields'

export function ExtraForm({
  extra,
  onSave,
  onCancel,
}: {
  extra?: Extra
  onSave: (data: Omit<Extra, 'id'>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(extra?.name ?? '')
  const [amount, setAmount] = useState(extra?.amount ?? 0)
  const [unit, setUnit] = useState<Extra['unit']>(extra?.unit ?? 'perUnit')
  const [category, setCategory] = useState(extra?.category ?? '')
  const [error, setError] = useState<string>()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Il nome è obbligatorio.')
      return
    }
    if (amount < 0) {
      setError('L’importo non può essere negativo.')
      return
    }

    onSave({
      name: name.trim(),
      amount: asMicroEur(amount),
      unit,
      category: category.trim() || undefined,
      archived: extra?.archived ?? false,
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
          placeholder="Es. Sacchetto zip"
        />
        <MoneyField label="Importo" valueMicro={amount} onChangeMicro={setAmount} decimals={2} />
        <SelectField
          label="Unità"
          value={unit}
          onChange={(value) => setUnit(value as Extra['unit'])}
          options={[
            { value: 'perUnit', label: 'Per pezzo' },
            { value: 'perJob', label: 'Per lavoro' },
          ]}
          hint={
            unit === 'perUnit'
              ? 'Viene moltiplicato per la quantità della riga.'
              : 'Viene applicato una volta al preventivo.'
          }
        />
        <TextField
          label="Categoria"
          value={category}
          onChange={setCategory}
          placeholder="Imballaggio, spedizione, hardware…"
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          Annulla
        </Button>
        <Button type="submit">Salva extra</Button>
      </div>
    </form>
  )
}
