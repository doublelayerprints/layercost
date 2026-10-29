import { create } from 'zustand'
import {
  AuthError,
  createSupabaseAuthGateway,
  mapAuthError,
  type AuthChangeEvent,
  type AuthErrorCode,
  type AuthGateway,
  type AuthSession,
} from '@/data/cloud/auth'
import { isCloudConfigured } from '@/data/cloud/client'
import {
  clearOAuthCallbackParams,
  oauthRedirectUrl,
  readOAuthCallback,
  type OAuthCallback,
  type OAuthProvider,
} from '@/data/cloud/oauth'

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'expired'
  | 'error'
  | 'unconfigured'

export type OAuthStatus = 'idle' | 'redirecting' | 'linking'

export interface OAuthCallbackState {
  error: AuthErrorCode
  navigateToLogin: boolean
}

export interface AuthState {
  status: AuthStatus
  user: AuthSession['user'] | null
  error?: AuthErrorCode
  oauth: OAuthStatus
  oauthCallback?: OAuthCallbackState
  initialized: boolean

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  linkGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  acknowledgeExpired: () => void
  acknowledgeOAuthCallback: () => void
  resetOAuth: () => void
}

export interface OAuthDeps {
  readCallback: () => OAuthCallback | undefined
  redirectTo: () => string
  clearParams: () => void
}

export interface AuthStoreDeps {
  isConfigured: () => boolean
  createGateway: () => Promise<AuthGateway>
  oauth?: OAuthDeps
}

const defaultOAuthDeps: OAuthDeps = {
  readCallback: readOAuthCallback,
  redirectTo: oauthRedirectUrl,
  clearParams: clearOAuthCallbackParams,
}

function errorCode(error: unknown): AuthErrorCode {
  return error instanceof AuthError ? error.code : mapAuthError(error).code
}

