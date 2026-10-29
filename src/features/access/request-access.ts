/**
 * Pure validation and transport helpers for the public "request access" page.
 * The Formspree endpoint is a public build-time value: no secret, no account and
 * no automatic user creation. The page is the only place that calls this module.
 */

export const ACCESS_REQUEST_EMAIL_MAX = 254
export const ACCESS_REQUEST_NAME_MAX = 80
export const ACCESS_REQUEST_MESSAGE_MAX = 500
export const ACCESS_REQUEST_SUBJECT = 'LayerCost — richiesta accesso cloud'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FORMSPREE_ENDPOINT_PATTERN = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+\/?$/

export interface AccessRequestInput {
  email: string
  name: string
  message: string
  privacy: boolean
  gotcha: string
}

export type AccessRequestField = 'email' | 'name' | 'message' | 'privacy'

export type AccessRequestValidationCode =
  | 'emailRequired'
  | 'emailInvalid'
  | 'emailTooLong'
  | 'nameTooLong'
  | 'messageTooLong'
  | 'privacyRequired'

export type AccessRequestFieldErrors = Partial<
  Record<AccessRequestField, AccessRequestValidationCode>
>

export interface AccessRequestPayload {
  email: string
  name: string
  message: string
  privacy: boolean
  _subject: string
  _replyto: string
  _gotcha: string
}

export type AccessRequestErrorCode =
  'notConfigured' | 'network' | 'rateLimited' | 'server' | 'rejected' | 'unknown'

export type AccessRequestResult =
  { ok: true; skipped: boolean } | { ok: false; error: AccessRequestErrorCode }

/**
 * Accepts only a Formspree form URL. The value is public and visible in the
 * bundle, but keeping the shape strict prevents a typo from becoming an
 * arbitrary outbound endpoint.
 */
export function normalizeAccessRequestEndpoint(value: string | undefined): string | undefined {
  const endpoint = value?.trim()
  if (!endpoint) return undefined
  return FORMSPREE_ENDPOINT_PATTERN.test(endpoint) ? endpoint : undefined
}

export function readAccessRequestEndpoint(): string | undefined {
  return normalizeAccessRequestEndpoint(import.meta.env.VITE_ACCESS_REQUEST_ENDPOINT)
}

export function validateAccessRequest(input: AccessRequestInput): AccessRequestFieldErrors {
  const errors: AccessRequestFieldErrors = {}
  const email = input.email.trim()

  if (!email) {
    errors.email = 'emailRequired'
  } else if (email.length > ACCESS_REQUEST_EMAIL_MAX) {
    errors.email = 'emailTooLong'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'emailInvalid'
  }

  if (input.name.trim().length > ACCESS_REQUEST_NAME_MAX) {
    errors.name = 'nameTooLong'
  }
  if (input.message.trim().length > ACCESS_REQUEST_MESSAGE_MAX) {
    errors.message = 'messageTooLong'
  }
  if (!input.privacy) {
    errors.privacy = 'privacyRequired'
  }

  return errors
}

export function hasAccessRequestErrors(errors: AccessRequestFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function buildAccessRequestPayload(input: AccessRequestInput): AccessRequestPayload {
  const email = input.email.trim()
  return {
    email,
    name: input.name.trim(),
    message: input.message.trim(),
    privacy: input.privacy,
    _subject: ACCESS_REQUEST_SUBJECT,
    _replyto: email,
    _gotcha: input.gotcha.trim(),
  }
}

export function mapAccessRequestStatus(status: number): AccessRequestErrorCode {
  if (status === 429) return 'rateLimited'
  if (status >= 500) return 'server'
  if (status >= 400) return 'rejected'
  return 'unknown'
}

/**
 * Sends the request to Formspree. A filled honeypot is treated as spam: the
 * page shows the same success state but no network call is made.
 */
export async function submitAccessRequest(
  endpoint: string | undefined,
  input: AccessRequestInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AccessRequestResult> {
  if (!endpoint) return { ok: false, error: 'notConfigured' }
  if (input.gotcha.trim()) return { ok: true, skipped: true }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildAccessRequestPayload(input)),
      credentials: 'omit',
    })

    if (response.ok) return { ok: true, skipped: false }
    return { ok: false, error: mapAccessRequestStatus(response.status) }
  } catch {
    return { ok: false, error: 'network' }
  }
}
