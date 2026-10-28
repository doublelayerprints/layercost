import type { QuotePricing, QuoteResult, Settings } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { InfoDot } from '@/components/ui'
import { DiscountField } from '@/components/discount-field'
import { MoneyField, PercentField, SelectField } from '@/components/number-fields'

export function PricingEditor({
  pricing,
  settings,
  result,
  onChange,
}: {
  pricing: QuotePricing
  settings: Settings
  result?: QuoteResult
  onChange: (patch: Partial<QuotePricing>) => void
}) {
  const { t } = useI18n()
  const format = useFormat()
  const isMarkup = pricing.mode === 'markup'
  const valueBp = isMarkup ? pricing.markupBp : pricing.marginBp
  const requestedDiscount =
    pricing.discount?.mode === 'amount' ? pricing.discount.amount : undefined
  const discountCapped =
    requestedDiscount !== undefined &&
    result !== undefined &&
    requestedDiscount > result.quoteDiscount

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t('pricing.mode')}
          value={pricing.mode}
          onChange={(value) => onChange({ mode: value as QuotePricing['mode'] })}
          options={[
            { value: 'markup', label: t('pricing.modeMarkup') },
            { value: 'margin', label: t('pricing.modeMargin') },
          ]}
        />
        <PercentField
          label={
            <span className="inline-flex items-center gap-1">
              {isMarkup ? t('pricing.markup') : t('pricing.margin')}
              <InfoDot label={isMarkup ? t('pricing.markupHint') : t('pricing.marginHint')} />
            </span>
          }
          valueBp={valueBp}
          onChangeBp={(value) => onChange(isMarkup ? { markupBp: value } : { marginBp: value })}
          decimals={1}
          max={isMarkup ? 1000 : 99}
        />
        <SelectField
          label={t('pricing.vat')}
          value={pricing.vatMode}
          onChange={(value) => onChange({ vatMode: value as QuotePricing['vatMode'] })}
          options={[
            { value: 'none', label: t('pricing.vatNone') },
            { value: 'excluded', label: t('pricing.vatExcluded') },
            { value: 'included', label: t('pricing.vatIncluded') },
          ]}
          hint={pricing.vatMode === 'none' ? t('pricing.vatNoneHint') : t('pricing.vatHint')}
        />
        {pricing.vatMode !== 'none' ? (
          <PercentField
            label={t('pricing.vatRate')}
            valueBp={pricing.vatRateBp}
            onChangeBp={(value) => onChange({ vatRateBp: value })}
            decimals={0}
            max={30}
          />
        ) : null}
        <SelectField
          label={t('pricing.rounding')}
          value={pricing.roundingMode}
          onChange={(value) => onChange({ roundingMode: value as QuotePricing['roundingMode'] })}
          options={[
            { value: 'up', label: t('pricing.roundUp') },
            { value: 'nearest', label: t('pricing.roundNearest') },
            { value: 'down', label: t('pricing.roundDown') },
          ]}
        />
        <MoneyField
          label={t('pricing.step')}
          valueMicro={pricing.roundingStep}
          onChangeMicro={(value) => onChange({ roundingStep: value })}
          decimals={2}
          hint={t('pricing.stepHint', {
            amount: new Intl.NumberFormat('it-IT', {
              style: 'currency',
              currency: 'EUR',
            }).format(0.1),
          })}
        />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <DiscountField
          value={pricing.discount}
          onChange={(discount) => onChange({ discount })}
          label={t('pricing.discount')}
          hint={t('pricing.discountHint')}
        />
        {result && result.quoteDiscount > 0 ? (
          <p className="mt-2 text-sm text-muted">
            {t('pricing.discountApplied', { amount: format.currency(result.quoteDiscount) })}
          </p>
        ) : null}
        {discountCapped && result ? (
          <p className="mt-1 text-sm text-warning" role="status">
            {t('pricing.discountCapped', { amount: format.currency(result.quoteDiscount) })}
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-snug text-muted">
        {t('pricing.allocationLabel')}{' '}
        <span className="text-ink">
          {settings.allocationMode === 'proportional'
            ? t('pricing.allocationProportional')
            : t('pricing.allocationEqual')}
        </span>
        {'. '}
        {t('pricing.allocationHint')}
      </p>
    </>
  )
}
