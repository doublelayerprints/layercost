/**
 * Pure validation and transport helpers for the "suggestions" page.
 * The Formspree endpoint is a public build-time value: no secret and no
 * account. The page is the only place that calls this module.
 */

export const FEEDBACK_TITLE_MAX = 120
export const FEEDBACK_DESCRIPTION_MAX = 2000
export const FEEDBACK_EMAIL_MAX = 254
export const FEEDBACK_SUBJECT = 'LayerCost — suggerimento'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FORMSPREE_ENDPOINT_PATTERN = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+\/?$/

export const FEEDBACK_TYPES = ['improvement', 'bug', 'other'] as const
export type FeedbackType = (typeof FEEDBACK_TYPES)[number]

export const FEEDBACK_AREAS = [
  'calculator',
  'quotes',
  'printers',
  'materials',
  'tariffs',
  'extras',
  'import',
  'compare',
  'settings',
  'cloud',
  'other',
] as const
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]

export interface FeedbackInput {
  type: FeedbackType
  area: FeedbackArea
  title: string
  description: string
  email: string
  privacy: boolean
  gotcha: string
}

export type FeedbackField = 'title' | 'description' | 'email' | 'privacy'

export type FeedbackValidationCode =
  | 'titleRequired'
  | 'titleTooLong'
  | 'descriptionRequired'
  | 'descriptionTooLong'
  | 'emailInvalid'
  | 'emailTooLong'
  | 'privacyRequired'

export type FeedbackFieldErrors = Partial<Record<FeedbackField, FeedbackValidationCode>>

export interface FeedbackPayload {
  type: FeedbackType
  area: FeedbackArea
  title: string
  description: string
  email?: string
  privacy: boolean
  _subject: string
  _replyto?: string
  _gotcha: string
}

export type FeedbackErrorCode =
  'notConfigured' | 'network' | 'rateLimited' | 'server' | 'rejected' | 'unknown'

export type FeedbackResult =
  { ok: true; skipped: boolean } | { ok: false; error: FeedbackErrorCode }

/**
 * Accepts only a Formspree form URL. The value is public and visible in the
 * bundle, but keeping the shape strict prevents a typo from becoming an
 * arbitrary outbound endpoint.
 */
export function normalizeFeedbackEndpoint(value: string | undefined): string | undefined {
  const endpoint = value?.trim()
  if (!endpoint) return undefined
  return FORMSPREE_ENDPOINT_PATTERN.test(endpoint) ? endpoint : undefined
}

export function readFeedbackEndpoint(): string | undefined {
  return normalizeFeedbackEndpoint(import.meta.env.VITE_FEEDBACK_ENDPOINT)
}

export function validateFeedback(input: FeedbackInput): FeedbackFieldErrors {
  const errors: FeedbackFieldErrors = {}
  const title = input.title.trim()
  const description = input.description.trim()
  const email = input.email.trim()

  if (!title) {
    errors.title = 'titleRequired'
  } else if (title.length > FEEDBACK_TITLE_MAX) {
    errors.title = 'titleTooLong'
  }

  if (!description) {
    errors.description = 'descriptionRequired'
  } else if (description.length > FEEDBACK_DESCRIPTION_MAX) {
    errors.description = 'descriptionTooLong'
  }

  if (email) {
    if (email.length > FEEDBACK_EMAIL_MAX) {
      errors.email = 'emailTooLong'
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'emailInvalid'
    }
  }

  if (!input.privacy) {
    errors.privacy = 'privacyRequired'
  }

  return errors
}

export function hasFeedbackErrors(errors: FeedbackFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function buildFeedbackPayload(input: FeedbackInput): FeedbackPayload {
  const title = input.title.trim()
  const description = input.description.trim()
  const email = input.email.trim()
  const base: FeedbackPayload = {
    type: input.type,
    area: input.area,
    title,
    description,
    privacy: input.privacy,
    _subject: FEEDBACK_SUBJECT,
    _gotcha: input.gotcha.trim(),
  }
  if (!email) return base
  return { ...base, email, _replyto: email }
}

export function mapFeedbackStatus(status: number): FeedbackErrorCode {
  if (status === 429) return 'rateLimited'
  if (status >= 500) return 'server'
  if (status >= 400) return 'rejected'
  return 'unknown'
}

/**
 * Sends the suggestion to Formspree. A filled honeypot is treated as spam: the
 * page shows the same success state but no network call is made.
 */
export async function submitFeedback(
  endpoint: string | undefined,
  input: FeedbackInput,
  fetchImpl: typeof fetch = fetch,
): Promise<FeedbackResult> {
  if (!endpoint) return { ok: false, error: 'notConfigured' }
  if (input.gotcha.trim()) return { ok: true, skipped: true }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildFeedbackPayload(input)),
      credentials: 'omit',
    })

    if (response.ok) return { ok: true, skipped: false }
    return { ok: false, error: mapFeedbackStatus(response.status) }
  } catch {
    return { ok: false, error: 'network' }
  }
}
