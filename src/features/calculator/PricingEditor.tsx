import type { QuotePricing, Settings } from '@/domain/types'
import { Button, InfoDot, SectionHeader } from '@/components/ui'
import { MoneyField, PercentField, SelectField } from '@/components/number-fields'
import { pricingModeLabels, roundingModeLabels, vatModeLabels } from '@/lib/labels'

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
  const isMarkup = pricing.mode === 'markup'
  const valueBp = isMarkup ? pricing.markupBp : pricing.marginBp

  return (
    <>
      <SectionHeader
        id="section-prezzo"
        title="Prezzo"
        description="Il prezzo si calcola sul costo pieno; lo sconto si applica prima dell’arrotondamento."
        actions={
          <Button variant="ghost" size="sm" onClick={onReset}>
            Ripristina default
          </Button>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Modalità"
          value={pricing.mode}
          onChange={(value) => onChange({ mode: value as QuotePricing['mode'] })}
          options={[
            { value: 'markup', label: pricingModeLabels.markup },
            { value: 'margin', label: pricingModeLabels.margin },
          ]}
        />
        <PercentField
          label={
            <span className="inline-flex items-center gap-1">
              {isMarkup ? 'Ricarico' : 'Margine'}
              <InfoDot
                label={
                  isMarkup ? 'Percentuale aggiunta al costo.' : 'Percentuale sul prezzo finale.'
                }
              />
            </span>
          }
          valueBp={valueBp}
          onChangeBp={(value) => onChange(isMarkup ? { markupBp: value } : { marginBp: value })}
          decimals={1}
          max={isMarkup ? 1000 : 99}
        />
        <PercentField
          label="Sconto"
          valueBp={pricing.discountBp}
          onChangeBp={(value) => onChange({ discountBp: value })}
          decimals={1}
          max={90}
        />
        <SelectField
          label="IVA"
          value={pricing.vatMode}
          onChange={(value) => onChange({ vatMode: value as QuotePricing['vatMode'] })}
          options={[
            { value: 'none', label: vatModeLabels.none },
            { value: 'excluded', label: vatModeLabels.excluded },
            { value: 'included', label: vatModeLabels.included },
          ]}
          hint={
            pricing.vatMode === 'none'
              ? 'Nessuna IVA applicata.'
              : 'La modalità IVA è solo di presentazione, non è consulenza fiscale.'
          }
        />
        {pricing.vatMode !== 'none' ? (
          <PercentField
            label="Aliquota IVA"
            valueBp={pricing.vatRateBp}
            onChangeBp={(value) => onChange({ vatRateBp: value })}
            decimals={0}
            max={30}
          />
        ) : null}
        <SelectField
          label="Arrotondamento"
          value={pricing.roundingMode}
          onChange={(value) => onChange({ roundingMode: value as QuotePricing['roundingMode'] })}
          options={[
            { value: 'up', label: roundingModeLabels.up },
            { value: 'nearest', label: roundingModeLabels.nearest },
            { value: 'down', label: roundingModeLabels.down },
          ]}
        />
        <MoneyField
          label="Passo"
          valueMicro={pricing.roundingStep}
          onChangeMicro={(value) => onChange({ roundingStep: value })}
          decimals={2}
          hint={`Default: ${new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
          }).format(0.1)}`}
        />
      </div>

      <p className="mt-4 text-sm leading-snug text-muted">
        Ripartizione costi fissi:{' '}
        <span className="text-ink">
          {settings.allocationMode === 'proportional'
            ? 'proporzionale al costo'
            : 'uguale per pezzo'}
        </span>
        . Puoi cambiarla nelle impostazioni.
      </p>
    </>
  )
}
