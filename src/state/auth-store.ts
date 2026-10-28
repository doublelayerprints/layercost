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

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'expired'
  | 'error'
  | 'unconfigured'

export interface AuthState {
  status: AuthStatus
  user: AuthSession['user'] | null
  error?: AuthErrorCode
  initialized: boolean

  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
  acknowledgeExpired: () => void
}

export interface AuthStoreDeps {
  isConfigured: () => boolean
  createGateway: () => Promise<AuthGateway>
}

function errorCode(error: unknown): AuthErrorCode {
  return error instanceof AuthError ? error.code : mapAuthError(error).code
}

export function createAuthStore(deps: AuthStoreDeps) {
  let gateway: AuthGateway | undefined
  let gatewayPromise: Promise<AuthGateway> | undefined
  let initialization: Promise<void> | undefined
  let subscribing = false

  return create<AuthState>()((set, get) => {
    const applySession = (session: AuthSession | null, event: AuthChangeEvent) => {
      if (session) {
        set({ status: 'authenticated', user: session.user, error: undefined })
        return
      }
      if (event === 'signedOut') {
        set((state) => ({
          status: state.user ? 'expired' : 'idle',
          user: null,
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

    return {
      status: 'idle',
      user: null,
      error: undefined,
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
              initialized: true,
            })
            return
          }

          set({ status: 'loading', error: undefined })
          try {
            const client = await ensureGateway()
            const session = await client.getSession()
            applySession(session, 'initial')
            set({ initialized: true })
          } catch (error) {
            set({
              status: 'error',
              error: errorCode(error),
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
          set({ status: 'unconfigured', error: 'notConfigured', user: null })
          return false
        }

        set({ status: 'loading', error: undefined })
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
          })
          return false
        }
      },

      signOut: async () => {
        set({ status: 'loading', error: undefined })
        try {
          if (gateway) await gateway.signOut()
        } catch {
          // The local session is cleared below even if the network fails.
        }
        set({ status: 'idle', user: null, error: undefined })
      },

      clearError: () => set({ error: undefined }),

      acknowledgeExpired: () => set({ status: 'idle' }),
    }
  })
}

export const useAuthStore = createAuthStore({
  isConfigured: isCloudConfigured,
  createGateway: createSupabaseAuthGateway,
})
