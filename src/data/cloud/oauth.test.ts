import { describe, expect, it } from 'vitest'
import {
  buildOAuthRedirectUrl,
  mapOAuthErrorCode,
  parseOAuthCallback,
} from './oauth'

describe('OAuth callback', () => {
  it('legge il codice PKCE dal query string', () => {
    expect(parseOAuthCallback('?code=abc123')).toEqual({ kind: 'code', code: 'abc123' })
  })

  it('accetta il query string senza punto interrogativo', () => {
    expect(parseOAuthCallback('code=abc123&state=x')).toEqual({ kind: 'code', code: 'abc123' })
  })

  it('ignora parametri non OAuth', () => {
    expect(parseOAuthCallback('?utm_source=test')).toBeUndefined()
    expect(parseOAuthCallback('')).toBeUndefined()
  })

  it('mappa l’annullamento dell’utente', () => {
    expect(parseOAuthCallback('?error=access_denied')).toEqual({
      kind: 'error',
      code: 'oauthCancelled',
      description: undefined,
    })
  })

  it('mappa gli errori di configurazione e provider', () => {
    expect(parseOAuthCallback('?error=redirect_uri_mismatch')?.kind).toBe('error')
    expect(parseOAuthCallback('?error=redirect_uri_mismatch')).toMatchObject({
      code: 'oauthConfig',
    })
    expect(parseOAuthCallback('?error=provider_disabled')).toMatchObject({
      code: 'oauthProviderDisabled',
    })
    expect(parseOAuthCallback('?error=signup_disabled')).toMatchObject({
      code: 'oauthSignupDisabled',
    })
    expect(parseOAuthCallback('?error=identity_already_exists')).toMatchObject({
      code: 'oauthIdentityExists',
    })
    expect(parseOAuthCallback('?error=manual_linking_disabled')).toMatchObject({
      code: 'manualLinkingDisabled',
    })
  })

  it('usa error_code quando error è assente', () => {
    expect(parseOAuthCallback('?error_code=bad_oauth_state')).toMatchObject({
      code: 'oauthCallback',
    })
  })

  it('tratta un errore sconosciuto come errore del callback', () => {
    expect(parseOAuthCallback('?error=qualcosa_di_strano')).toMatchObject({
      code: 'oauthCallback',
    })
  })

  it('preferisce l’errore al codice se arrivano entrambi', () => {
    expect(parseOAuthCallback('?code=abc&error=access_denied')).toMatchObject({
      kind: 'error',
      code: 'oauthCancelled',
    })
  })
})

describe('OAuth error mapping', () => {
  it('mappa i codici GoTrue e del provider', () => {
    expect(mapOAuthErrorCode('provider_disabled')).toBe('oauthProviderDisabled')
    expect(mapOAuthErrorCode('signup_disabled')).toBe('oauthSignupDisabled')
    expect(mapOAuthErrorCode('identity_already_exists')).toBe('oauthIdentityExists')
    expect(mapOAuthErrorCode('manual_linking_disabled')).toBe('manualLinkingDisabled')
    expect(mapOAuthErrorCode('bad_code_verifier')).toBe('oauthCallback')
  })

  it('non cattura i codici non OAuth', () => {
    expect(mapOAuthErrorCode('invalid_credentials')).toBeUndefined()
    expect(mapOAuthErrorCode('over_request_rate_limit')).toBeUndefined()
    expect(mapOAuthErrorCode(undefined)).toBeUndefined()
    expect(mapOAuthErrorCode('')).toBeUndefined()
  })
})

describe('OAuth redirect URL', () => {
  it('aggiunge sempre la barra finale', () => {
    expect(buildOAuthRedirectUrl('https://layercost.vercel.app')).toBe(
      'https://layercost.vercel.app/',
    )
    expect(buildOAuthRedirectUrl('http://127.0.0.1:5173/')).toBe(
      'http://127.0.0.1:5173/',
    )
  })
})
