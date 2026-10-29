import type { AuthErrorCode } from './auth'

export type OAuthProvider = 'google'

export type OAuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'error'; code: AuthErrorCode; description?: string }

/**
 * Error codes that can arrive either from GoTrue or from the provider redirect.
 * Keeping the mapping here lets `mapAuthError` and the callback parser agree.
 */
const OAUTH_ERROR_CODES: Record<string, AuthErrorCode> = {
  access_denied: 'oauthCancelled',
  redirect_uri_mismatch: 'oauthConfig',
  provider_disabled: 'oauthProviderDisabled',
  oauth_provider_not_supported: 'oauthProviderDisabled',
  signup_disabled: 'oauthSignupDisabled',
  email_address_not_authorized: 'oauthSignupDisabled',
  identity_already_exists: 'oauthIdentityExists',
  manual_linking_disabled: 'manualLinkingDisabled',
  bad_oauth_callback: 'oauthCallback',
  bad_oauth_state: 'oauthCallback',
  bad_code_verifier: 'oauthCallback',
  flow_state_not_found: 'oauthCallback',
  flow_state_expired: 'oauthCallback',
  server_error: 'oauthCallback',
  temporarily_unavailable: 'oauthCallback',
}

/** Maps a GoTrue or provider error code, or returns undefined when it is not OAuth-specific. */
export function mapOAuthErrorCode(value: string | null | undefined): AuthErrorCode | undefined {
  if (!value) return undefined
  return OAUTH_ERROR_CODES[value]
}

/**
 * Parses the query string returned by Supabase. PKCE puts `code` and `error`
 * in the query string, so the hash used by HashRouter stays untouched.
 */
export function parseOAuthCallback(search: string): OAuthCallback | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const error = params.get('error')
  const errorCode = params.get('error_code')

  if (error || errorCode) {
    return {
      kind: 'error',
      code:
        mapOAuthErrorCode(error) ??
        mapOAuthErrorCode(errorCode) ??
        'oauthCallback',
      description: params.get('error_description') ?? undefined,
    }
  }

  const code = params.get('code')
  if (code) return { kind: 'code', code }

  return undefined
}

/** The callback always returns to the site root; the trailing slash avoids allow-list edge cases. */
export function buildOAuthRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/`
}

export function readOAuthCallback(): OAuthCallback | undefined {
  if (typeof window === 'undefined') return undefined
  return parseOAuthCallback(window.location.search)
}

export function oauthRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  return buildOAuthRedirectUrl(window.location.origin)
}

/** Removes the one-time OAuth parameters without touching the router hash. */
export function clearOAuthCallbackParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.search) return
  url.search = ''
  window.history.replaceState({}, '', `${url.pathname}${url.hash}`)
}
