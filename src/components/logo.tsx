import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      className={cn('flex items-center gap-3 rounded-control', className)}
      aria-label={compact ? 'LayerCost' : undefined}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0 text-ink"
        fill="currentColor"
      >
        <rect x="2" y="5" width="20" height="6" rx="2" />
        <rect x="6" y="13" width="20" height="6" rx="2" />
        <rect x="10" y="21" width="20" height="6" rx="2" />
      </svg>
      {!compact ? (
        <span>
          <span className="block text-sm font-semibold tracking-title text-ink">LayerCost</span>
          <span className="block text-xs text-muted">Costo e prezzo delle stampe 3D</span>
        </span>
      ) : null}
    </Link>
  )
}
