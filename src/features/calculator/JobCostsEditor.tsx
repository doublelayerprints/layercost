import type { CostConfig, JobCosts, QuoteResult } from '@/domain/types'
import { SectionHeader } from '@/components/ui'
import { DurationField, TextareaField } from '@/components/number-fields'
import { formatCurrency } from '@/lib/format'

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
  const jobExtras = config.extras.filter(
    (extra) => extra.unit === 'perJob' && (!extra.archived || job.extraIds.includes(extra.id)),
  )

  return (
    <>
      <SectionHeader
        id="section-lavoro"
        title="Costi di lavoro"
        description="Setup, progettazione ed extra applicati una volta per preventivo."
        actions={
          result ? (
            <p className="text-sm text-muted">
              Manodopera <span className="tabular-nums text-ink">{formatCurrency(result.jobLabor)}</span>
              {' · '}
              Extra <span className="tabular-nums text-ink">{formatCurrency(result.jobExtras)}</span>
            </p>
          ) : null
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DurationField
          label="Setup"
          valueSeconds={job.setupSeconds}
          onChangeSeconds={(value) => onChange({ setupSeconds: value as JobCosts['setupSeconds'] })}
        />
        <DurationField
          label="Progettazione"
          valueSeconds={job.designSeconds}
          onChangeSeconds={(value) =>
            onChange({ designSeconds: value as JobCosts['designSeconds'] })
          }
        />
      </div>

      {jobExtras.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">Extra per lavoro</h3>
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
                  {formatCurrency(extra.amount)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <TextareaField
          label="Note del preventivo"
          value={job.notes ?? ''}
          onChange={(value) => onChange({ notes: value || undefined })}
          placeholder="Materiale, colore, consegna, condizioni…"
        />
      </div>
    </>
  )
}
