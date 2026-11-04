import { Fragment, useEffect, useId, useState, type FormEvent } from 'react'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import {
  Alert,
  Badge,
  Button,
  ChevronDown,
  EmptyState,
  Field,
  Input,
  Table,
} from '@/components/ui'
import type { AdminWorkspace } from '@/data/cloud/gateway'
import { useAdminStore } from '@/state/admin-store'
import { cn } from '@/lib/cn'
import { adminErrorKeys } from './messages'

function parseLimit(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return parsed
}

/**
 * Workspaces with usage, caps and members. Caps are editable inline: the
 * trigger on the database stays the source of truth, the console only writes
 * `workspace_limits` through the admin RPC (runbook §16.2).
 */
export function AdminWorkspaces({
  workspaces,
  loading,
}: {
  workspaces: AdminWorkspace[]
  loading: boolean
}) {
  const { t } = useI18n()
  const selectWorkspace = useAdminStore((state) => state.selectWorkspace)
  // One open panel at a time: the members list lives in the store for the
  // last selected workspace only.
  const [openId, setOpenId] = useState<string>()

  useEffect(() => {
    if (openId === undefined) return
    void selectWorkspace(openId)
  }, [openId, selectWorkspace])

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? undefined : id))
  }

  return (
    <section aria-labelledby="admin-workspaces" className="mt-10">
      <h2 id="admin-workspaces" className="text-base font-semibold text-ink">
        {t('admin.workspaces.title')}
      </h2>

      {loading ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : workspaces.length === 0 ? (
        <div className="mt-3">
          <EmptyState title={t('admin.workspaces.empty')} />
        </div>
      ) : (
        <>
          <WorkspacesTable workspaces={workspaces} openId={openId} onToggle={toggle} />
          <WorkspaceCards workspaces={workspaces} openId={openId} onToggle={toggle} />
        </>
      )}
    </section>
  )
}

interface ListProps {
  workspaces: AdminWorkspace[]
  openId?: string
  onToggle: (id: string) => void
}

function UsageValue({ used, max }: { used: number; max: number }) {
  const { t } = useI18n()
  const atCap = used >= max
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className={cn(atCap ? 'font-medium text-ink' : 'text-muted')}>
        {t('admin.workspaces.usage.value', { used, max })}
      </span>
      {atCap ? <Badge tone="warning">{t('admin.workspaces.atCap')}</Badge> : null}
    </span>
  )
}

function KindBadge({ kind }: { kind: AdminWorkspace['kind'] }) {
  const { t } = useI18n()
  return (
    <Badge tone={kind === 'personal' ? 'neutral' : 'info'}>
      {kind === 'personal'
        ? t('admin.workspaces.kind.personal')
        : t('admin.workspaces.kind.shared')}
    </Badge>
  )
}

function DetailsToggle({
  panelId,
  name,
  open,
  onToggle,
}: {
  panelId: string
  name: string
  open: boolean
  onToggle: () => void
}) {
  const { t } = useI18n()
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
    >
      {t('admin.workspaces.details')}
      <span className="sr-only"> {name}</span>
      <ChevronDown open={open} />
    </Button>
  )
}

