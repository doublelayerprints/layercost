import type { CostConfig, JobCosts, QuoteResult } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { SectionHeader } from '@/components/ui'
import { DurationField, TextareaField } from '@/components/number-fields'

export function JobCostsEditor({
  job,
  config,
  result,
  onChange,
  onToggleExtra,
}: {
  job: JobCosts
  config: CostConfig
  result?: QuoteResult
  onChange: (patch: Partial<JobCosts>) => void
  onToggleExtra: (extraId: string) => void
}) {
  const { t } = useI18n()
  const format = useFormat()
  const jobExtras = config.extras.filter(
    (extra) => extra.unit === 'perJob' && (!extra.archived || job.extraIds.includes(extra.id)),
  )

  return (
    <>
      <SectionHeader
        id="section-lavoro"
        title={t('job.title')}
        description={t('job.description')}
        actions={
          result ? (
            <p className="text-sm text-muted">
              {t('job.labor')}{' '}
              <span className="tabular-nums text-ink">{format.currency(result.jobLabor)}</span>
              {' · '}
              {t('job.extras')}{' '}
              <span className="tabular-nums text-ink">{format.currency(result.jobExtras)}</span>
            </p>
          ) : null
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DurationField
          label={t('job.setup')}
          valueSeconds={job.setupSeconds}
          onChangeSeconds={(value) => onChange({ setupSeconds: value as JobCosts['setupSeconds'] })}
        />
        <DurationField
          label={t('job.design')}
          valueSeconds={job.designSeconds}
          onChangeSeconds={(value) =>
            onChange({ designSeconds: value as JobCosts['designSeconds'] })
          }
        />
      </div>

      {jobExtras.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">{t('job.extrasHeading')}</h3>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2.5">
            {jobExtras.map((extra) => (
              <label key={extra.id} className="flex min-h-6 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={job.extraIds.includes(extra.id)}
                  onChange={() => onToggleExtra(extra.id)}
                  className="h-4 w-4 rounded border-control accent-data"
                />
                <span>{extra.name}</span>
                <span className="text-sm tabular-nums text-muted">
                  {format.currency(extra.amount)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <TextareaField
          label={t('job.notes')}
          value={job.notes ?? ''}
          onChange={(value) => onChange({ notes: value || undefined })}
          placeholder={t('job.notesPlaceholder')}
        />
      </div>
    </>
  )
}
