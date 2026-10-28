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
  signOut: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
}

function createFakeGateway(initialSession: AuthSession | null = null): FakeGateway {
  let listener: ((session: AuthSession | null, event: AuthChangeEvent) => void) | undefined
  const getSession = vi.fn(async () => initialSession)
  const signIn = vi.fn(async () => initialSession as AuthSession)
  const signOut = vi.fn(async () => {})
  const gateway: AuthGateway = {
    getSession,
    signIn,
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
    signOut,
    getSession,
  }
}

const user = {
  user: {
    id: 'user-1',
    email: 'owner@example.test',
  },
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
})
