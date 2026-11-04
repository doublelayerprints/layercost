import { useEffect } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, EmptyState, PageHeader, Stat } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import { useAdminStore } from '@/state/admin-store'
import { useAuthStore } from '@/state/auth-store'
import { AdminUsers } from './AdminUsers'
import { AdminWorkspaces } from './AdminWorkspaces'
import { adminErrorKeys } from './messages'

/**
 * Administration console (EVO-8): service overview, users and workspaces with
 * their caps. The page is fail-closed: without a session, without cloud or
 * without the `is_admin` flag it renders the reserved state and the RPCs
 * would refuse the data anyway.
 */
export function AdminPage() {
  const { t } = useI18n()
  const authStatus = useAuthStore((state) => state.status)
  const status = useAdminStore((state) => state.status)
  const isAdmin = useAdminStore((state) => state.isAdmin)
  const error = useAdminStore((state) => state.error)
  const checkAdmin = useAdminStore((state) => state.checkAdmin)

  const authenticated = isCloudConfigured() && authStatus === 'authenticated'

  useEffect(() => {
    if (!authenticated) return
    // SyncController kicks the check off at login; this covers a direct
    // navigation to /#/admin while the check is still idle.
    if (status === 'idle') void checkAdmin()
  }, [authenticated, checkAdmin, status])

  if (!authenticated || (status !== 'error' && !isAdmin)) {
    return (
      <>
        <PageHeader title={t('admin.title')} description={t('admin.description')} />
        <div className="mt-6">
          <EmptyState title={t('admin.reserved.title')} description={t('admin.reserved.body')} />
        </div>
      </>
    )
  }

  if (status === 'checking') {
    return (
      <>
        <PageHeader title={t('admin.title')} description={t('admin.description')} />
        <p role="status" className="mt-6 text-sm text-muted">
          {t('admin.checking')}
        </p>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title={t('admin.title')} description={t('admin.description')} />
        <div className="mt-6">
          <Alert tone="warning" title={t('admin.error.title')}>
            <p>{error ? t(adminErrorKeys[error]) : t('workspace.error.unknown')}</p>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => void checkAdmin()}>
                {t('admin.retry')}
              </Button>
            </div>
          </Alert>
        </div>
      </>
    )
  }

  return <AdminConsole />
}

function AdminConsole() {
  const { t } = useI18n()
  const dataStatus = useAdminStore((state) => state.dataStatus)
  const overview = useAdminStore((state) => state.overview)
  const users = useAdminStore((state) => state.users)
  const workspaces = useAdminStore((state) => state.workspaces)
  const error = useAdminStore((state) => state.error)
  const load = useAdminStore((state) => state.load)

  useEffect(() => {
    if (dataStatus === 'idle') void load()
  }, [dataStatus, load])

  const usersAtCap = overview ? overview.totalUsers >= overview.maxUsersLimit : false

  return (
    <>
      <PageHeader title={t('admin.title')} description={t('admin.description')} />

      {dataStatus === 'error' ? (
        <div className="mt-6">
          <Alert tone="warning" title={t('admin.error.title')}>
            <p>{error ? t(adminErrorKeys[error]) : t('workspace.error.unknown')}</p>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                {t('admin.retry')}
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}

      <section aria-labelledby="admin-overview" className="mt-6">
        <h2 id="admin-overview" className="text-base font-semibold text-ink">
          {t('admin.overview.title')}
        </h2>
        {dataStatus === 'loading' && !overview ? (
          <p role="status" className="mt-2 text-sm text-muted">
            {t('common.loading')}
          </p>
        ) : overview ? (
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t('admin.overview.users')}
              value={overview.totalUsers}
              hint={t('admin.overview.usersHint', { max: overview.maxUsersLimit })}
              tone={usersAtCap ? 'warning' : 'default'}
            />
            <Stat
              label={t('admin.overview.personal')}
              value={overview.totalPersonalWorkspaces}
            />
            <Stat
              label={t('admin.overview.shared')}
              value={overview.totalSharedWorkspaces}
            />
            <Stat
              label={t('admin.overview.quotes')}
              value={overview.totalQuotes}
              hint={t('admin.overview.membershipsHint', { count: overview.totalMemberships })}
            />
          </div>
        ) : null}
      </section>

      <AdminUsers users={users} loading={dataStatus === 'loading' && users.length === 0} />
      <AdminWorkspaces
        workspaces={workspaces}
        loading={dataStatus === 'loading' && workspaces.length === 0}
      />
    </>
  )
}
