import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Button, Modal } from '@/components/ui'
import { useSyncStore } from '@/state/sync-store'
import { syncConflictReasonKeys, syncEntityKeys } from './messages'

/** Explicit conflict resolution: no choice is made silently. */
export function SyncConflictDialog() {
  const { t } = useI18n()
  const format = useFormat()
  const conflict = useSyncStore((state) => state.conflict)
  const open = useSyncStore((state) => state.conflictOpen)
  const resolve = useSyncStore((state) => state.resolveConflict)
  const close = useSyncStore((state) => state.closeConflict)

  if (!conflict || !open) return null
  const isQuote = conflict.operation.entity === 'quote'
  const isDelete = conflict.operation.kind === 'delete'
  const entity = t(syncEntityKeys[conflict.operation.entity])

  return (
    <Modal
      open
      onClose={close}
      title={t('sync.conflict.title')}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('sync.conflict.close')}
          </Button>
          <Button variant="secondary" onClick={() => void resolve('useRemote')}>
            {t('sync.conflict.useRemote')}
          </Button>
          {isDelete ? (
            <Button onClick={() => void resolve('keepLocal')}>
              {t('sync.conflict.keepDelete')}
            </Button>
          ) : isQuote ? (
            <Button onClick={() => void resolve('duplicateLocal')}>
              {t('sync.conflict.duplicateLocal')}
            </Button>
          ) : (
            <Button onClick={() => void resolve('keepLocal')}>
              {t('sync.conflict.keepLocal')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-2 text-sm text-muted">
        <p>{t('sync.conflict.description')}</p>
        <p>{t(syncConflictReasonKeys[conflict.reason])}</p>
        <p className="text-xs">
          {t('sync.conflict.entity', { entity })}
          {conflict.label ? ` · ${t('sync.conflict.name', { name: conflict.label })}` : null}
        </p>
        {conflict.remoteUpdatedAt ? (
          <p className="text-xs">
            {t('sync.conflict.remoteUpdated', {
              date: format.dateTime(conflict.remoteUpdatedAt),
            })}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
