import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Card, Field, Input, PageHeader } from '@/components/ui'
import { useAuthStore } from '@/state/auth-store'
import { authErrorKeys } from '@/features/sync/messages'
import type { MessageKey } from '@/i18n'

/**
 * Password recovery (EVO-11). The link in the email lands on the site root and
 * is exchanged there; after that the store is in `pending` and this page asks
 * for the new password. The email request form lives here too.
 */
export function PasswordResetPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const recovery = useAuthStore((state) => state.recovery)
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const error = useAuthStore((state) => state.error)
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset)
  const completePasswordReset = useAuthStore((state) => state.completePasswordReset)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<MessageKey | undefined>()

  if (status === 'unconfigured') return <Navigate to="/login" replace />

  const errorKey = error ? authErrorKeys[error] : undefined
  const showRequest = recovery === 'idle' || recovery === 'requested'
  const busy = submitting || status === 'loading'

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (trimmed === '') return setFieldError('auth.error.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return setFieldError('auth.error.emailInvalid')
    setFieldError(undefined)
    setSubmitting(true)
    await requestPasswordReset(trimmed)
    setSubmitting(false)
  }

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password === '') return setFieldError('auth.error.passwordRequired')
    if (password.length < 12) return setFieldError('auth.passwordRule')
    if (password !== repeat) return setFieldError('auth.recovery.passwordMismatch')
    setFieldError(undefined)
    setSubmitting(true)
    await completePasswordReset(password)
    setSubmitting(false)
    // On success the store switches to `saved` and the confirmation below
    // replaces the form; a failure keeps the form and shows the error above.
  }

  if (recovery === 'saved') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t('auth.recovery.savedTitle')} />
        <Card className="mt-6 p-6">
          <Alert tone="success" title={t('auth.recovery.savedTitle')}>
            {t('auth.recovery.savedBody')}
          </Alert>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate('/calculator', { replace: true })}>
              {t('auth.backToApp')}
            </Button>
            <Link
              to="/settings"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('auth.recovery.settings')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={recovery === 'pending' ? t('auth.recovery.newTitle') : t('auth.recovery.title')}
        description={
          recovery === 'pending' ? t('auth.recovery.newDescription') : t('auth.recovery.description')
        }
      />

      {errorKey ? (
        <div role="alert" className="mt-6">
          <Alert tone="danger" title={t('common.error')}>
            {t(errorKey)}
          </Alert>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        {showRequest ? (
          recovery === 'requested' ? (
            <div className="space-y-4">
              <Alert tone="success" title={t('auth.recovery.sentTitle')}>
                {t('auth.recovery.sentBody')}
              </Alert>
              <p className="text-sm text-muted">{t('auth.recovery.sentHint')}</p>
              <Link
                to="/login"
                className="inline-block text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
              >
                {t('auth.recovery.backToLogin')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={(event) => void submitRequest(event)} noValidate>
              <Field label={t('auth.email')} htmlFor="reset-email" required>
                <Input
                  id="reset-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldError(undefined)
                  }}
                  required
                  disabled={busy}
                  aria-describedby={fieldError ? 'reset-email-error' : undefined}
                />
                {fieldError ? (
                  <p id="reset-email-error" className="mt-1.5 text-xs text-negative">
                    {t(fieldError)}
                  </p>
                ) : null}
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={busy}>
                  {submitting ? t('auth.recovery.sending') : t('auth.recovery.send')}
                </Button>
                <Link
                  to="/login"
                  className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
                >
                  {t('auth.recovery.backToLogin')}
                </Link>
              </div>
              <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
                {t('auth.forgotPasswordGoogle')}
              </p>
            </form>
          )
        ) : (
          <form className="space-y-5" onSubmit={(event) => void submitPassword(event)} noValidate>
            {user?.email ? (
              <p className="text-sm text-muted">{t('auth.recovery.forAccount', { email: user.email })}</p>
            ) : null}
            <Field label={t('auth.recovery.newPassword')} htmlFor="reset-password" required>
              <Input
                id="reset-password"
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFieldError(undefined)
                }}
                required
                disabled={busy}
                aria-describedby={fieldError ? 'reset-password-error' : 'reset-password-hint'}
              />
              {fieldError ? (
                <p id="reset-password-error" className="mt-1.5 text-xs text-negative">
                  {t(fieldError)}
                </p>
              ) : (
                <p id="reset-password-hint" className="mt-1.5 text-xs text-muted">
                  {t('auth.passwordRule')}
                </p>
              )}
            </Field>
            <Field label={t('auth.recovery.repeatPassword')} htmlFor="reset-repeat" required>
              <Input
                id="reset-repeat"
                type="password"
                name="repeat-password"
                autoComplete="new-password"
                value={repeat}
                onChange={(event) => {
                  setRepeat(event.target.value)
                  setFieldError(undefined)
                }}
                required
                disabled={busy}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {submitting ? t('auth.recovery.saving') : t('auth.recovery.save')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}