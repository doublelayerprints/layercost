import { describe, expect, it, vi } from 'vitest'
import {
  AuthError,
  type AuthChangeEvent,
  type AuthGateway,
  type AuthSession,
} from '@/data/cloud/auth'
import { createAuthStore } from './auth-store'

interface FakeGateway {
  gateway: AuthGateway
  emit: (session: AuthSession | null, event: AuthChangeEvent) => void
  signIn: ReturnType<typeof vi.fn>
  signInWithOAuth: ReturnType<typeof vi.fn>
  linkIdentity: ReturnType<typeof vi.fn>
  exchangeCodeForSession: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
}

function createFakeGateway(initialSession: AuthSession | null = null): FakeGateway {
  let listener: ((session: AuthSession | null, event: AuthChangeEvent) => void) | undefined
  const getSession = vi.fn(async () => initialSession)
  const signIn = vi.fn(async () => initialSession as AuthSession)
  const signInWithOAuth = vi.fn(async () => {})
  const linkIdentity = vi.fn(async () => {})
  const exchangeCodeForSession = vi.fn(async () => initialSession as AuthSession)
  const signOut = vi.fn(async () => {})
  const gateway: AuthGateway = {
    getSession,
    signIn,
    signInWithOAuth,
    linkIdentity,
    exchangeCodeForSession,
    signOut,
    onChange: (callback) => {
      listener = callback
      return () => {
        listener = undefined
      }
    },
  }

  return {
    gateway,
    emit: (session, event) => listener?.(session, event),
    signIn,
    signInWithOAuth,
    linkIdentity,
    exchangeCodeForSession,
    signOut,
    getSession,
  }
}

const user = {
  user: {
    id: 'user-1',
    email: 'owner@example.test',
    providers: ['email'],
  },
}

const oauthDeps = {
  readCallback: () => undefined,
  redirectTo: () => 'https://app.test/',
  clearParams: vi.fn(),
}

