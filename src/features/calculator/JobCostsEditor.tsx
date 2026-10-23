import type { CostConfig, JobCosts, QuoteResult } from '@/domain/types'
import { Card } from '@/components/ui'
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
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Costi di lavoro</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Setup, progettazione ed extra applicati una volta per preventivo.
          </p>
        </div>
        {result ? (
          <p className="text-xs text-slate-500">
            Manodopera:{' '}
            <strong className="text-slate-700">{formatCurrency(result.jobLabor)}</strong>
            {' · '}
            Extra: <strong className="text-slate-700">{formatCurrency(result.jobExtras)}</strong>
          </p>
        ) : null}
      </div>

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
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-600">Extra per lavoro</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {jobExtras.map((extra) => (
              <label key={extra.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={job.extraIds.includes(extra.id)}
                  onChange={() => onToggleExtra(extra.id)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>{extra.name}</span>
                <span className="text-xs text-slate-400">{formatCurrency(extra.amount)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <TextareaField
          label="Note del preventivo"
          value={job.notes ?? ''}
          onChange={(value) => onChange({ notes: value || undefined })}
          placeholder="Materiale, colore, consegna, condizioni…"
        />
      </div>
    </Card>
  )
}
