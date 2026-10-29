import { useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import type { AuthErrorCode } from '@/data/cloud/auth'
import { isGoogleAuthEnabled } from '@/data/cloud/client'
import { useAuthStore } from '@/state/auth-store'
import type { MessageKey } from '@/i18n'

const errorKeys: Record<AuthErrorCode, MessageKey> = {
  invalidCredentials: 'auth.error.invalidCredentials',
  emailNotConfirmed: 'auth.error.emailNotConfirmed',
  tooManyRequests: 'auth.error.tooManyRequests',
  network: 'auth.error.network',
  notConfigured: 'auth.error.notConfigured',
  oauthCancelled: 'auth.error.oauthCancelled',
  oauthProviderDisabled: 'auth.error.oauthProviderDisabled',
  oauthSignupDisabled: 'auth.error.oauthSignupDisabled',
  oauthIdentityExists: 'auth.error.oauthIdentityExists',
  oauthConfig: 'auth.error.oauthConfig',
  oauthCallback: 'auth.error.oauthCallback',
  manualLinkingDisabled: 'auth.error.manualLinkingDisabled',
  unknown: 'auth.error.unknown',
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M17.64 9.204c0-.638-.057-1.252-.163-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const oauth = useAuthStore((state) => state.oauth)
  const oauthCallbackError = useAuthStore((state) => state.oauthCallback?.error)
  const signIn = useAuthStore((state) => state.signIn)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const initialize = useAuthStore((state) => state.initialize)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const googleEnabled = isGoogleAuthEnabled()

  if (status === 'authenticated' && user) return <Navigate to="/" replace />

  if (status === 'unconfigured') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t('auth.unconfigured.title')} />
        <Card className="mt-6 p-6">
          <EmptyState
            title={t('auth.unconfigured.title')}
            description={t('auth.unconfigured.body')}
            action={<Button onClick={() => navigate('/')}>{t('auth.backToApp')}</Button>}
          />
        </Card>
      </div>
    )
  }

  const emailBusy = submitting || status === 'loading'
  const busy = emailBusy || oauth !== 'idle'
  const displayError = oauthCallbackError ?? error

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const ok = await signIn(email, password)
    setSubmitting(false)
    if (ok) navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('auth.title')} description={t('auth.description')} />

      {status === 'expired' ? (
        <div className="mt-6">
          <Alert tone="warning" title={t('auth.expired.title')}>
            {t('auth.expired.body')}
          </Alert>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="mt-6">
          <Alert tone="danger" title={t('common.error')}>
            <p>{error ? t(errorKeys[error]) : t('auth.error.unknown')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => void initialize()}>
              {t('sync.retry')}
            </Button>
          </Alert>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        {displayError && status !== 'error' ? (
          <div role="alert" className="mb-5">
            <Alert tone="danger" title={t('common.error')}>
              {t(errorKeys[displayError])}
            </Alert>
          </div>
        ) : null}

        {googleEnabled ? (
          <div className="space-y-4">
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
            >
              <GoogleIcon />
              {oauth === 'redirecting'
                ? t('auth.google.redirecting')
                : t('auth.google.continue')}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
              <span>{t('auth.google.or')}</span>
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </div>
          </div>
        ) : null}

        <form
          className={googleEnabled ? 'mt-5 space-y-5' : 'space-y-5'}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Field label={t('auth.email')} htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={busy}
            />
          </Field>

          <Field label={t('auth.password')} htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={busy}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {emailBusy ? t('auth.submitting') : t('auth.submit')}
            </Button>
            <Link
              to="/"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('auth.backToApp')}
            </Link>
          </div>

          <div className="space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            <p>{t('auth.noSignup')}</p>
            <p>{t('auth.forgotPassword')}</p>
          </div>
        </form>
      </Card>
    </div>
  )
}