function WorkspacesTable({ workspaces, openId, onToggle }: ListProps) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <Table
      label={t('admin.workspaces.tableLabel')}
      containerClassName="hidden mt-3 border-y border-line xl:block"
    >
      <caption className="sr-only">{t('admin.workspaces.tableLabel')}</caption>
      <thead>
        <tr className="text-xs text-muted">
          <th scope="col" className="py-2 pl-4 pr-4 text-left font-medium">
            {t('admin.workspaces.name')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.workspaces.membersTitle')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.overview.quotes')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.workspaces.createdAt')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.workspaces.details')}
          </th>
        </tr>
      </thead>
      <tbody>
        {workspaces.map((workspace) => {
          const open = openId === workspace.id
          const panelId = `admin-ws-details-table-${workspace.id}`

          return (
            <Fragment key={workspace.id}>
              <tr
                className={cn(
                  'border-t border-rule align-middle transition-feedback hover:bg-raised',
                  open && 'bg-raised',
                )}
              >
                <th scope="row" className="py-3 pl-4 pr-4 text-left font-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{workspace.name}</span>
                    <KindBadge kind={workspace.kind} />
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted">{workspace.id}</p>
                </th>
                <td className="py-3 pr-4 text-right tabular-nums">
                  <UsageValue used={workspace.members} max={workspace.maxMembers} />
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  <UsageValue used={workspace.quotes} max={workspace.maxQuotes} />
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted" data-volatile>
                  {format.instantDate(workspace.createdAt)}
                </td>
                <td className="py-3 pr-4 text-right">
                  <DetailsToggle
                    panelId={panelId}
                    name={workspace.name}
                    open={open}
                    onToggle={() => onToggle(workspace.id)}
                  />
                </td>
              </tr>
              <tr id={panelId} hidden={!open} className="border-t border-rule bg-raised">
                <td colSpan={5} className="px-4 pb-4 pt-1">
                  <WorkspaceDetails workspace={workspace} />
                </td>
              </tr>
            </Fragment>
          )
        })}
      </tbody>
    </Table>
  )
}

