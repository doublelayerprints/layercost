import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Modal } from '@/components/ui'
import { useSyncStore } from '@/state/sync-store'
import { syncErrorKeys } from './messages'

/** First connection: choose what happens when the cloud and the browser differ. */
export function FirstLoginDialog() {
  const { t } = useI18n()
  const firstLogin = useSyncStore((state) => state.firstLogin)
  const status = useSyncStore((state) => state.status)
  const error = useSyncStore((state) => state.error)
  const resolve = useSyncStore((state) => state.resolveFirstLogin)
  const busy = status === 'syncing'

  if (!firstLogin) return null
  const isImport = firstLogin.kind === 'importLocal'

  return (
    <Modal
      open
      onClose={() => {
        if (!busy) void resolve('cancel')
      }}
      title={isImport ? t('sync.firstLogin.importTitle') : t('sync.firstLogin.cloudWinsTitle')}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void resolve('cancel')}
          >
            {t('sync.firstLogin.cancel')}
          </Button>
          <Button
            disabled={busy}
            onClick={() => void resolve(isImport ? 'importLocal' : 'cloudWins')}
          >
            {busy
              ? t('sync.status.syncing')
              : isImport
                ? t('sync.firstLogin.importAction')
                : t('sync.firstLogin.cloudWinsAction')}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-muted">
        {error ? (
          <Alert tone="danger" title={t('sync.status.error')}>
            {t(syncErrorKeys[error])}
          </Alert>
        ) : null}
        <p>{isImport ? t('sync.firstLogin.importBody') : t('sync.firstLogin.cloudWinsBody')}</p>
        <p className="text-xs leading-relaxed">{t('sync.firstLogin.backupHint')}</p>
      </div>
    </Modal>
  )
}
