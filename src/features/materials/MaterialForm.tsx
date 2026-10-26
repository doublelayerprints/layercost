import { useState, type FormEvent } from 'react'
import type { Material } from '@/domain/types'
import { MATERIAL_FAMILIES } from '@/domain/types'
import { asBasisPoints, asMicroEur } from '@/domain/units'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { materialFamilyLabel } from '@/lib/labels'
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
  const { t } = useI18n()
  const format = useFormat()
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
      setError(t('material.errorName'))
      return
    }
    if (pricePerKg < 0) {
      setError(t('material.errorPrice'))
      return
    }
    if (spoolNetWeightG <= 0) {
      setError(t('material.errorSpool'))
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
        <Alert tone="danger" title={t('material.errorTitle')}>
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('material.name')}
          value={name}
          onChange={setName}
          required
          placeholder={t('material.namePlaceholder')}
        />
        <SelectField
          label={t('material.family')}
          value={family}
          onChange={(value) => setFamily(value as Material['family'])}
          options={MATERIAL_FAMILIES.map((item) => ({
            value: item,
            label: materialFamilyLabel(item, t),
          }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label={t('material.pricePerKg')}
          valueMicro={pricePerKg}
          onChangeMicro={setPricePerKg}
          decimals={2}
          hint={t('material.priceHint', { price: format.currency(pricePerKg / 1000, 4) })}
        />
        <NumberField
          label={t('material.spoolWeight')}
          value={spoolNetWeightG}
          onChange={setSpoolNetWeightG}
          min={1}
          max={100_000}
          decimals={0}
          suffix="g"
          hint={t('material.spoolWeightHint')}
        />
      </div>

      <div className="rounded-control bg-raised px-3 py-2 text-xs text-muted">
        {t('material.priceFormula')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('material.supplier')}
          value={supplier}
          onChange={setSupplier}
          placeholder={t('material.optionalPlaceholder')}
        />
        <TextField
          label={t('material.color')}
          value={color}
          onChange={setColor}
          placeholder={t('material.optionalPlaceholder')}
        />
      </div>

      <div className="rounded-control border border-line p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={failureEnabled}
            onChange={(event) => setFailureEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-control accent-data"
          />
          {t('material.failureSpecific')}
        </label>
        <p className="mt-1 text-xs text-muted">{t('material.failureHint')}</p>
        {failureEnabled ? (
          <div className="mt-3 max-w-xs">
            <PercentField
              label={t('material.failureRate')}
              valueBp={failureBp}
              onChangeBp={setFailureBp}
              decimals={1}
              max={50}
            />
          </div>
        ) : null}
      </div>

      <TextareaField
        label={t('material.notes')}
        value={notes}
        onChange={setNotes}
        placeholder={t('material.notesPlaceholder')}
      />

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('material.save')}</Button>
      </div>
    </form>
  )
}
