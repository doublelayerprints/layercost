import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFormat } from '@/app/use-format'
import { useI18n } from '@/app/i18n-context'
import { Field, Input } from '@/components/ui'
import { landingButtonClassName } from './button'
import { displayCents, parseLocaleNumber } from '@/lib/format'
import { cn } from '@/lib/cn'
import {
  PREVIEW_DEFAULTS,
  PREVIEW_MAX_GRAMS,
  PREVIEW_MAX_HOURS,
  calculatePreview,
} from './preview'

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, value))
}

export function LivePriceDemo() {
  const { t } = useI18n()
  const format = useFormat()
  const gramsId = useId()
  const hoursId = useId()
  const [grams, setGrams] = useState(String(PREVIEW_DEFAULTS.grams))
  const [hours, setHours] = useState(String(PREVIEW_DEFAULTS.hours))

  const gramsValue = clamp(parseLocaleNumber(grams), PREVIEW_MAX_GRAMS)
  const hoursValue = clamp(parseLocaleNumber(hours), PREVIEW_MAX_HOURS)
  const result = useMemo(() => calculatePreview(gramsValue, hoursValue), [gramsValue, hoursValue])

  const priceCents = result?.netPriceCents ?? 0
  const costCents = result ? displayCents(result.totalCost) : 0
  const total = Math.max(priceCents, 1)
  const costPercent = Math.min(100, Math.max(0, (costCents / total) * 100))
  const gainPercent = Math.max(0, 100 - costPercent)

  return (
    <div
      data-ui
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
      aria-labelledby={`${gramsId}-demo-title`}
    >
      <h3 id={`${gramsId}-demo-title`} className="landing-h3 text-ink">
        {t('landing.demo.title')}
      </h3>
      <p className="mt-2 text-base leading-relaxed text-muted">{t('landing.demo.body')}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t('landing.demo.grams')} htmlFor={gramsId} hint={t('landing.demo.gramsHint')}>
          <Input
            id={gramsId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={grams}
            onChange={(event) => setGrams(event.target.value)}
          />
        </Field>
        <Field label={t('landing.demo.hours')} htmlFor={hoursId} hint={t('landing.demo.hoursHint')}>
          <Input
            id={hoursId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-card bg-ground p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base text-muted">{t('landing.demo.price')}</span>
          <span className="font-serif text-price-sm tabular-nums text-ink">
            {result ? format.cents(result.netPriceCents) : '—'}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <span className="text-base text-muted">{t('landing.demo.cost')}</span>
          <span className="font-serif text-2xl tabular-nums text-ink">
            {result ? format.currency(result.totalCost) : '—'}
          </span>
        </div>

        <div
          role="img"
          aria-label={t('landing.demo.compositionAria')}
          className="mt-4 flex h-2 overflow-hidden rounded-full bg-raised"
        >
          <span
            className="h-full bg-control"
            style={{ width: `${result ? costPercent : 0}%` }}
          />
          <span
            className="h-full bg-data"
            style={{ width: `${result ? gainPercent : 0}%` }}
          />
        </div>

        <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-control" aria-hidden="true" />
            <dt className="text-ink">{t('landing.demo.cost')}</dt>
            <dd className="tabular-nums text-ink">
              {result ? format.currency(result.totalCost) : '—'}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-data" aria-hidden="true" />
            <dt className="text-ink">{t('landing.demo.gain')}</dt>
            <dd
              className={cn(
                'tabular-nums',
                result && result.gainMicro < 0 ? 'text-warning' : 'text-ink',
              )}
            >
              {result ? format.currency(result.gainMicro) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {!result ? (
        <p role="status" className="mt-3 text-[13px] font-medium text-warning">
          {t('landing.demo.invalid')}
        </p>
      ) : null}

      <p className="mt-3 text-[13px] leading-relaxed text-muted">{t('landing.demo.note')}</p>

      <Link
        to="/calculator"
        className={landingButtonClassName({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
      >
        {t('landing.demo.open')}
      </Link>
    </div>
  )
}
