import { describe, expect, it } from 'vitest'
import { landingRedirect } from './routing'

describe('instradamento della landing', () => {
  it('mostra la landing a un visitatore nuovo', () => {
    expect(
      landingRedirect({ forced: false, hasVisited: false, authenticated: false }),
    ).toBeUndefined()
  })

  it('manda al calcolatore chi ha già dati o il marker di visita', () => {
    expect(
      landingRedirect({ forced: false, hasVisited: true, authenticated: false }),
    ).toBe('/calculator')
  })

  it('manda al calcolatore un utente autenticato anche senza dati locali', () => {
    expect(
      landingRedirect({ forced: false, hasVisited: false, authenticated: true }),
    ).toBe('/calculator')
  })

  it('/welcome mostra sempre la landing', () => {
    expect(
      landingRedirect({ forced: true, hasVisited: true, authenticated: true }),
    ).toBeUndefined()
  })
})
