import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import type { MessageKey } from '@/i18n'
import { Alert, Button, Card, Field, Input, PageHeader, Textarea } from '@/components/ui'
import {
  ACCESS_REQUEST_EMAIL_MAX,
  ACCESS_REQUEST_MESSAGE_MAX,
  ACCESS_REQUEST_NAME_MAX,
  hasAccessRequestErrors,
  readAccessRequestEndpoint,
  submitAccessRequest,
  validateAccessRequest,
  type AccessRequestErrorCode,
  type AccessRequestFieldErrors,
  type AccessRequestInput,
  type AccessRequestValidationCode,
} from './request-access'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'unavailable'

const validationKeys: Record<AccessRequestValidationCode, MessageKey> = {
  emailRequired: 'access.validation.emailRequired',
  emailInvalid: 'access.validation.emailInvalid',
  emailTooLong: 'access.validation.emailTooLong',
  nameTooLong: 'access.validation.nameTooLong',
  messageTooLong: 'access.validation.messageTooLong',
  privacyRequired: 'access.validation.privacyRequired',
}

const errorKeys: Record<AccessRequestErrorCode, MessageKey> = {
  notConfigured: 'access.error.notConfigured',
  network: 'access.error.network',
  rateLimited: 'access.error.rateLimited',
  server: 'access.error.server',
  rejected: 'access.error.rejected',
  unknown: 'access.error.unknown',
}

const emptyValues: AccessRequestInput = {
  email: '',
  name: '',
  message: '',
  privacy: false,
  gotcha: '',
}

export function RequestAccessPage() {
  const { t } = useI18n()
  const endpoint = readAccessRequestEndpoint()
  const configured = endpoint !== undefined
  const [values, setValues] = useState<AccessRequestInput>(emptyValues)
  const [errors, setErrors] = useState<AccessRequestFieldErrors>({})
  const [status, setStatus] = useState<FormStatus>(configured ? 'idle' : 'unavailable')
  const [errorCode, setErrorCode] = useState<AccessRequestErrorCode>()

  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const privacyRef = useRef<HTMLInputElement>(null)
  const successTitleRef = useRef<HTMLHeadingElement>(null)
  const privacyHintId = useId()
  const privacyErrorId = useId()

  useEffect(() => {
    if (status === 'success') successTitleRef.current?.focus()
  }, [status])

  const update = <K extends keyof AccessRequestInput>(key: K, value: AccessRequestInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const focusFirstError = (nextErrors: AccessRequestFieldErrors) => {
    if (nextErrors.email) {
      emailRef.current?.focus()
    } else if (nextErrors.name) {
      nameRef.current?.focus()
    } else if (nextErrors.message) {
      messageRef.current?.focus()
    } else if (nextErrors.privacy) {
      privacyRef.current?.focus()
    }
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (status === 'unavailable' || status === 'submitting') return

    const nextErrors = validateAccessRequest(values)
    setErrors(nextErrors)
    if (hasAccessRequestErrors(nextErrors)) {
      setStatus('idle')
      setErrorCode(undefined)
      focusFirstError(nextErrors)
      return
    }

    setStatus('submitting')
    setErrorCode(undefined)
    const result = await submitAccessRequest(endpoint, values)
    if (result.ok) {
      setStatus('success')
      return
    }
    setErrorCode(result.error)
    setStatus('error')
  }

  const busy = status === 'submitting'
  const disabled = status === 'unavailable' || busy

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t('access.title')} description={t('access.description')} />
        <Card role="status" aria-live="polite" className="mt-6 p-6">
          <h2
            ref={successTitleRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-title text-ink"
          >
            {t('access.success.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{t('access.success.body')}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('access.success.noEmail')}</p>
          <Link
            to="/"
            className="mt-5 inline-block text-sm font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
          >
            {t('access.success.back')}
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('access.title')} description={t('access.description')} />

      {!configured ? (
        <div className="mt-6">
          <Alert tone="warning" title={t('access.unavailable.title')}>
            <p>{t('access.unavailable.body')}</p>
          </Alert>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        {status === 'error' && errorCode ? (
          <div role="alert" className="mb-5">
            <Alert tone="danger" title={t('access.error.title')}>
              <p>{t(errorKeys[errorCode])}</p>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={disabled}
                onClick={() => void handleSubmit()}
              >
                {t('access.retry')}
              </Button>
            </Alert>
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-muted">{t('access.intro')}</p>

        <form
          noValidate
          aria-busy={busy}
          className="relative mt-5 space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Field
            label={t('access.email')}
            htmlFor="request-access-email"
            hint={t('access.emailHint')}
            error={errors.email ? t(validationKeys[errors.email]) : undefined}
            required
          >
            <Input
              ref={emailRef}
              id="request-access-email"
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={ACCESS_REQUEST_EMAIL_MAX}
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              disabled={disabled}
              required
            />
          </Field>

          <Field
            label={t('access.name')}
            htmlFor="request-access-name"
            hint={t('access.nameHint')}
            error={errors.name ? t(validationKeys[errors.name]) : undefined}
          >
            <Input
              ref={nameRef}
              id="request-access-name"
              type="text"
              name="name"
              autoComplete="name"
              maxLength={ACCESS_REQUEST_NAME_MAX}
              value={values.name}
              onChange={(event) => update('name', event.target.value)}
              disabled={disabled}
            />
          </Field>

          <Field
            label={t('access.message')}
            htmlFor="request-access-message"
            hint={t('access.messageHint')}
            error={errors.message ? t(validationKeys[errors.message]) : undefined}
          >
            <Textarea
              ref={messageRef}
              id="request-access-message"
              name="message"
              maxLength={ACCESS_REQUEST_MESSAGE_MAX}
              value={values.message}
              onChange={(event) => update('message', event.target.value)}
              disabled={disabled}
            />
          </Field>

          <p id={privacyHintId} className="text-xs leading-relaxed text-muted">
            {t('access.privacyNote')}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5">
              <input
                ref={privacyRef}
                id="request-access-privacy"
                type="checkbox"
                name="privacy"
                checked={values.privacy}
                onChange={(event) => update('privacy', event.target.checked)}
                disabled={disabled}
                required
                aria-invalid={errors.privacy ? true : undefined}
                aria-describedby={
                  errors.privacy ? `${privacyHintId} ${privacyErrorId}` : privacyHintId
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-data"
              />
              <label htmlFor="request-access-privacy" className="text-sm leading-snug text-ink">
                {t('access.privacyConsent')}
                <span className="ml-0.5 text-negative" aria-hidden="true">
                  *
                </span>
              </label>
            </div>
            {errors.privacy ? (
              <p id={privacyErrorId} role="alert" className="text-xs font-medium text-negative">
                {t(validationKeys[errors.privacy])}
              </p>
            ) : null}
          </div>

          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="request-access-gotcha">{t('access.honeypot')}</label>
            <input
              id="request-access-gotcha"
              type="text"
              name="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              value={values.gotcha}
              onChange={(event) => update('gotcha', event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button type="submit" disabled={disabled}>
              {busy ? t('access.submitting') : t('access.submit')}
            </Button>
            <Link
              to="/"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('access.success.back')}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
