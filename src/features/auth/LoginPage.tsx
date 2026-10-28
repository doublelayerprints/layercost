import { useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import type { AuthErrorCode } from '@/data/cloud/auth'
import { useAuthStore } from '@/state/auth-store'
import type { MessageKey } from '@/i18n'

const errorKeys: Record<AuthErrorCode, MessageKey> = {
  invalidCredentials: 'auth.error.invalidCredentials',
  emailNotConfirmed: 'auth.error.emailNotConfirmed',
  tooManyRequests: 'auth.error.tooManyRequests',
  network: 'auth.error.network',
  notConfigured: 'auth.error.notConfigured',
  unknown: 'auth.error.unknown',
}

export function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const signIn = useAuthStore((state) => state.signIn)
  const initialize = useAuthStore((state) => state.initialize)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const busy = submitting || status === 'loading'

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
            <p>{t('auth.error.unknown')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => void initialize()}>
              {t('sync.retry')}
            </Button>
          </Alert>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          {error && status !== 'error' ? (
            <div role="alert">
              <Alert tone="danger" title={t('common.error')}>
                {t(errorKeys[error])}
              </Alert>
            </div>
          ) : null}

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
              {busy ? t('auth.submitting') : t('auth.submit')}
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
