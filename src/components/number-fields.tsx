import { useId, useState, type ReactNode } from 'react'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { parseLocaleNumber, clamp } from '@/lib/format'
import type { BasisPoints, Centigrams, MicroEur } from '@/domain/units'
import {
  euroToMicro,
  gramsToCg,
  microToEuro,
  percentToBp,
  cgToGrams,
  bpToPercent,
} from '@/domain/units'
import { Field, Input, Select, Textarea } from './ui'
import { useFieldIds } from './field-context'
import { cn } from '@/lib/cn'

interface BareNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  decimals?: number
  suffix?: string
  disabled?: boolean
  placeholder?: string
  ariaLabel: string
  className?: string
}

function BareNumberInput({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  decimals = 2,
  suffix,
  disabled,
  placeholder,
  ariaLabel,
  className,
}: BareNumberInputProps) {
  const format = useFormat()
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? format.inputNumber(value, decimals)

  const handleChange = (raw: string) => {
    setDraft(raw)
    if (raw.trim() === '') {
      onChange(min > 0 ? min : 0)
      return
    }
    const parsed = parseLocaleNumber(raw)
    if (Number.isNaN(parsed)) return
    onChange(clamp(parsed, min, max))
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={(event) => {
          setDraft(format.inputNumber(value, decimals))
          event.currentTarget.select()
        }}
        onBlur={() => setDraft(null)}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={suffix ? 'pr-9' : undefined}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

export interface NumberFieldProps {
  label?: ReactNode
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  decimals?: number
  suffix?: string
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  decimals = 2,
  suffix,
  hint,
  error,
  disabled,
  placeholder,
  className,
  ariaLabel,
}: NumberFieldProps) {
  const { t } = useI18n()
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <BareNumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        decimals={decimals}
        suffix={suffix}
        disabled={disabled}
        placeholder={placeholder}
        ariaLabel={ariaLabel ?? (typeof label === 'string' ? label : t('units.number'))}
      />
    </Field>
  )
}

export function MoneyField({
  label,
  valueMicro,
  onChangeMicro,
  decimals = 2,
  hint,
  error,
  disabled,
  className,
}: {
  label?: ReactNode
  valueMicro: number
  onChangeMicro: (value: MicroEur) => void
  decimals?: number
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <NumberField
      label={label}
      value={microToEuro(valueMicro)}
      onChange={(value) => onChangeMicro(euroToMicro(value))}
      decimals={decimals}
      suffix="€"
      hint={hint}
      error={error}
      disabled={disabled}
      className={className}
    />
  )
}

export function PercentField({
  label,
  valueBp,
  onChangeBp,
  decimals = 1,
  max = 100,
  hint,
  error,
  disabled,
  className,
  ariaLabel,
}: {
  label?: ReactNode
  valueBp: number
  onChangeBp: (value: BasisPoints) => void
  decimals?: number
  max?: number
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <NumberField
      label={label}
      value={bpToPercent(valueBp)}
      onChange={(value) => onChangeBp(percentToBp(value))}
      decimals={decimals}
      max={max}
      suffix="%"
      hint={hint}
      error={error}
      disabled={disabled}
      className={className}
      ariaLabel={ariaLabel}
    />
  )
}

export function GramsField({
  label,
  valueCg,
  onChangeCg,
  hint,
  error,
  disabled,
  className,
  ariaLabel,
}: {
  label?: ReactNode
  valueCg: number
  onChangeCg: (value: Centigrams) => void
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  return (
    <NumberField
      label={label}
      value={cgToGrams(valueCg)}
      onChange={(value) => onChangeCg(gramsToCg(value))}
      decimals={2}
      suffix="g"
      hint={hint}
      error={error}
      disabled={disabled}
      className={className}
      ariaLabel={ariaLabel}
    />
  )
}

export function DurationField({
  label,
  valueSeconds,
  onChangeSeconds,
  hint,
  error,
  disabled,
  className,
}: {
  label: ReactNode
  valueSeconds: number
  onChangeSeconds: (value: number) => void
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const { labelId } = useFieldIds()
  const hours = Math.floor(valueSeconds / 3600)
  const minutes = Math.round((valueSeconds % 3600) / 60)

  const update = (nextHours: number, nextMinutes: number) => {
    const normalizedHours = Math.max(0, Math.round(nextHours))
    const normalizedMinutes = clamp(Math.round(nextMinutes), 0, 59)
    onChangeSeconds(normalizedHours * 3600 + normalizedMinutes * 60)
  }

  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <div
        className="flex gap-2"
        role="group"
        aria-labelledby={labelId || undefined}
        aria-label={labelId ? undefined : t('units.duration')}
      >
        <BareNumberInput
          value={hours}
          onChange={(value) => update(value, minutes)}
          min={0}
          max={9999}
          decimals={0}
          suffix="h"
          disabled={disabled}
          ariaLabel={t('units.hours')}
        />
        <BareNumberInput
          value={minutes}
          onChange={(value) => update(hours, value)}
          min={0}
          max={59}
          decimals={0}
          suffix="min"
          disabled={disabled}
          ariaLabel={t('units.minutes')}
        />
      </div>
    </Field>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  disabled,
  required,
  className,
}: {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: ReactNode
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  disabled,
  className,
}: {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  )
}

export function TextareaField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  disabled,
  className,
}: {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </Field>
  )
}
