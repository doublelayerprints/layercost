import { useEffect, useState, type FormEvent } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Button, Field, Input } from '@/components/ui'
import { isCloudConfigured } from '@/data/cloud/client'
import type { WorkspaceErrorCode } from '@/data/cloud/gateway'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import type { MessageKey } from '@/i18n'

const PROFILE_ERROR_KEYS: Record<WorkspaceErrorCode, MessageKey> = {
  invalidName: 'profile.error.invalidName',
  network: 'profile.error.network',
  auth: 'profile.error.auth',
  workspaceLimit: 'profile.error.unknown',
  memberLimit: 'profile.error.unknown',
  inviteInvalid: 'profile.error.unknown',
  inviteExpired: 'profile.error.unknown',
  inviteRevoked: 'profile.error.unknown',
  inviteExhausted: 'profile.error.unknown',
  lastOwner: 'profile.error.unknown',
  notOwner: 'profile.error.unknown',
  notMember: 'profile.error.unknown',
  unknown: 'profile.error.unknown',
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function ProfileForm({ initialName }: { initialName: string }) {
  const { t } = useI18n()
  const profileStatus = useWorkspaceStore((state) => state.profileStatus)
  const profileError = useWorkspaceStore((state) => state.profileError)
  const saveProfile = useWorkspaceStore((state) => state.saveProfile)

  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [localError, setLocalError] = useState<string>()

  const saveError =
    profileStatus !== 'error' && profileError ? t(PROFILE_ERROR_KEYS[profileError]) : undefined
  const fieldError = localError ?? saveError

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const normalized = normalizeName(name)
    if (normalized.length === 0 || normalized.length > 40) {
      setLocalError(t('profile.error.invalidName'))
      setSaved(false)
      return
    }

    setLocalError(undefined)
    setSaved(false)
    setBusy(true)
    try {
      const ok = await saveProfile(normalized)
      if (ok) {
        setName(normalized)
        setSaved(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Field
        label={t('profile.name')}
        htmlFor="settings-profile-name"
        hint={t('profile.nameHint')}
        error={fieldError}
      >
        <Input
          id="settings-profile-name"
          value={name}
          maxLength={40}
          autoComplete="nickname"
          onChange={(event) => {
            setName(event.target.value)
            setSaved(false)
            setLocalError(undefined)
          }}
        />
      </Field>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || profileStatus === 'loading'}>
          {busy ? t('profile.saving') : t('profile.save')}
        </Button>
        {saved ? (
          <p role="status" className="text-xs font-medium text-positive">
            {t('profile.saved')}
          </p>
        ) : null}
      </div>
    </form>
  )
}

/**
 * The visible name is global per account and is shown to every member of the
 * shared workspaces the user belongs to. It is not part of the local data or
 * of the economic quote snapshot.
 */
export function ProfileSettings() {
  const { t } = useI18n()
  const authStatus = useAuthStore((state) => state.status)
  const profileStatus = useWorkspaceStore((state) => state.profileStatus)
  const profileName = useWorkspaceStore((state) => state.profileName)
  const profileError = useWorkspaceStore((state) => state.profileError)
  const loadProfile = useWorkspaceStore((state) => state.loadProfile)

  useEffect(() => {
    if (authStatus === 'authenticated' && profileStatus === 'idle') void loadProfile()
  }, [authStatus, loadProfile, profileStatus])

  if (!isCloudConfigured() || authStatus !== 'authenticated') return null

  const loadError =
    profileStatus === 'error' && profileError ? t(PROFILE_ERROR_KEYS[profileError]) : undefined
  const waiting = (profileStatus === 'idle' || profileStatus === 'loading') && !profileName

  return (
    <section
      className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
      aria-labelledby="settings-profile"
    >
      <div>
        <h2 id="settings-profile" className="text-base font-semibold text-ink">
          {t('profile.title')}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted">{t('profile.description')}</p>
      </div>

      <div>
        {waiting ? (
          <p role="status" className="text-sm text-muted">
            {t('profile.loading')}
          </p>
        ) : null}

        {loadError ? (
          <div role="alert" className="mb-3 text-sm text-negative">
            <p>{loadError}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => void loadProfile()}
            >
              {t('common.retry')}
            </Button>
          </div>
        ) : null}

        {!waiting ? <ProfileForm initialName={profileName ?? ''} /> : null}
      </div>
    </section>
  )
}
