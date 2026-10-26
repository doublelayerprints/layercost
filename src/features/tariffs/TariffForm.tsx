import { useId, useState, type FormEvent } from 'react'
import type { EnergyTariff } from '@/domain/types'
import { asMicroEur } from '@/domain/units'
import { useI18n } from '@/app/i18n-context'
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
  const { t } = useI18n()
  const [label, setLabel] = useState(tariff?.label ?? '')
  const [pricePerKWh, setPricePerKWh] = useState(tariff?.pricePerKWh ?? 0)
  const [effectiveFrom, setEffectiveFrom] = useState(tariff?.effectiveFrom ?? todayIsoDate())
  const [notes, setNotes] = useState(tariff?.notes ?? '')
  const [error, setError] = useState<string>()
  const dateFieldId = useId()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!label.trim()) {
      setError(t('tariff.errorLabel'))
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      setError(t('tariff.errorDate'))
      return
    }
    if (pricePerKWh < 0) {
      setError(t('tariff.errorPrice'))
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
        <Alert tone="danger" title={t('tariff.errorTitle')}>
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('tariff.label')}
          value={label}
          onChange={setLabel}
          required
          placeholder={t('tariff.labelPlaceholder')}
        />
        <MoneyField
          label={t('tariff.pricePerKWh')}
          valueMicro={pricePerKWh}
          onChangeMicro={setPricePerKWh}
          decimals={4}
          hint={t('tariff.priceHint')}
        />
      </div>

      <Field
        label={t('tariff.effectiveFrom')}
        htmlFor={dateFieldId}
        hint={t('tariff.effectiveFromHint')}
      >
        <Input
          id={dateFieldId}
          type="date"
          value={effectiveFrom}
          onChange={(event) => setEffectiveFrom(event.target.value)}
        />
      </Field>

      <Alert tone="info" title={t('tariff.priceNoteTitle')}>
        {t('tariff.priceNoteBody')}
      </Alert>

      <TextareaField
        label={t('tariff.notes')}
        value={notes}
        onChange={setNotes}
        placeholder={t('tariff.notesPlaceholder')}
      />

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('tariff.save')}</Button>
      </div>
    </form>
  )
}
