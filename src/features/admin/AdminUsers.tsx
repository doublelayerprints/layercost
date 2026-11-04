import { useMemo, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Badge, EmptyState, Input, Table } from '@/components/ui'
import type { AdminUser } from '@/data/cloud/gateway'
import type { MessageKey } from '@/i18n'
import { plural } from '@/i18n'

function providerLabel(provider: string, t: (key: MessageKey) => string): string {
  if (provider === 'email') return t('admin.provider.email')
  if (provider === 'google') return t('admin.provider.google')
  return provider
}

/**
 * Registered users with provider, workspace count and last sign-in.
 * Table from the xl breakpoint, cards below, like the printers list.
 */
export function AdminUsers({ users, loading }: { users: AdminUser[]; loading: boolean }) {
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      normalizedQuery === ''
        ? users
        : users.filter(
            (user) =>
              (user.email ?? '').toLowerCase().includes(normalizedQuery) ||
              (user.displayName ?? '').toLowerCase().includes(normalizedQuery),
          ),
    [normalizedQuery, users],
  )

  const searchId = 'admin-users-search'

  return (
    <section aria-labelledby="admin-users" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="admin-users" className="text-base font-semibold text-ink">
          {t('admin.users.title')}
        </h2>
        <div>
          <label
            htmlFor={searchId}
            className="mb-1 block text-xs font-medium text-muted"
          >
            {t('admin.users.searchLabel')}
          </label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
            className="w-64 max-w-full"
          />
        </div>
      </div>

      {loading ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : (
        <>
          <p aria-live="polite" className="mt-3 text-sm text-muted">
            {plural(locale, filtered.length, {
              one: 'admin.users.results.one',
              other: 'admin.users.results.other',
            })}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t('admin.users.empty')} />
            </div>
          ) : (
            <>
              <UsersTable users={filtered} />
              <UserCards users={filtered} />
            </>
          )}
        </>
      )}
    </section>
  )
}

function ProviderPills({ providers }: { providers: string[] }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-1">
      {providers.map((provider) => (
        <Badge key={provider} tone={provider === 'google' ? 'info' : 'neutral'}>
          {providerLabel(provider, t)}
        </Badge>
      ))}
    </div>
  )
}

function UsersTable({ users }: { users: AdminUser[] }) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <Table label={t('admin.users.tableLabel')} containerClassName="hidden mt-3 border-y border-line xl:block">
      <caption className="sr-only">{t('admin.users.tableLabel')}</caption>
      <thead>
        <tr className="text-xs text-muted">
          <th scope="col" className="py-2 pl-4 pr-4 text-left font-medium">
            {t('admin.users.email')}
          </th>
          <th scope="col" className="py-2 pr-4 text-left font-medium">
            {t('admin.users.name')}
          </th>
          <th scope="col" className="py-2 pr-4 text-left font-medium">
            {t('admin.users.providers')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.users.workspaces')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.users.createdAt')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('admin.users.lastSignIn')}
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr
            key={user.userId}
            className="border-t border-rule transition-feedback hover:bg-raised"
          >
            <th scope="row" className="py-3 pl-4 pr-4 text-left font-normal">
              <span className="text-sm font-medium text-ink">{user.email ?? '—'}</span>
            </th>
            <td className="py-3 pr-4 text-sm text-muted">{user.displayName ?? '—'}</td>
            <td className="py-3 pr-4">
              <ProviderPills providers={user.providers} />
            </td>
            <td className="py-3 pr-4 text-right tabular-nums text-ink">
              {user.workspaceCount}
            </td>
            <td className="py-3 pr-4 text-right tabular-nums text-muted" data-volatile>
              {format.instantDate(user.createdAt)}
            </td>
            <td className="py-3 pr-4 text-right tabular-nums text-muted" data-volatile>
              {user.lastSignInAt ? format.instantDate(user.lastSignInAt) : t('admin.users.never')}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

function UserCards({ users }: { users: AdminUser[] }) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <div className="mt-3 space-y-3 xl:hidden">
      {users.map((user) => (
        <article
          key={user.userId}
          className="rounded-card border border-line bg-surface px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">{user.email ?? '—'}</p>
            <ProviderPills providers={user.providers} />
          </div>
          <p className="mt-1 text-sm text-muted">{user.displayName ?? '—'}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-label={t('admin.users.tableLabel')}>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('admin.users.workspaces')}</dt>
              <dd className="tabular-nums text-ink">{user.workspaceCount}</dd>
            </div>
            <div className="flex justify-between gap-3" data-volatile>
              <dt className="text-muted">{t('admin.users.lastSignIn')}</dt>
              <dd className="tabular-nums text-muted">
                {user.lastSignInAt ? format.instantDate(user.lastSignInAt) : t('admin.users.never')}
              </dd>
            </div>
            <div className="flex justify-between gap-3" data-volatile>
              <dt className="text-muted">{t('admin.users.createdAt')}</dt>
              <dd className="tabular-nums text-muted">{format.instantDate(user.createdAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
