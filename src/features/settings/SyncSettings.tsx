import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Badge, Button, Modal } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'

export function SyncSettings() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const initialize = useAuthStore((state) => state.initialize)
  const signOut = useAuthStore((state) => state.signOut)
  const flushPersistence = useAppStore((state) => state.flushPersistence)
  const pendingWrites = useAppStore((state) => state.pendingWrites)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!isCloudConfigured()) return null

  const pending = pendingWrites()

  const handleLogout = async () => {
    setBusy(true)
    await flushPersistence()
    await signOut()
    setBusy(false)
    setLogoutOpen(false)
  }

  const requestLogout = () => {
    if (pending > 0) {
      setLogoutOpen(true)
      return
    }
    void handleLogout()
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
          {status === 'loading' ? (
            <p role="status" className="text-sm text-muted">
              {t('sync.status.loading')}
            </p>
          ) : null}

          {status === 'expired' ? (
            <Alert tone="warning" title={t('auth.expired.title')}>
              <p>{t('auth.expired.body')}</p>
              <Button className="mt-3" variant="secondary" onClick={() => navigate('/login')}>
                {t('auth.loginAction')}
              </Button>
            </Alert>
          ) : null}

          {status === 'error' ? (
            <Alert tone="danger" title={t('sync.status.error')}>
              <p>{error ? t(`auth.error.${error}`) : t('auth.error.unknown')}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void initialize()}>
                {t('sync.retry')}
              </Button>
            </Alert>
          ) : null}

          {status === 'idle' || status === 'unconfigured' ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{t('sync.status.idle')}</Badge>
              </div>
              <Button onClick={() => navigate('/login')}>{t('sync.login')}</Button>
            </>
          ) : null}

          {status === 'authenticated' && user ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="success">{t('sync.status.authenticated')}</Badge>
              </div>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted">{t('sync.account')}</dt>
                  <dd className="mt-0.5 break-all text-ink">{user.email ?? user.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted">{t('sync.lastSync')}</dt>
                  <dd className="mt-0.5 text-ink">{t('sync.never')}</dd>
                </div>
              </dl>
              {pending > 0 ? (
                <p className="text-xs font-medium text-warning">
                  {t('sync.pending', { count: pending })}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-muted">{t('sync.comingSoon')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" disabled title={t('sync.syncNowHint')}>
                  {t('sync.syncNow')}
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
        title={t('sync.logoutTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLogoutOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void handleLogout()}>
              {t('sync.logoutConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('sync.logoutDescription')}</p>
        {pending > 0 ? (
          <p className="mt-3 text-xs font-medium text-warning">
            {t('sync.pending', { count: pending })}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
