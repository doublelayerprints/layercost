import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAuthStore } from '@/state/auth-store'
import { useSyncStore, type SyncStatus } from '@/state/sync-store'
import { cn } from '@/lib/cn'
import { syncStatusKeys } from './messages'

const dotTones: Record<SyncStatus, string> = {
  disabled: 'bg-muted',
  idle: 'bg-muted',
  connecting: 'bg-data',
  firstLogin: 'bg-data',
  syncing: 'bg-data',
  synced: 'bg-positive',
  pending: 'bg-warning',
  offline: 'bg-warning',
  conflict: 'bg-data',
  error: 'bg-negative',
}

/** Discrete header/sidebar indicator; the label carries the meaning, not the colour. */
export function SyncIndicator({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n()
  const authStatus = useAuthStore((state) => state.status)
  const status = useSyncStore((state) => state.status)

  if (!isCloudConfigured()) return null
  if (authStatus !== 'authenticated' && authStatus !== 'expired') return null
  if (status === 'idle' || status === 'disabled') return null

  const label = t(syncStatusKeys[status])

  return (
    <Link
      to="/settings"
      aria-label={t('sync.indicatorAria', { status: label })}
      className={cn(
        'inline-flex items-center gap-2 rounded-control text-xs text-muted transition-feedback hover:bg-raised hover:text-ink',
        mobile ? 'px-3 py-2' : 'px-1 py-1',
      )}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', dotTones[status])} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  )
}
