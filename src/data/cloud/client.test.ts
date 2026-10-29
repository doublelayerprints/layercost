import { afterEach, describe, expect, it, vi } from 'vitest'
import { isGoogleAuthEnabled } from './client'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Google button flag', () => {
  it('resta spento senza configurazione cloud', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true')
    expect(isGoogleAuthEnabled()).toBe(false)
  })

  it('si accende solo con cloud e flag esplicito', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', 'true')
    expect(isGoogleAuthEnabled()).toBe(true)
  })

  it('resta spento con un valore diverso da true', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    vi.stubEnv('VITE_AUTH_GOOGLE_ENABLED', '1')
    expect(isGoogleAuthEnabled()).toBe(false)
  })
})
