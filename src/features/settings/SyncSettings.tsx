import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Alert, Badge, Button, Modal } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { useSyncStore, type SyncStatus } from '@/state/sync-store'
import { syncErrorKeys, syncStatusKeys } from '@/features/sync/messages'

const statusTones: Record<
  SyncStatus,
  'neutral' | 'success' | 'warning' | 'info' | 'danger'
> = {
  disabled: 'neutral',
  idle: 'neutral',
  connecting: 'info',
  firstLogin: 'info',
  syncing: 'info',
  synced: 'success',
  pending: 'warning',
  offline: 'warning',
  conflict: 'danger',
  error: 'danger',
}

export function SyncSettings() {
  const { t } = useI18n()
  const format = useFormat()
  const navigate = useNavigate()
  const authStatus = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const authError = useAuthStore((state) => state.error)
  const initialize = useAuthStore((state) => state.initialize)
  const signOut = useAuthStore((state) => state.signOut)
  const syncStatus = useSyncStore((state) => state.status)
  const syncError = useSyncStore((state) => state.error)
  const pending = useSyncStore((state) => state.pending)
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt)
  const conflict = useSyncStore((state) => state.conflict)
  const connect = useSyncStore((state) => state.connect)
  const disconnect = useSyncStore((state) => state.disconnect)
  const syncNow = useSyncStore((state) => state.syncNow)
  const openConflict = useSyncStore((state) => state.openConflict)
  const exportData = useAppStore((state) => state.exportData)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!isCloudConfigured()) return null

  const lastSync = lastSyncedAt ? format.dateTime(lastSyncedAt) : t('sync.never')
  const syncing = syncStatus === 'syncing' || syncStatus === 'connecting'
  const manualSyncDisabled = syncing || syncStatus === 'firstLogin' || conflict !== undefined
  const needsLogoutConfirmation = pending > 0 || conflict !== undefined

  const handleLogout = async () => {
    setBusy(true)
    try {
      await disconnect()
      await signOut()
      setLogoutOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const requestLogout = () => {
    if (needsLogoutConfirmation) {
      setLogoutOpen(true)
      return
    }
    void handleLogout()
  }

  const retrySync = async () => {
    await syncNow()
    if (!useSyncStore.getState().workspaceId) await connect()
  }

  return (
    <>
      <section
        className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
        aria-labelledby="settings-sync"
      >
        <div>
          <h2 id="settings-sync" className="text-base font-semibold text-ink">
            {t('sync.title')}
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted">{t('sync.description')}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">{t('sync.localOnly')}</p>
        </div>

        <div className="space-y-4">
          {authStatus === 'loading' ? (
            <p role="status" className="text-sm text-muted">
              {t('sync.status.loading')}
            </p>
          ) : null}

          {authStatus === 'expired' ? (
            <Alert tone="warning" title={t('auth.expired.title')}>
              <p>{t('auth.expired.body')}</p>
              <Button className="mt-3" variant="secondary" onClick={() => navigate('/login')}>
                {t('auth.loginAction')}
              </Button>
            </Alert>
          ) : null}

          {authStatus === 'error' ? (
            <Alert tone="danger" title={t('sync.status.error')}>
              <p>{authError ? t(`auth.error.${authError}`) : t('auth.error.unknown')}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void initialize()}>
                {t('sync.retry')}
              </Button>
            </Alert>
          ) : null}

          {authStatus === 'idle' || authStatus === 'unconfigured' ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{t('sync.status.idle')}</Badge>
              </div>
              <Button onClick={() => navigate('/login')}>{t('sync.login')}</Button>
            </>
          ) : null}

          {authStatus === 'authenticated' && user ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTones[syncStatus]}>{t(syncStatusKeys[syncStatus])}</Badge>
                {pending > 0 ? (
                  <span className="text-xs font-medium text-warning">
                    {t('sync.pending', { count: pending })}
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted">{t('sync.account')}</dt>
                  <dd className="mt-0.5 break-all text-ink">{user.email ?? user.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">{t('sync.lastSync')}</dt>
                  <dd className="mt-0.5 text-ink">{lastSync}</dd>
                </div>
              </dl>

              {syncStatus === 'synced' ? (
                <p className="text-xs leading-relaxed text-muted">{t('sync.syncedHint')}</p>
              ) : null}
              {syncStatus === 'pending' ? (
                <p className="text-xs leading-relaxed text-muted">{t('sync.pendingHint')}</p>
              ) : null}
              {syncStatus === 'offline' && syncError !== 'auth' ? (
                <p className="text-xs leading-relaxed text-muted">{t('sync.offlineHint')}</p>
              ) : null}

              {syncStatus === 'offline' && syncError === 'auth' ? (
                <Alert tone="warning" title={t('auth.expired.title')}>
                  <p>{t('sync.error.auth')}</p>
                  <Button className="mt-3" variant="secondary" onClick={() => navigate('/login')}>
                    {t('auth.loginAction')}
                  </Button>
                </Alert>
              ) : null}

              {syncStatus === 'error' ? (
                <Alert tone="danger" title={t('sync.status.error')}>
                  <p>{t(syncErrorKeys[syncError ?? 'unknown'])}</p>
                  <Button className="mt-3" variant="secondary" onClick={() => void retrySync()}>
                    {t('sync.retry')}
                  </Button>
                </Alert>
              ) : null}

              {conflict ? (
                <Alert tone="danger" title={t('sync.status.conflict')}>
                  <p>{t('sync.conflict.description')}</p>
                  <Button className="mt-3" variant="secondary" onClick={openConflict}>
                    {t('sync.actions.resolveConflict')}
                  </Button>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={manualSyncDisabled}
                  onClick={() => void retrySync()}
                >
                  {t('sync.syncNow')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void exportData()
                  }}
                >
                  {t('sync.actions.exportBackup')}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={requestLogout}>
                  {t('sync.logout')}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={
          pending > 0 ? t('sync.logoutPendingTitle') : t('sync.logoutTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setLogoutOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void handleLogout()}>
              {pending > 0 ? t('sync.logoutAnyway') : t('sync.logoutConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {pending > 0
            ? t('sync.logoutPendingDescription')
            : t('sync.logoutDescription')}
        </p>
        {pending > 0 ? (
          <p className="mt-3 text-xs font-medium text-warning">
            {t('sync.pending', { count: pending })}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