describe('auth store', () => {
  it('resta unconfigured senza env e non crea il gateway', async () => {
    const createGateway = vi.fn(async () => createFakeGateway().gateway)
    const store = createAuthStore({ isConfigured: () => false, createGateway })

    await store.getState().initialize()

    expect(createGateway).not.toHaveBeenCalled()
    expect(store.getState().status).toBe('unconfigured')
    expect(store.getState().initialized).toBe(true)
    expect(store.getState().user).toBeNull()
  })

  it('inizializza senza sessione e resta idle', async () => {
    const fake = createFakeGateway(null)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })

    await store.getState().initialize()

    expect(store.getState().status).toBe('idle')
    expect(store.getState().initialized).toBe(true)
    expect(store.getState().user).toBeNull()
  })

  it('ripristina una sessione esistente', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })

    await store.getState().initialize()

    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.email).toBe('owner@example.test')
  })

  it('inizializza una sola volta il gateway', async () => {
    const fake = createFakeGateway(user)
    const createGateway = vi.fn(async () => fake.gateway)
    const store = createAuthStore({ isConfigured: () => true, createGateway })

    await Promise.all([store.getState().initialize(), store.getState().initialize()])

    expect(createGateway).toHaveBeenCalledTimes(1)
    expect(fake.getSession).toHaveBeenCalledTimes(1)
  })

  it('mappa un errore di inizializzazione', async () => {
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => {
        throw new AuthError('network')
      },
    })

    await store.getState().initialize()

    expect(store.getState().status).toBe('error')
    expect(store.getState().error).toBe('network')
    expect(store.getState().initialized).toBe(false)
  })

  it('accede e normalizza l’email', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })

    const ok = await store.getState().signIn('  owner@example.test  ', 'password')

    expect(ok).toBe(true)
    expect(fake.signIn).toHaveBeenCalledWith('owner@example.test', 'password')
    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.id).toBe('user-1')
  })

  it('mostra un errore di credenziali senza perdere la modalità locale', async () => {
    const fake = createFakeGateway(user)
    fake.signIn.mockRejectedValueOnce(new AuthError('invalidCredentials'))
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })

    const ok = await store.getState().signIn('owner@example.test', 'wrong')

    expect(ok).toBe(false)
    expect(store.getState().status).toBe('idle')
    expect(store.getState().error).toBe('invalidCredentials')
    expect(store.getState().user).toBeNull()
  })

  it('rifiuta il login quando il cloud non è configurato', async () => {
    const store = createAuthStore({
      isConfigured: () => false,
      createGateway: vi.fn(async () => createFakeGateway().gateway),
    })

    const ok = await store.getState().signIn('owner@example.test', 'password')

    expect(ok).toBe(false)
    expect(store.getState().status).toBe('unconfigured')
    expect(store.getState().error).toBe('notConfigured')
  })

  it('esce e torna idle', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })
    await store.getState().initialize()

    await store.getState().signOut()

    expect(fake.signOut).toHaveBeenCalledTimes(1)
    expect(store.getState().status).toBe('idle')
    expect(store.getState().user).toBeNull()
  })

  it('distingue una sessione scaduta da un logout volontario', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })
    await store.getState().initialize()
    expect(store.getState().status).toBe('authenticated')

    fake.emit(null, 'signedOut')

    expect(store.getState().status).toBe('expired')
    expect(store.getState().user).toBeNull()

    store.getState().acknowledgeExpired()
    expect(store.getState().status).toBe('idle')
  })

  it('accetta un evento di login esterno', async () => {
    const fake = createFakeGateway(null)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
    })
    await store.getState().initialize()

    fake.emit(user, 'signedIn')

    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.email).toBe('owner@example.test')
  })

  it('avvia Google con il provider e il redirect corretti', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: oauthDeps,
    })

    await store.getState().signInWithGoogle()

    expect(fake.signInWithOAuth).toHaveBeenCalledWith('google', 'https://app.test/')
    expect(store.getState().oauth).toBe('redirecting')
    expect(store.getState().error).toBeUndefined()
  })

  it('mappa un errore del provider Google', async () => {
    const fake = createFakeGateway(user)
    fake.signInWithOAuth.mockRejectedValueOnce(new AuthError('oauthProviderDisabled'))
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: oauthDeps,
    })

    await store.getState().signInWithGoogle()

    expect(store.getState().oauth).toBe('idle')
    expect(store.getState().error).toBe('oauthProviderDisabled')
    expect(store.getState().status).toBe('idle')
  })

  it('scambia il codice del callback e apre la sessione', async () => {
    const fake = createFakeGateway(null)
    fake.exchangeCodeForSession.mockResolvedValueOnce(user)
    const clearParams = vi.fn()
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: {
        ...oauthDeps,
        readCallback: () => ({ kind: 'code', code: 'auth-code' }),
        clearParams,
      },
    })

    await store.getState().initialize()

    expect(clearParams).toHaveBeenCalledTimes(1)
    expect(fake.exchangeCodeForSession).toHaveBeenCalledWith('auth-code')
    expect(fake.getSession).not.toHaveBeenCalled()
    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.id).toBe('user-1')
    expect(store.getState().oauthCallback).toBeUndefined()
  })

  it('porta alla pagina di accesso quando il callback contiene un errore', async () => {
    const fake = createFakeGateway(null)
    const clearParams = vi.fn()
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: {
        ...oauthDeps,
        readCallback: () => ({ kind: 'error', code: 'oauthCancelled' }),
        clearParams,
      },
    })

    await store.getState().initialize()

    expect(clearParams).toHaveBeenCalledTimes(1)
    expect(fake.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(store.getState().status).toBe('idle')
    expect(store.getState().oauthCallback).toEqual({
      error: 'oauthCancelled',
      navigateToLogin: true,
    })

    store.getState().acknowledgeOAuthCallback()
    expect(store.getState().oauthCallback?.navigateToLogin).toBe(false)
    expect(store.getState().oauthCallback?.error).toBe('oauthCancelled')
  })

  it('mappa un code exchange fallito', async () => {
    const fake = createFakeGateway(null)
    fake.exchangeCodeForSession.mockRejectedValueOnce(new AuthError('oauthCallback'))
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: {
        ...oauthDeps,
        readCallback: () => ({ kind: 'code', code: 'expired-code' }),
      },
    })

    await store.getState().initialize()

    expect(store.getState().status).toBe('idle')
    expect(store.getState().oauthCallback).toEqual({
      error: 'oauthCallback',
      navigateToLogin: true,
    })
  })

  it('mantiene la sessione se il collegamento Google viene annullato', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: {
        ...oauthDeps,
        readCallback: () => ({ kind: 'error', code: 'oauthCancelled' }),
      },
    })

    await store.getState().initialize()

    expect(store.getState().status).toBe('authenticated')
    expect(store.getState().user?.id).toBe('user-1')
    expect(store.getState().error).toBe('oauthCancelled')
    expect(store.getState().oauthCallback).toBeUndefined()
  })

  it('collega Google mentre l’utente è già autenticato', async () => {
    const fake = createFakeGateway(user)
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: oauthDeps,
    })
    await store.getState().initialize()

    await store.getState().linkGoogle()

    expect(fake.linkIdentity).toHaveBeenCalledWith('google', 'https://app.test/')
    expect(store.getState().oauth).toBe('linking')
    expect(store.getState().status).toBe('authenticated')
  })

  it('mappa il collegamento manuale disabilitato', async () => {
    const fake = createFakeGateway(user)
    fake.linkIdentity.mockRejectedValueOnce(new AuthError('manualLinkingDisabled'))
    const store = createAuthStore({
      isConfigured: () => true,
      createGateway: async () => fake.gateway,
      oauth: oauthDeps,
    })
    await store.getState().initialize()

    await store.getState().linkGoogle()

    expect(store.getState().oauth).toBe('idle')
    expect(store.getState().error).toBe('manualLinkingDisabled')
  })
})
