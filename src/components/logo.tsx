import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { cn } from '@/lib/cn'

export function Logo({
  compact = false,
  tagline = true,
  to = '/calculator',
  className,
  onClick,
}: {
  compact?: boolean
  tagline?: boolean
  to?: string
  className?: string
  onClick?: () => void
}) {
  const { t } = useI18n()
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn('flex items-center gap-2.5 rounded-control', className)}
      aria-label={compact ? t('app.name') : undefined}
    >
      <svg
        width="24"
        height="24"
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
          <span className="block text-base font-semibold tracking-title text-ink">LayerCost</span>
          {tagline ? <span className="block text-xs text-muted">{t('logo.tagline')}</span> : null}
        </span>
      ) : null}
    </Link>
  )
}
