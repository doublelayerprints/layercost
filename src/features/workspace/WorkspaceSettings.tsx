import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Alert, Badge, Button, Field, Input, Modal } from '@/components/ui'
import { SelectField } from '@/components/number-fields'
import { isCloudConfigured } from '@/data/cloud/client'
import type { WorkspaceRole, WorkspaceSummary } from '@/data/cloud/gateway'
import { copyText } from '@/lib/share'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import { workspaceErrorKeys } from './messages'

function formatDate(locale: 'it' | 'en', iso: string): string {
  return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
    dateStyle: 'medium',
  }).format(new Date(iso))
}

/**
 * Workspace administration inside Settings: name, members, invites and leave.
 * Only owners can change the name, create invites and revoke them.
 */
export function WorkspaceSettings() {
  const mode = useAppStore((state) => state.mode)
  const authStatus = useAuthStore((state) => state.status)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeId = useWorkspaceStore((state) => state.activeId)
  const active = workspaces.find((workspace) => workspace.id === activeId)

  if (!isCloudConfigured() || authStatus !== 'authenticated' || mode !== 'cloud' || !active) {
    return null
  }

  // Keyed by workspace: name, invite code and messages reset on a switch.
  return <WorkspaceSettingsSection key={active.id} workspace={active} />
}

