import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { cn } from '@/lib/cn'
import { useSyncStore, type SyncStatus } from '@/state/sync-store'
import { syncStatusKeys } from './messages'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.5 6.5A5 5 0 1 0 13 9" />
      <path d="M12.5 3v3.5H9" />
    </svg>
  )
}

function CloudOffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 11.5A3 3 0 0 1 5 5.6a4 4 0 0 1 6.9 1.5A2.5 2.5 0 0 1 12 12" />
      <path d="m2.5 2.5 11 11" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.5 14 13H2L8 2.5Z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.5v3.5M8 5.2v.1" />
    </svg>
  )
}

const tone: Record<SyncStatus, string> = {
  disabled: 'text-muted',
  idle: 'text-muted',
  connecting: 'text-muted',
  firstLogin: 'text-warning',
  syncing: 'text-muted',
  synced: 'text-positive',
  pending: 'text-warning',
  offline: 'text-warning',
  conflict: 'text-data',
  error: 'text-negative',
}

function StatusIcon({ status, className }: { status: SyncStatus; className: string }) {
  switch (status) {
    case 'synced':
      return <CheckIcon className={className} />
    case 'connecting':
    case 'syncing':
      return <RefreshIcon className={className} />
    case 'pending':
      return <ClockIcon className={className} />
    case 'offline':
      return <CloudOffIcon className={className} />
    case 'conflict':
    case 'error':
      return <AlertIcon className={className} />
    case 'firstLogin':
      return <InfoIcon className={className} />
    default:
      return null
  }
}

/**
 * Square sync indicator for the top bar control group. The icon shape and the
 * tooltip carry the status; the colour is only an accent.
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
      <StatusIcon status={status} className={cn('h-4 w-4', tone[status])} />
    </Link>
  )
}
