import type { QuotePricing, Settings } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { Button, InfoDot, SectionHeader } from '@/components/ui'
import { MoneyField, PercentField, SelectField } from '@/components/number-fields'

export function PricingEditor({
  pricing,
  settings,
  onChange,
  onReset,
}: {
  pricing: QuotePricing
  settings: Settings
  onChange: (patch: Partial<QuotePricing>) => void
  onReset: () => void
}) {
  const { t } = useI18n()
  const isMarkup = pricing.mode === 'markup'
  const valueBp = isMarkup ? pricing.markupBp : pricing.marginBp

  return (
    <>
      <SectionHeader
        id="section-prezzo"
        title={t('pricing.title')}
        description={t('pricing.description')}
        actions={
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t('pricing.reset')}
          </Button>
        }
      />

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
        <PercentField
          label={t('pricing.discount')}
          valueBp={pricing.discountBp}
          onChangeBp={(value) => onChange({ discountBp: value })}
          decimals={1}
          max={90}
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
