import { allocateLargestRemainder } from '@/domain/money'
import { displayCostBands, type CostBand } from '@/lib/cost-bands'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'

type StackTone = 'data' | 'ink' | 'muted' | 'control'

const TONE_CLASSES: Record<StackTone, string> = {
  data: 'bg-data',
  ink: 'bg-ink',
  muted: 'bg-muted',
  control: 'bg-control',
}

const FALLBACK_TONES: StackTone[] = ['ink', 'muted', 'control']

export function CostStack({ bands, className }: { bands: CostBand[]; className?: string }) {
  const groups = displayCostBands(bands)
  const total = groups.reduce((sum, band) => sum + band.value, 0)
  if (total <= 0) return null

  const largestKey = groups.reduce((largest, band) =>
    band.value > largest.value ? band : largest,
  ).key
  const widths = allocateLargestRemainder(
    1000,
    groups.map((band) => band.value),
  )
  // The legend amounts are allocated in cents so their sum matches the displayed cost.
  const legendCents = allocateLargestRemainder(
    Math.round(total / 10_000),
    groups.map((band) => band.value),
  )

  let fallbackIndex = 0
  const tones = new Map<string, StackTone>()
  for (const band of groups) {
    if (band.key === largestKey) {
      tones.set(band.key, 'data')
    } else if (band.key === 'other') {
      tones.set(band.key, 'control')
    } else {
      tones.set(band.key, FALLBACK_TONES[fallbackIndex % FALLBACK_TONES.length] ?? 'control')
      fallbackIndex += 1
    }
  }

  const label = groups
    .map((band, index) => `${band.label} ${formatCents(legendCents[index] ?? 0)}`)
    .join(', ')

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden bg-surface"
        role="img"
        aria-label={`Composizione del costo: ${label}`}
      >
        {groups.map((band, index) => {
          const tone = tones.get(band.key) ?? 'control'
          return (
            <span
              key={band.key}
              data-stack-tone={tone}
              className={cn('h-full', TONE_CLASSES[tone])}
              style={{ flexBasis: 0, flexGrow: widths[index] ?? 0 }}
            />
          )
        })}
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm">
        {groups.map((band, index) => {
          const tone = tones.get(band.key) ?? 'control'
          return (
            <div key={band.key} className="flex items-center justify-between gap-3">
              <dt className="flex min-w-0 items-center gap-2 text-muted">
                <span
                  data-stack-tone={tone}
                  className={cn('h-2 w-2 shrink-0 rounded-[1px] print:border print:border-ink', TONE_CLASSES[tone])}
                  aria-hidden="true"
                />
                <span className="truncate">{band.label}</span>
              </dt>
              <dd className="shrink-0 tabular-nums text-ink">
                {formatCents(legendCents[index] ?? 0)}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
