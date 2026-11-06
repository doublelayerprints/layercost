import type { Session } from '@supabase/supabase-js'
import { loadSupabaseClient } from './client'
import { mapOAuthErrorCode, type OAuthProvider } from './oauth'

export interface AuthUser {
  id: string
  email?: string
  /** Providers linked to this user, e.g. `email` and `google`. */
  providers: string[]
}

export interface AuthSession {
  user: AuthUser
}

export type AuthChangeEvent =
  | 'initial'
  | 'signedIn'
  | 'signedOut'
  | 'tokenRefreshed'
  | 'userUpdated'
  | 'passwordRecovery'
  | 'other'

export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'tooManyRequests'
  | 'network'
  | 'notConfigured'
  | 'signupLimitReached'
  | 'emailExists'
  | 'oauthCancelled'
  | 'oauthProviderDisabled'
  | 'oauthSignupDisabled'
  | 'oauthIdentityExists'
  | 'oauthConfig'
  | 'oauthCallback'
  | 'manualLinkingDisabled'
  | 'weakPassword'
  | 'recoveryLinkInvalid'
  | 'unknown'

export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message = code) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export interface AuthGateway {
  getSession: () => Promise<AuthSession | null>
  signIn: (email: string, password: string) => Promise<AuthSession>
  signUp: (email: string, password: string) => Promise<AuthSession>
  signInWithOAuth: (provider: OAuthProvider, redirectTo: string) => Promise<void>
  linkIdentity: (provider: OAuthProvider, redirectTo: string) => Promise<void>
  /**
   * Exchanges the PKCE code and reports whether the link was a password
   * recovery: GoTrue's `redirectType` is the authoritative signal (the URL
   * carries no `type` for PKCE links), so the store never guesses.
   */
  exchangeCodeForSession: (code: string) => Promise<{ session: AuthSession; recovery: boolean }>
  /**
   * Sends the recovery email (EVO-11). `redirectTo` must be an allow-listed
   * URL: Supabase appends `?code=…` and the app exchanges it with PKCE.
   */
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>
  /** Sets a new password for the user of the current (recovery) session. */
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  onChange: (listener: (session: AuthSession | null, event: AuthChangeEvent) => void) => () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function providersOf(session: Session): string[] {
  const identities = session.user.identities?.map((identity) => identity.provider) ?? []
  if (identities.length > 0) return [...new Set(identities)]

  const provider = session.user.app_metadata?.provider
  return typeof provider === 'string' ? [provider] : []
}

function toSession(session: Session | null): AuthSession | null {
  if (!session) return null
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? undefined,
      providers: providersOf(session),
    },
  }
}

function mapEvent(event: string): AuthChangeEvent {
  switch (event) {
    case 'INITIAL_SESSION':
      return 'initial'
    case 'SIGNED_IN':
      return 'signedIn'
    case 'SIGNED_OUT':
      return 'signedOut'
    case 'TOKEN_REFRESHED':
      return 'tokenRefreshed'
    case 'USER_UPDATED':
      return 'userUpdated'
    case 'PASSWORD_RECOVERY':
      return 'passwordRecovery'
    default:
      return 'other'
  }
}

/**
 * The signup cap lives in the `before-user-created` Auth Hook (EVO-2,
 * ADR-0027): when it rejects, GoTrue surfaces the raw Postgres error as
 * `{ code: 'P0001', message: 'signup_limit_reached' }`.
 */
export function mapAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error

  if (error instanceof TypeError) return new AuthError('network')
  if (isRecord(error) && error.name === 'AuthRetryableFetchError') {
    return new AuthError('network')
  }

  const message = isRecord(error) && typeof error.message === 'string' ? error.message : ''
  if (message.includes('signup_limit_reached')) return new AuthError('signupLimitReached')

  const code = isRecord(error) && typeof error.code === 'string' ? error.code : undefined
  if (code) {
    const oauthCode = mapOAuthErrorCode(code)
    if (oauthCode) return new AuthError(oauthCode)
  }

  switch (code) {
    case 'invalid_credentials':
      return new AuthError('invalidCredentials')
    case 'email_not_confirmed':
      return new AuthError('emailNotConfirmed')
    case 'user_already_exists':
      return new AuthError('emailExists')
    case 'weak_password':
      return new AuthError('weakPassword')
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
      return new AuthError('recoveryLinkInvalid')
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
    case 'too_many_requests':
      return new AuthError('tooManyRequests')
    default:
      return new AuthError('unknown')
  }
}

/** Adapts Supabase Auth to the small interface used by the Zustand store. */
export async function createSupabaseAuthGateway(): Promise<AuthGateway> {
  const client = await loadSupabaseClient()

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw mapAuthError(error)
      return toSession(data.session)
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw mapAuthError(error)
      const session = toSession(data.session)
      if (!session) throw new AuthError('emailNotConfirmed')
      return session
    },

    // With auto-confirm (EVO-2) the session starts immediately; the first
    // login dialog and the automatic personal workspace handle the rest.
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password })
      if (error) throw mapAuthError(error)
      const session = toSession(data.session)
      if (!session) throw new AuthError('emailNotConfirmed')
      return session
    },

    async signInWithOAuth(provider, redirectTo) {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error) throw mapAuthError(error)
    },

    async linkIdentity(provider, redirectTo) {
      const { error } = await client.auth.linkIdentity({
        provider,
        options: { redirectTo },
      })
      if (error) throw mapAuthError(error)
    },

    async exchangeCodeForSession(code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code)
      if (error) throw mapAuthError(error)
      const session = toSession(data.session)
      if (!session) throw new AuthError('oauthCallback')
      // `redirectType` is present on the PKCE exchange result but missing from
      // the emitted types; read it defensively and fall back to the URL marker.
      const redirectType = (data as { redirectType?: string | null }).redirectType
      return { session, recovery: redirectType === 'recovery' }
    },

    async requestPasswordReset(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw mapAuthError(error)
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw mapAuthError(error)
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (!error) return
      // A global sign-out needs the network; always clear the local session too.
      const local = await client.auth.signOut({ scope: 'local' })
      if (local.error) throw mapAuthError(local.error)
    },

    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        listener(toSession(session), mapEvent(event))
      })
      return () => data.subscription.unsubscribe()
    },
  }
}
