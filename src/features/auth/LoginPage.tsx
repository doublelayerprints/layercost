import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  signupLimitReached: 'auth.error.signupLimitReached',
  emailExists: 'auth.error.emailExists',
  oauthCancelled: 'auth.error.oauthCancelled',
  oauthProviderDisabled: 'auth.error.oauthProviderDisabled',
  oauthSignupDisabled: 'auth.error.oauthSignupDisabled',
  oauthIdentityExists: 'auth.error.oauthIdentityExists',
  oauthConfig: 'auth.error.oauthConfig',
  oauthCallback: 'auth.error.oauthCallback',
  manualLinkingDisabled: 'auth.error.manualLinkingDisabled',
  unknown: 'auth.error.unknown',
}

type LoginMode = 'signin' | 'signup'

const MIN_PASSWORD_LENGTH = 6

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

function ModeSwitch({
  mode,
  onChange,
  disabled,
}: {
  mode: LoginMode
  onChange: (mode: LoginMode) => void
  disabled: boolean
}) {
  const { t } = useI18n()
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{t('auth.mode.legend')}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-control bg-raised p-1">
        {(['signin', 'signup'] as const).map((value) => (
          <label
            key={value}
            className="relative grid h-10 cursor-pointer place-items-center rounded-control px-3 text-center text-sm font-medium text-muted hover:text-ink has-[:checked]:bg-surface has-[:checked]:font-semibold has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-data has-[:disabled]:cursor-not-allowed"
          >
            <input
              type="radio"
              name="login-mode"
              value={value}
              checked={mode === value}
              onChange={() => onChange(value)}
              disabled={disabled}
              aria-label={value === 'signin' ? t('auth.mode.signin') : t('auth.mode.signup')}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="pointer-events-none">
              {value === 'signin' ? t('auth.mode.signin') : t('auth.mode.signup')}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const oauth = useAuthStore((state) => state.oauth)
  const oauthCallbackError = useAuthStore((state) => state.oauthCallback?.error)
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const initialize = useAuthStore((state) => state.initialize)
  const [mode, setMode] = useState<LoginMode>(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password', MessageKey>>>({})

  // The URL is the source of truth for the entry mode: navigating to /#/login
  // without ?mode=signup goes back to the sign-in form (the manual switch does
  // not change the URL, so it is never overridden).
  useEffect(() => {
    setMode(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  }, [searchParams])

  const googleEnabled = isGoogleAuthEnabled()

  if (status === 'authenticated' && user) return <Navigate to="/calculator" replace />

  if (status === 'unconfigured') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t('auth.unconfigured.title')} />
        <Card className="mt-6 p-6">
          <EmptyState
            title={t('auth.unconfigured.title')}
            description={t('auth.unconfigured.body')}
            action={<Button onClick={() => navigate('/calculator')}>{t('auth.backToApp')}</Button>}
          />
        </Card>
      </div>
    )
  }

  const emailBusy = submitting || status === 'loading'
  const busy = emailBusy || oauth !== 'idle'
  const displayError = oauthCallbackError ?? error

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setFieldErrors({})
  }

  const validate = (): boolean => {
    const next: Partial<Record<'email' | 'password', MessageKey>> = {}
    const trimmedEmail = email.trim()
    if (trimmedEmail === '') {
      next.email = 'auth.error.emailRequired'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'auth.error.emailInvalid'
    }
    if (password === '') {
      next.password = 'auth.error.passwordRequired'
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = 'auth.error.passwordTooShort'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'signup' && !validate()) return
    setSubmitting(true)
    const ok =
      mode === 'signup' ? await signUp(email, password) : await signIn(email, password)
    setSubmitting(false)
    if (ok) navigate('/calculator', { replace: true })
  }

  const title = mode === 'signup' ? t('auth.mode.signup') : t('auth.title')
  const description =
    mode === 'signup' ? t('auth.signup.description') : t('auth.description')
  const passwordError = fieldErrors.password

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={title} description={description} />

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

        <ModeSwitch mode={mode} onChange={switchMode} disabled={busy} />

        {googleEnabled ? (
          <div className="mt-5 space-y-4">
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
            >
              <GoogleIcon />
              {oauth === 'redirecting' ? t('auth.google.redirecting') : t('auth.google.continue')}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
              <span>{t('auth.google.or')}</span>
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </div>
          </div>
        ) : null}

        <form
          className={googleEnabled ? 'mt-5 space-y-5' : 'mt-5 space-y-5'}
          onSubmit={(event) => void handleSubmit(event)}
          noValidate={mode === 'signup'}
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
              onChange={(event) => {
                setEmail(event.target.value)
                setFieldErrors((current) => ({ ...current, email: undefined }))
              }}
              required
              disabled={busy}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p id="login-email-error" className="mt-1.5 text-xs text-negative">
                {t(fieldErrors.email)}
              </p>
            ) : null}
          </Field>

          <Field label={t('auth.password')} htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((current) => ({ ...current, password: undefined }))
              }}
              required
              disabled={busy}
              aria-describedby={
                passwordError
                  ? 'login-password-error'
                  : mode === 'signup'
                    ? 'login-password-hint'
                    : undefined
              }
            />
            {passwordError ? (
              <p id="login-password-error" className="mt-1.5 text-xs text-negative">
                {t(passwordError)}
              </p>
            ) : null}
            {mode === 'signup' && !passwordError ? (
              <p id="login-password-hint" className="mt-1.5 text-xs text-muted">
                {t('auth.signup.passwordHint')}
              </p>
            ) : null}
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {emailBusy
                ? mode === 'signup'
                  ? t('auth.signup.submitting')
                  : t('auth.submitting')
                : mode === 'signup'
                  ? t('auth.signup.submit')
                  : t('auth.submit')}
            </Button>
            <Link
              to="/calculator"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('auth.backToApp')}
            </Link>
          </div>

          <div className="space-y-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            {mode === 'signin' ? (
              <>
                <p>{t('auth.signup.hint')}</p>
                <p>{t('auth.forgotPassword')}</p>
              </>
            ) : (
              <p>{t('auth.signup.hint')}</p>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
