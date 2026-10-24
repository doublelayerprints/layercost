import { allocateLargestRemainder } from '@/domain/money'
import { displayCostBands, type CostBand } from '@/lib/cost-bands'
import { cn } from '@/lib/cn'
import { formatCurrency } from '@/lib/format'

const FALLBACK_TONES = ['bg-ink', 'bg-muted', 'bg-control']

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

  let fallbackIndex = 0
  const tones = new Map<string, string>()
  for (const band of groups) {
    if (band.key === largestKey) {
      tones.set(band.key, 'bg-data')
    } else if (band.key === 'other') {
      tones.set(band.key, 'bg-control')
    } else {
      tones.set(band.key, FALLBACK_TONES[fallbackIndex % FALLBACK_TONES.length] ?? 'bg-control')
      fallbackIndex += 1
    }
  }

  const label = groups.map((band) => `${band.label} ${formatCurrency(band.value)}`).join(', ')

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden bg-surface"
        role="img"
        aria-label={`Composizione del costo: ${label}`}
      >
        {groups.map((band, index) => (
          <span
            key={band.key}
            className={cn('h-full', tones.get(band.key))}
            style={{ flexBasis: 0, flexGrow: widths[index] ?? 0 }}
          />
        ))}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {groups.map((band) => (
          <div key={band.key} className="flex items-center justify-between gap-2">
            <dt className="flex min-w-0 items-center gap-1.5 text-muted">
              <span
                className={cn('h-2 w-2 shrink-0 rounded-[1px]', tones.get(band.key))}
                aria-hidden="true"
              />
              <span className="truncate">{band.label}</span>
            </dt>
            <dd className="shrink-0 tabular-nums text-ink">{formatCurrency(band.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
