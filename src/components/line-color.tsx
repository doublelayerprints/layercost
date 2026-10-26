import { cn } from '@/lib/cn'
import { isHexColor } from '@/lib/color'

/** Small, non-interactive filament colour marker used in cards, tables and print. */
export function LineColorSwatch({ color, className }: { color?: string; className?: string }) {
  if (!isHexColor(color)) return null
  return (
    <span
      aria-hidden="true"
      data-line-color={color}
      title={color}
      className={cn('inline-block shrink-0 rounded-[4px] border border-control', className)}
      style={{ backgroundColor: color }}
    />
  )
}

/**
 * Native colour picker hidden behind a rounded swatch. The input stays
 * keyboard reachable and the wrapper shows the focus ring through focus-within.
 */
export function LineColorField({
  color,
  label,
  clearLabel,
  onChange,
  className,
}: {
  color?: string
  label: string
  clearLabel: string
  onChange: (color: string | undefined) => void
  className?: string
}) {
  const validColor = isHexColor(color) ? color : undefined

  return (
    <div className={cn('flex shrink-0 items-center gap-0.5', className)}>
      <label
        className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-control transition-feedback focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-data sm:h-9 sm:w-9"
        title={label}
      >
        <span
          aria-hidden="true"
          data-line-color={validColor}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-[6px] border sm:h-6 sm:w-6',
            validColor ? 'border-control' : 'border-dashed border-control bg-surface',
          )}
          style={validColor ? { backgroundColor: validColor } : undefined}
        >
          {validColor ? null : <span className="text-sm leading-none text-muted">+</span>}
        </span>
        <input
          type="color"
          value={validColor ?? '#000000'}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          aria-label={label}
          className="sr-only"
        />
      </label>
      {validColor ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={clearLabel}
          title={clearLabel}
          className="inline-flex h-11 w-11 items-center justify-center rounded-control text-sm text-muted transition-feedback hover:bg-surface hover:text-ink sm:h-9 sm:w-9"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  )
}
