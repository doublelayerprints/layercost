import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import type { MessageKey } from '@/i18n'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import {
  FEEDBACK_AREAS,
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_EMAIL_MAX,
  FEEDBACK_TITLE_MAX,
  FEEDBACK_TYPES,
  hasFeedbackErrors,
  readFeedbackEndpoint,
  submitFeedback,
  validateFeedback,
  type FeedbackArea,
  type FeedbackErrorCode,
  type FeedbackFieldErrors,
  type FeedbackInput,
  type FeedbackType,
  type FeedbackValidationCode,
} from './feedback'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error' | 'unavailable'

const validationKeys: Record<FeedbackValidationCode, MessageKey> = {
  titleRequired: 'feedback.validation.titleRequired',
  titleTooLong: 'feedback.validation.titleTooLong',
  descriptionRequired: 'feedback.validation.descriptionRequired',
  descriptionTooLong: 'feedback.validation.descriptionTooLong',
  emailInvalid: 'feedback.validation.emailInvalid',
  emailTooLong: 'feedback.validation.emailTooLong',
  privacyRequired: 'feedback.validation.privacyRequired',
}

const errorKeys: Record<FeedbackErrorCode, MessageKey> = {
  notConfigured: 'feedback.error.notConfigured',
  network: 'feedback.error.network',
  rateLimited: 'feedback.error.rateLimited',
  server: 'feedback.error.server',
  rejected: 'feedback.error.rejected',
  unknown: 'feedback.error.unknown',
}

const typeKeys: Record<FeedbackType, MessageKey> = {
  improvement: 'feedback.type.improvement',
  bug: 'feedback.type.bug',
  other: 'feedback.type.otherKind',
}

const areaKeys: Record<FeedbackArea, MessageKey> = {
  calculator: 'feedback.area.calculator',
  quotes: 'feedback.area.quotes',
  printers: 'feedback.area.printers',
  materials: 'feedback.area.materials',
  tariffs: 'feedback.area.tariffs',
  extras: 'feedback.area.extras',
  import: 'feedback.area.import',
  compare: 'feedback.area.compare',
  settings: 'feedback.area.settings',
  cloud: 'feedback.area.cloud',
  other: 'feedback.area.otherArea',
}

const emptyValues: FeedbackInput = {
  type: 'improvement',
  area: 'other',
  title: '',
  description: '',
  email: '',
  privacy: false,
  gotcha: '',
}

