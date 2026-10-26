import { useState, type FormEvent } from 'react'
import type { Extra } from '@/domain/types'
import { asMicroEur } from '@/domain/units'
import { useI18n } from '@/app/i18n-context'
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
  const { t } = useI18n()
  const [name, setName] = useState(extra?.name ?? '')
  const [amount, setAmount] = useState(extra?.amount ?? 0)
  const [unit, setUnit] = useState<Extra['unit']>(extra?.unit ?? 'perUnit')
  const [category, setCategory] = useState(extra?.category ?? '')
  const [error, setError] = useState<string>()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('extra.errorName'))
      return
    }
    if (amount < 0) {
      setError(t('extra.errorAmount'))
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
        <Alert tone="danger" title={t('extra.errorTitle')}>
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('extra.name')}
          value={name}
          onChange={setName}
          required
          placeholder={t('extra.namePlaceholder')}
        />
        <MoneyField
          label={t('extra.amount')}
          valueMicro={amount}
          onChangeMicro={setAmount}
          decimals={2}
        />
        <SelectField
          label={t('extra.unit')}
          value={unit}
          onChange={(value) => setUnit(value as Extra['unit'])}
          options={[
            { value: 'perUnit', label: t('extra.unitPerUnit') },
            { value: 'perJob', label: t('extra.unitPerJob') },
          ]}
          hint={unit === 'perUnit' ? t('extra.unitPerUnitHint') : t('extra.unitPerJobHint')}
        />
        <TextField
          label={t('extra.category')}
          value={category}
          onChange={setCategory}
          placeholder={t('extra.categoryPlaceholder')}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('extra.save')}</Button>
      </div>
    </form>
  )
}
