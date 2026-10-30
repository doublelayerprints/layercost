import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { cn } from '@/lib/cn'
import { useSyncStore } from '@/state/sync-store'
import { syncStatusKeys, syncStatusTones } from './messages'

/**
 * Square sync indicator for the top bar control group. It keeps the original
 * coloured dot; the tooltip and aria-label carry the extended status.
 */
export function SyncStatusButton() {
  const { t } = useI18n()
  const status = useSyncStore((state) => state.status)

  if (status === 'idle' || status === 'disabled') return null

  const label = t(syncStatusKeys[status])

  return (
    <Link
      to="/settings"
      aria-label={t('sync.indicatorAria', { status: label })}
      title={label}
      className="grid size-8 place-items-center rounded-[4px] transition-feedback hover:bg-surface"
    >
      <span
        className={cn('size-2 rounded-full', syncStatusTones[status])}
        aria-hidden="true"
      />
    </Link>
  )
}