export function FeedbackPage() {
  const { t } = useI18n()
  const endpoint = readFeedbackEndpoint()
  const configured = endpoint !== undefined
  const [values, setValues] = useState<FeedbackInput>(emptyValues)
  const [errors, setErrors] = useState<FeedbackFieldErrors>({})
  const [status, setStatus] = useState<FormStatus>(configured ? 'idle' : 'unavailable')
  const [errorCode, setErrorCode] = useState<FeedbackErrorCode>()

  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const privacyRef = useRef<HTMLInputElement>(null)
  const successTitleRef = useRef<HTMLHeadingElement>(null)
  const privacyHintId = useId()
  const privacyErrorId = useId()

  useEffect(() => {
    if (status === 'success') successTitleRef.current?.focus()
  }, [status])

  const update = <K extends keyof FeedbackInput>(key: K, value: FeedbackInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const focusFirstError = (nextErrors: FeedbackFieldErrors) => {
    if (nextErrors.title) {
      titleRef.current?.focus()
    } else if (nextErrors.description) {
      descriptionRef.current?.focus()
    } else if (nextErrors.email) {
      emailRef.current?.focus()
    } else if (nextErrors.privacy) {
      privacyRef.current?.focus()
    }
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (status === 'unavailable' || status === 'submitting') return

    const nextErrors = validateFeedback(values)
    setErrors(nextErrors)
    if (hasFeedbackErrors(nextErrors)) {
      setStatus('idle')
      setErrorCode(undefined)
      focusFirstError(nextErrors)
      return
    }

    setStatus('submitting')
    setErrorCode(undefined)
    const result = await submitFeedback(endpoint, values)
    if (result.ok) {
      setStatus('success')
      return
    }
    setErrorCode(result.error)
    setStatus('error')
  }

  const startAnother = () => {
    setValues(emptyValues)
    setErrors({})
    setErrorCode(undefined)
    setStatus('idle')
    window.setTimeout(() => titleRef.current?.focus(), 0)
  }

  const busy = status === 'submitting'
  const disabled = status === 'unavailable' || busy

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t('feedback.title')} description={t('feedback.description')} />
        <Card role="status" aria-live="polite" className="mt-6 p-6">
          <h2
            ref={successTitleRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-title text-ink outline-none"
          >
            {t('feedback.success.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{t('feedback.success.body')}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('feedback.success.noEmail')}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to="/calculator"
              className="text-sm font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
            >
              {t('feedback.success.back')}
            </Link>
            <Link
              to="/docs/primi-passi"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('feedback.success.docs')}
            </Link>
            <Button variant="secondary" size="sm" onClick={startAnother}>
              {t('feedback.success.another')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('feedback.title')} description={t('feedback.description')} />

      {!configured ? (
        <div className="mt-6">
          <Alert tone="warning" title={t('feedback.unavailable.title')}>
            <p>{t('feedback.unavailable.body')}</p>
          </Alert>
        </div>
      ) : null}

      <Card className="mt-6 p-5 sm:p-6">
        {status === 'error' && errorCode ? (
          <div role="alert" className="mb-5">
            <Alert tone="danger" title={t('feedback.error.title')}>
              <p>{t(errorKeys[errorCode])}</p>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={disabled}
                onClick={() => void handleSubmit()}
              >
                {t('feedback.retry')}
              </Button>
            </Alert>
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-muted">{t('feedback.intro')}</p>

        <form
          noValidate
          aria-busy={busy}
          className="relative mt-5 space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('feedback.type')} htmlFor="feedback-type">
              <Select
                id="feedback-type"
                name="type"
                value={values.type}
                onChange={(event) => update('type', event.target.value as FeedbackType)}
                disabled={disabled}
              >
                {FEEDBACK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(typeKeys[type])}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('feedback.area')} htmlFor="feedback-area">
              <Select
                id="feedback-area"
                name="area"
                value={values.area}
                onChange={(event) => update('area', event.target.value as FeedbackArea)}
                disabled={disabled}
              >
                {FEEDBACK_AREAS.map((area) => (
                  <option key={area} value={area}>
                    {t(areaKeys[area])}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label={t('feedback.titleLabel')}
            htmlFor="feedback-title"
            hint={t('feedback.titleHint')}
            error={errors.title ? t(validationKeys[errors.title]) : undefined}
            required
          >
            <Input
              ref={titleRef}
              id="feedback-title"
              type="text"
              name="title"
              maxLength={FEEDBACK_TITLE_MAX}
              value={values.title}
              onChange={(event) => update('title', event.target.value)}
              disabled={disabled}
              required
            />
          </Field>

          <Field
            label={t('feedback.descriptionLabel')}
            htmlFor="feedback-description"
            hint={t('feedback.descriptionHint')}
            error={errors.description ? t(validationKeys[errors.description]) : undefined}
            required
          >
            <Textarea
              ref={descriptionRef}
              id="feedback-description"
              name="description"
              rows={7}
              maxLength={FEEDBACK_DESCRIPTION_MAX}
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
              disabled={disabled}
              required
            />
          </Field>

          <Field
            label={t('feedback.email')}
            htmlFor="feedback-email"
            hint={t('feedback.emailHint')}
            error={errors.email ? t(validationKeys[errors.email]) : undefined}
          >
            <Input
              ref={emailRef}
              id="feedback-email"
              type="email"
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={FEEDBACK_EMAIL_MAX}
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              disabled={disabled}
            />
          </Field>

          <p id={privacyHintId} className="text-xs leading-relaxed text-muted">
            {t('feedback.privacyNote')}
          </p>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5">
              <input
                ref={privacyRef}
                id="feedback-privacy"
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
              <label htmlFor="feedback-privacy" className="text-sm leading-snug text-ink">
                {t('feedback.privacyConsent')}
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
            <label htmlFor="feedback-gotcha">{t('feedback.honeypot')}</label>
            <input
              id="feedback-gotcha"
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
              {busy ? t('feedback.submitting') : t('feedback.submit')}
            </Button>
            <Link
              to="/docs/primi-passi"
              className="text-sm text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {t('feedback.success.docs')}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