function WorkspaceSettingsSection({ workspace }: { workspace: WorkspaceSummary }) {
  const { t, locale } = useI18n()
  const baseId = useId()
  const userId = useAuthStore((state) => state.user?.id)
  const members = useWorkspaceStore((state) => state.members)
  const invites = useWorkspaceStore((state) => state.invites)
  const detailsStatus = useWorkspaceStore((state) => state.detailsStatus)
  const detailsError = useWorkspaceStore((state) => state.detailsError)
  const loadDetails = useWorkspaceStore((state) => state.loadDetails)
  const rename = useWorkspaceStore((state) => state.rename)
  const createInvite = useWorkspaceStore((state) => state.createInvite)
  const revokeInvite = useWorkspaceStore((state) => state.revokeInvite)
  const leave = useWorkspaceStore((state) => state.leave)

  const isOwner = workspace.role === 'owner'
  const isLastOwner = isOwner && members.filter((member) => member.role === 'owner').length <= 1

  const [name, setName] = useState(workspace.name)
  const [saved, setSaved] = useState(false)
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('editor')
  const [inviteDays, setInviteDays] = useState('7')
  const [token, setToken] = useState<string>()
  const [copied, setCopied] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  const errorMessage = detailsError ? t(workspaceErrorKeys[detailsError]) : undefined
  const activeInvites = invites.filter((invite) => invite.revokedAt === undefined)

  const submitName = async () => {
    if (name.trim() === '' || name.trim() === workspace.name) return
    const ok = await rename(workspace.id, name)
    if (ok) setSaved(true)
  }

  const submitInvite = async () => {
    const created = await createInvite(inviteRole, Number(inviteDays))
    if (created) {
      setToken(created)
      setCopied(false)
    }
  }

  const copyToken = async () => {
    if (!token) return
    try {
      await copyText(token)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const confirmLeave = async () => {
    const ok = await leave(workspace.id)
    if (ok) setLeaveOpen(false)
  }

  return (
    <section
      className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
      aria-labelledby="settings-spazio"
    >
      <div>
        <h2 id="settings-spazio" className="text-base font-semibold text-ink">
          {t('workspace.title')}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted">{t('workspace.description')}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="text-sm text-ink">{workspace.name}</span>
          <Badge tone={isOwner ? 'info' : 'neutral'}>
            {isOwner ? t('workspace.roleOwner') : t('workspace.roleEditor')}
          </Badge>
        </p>
        {!isOwner ? <p className="mt-2 text-xs text-muted">{t('workspace.ownerOnly')}</p> : null}
      </div>

      <div className="space-y-8">
        {isOwner ? (
          <div>
            <Field label={t('workspace.name')} htmlFor={`${baseId}-name`}>
              <Input
                id={`${baseId}-name`}
                value={name}
                maxLength={80}
                onChange={(event) => {
                  setName(event.target.value)
                  setSaved(false)
                }}
              />
            </Field>
            <div className="mt-2 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => void submitName()}
                disabled={name.trim() === '' || name.trim() === workspace.name}
              >
                {t('workspace.rename')}
              </Button>
              {saved ? (
                <span role="status" className="text-xs text-positive">
                  {t('workspace.renameSuccess')}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-semibold text-ink">{t('workspace.members')}</h3>
          <p className="mt-0.5 text-xs text-muted">{t('workspace.membersDescription')}</p>
          {detailsStatus === 'loading' && members.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t('workspace.loading')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="text-sm text-ink">
                    {member.userId === userId
                      ? t('workspace.you')
                      : (member.email ?? t('workspace.member'))}
                    <span className="ml-2 text-xs text-muted">
                      {member.role === 'owner'
                        ? t('workspace.roleOwner')
                        : t('workspace.roleEditor')}
                    </span>
                  </span>
                  <span className="text-xs text-muted">
                    {t('workspace.memberSince', {
                      date: formatDate(locale, member.joinedAt),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isOwner ? (
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('workspace.invites')}</h3>
            <p className="mt-0.5 text-xs text-muted">{t('workspace.invitesDescription')}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <SelectField
                label={t('workspace.inviteRole')}
                value={inviteRole}
                onChange={(value: string) =>
                  setInviteRole(value === 'owner' ? 'owner' : 'editor')
                }
                options={[
                  { value: 'editor', label: t('workspace.roleEditor') },
                  { value: 'owner', label: t('workspace.roleOwner') },
                ]}
              />
              <SelectField
                label={t('workspace.inviteDays')}
                value={inviteDays}
                onChange={setInviteDays}
                options={[
                  { value: '1', label: '1' },
                  { value: '7', label: '7' },
                  { value: '14', label: '14' },
                  { value: '30', label: '30' },
                ]}
              />
              <Button variant="secondary" onClick={() => void submitInvite()}>
                {t('workspace.inviteCreate')}
              </Button>
            </div>

            {token ? (
              <div className="mt-3 space-y-2">
                <Alert tone="success" title={t('workspace.inviteCreated')}>
                  <code className="block break-all font-mono text-sm text-ink">{token}</code>
                </Alert>
                <Button variant="ghost" size="sm" onClick={() => void copyToken()}>
                  {copied ? t('workspace.inviteCopied') : t('workspace.inviteCopy')}
                </Button>
              </div>
            ) : null}

            {activeInvites.length === 0 ? (
              <p className="mt-3 text-xs text-muted">{t('workspace.invitesEmpty')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {activeInvites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="text-sm text-ink">
                      {invite.role === 'owner'
                        ? t('workspace.roleOwner')
                        : t('workspace.roleEditor')}
                      <span className="ml-2 text-xs text-muted">
                        {t('workspace.inviteExpires', {
                          date: formatDate(locale, invite.expiresAt),
                        })}
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        {t('workspace.inviteUsed', {
                          used: invite.usedCount,
                          max: invite.maxUses,
                        })}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void revokeInvite(invite.id)}
                    >
                      {t('workspace.inviteRevoke')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {errorMessage ? (
          <Alert tone="danger" title={t('common.error')}>
            {errorMessage}
          </Alert>
        ) : null}

        <div className="border-t border-line pt-4">
          <p className="max-w-xl text-sm text-muted">{t('workspace.leaveDescription')}</p>
          {isLastOwner ? (
            <p className="mt-2 max-w-xl text-xs text-negative">{t('workspace.leaveLastOwner')}</p>
          ) : null}
          <Button
            variant="ghost"
            className="mt-2 text-negative hover:bg-raised"
            disabled={isLastOwner}
            onClick={() => setLeaveOpen(true)}
          >
            {t('workspace.leave')}
          </Button>
        </div>
      </div>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={t('workspace.leaveTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmLeave()}>
              {t('workspace.leaveConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('workspace.leaveDescription')}</p>
      </Modal>
    </section>
  )
}
