import type { DiscountRule } from '@/domain/types'
import { asBasisPoints, asMicroEur } from '@/domain/units'
import { useI18n } from '@/app/i18n-context'
import { cn } from '@/lib/cn'
import { MoneyField, PercentField, SelectField } from './number-fields'

type DiscountMode = 'none' | DiscountRule['mode']

export function DiscountField({
  value,
  onChange,
  label,
  hint,
  className,
}: {
  value?: DiscountRule
  onChange: (value: DiscountRule | undefined) => void
  label: string
  hint?: string
  className?: string
}) {
  const { t } = useI18n()
  const mode: DiscountMode = value?.mode ?? 'none'

  const changeMode = (next: DiscountMode) => {
    if (next === 'none') {
      onChange(undefined)
      return
    }
    if (next === 'percent') {
      onChange({
        mode: 'percent',
        valueBp: value?.mode === 'percent' ? value.valueBp : asBasisPoints(0),
      })
      return
    }
    onChange({
      mode: 'amount',
      amount: value?.mode === 'amount' ? value.amount : asMicroEur(0),
    })
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <SelectField
        label={label}
        value={mode}
        onChange={(next) => changeMode(next as DiscountMode)}
        options={[
          { value: 'none', label: t('discount.none') },
          { value: 'percent', label: t('discount.percent') },
          { value: 'amount', label: t('discount.amount') },
        ]}
        hint={hint}
        className={value ? undefined : 'sm:col-span-2'}
      />
      {value?.mode === 'percent' ? (
        <PercentField
          label={t('discount.value')}
          valueBp={value.valueBp}
          onChangeBp={(valueBp) => onChange({ mode: 'percent', valueBp })}
          decimals={1}
          max={90}
        />
      ) : null}
      {value?.mode === 'amount' ? (
        <MoneyField
          label={t('discount.value')}
          valueMicro={value.amount}
          onChangeMicro={(amount) => onChange({ mode: 'amount', amount })}
          decimals={2}
        />
      ) : null}
    </div>
  )
}
