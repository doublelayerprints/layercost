import { useId, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Field, Input, Modal, Select } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import { workspaceErrorKeys } from './messages'

/**
 * Compact workspace switcher for the sidebar and the mobile menu. It only
 * appears in cloud mode: guest mode keeps the single local archive.
 */
export function WorkspaceSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { t } = useI18n()
  const selectId = useId()
  const authStatus = useAuthStore((state) => state.status)
  const mode = useAppStore((state) => state.mode)
  const status = useWorkspaceStore((state) => state.status)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeId = useWorkspaceStore((state) => state.activeId)
  const error = useWorkspaceStore((state) => state.error)
  const activate = useWorkspaceStore((state) => state.activate)
  const load = useWorkspaceStore((state) => state.load)
  const create = useWorkspaceStore((state) => state.create)
  const redeem = useWorkspaceStore((state) => state.redeem)
  const clearError = useWorkspaceStore((state) => state.clearError)

  const [createOpen, setCreateOpen] = useState(false)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isCloudConfigured() || authStatus !== 'authenticated' || mode !== 'cloud') return null

  const openCreate = () => {
    clearError()
    setName('')
    setCreateOpen(true)
  }

  const openRedeem = () => {
    clearError()
    setCode('')
    setRedeemOpen(true)
  }

  const submitCreate = async () => {
    if (name.trim() === '' || busy) return
    setBusy(true)
    const id = await create(name)
    setBusy(false)
    if (id) {
      setCreateOpen(false)
      setName('')
    }
  }

  const submitRedeem = async () => {
    if (code.trim() === '' || busy) return
    setBusy(true)
    const id = await redeem(code)
    setBusy(false)
    if (id) {
      setRedeemOpen(false)
      setCode('')
    }
  }

  const errorMessage = error ? t(workspaceErrorKeys[error]) : undefined

  return (
    <div className={mobile ? 'border-t border-line pt-3' : 'mt-4 border-y border-line px-1 py-3'}>
      <label
        htmlFor={selectId}
        className="block pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
      >
        {t('workspace.active')}
      </label>

      {status === 'loading' && workspaces.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted">{t('workspace.loading')}</p>
      ) : status === 'error' && workspaces.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-negative">{errorMessage ?? t('workspace.error.unknown')}</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            {t('workspace.retry')}
          </Button>
        </div>
      ) : (
        <>
          <Select
            id={selectId}
            value={activeId ?? ''}
            onChange={(event) => activate(event.target.value)}
            disabled={workspaces.length < 2}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
                {workspace.role === 'editor' ? ` · ${t('workspace.roleEditor')}` : ''}
              </option>
            ))}
          </Select>
          <div className={mobile ? 'mt-2 flex flex-wrap gap-2' : 'mt-2 grid grid-cols-2 gap-1.5'}>
            <Button variant="secondary" size="sm" onClick={openCreate}>
              {t('workspace.new')}
            </Button>
            <Button variant="ghost" size="sm" onClick={openRedeem}>
              {t('workspace.redeem')}
            </Button>
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('workspace.newTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void submitCreate()}
              disabled={busy || name.trim() === ''}
            >
              {t('workspace.create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('workspace.newDescription')}</p>
          <Field label={t('workspace.name')} htmlFor={`${selectId}-name`}>
            <Input
              id={`${selectId}-name`}
              value={name}
              maxLength={80}
              placeholder={t('workspace.namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          {errorMessage ? (
            <Alert tone="danger" title={t('common.error')}>
              {errorMessage}
            </Alert>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        title={t('workspace.redeemTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRedeemOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void submitRedeem()}
              disabled={busy || code.trim() === ''}
            >
              {t('workspace.redeemAction')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('workspace.redeemDescription')}</p>
          <Field label={t('workspace.redeemCode')} htmlFor={`${selectId}-code`}>
            <Input
              id={`${selectId}-code`}
              value={code}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          {errorMessage ? (
            <Alert tone="danger" title={t('common.error')}>
              {errorMessage}
            </Alert>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
