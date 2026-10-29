import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from './database.types'

const mocks = vi.hoisted(() => ({
  loadSupabaseClient: vi.fn(),
}))

vi.mock('./client', () => ({
  loadSupabaseClient: mocks.loadSupabaseClient,
}))

import {
  AuthError,
  createSupabaseAuthGateway,
  mapAuthError,
} from './auth'

const session = {
  user: {
    id: 'user-1',
    email: 'owner@example.test',
    identities: [{ provider: 'email' }, { provider: 'google' }],
    app_metadata: { provider: 'email' },
  },
} as unknown as Session

function createClientStub() {
  const auth = {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    linkIdentity: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  }
  return {
    client: { auth } as unknown as SupabaseClient<Database>,
    auth,
  }
}

beforeEach(() => {
  mocks.loadSupabaseClient.mockReset()
})

describe('Supabase auth gateway', () => {
  it('espone i provider collegati all’utente', async () => {
    const { client, auth } = createClientStub()
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()
    const result = await gateway.getSession()

    expect(result?.user.providers).toEqual(['email', 'google'])
  })

  it('avvia Google con il redirect richiesto', async () => {
    const { client, auth } = createClientStub()
    auth.signInWithOAuth.mockResolvedValue({ data: { provider: 'google', url: 'x' }, error: null })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()
    await gateway.signInWithOAuth('google', 'https://layercost.vercel.app/')

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://layercost.vercel.app/' },
    })
  })

  it('collega Google con linkIdentity', async () => {
    const { client, auth } = createClientStub()
    auth.linkIdentity.mockResolvedValue({ data: { provider: 'google', url: 'x' }, error: null })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()
    await gateway.linkIdentity('google', 'https://layercost.vercel.app/')

    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://layercost.vercel.app/' },
    })
  })

  it('scambia il codice PKCE e restituisce la sessione', async () => {
    const { client, auth } = createClientStub()
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()
    const result = await gateway.exchangeCodeForSession('auth-code')

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code')
    expect(result.user.id).toBe('user-1')
    expect(result.user.providers).toEqual(['email', 'google'])
  })
})

describe('auth error mapping', () => {
  it('mappa gli errori OAuth di GoTrue e del provider', () => {
    expect(mapAuthError({ code: 'provider_disabled' }).code).toBe('oauthProviderDisabled')
    expect(mapAuthError({ code: 'signup_disabled' }).code).toBe('oauthSignupDisabled')
    expect(mapAuthError({ code: 'identity_already_exists' }).code).toBe('oauthIdentityExists')
    expect(mapAuthError({ code: 'manual_linking_disabled' }).code).toBe('manualLinkingDisabled')
    expect(mapAuthError({ code: 'bad_code_verifier' }).code).toBe('oauthCallback')
    expect(mapAuthError({ code: 'access_denied' }).code).toBe('oauthCancelled')
    expect(mapAuthError({ code: 'redirect_uri_mismatch' }).code).toBe('oauthConfig')
  })

  it('mantiene gli errori esistenti', () => {
    expect(mapAuthError({ code: 'invalid_credentials' }).code).toBe('invalidCredentials')
    expect(mapAuthError({ code: 'email_not_confirmed' }).code).toBe('emailNotConfirmed')
    expect(mapAuthError({ code: 'over_request_rate_limit' }).code).toBe('tooManyRequests')
    expect(mapAuthError({ code: 'un_codice_nuovo' }).code).toBe('unknown')
  })

  it('riconosce la rete e non rimappa un AuthError', () => {
    expect(mapAuthError(new TypeError('offline')).code).toBe('network')
    expect(mapAuthError({ name: 'AuthRetryableFetchError' }).code).toBe('network')

    const original = new AuthError('oauthCallback')
    expect(mapAuthError(original)).toBe(original)
  })

  it('propaga l’errore del code exchange', async () => {
    const { client, auth } = createClientStub()
    auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: 'bad_code_verifier' },
    })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()

    await expect(gateway.exchangeCodeForSession('bad')).rejects.toMatchObject({
      code: 'oauthCallback',
    })
  })

  it('propaga il provider disabilitato', async () => {
    const { client, auth } = createClientStub()
    auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: null },
      error: { code: 'provider_disabled' },
    })
    mocks.loadSupabaseClient.mockResolvedValue(client)

    const gateway = await createSupabaseAuthGateway()

    await expect(gateway.signInWithOAuth('google', 'https://app.test/')).rejects.toMatchObject({
      code: 'oauthProviderDisabled',
    })
  })
})