export function createAuthStore(deps: AuthStoreDeps) {
  let gateway: AuthGateway | undefined
  let gatewayPromise: Promise<AuthGateway> | undefined
  let initialization: Promise<void> | undefined
  let subscribing = false

  const oauth = deps.oauth ?? defaultOAuthDeps

  return create<AuthState>()((set, get) => {
    const applySession = (session: AuthSession | null, event: AuthChangeEvent) => {
      if (session) {
        set({
          status: 'authenticated',
          user: session.user,
          error: undefined,
          oauth: 'idle',
          oauthCallback: undefined,
        })
        return
      }
      if (event === 'signedOut') {
        set((state) => ({
          status: state.user ? 'expired' : 'idle',
          user: null,
          oauth: 'idle',
          oauthCallback: undefined,
        }))
        return
      }
      set({ status: 'idle', user: null })
    }

    const ensureGateway = (): Promise<AuthGateway> => {
      if (gateway) return Promise.resolve(gateway)
      if (!gatewayPromise) {
        gatewayPromise = deps
          .createGateway()
          .then((created) => {
            gateway = created
            if (!subscribing) {
              subscribing = true
              created.onChange((session, event) => applySession(session, event))
            }
            return created
          })
          .catch((error: unknown) => {
            gatewayPromise = undefined
            throw error
          })
      }
      return gatewayPromise
    }

    const startOAuth = async (
      mode: Exclude<OAuthStatus, 'idle'>,
      run: (client: AuthGateway, redirectTo: string) => Promise<void>,
    ) => {
      if (!deps.isConfigured()) {
        set({ status: 'unconfigured', error: 'notConfigured', user: null, oauth: 'idle' })
        return
      }

      set({ oauth: mode, error: undefined, oauthCallback: undefined })
      try {
        const client = await ensureGateway()
        await run(client, oauth.redirectTo())
      } catch (error) {
        set({ oauth: 'idle', error: errorCode(error) })
      }
    }

    /**
     * A failed Google callback is a login failure only when there is no
     * session. "Collega Google" runs while the user is already authenticated:
     * cancelling it must keep that session and surface the error in Settings.
     */
    const failCallback = async (client: AuthGateway, code: AuthErrorCode) => {
      const session = await client.getSession().catch(() => null)
      if (session) {
        set({
          status: 'authenticated',
          user: session.user,
          error: code,
          oauth: 'idle',
          oauthCallback: undefined,
          initialized: true,
        })
        return
      }

      const current = get().user
      if (current) {
        set({
          status: 'authenticated',
          user: current,
          error: code,
          oauth: 'idle',
          oauthCallback: undefined,
          initialized: true,
        })
        return
      }

      set({
        status: 'idle',
        user: null,
        error: undefined,
        oauth: 'idle',
        oauthCallback: { error: code, navigateToLogin: true },
        initialized: true,
      })
    }

    const provider: OAuthProvider = 'google'

    return {
      status: 'idle',
      user: null,
      error: undefined,
      oauth: 'idle',
      oauthCallback: undefined,
      initialized: false,

      initialize: () => {
        if (get().initialized) return Promise.resolve()
        if (initialization) return initialization

        initialization = (async () => {
          if (!deps.isConfigured()) {
            set({
              status: 'unconfigured',
              user: null,
              error: undefined,
              oauth: 'idle',
              oauthCallback: undefined,
              initialized: true,
            })
            return
          }

          set({ status: 'loading', error: undefined })
          try {
            const client = await ensureGateway()
            const callback = oauth.readCallback()

            if (callback) {
              // The code or the provider error is single-use: remove it from
              // the address bar before attempting the exchange.
              oauth.clearParams()

              if (callback.kind === 'error') {
                await failCallback(client, callback.code)
                return
              }

              try {
                const session = await client.exchangeCodeForSession(callback.code)
                applySession(session, 'signedIn')
                set({ initialized: true })
              } catch (error) {
                await failCallback(client, errorCode(error))
              }
              return
            }

            const session = await client.getSession()
            applySession(session, 'initial')
            set({ initialized: true })
          } catch (error) {
            set({
              status: 'error',
              error: errorCode(error),
              oauth: 'idle',
              initialized: false,
            })
          }
        })().finally(() => {
          initialization = undefined
        })

        return initialization
      },

      signIn: async (email, password) => {
        if (!deps.isConfigured()) {
          set({ status: 'unconfigured', error: 'notConfigured', user: null, oauth: 'idle' })
          return false
        }

        set({ status: 'loading', error: undefined, oauthCallback: undefined })
        try {
          const client = await ensureGateway()
          const session = await client.signIn(email.trim(), password)
          applySession(session, 'signedIn')
          return true
        } catch (error) {
          set({
            status: 'idle',
            user: null,
            error: errorCode(error),
            oauth: 'idle',
          })
          return false
        }
      },

      signInWithGoogle: () =>
        startOAuth('redirecting', (client, redirectTo) =>
          client.signInWithOAuth(provider, redirectTo),
        ),

      linkGoogle: () =>
        startOAuth('linking', (client, redirectTo) =>
          client.linkIdentity(provider, redirectTo),
        ),

      signOut: async () => {
        set({ status: 'loading', error: undefined, oauth: 'idle', oauthCallback: undefined })
        try {
          if (gateway) await gateway.signOut()
        } catch {
          // The local session is cleared below even if the network fails.
        }
        set({ status: 'idle', user: null, error: undefined, oauth: 'idle', oauthCallback: undefined })
      },

      clearError: () => set({ error: undefined, oauthCallback: undefined }),

      acknowledgeExpired: () => set({ status: 'idle' }),

      acknowledgeOAuthCallback: () =>
        set((state) => ({
          oauthCallback: state.oauthCallback
            ? { ...state.oauthCallback, navigateToLogin: false }
            : undefined,
        })),

      resetOAuth: () => set({ oauth: 'idle' }),
    }
  })
}

export const useAuthStore = createAuthStore({
  isConfigured: isCloudConfigured,
  createGateway: createSupabaseAuthGateway,
})