function WorkspaceCards({ workspaces, openId, onToggle }: ListProps) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <div className="mt-3 space-y-3 xl:hidden">
      {workspaces.map((workspace) => {
        const open = openId === workspace.id
        const panelId = `admin-ws-details-card-${workspace.id}`

        return (
          <article
            key={workspace.id}
            className="rounded-card border border-line bg-surface px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">{workspace.name}</p>
              <KindBadge kind={workspace.kind} />
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted">{workspace.id}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('admin.workspaces.membersTitle')}</dt>
                <dd className="text-right">
                  <UsageValue used={workspace.members} max={workspace.maxMembers} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t('admin.overview.quotes')}</dt>
                <dd className="text-right">
                  <UsageValue used={workspace.quotes} max={workspace.maxQuotes} />
                </dd>
              </div>
              <div className="flex justify-between gap-3" data-volatile>
                <dt className="text-muted">{t('admin.workspaces.createdAt')}</dt>
                <dd className="tabular-nums text-muted">
                  {format.instantDate(workspace.createdAt)}
                </dd>
              </div>
            </dl>
            <div className="mt-2">
              <DetailsToggle
                panelId={panelId}
                name={workspace.name}
                open={open}
                onToggle={() => onToggle(workspace.id)}
              />
            </div>
            {open ? (
              <div id={panelId} className="mt-3 border-t border-rule pt-3">
                <WorkspaceDetails workspace={workspace} />
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

/** Members and caps editor, shared by the table panel and the mobile card. */
function WorkspaceDetails({ workspace }: { workspace: AdminWorkspace }) {
  return (
    <div className="space-y-5">
      <MembersList workspaceId={workspace.id} />
      {/* The key realigns the fields after a save: new caps remount the editor. */}
      <LimitsEditor
        key={`${workspace.id}-${workspace.maxMembers}-${workspace.maxQuotes}`}
        workspace={workspace}
      />
    </div>
  )
}

function MembersList({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()
  const format = useFormat()
  const membersWorkspaceId = useAdminStore((state) => state.membersWorkspaceId)
  const members = useAdminStore((state) => state.members)
  const membersStatus = useAdminStore((state) => state.membersStatus)
  const membersError = useAdminStore((state) => state.membersError)

  if (membersWorkspaceId !== workspaceId) return null

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{t('admin.workspaces.membersTitle')}</h3>
      {membersStatus === 'loading' ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {t('admin.workspaces.membersLoading')}
        </p>
      ) : membersStatus === 'error' ? (
        <div className="mt-2">
          <Alert tone="warning" title={t('admin.error.title')}>
            <p>{membersError ? t(adminErrorKeys[membersError]) : t('workspace.error.unknown')}</p>
          </Alert>
        </div>
      ) : members.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t('admin.workspaces.membersEmpty')}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
            >
              <span className="min-w-0">
                <span className="font-medium text-ink">{member.email ?? member.displayName ?? '—'}</span>
                {member.displayName && member.email ? (
                  <span className="ml-2 text-muted">{member.displayName}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <Badge tone={member.role === 'owner' ? 'info' : 'neutral'}>
                  {member.role === 'owner'
                    ? t('workspace.roleOwner')
                    : t('workspace.roleEditor')}
                </Badge>
                <span data-volatile>
                  {t('admin.workspaces.memberJoined')} {format.instantDate(member.joinedAt)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LimitsEditor({ workspace }: { workspace: AdminWorkspace }) {
  const { t } = useI18n()
  const baseId = useId()
  const membersInputId = `${baseId}-members`
  const quotesInputId = `${baseId}-quotes`
  const warningId = `${baseId}-warning`

  const updateLimits = useAdminStore((state) => state.updateLimits)
  const limitsStatus = useAdminStore((state) => state.limitsStatus)
  const limitsError = useAdminStore((state) => state.limitsError)
  const limitsWorkspaceId = useAdminStore((state) => state.limitsWorkspaceId)
  const clearLimitsFeedback = useAdminStore((state) => state.clearLimitsFeedback)

  const [membersValue, setMembersValue] = useState(String(workspace.maxMembers))
  const [quotesValue, setQuotesValue] = useState(String(workspace.maxQuotes))

  const membersParsed = parseLimit(membersValue)
  const quotesParsed = parseLimit(quotesValue)
  const membersInvalid = membersValue.trim() !== '' && membersParsed === null
  const quotesInvalid = quotesValue.trim() !== '' && quotesParsed === null
  const belowUsage =
    (membersParsed !== null && membersParsed < workspace.members) ||
    (quotesParsed !== null && quotesParsed < workspace.quotes)
  const dirty =
    membersValue !== String(workspace.maxMembers) ||
    quotesValue !== String(workspace.maxQuotes)
  const saving = limitsStatus === 'saving' && limitsWorkspaceId === workspace.id
  const feedbackForThisWorkspace =
    limitsWorkspaceId === workspace.id &&
    (limitsStatus === 'saved' || (limitsStatus === 'error' && limitsError !== undefined))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (membersParsed === null || quotesParsed === null) return
    await updateLimits(workspace.id, membersParsed, quotesParsed)
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="max-w-md">
      <h3 className="text-sm font-semibold text-ink">{t('admin.workspaces.limitsTitle')}</h3>
      <p className="mt-1 text-xs leading-snug text-muted">{t('admin.workspaces.limitsHint')}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field
          label={t('admin.workspaces.maxMembers')}
          htmlFor={membersInputId}
          error={membersInvalid ? t('admin.workspaces.limitInvalid') : undefined}
        >
          <Input
            id={membersInputId}
            type="text"
            inputMode="numeric"
            value={membersValue}
            onChange={(event) => {
              clearLimitsFeedback()
              setMembersValue(event.target.value)
            }}
            aria-describedby={belowUsage ? warningId : undefined}
            className="w-full tabular-nums"
          />
        </Field>
        <Field
          label={t('admin.workspaces.maxQuotes')}
          htmlFor={quotesInputId}
          error={quotesInvalid ? t('admin.workspaces.limitInvalid') : undefined}
        >
          <Input
            id={quotesInputId}
            type="text"
            inputMode="numeric"
            value={quotesValue}
            onChange={(event) => {
              clearLimitsFeedback()
              setQuotesValue(event.target.value)
            }}
            aria-describedby={belowUsage ? warningId : undefined}
            className="w-full tabular-nums"
          />
        </Field>
      </div>

      <p
        id={warningId}
        className={cn('mt-2 text-xs', belowUsage ? 'text-warning' : 'hidden')}
      >
        {t('admin.workspaces.belowUsageWarning')}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={saving || !dirty}>
          {saving
            ? t('admin.workspaces.limitsSaving')
            : t('admin.workspaces.limitsSave')}
        </Button>
        {feedbackForThisWorkspace && limitsStatus === 'saved' ? (
          <p role="status" className="text-sm text-muted">
            {t('admin.workspaces.limitsSaved')}
          </p>
        ) : null}
        {feedbackForThisWorkspace && limitsStatus === 'error' && limitsError ? (
          <p role="alert" className="text-sm text-ink">
            {t(adminErrorKeys[limitsError])}
          </p>
        ) : null}
      </div>
    </form>
  )
}
