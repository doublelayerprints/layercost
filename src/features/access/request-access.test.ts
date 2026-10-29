import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACCESS_REQUEST_SUBJECT,
  buildAccessRequestPayload,
  hasAccessRequestErrors,
  mapAccessRequestStatus,
  normalizeAccessRequestEndpoint,
  readAccessRequestEndpoint,
  submitAccessRequest,
  validateAccessRequest,
  type AccessRequestInput,
} from './request-access'

const validInput: AccessRequestInput = {
  email: 'mario@example.com',
  name: 'Mario',
  message: 'Vorrei usare il cloud condiviso.',
  privacy: true,
  gotcha: '',
}

function jsonResponse(status = 200): Response {
  return new Response('{"ok":true}', {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('validazione della richiesta di accesso', () => {
  it('accetta un input valido', () => {
    expect(validateAccessRequest(validInput)).toEqual({})
    expect(hasAccessRequestErrors(validateAccessRequest(validInput))).toBe(false)
  })

  it('richiede un’email', () => {
    expect(validateAccessRequest({ ...validInput, email: '   ' })).toEqual({
      email: 'emailRequired',
    })
  })

  it('rifiuta un’email non valida', () => {
    expect(validateAccessRequest({ ...validInput, email: 'mario@example' })).toEqual({
      email: 'emailInvalid',
    })
    expect(validateAccessRequest({ ...validInput, email: 'mario example.com' })).toEqual({
      email: 'emailInvalid',
    })
  })

  it('rifiuta un’email oltre 254 caratteri', () => {
    const email = `${'a'.repeat(250)}@b.co`
    expect(email.length).toBeGreaterThan(254)
    expect(validateAccessRequest({ ...validInput, email })).toEqual({
      email: 'emailTooLong',
    })
  })

  it('conta i limiti dopo il trim', () => {
    expect(validateAccessRequest({ ...validInput, name: 'a'.repeat(80) })).toEqual({})
    expect(validateAccessRequest({ ...validInput, name: 'a'.repeat(81) })).toEqual({
      name: 'nameTooLong',
    })
    expect(validateAccessRequest({ ...validInput, message: 'a'.repeat(500) })).toEqual({})
    expect(validateAccessRequest({ ...validInput, message: 'a'.repeat(501) })).toEqual({
      message: 'messageTooLong',
    })
    expect(validateAccessRequest({ ...validInput, name: `  ${'a'.repeat(80)}  ` })).toEqual({})
  })

  it('richiede il consenso privacy', () => {
    expect(validateAccessRequest({ ...validInput, privacy: false })).toEqual({
      privacy: 'privacyRequired',
    })
  })

  it('segnala più errori insieme', () => {
    const errors = validateAccessRequest({
      email: '',
      name: 'a'.repeat(81),
      message: 'a'.repeat(501),
      privacy: false,
      gotcha: '',
    })
    expect(errors).toEqual({
      email: 'emailRequired',
      name: 'nameTooLong',
      message: 'messageTooLong',
      privacy: 'privacyRequired',
    })
    expect(hasAccessRequestErrors(errors)).toBe(true)
  })
})

describe('payload Formspree', () => {
  it('mappa i campi, il subject e il reply-to', () => {
    expect(
      buildAccessRequestPayload({
        email: ' mario@example.com ',
        name: ' Mario ',
        message: ' Ciao ',
        privacy: true,
        gotcha: ' bot ',
      }),
    ).toEqual({
      email: 'mario@example.com',
      name: 'Mario',
      message: 'Ciao',
      privacy: true,
      _subject: ACCESS_REQUEST_SUBJECT,
      _replyto: 'mario@example.com',
      _gotcha: 'bot',
    })
    expect(ACCESS_REQUEST_SUBJECT).toBe('LayerCost — richiesta accesso cloud')
  })

  it('conserva nome e messaggio vuoti come stringhe', () => {
    expect(
      buildAccessRequestPayload({ ...validInput, name: '', message: '', gotcha: '' }),
    ).toMatchObject({ name: '', message: '', _gotcha: '' })
  })
})

describe('endpoint Formspree', () => {
  it('accetta solo un form Formspree https', () => {
    expect(normalizeAccessRequestEndpoint('https://formspree.io/f/abc123')).toBe(
      'https://formspree.io/f/abc123',
    )
    expect(normalizeAccessRequestEndpoint(' https://formspree.io/f/abc-123/ ')).toBe(
      'https://formspree.io/f/abc-123/',
    )
    expect(normalizeAccessRequestEndpoint(undefined)).toBeUndefined()
    expect(normalizeAccessRequestEndpoint('')).toBeUndefined()
    expect(normalizeAccessRequestEndpoint('http://formspree.io/f/abc123')).toBeUndefined()
    expect(normalizeAccessRequestEndpoint('https://example.com/f/abc123')).toBeUndefined()
    expect(normalizeAccessRequestEndpoint('https://formspree.io/f/')).toBeUndefined()
  })

  it('legge la variabile pubblica a runtime', () => {
    vi.stubEnv('VITE_ACCESS_REQUEST_ENDPOINT', 'https://formspree.io/f/test-form')
    expect(readAccessRequestEndpoint()).toBe('https://formspree.io/f/test-form')

    vi.stubEnv('VITE_ACCESS_REQUEST_ENDPOINT', 'off')
    expect(readAccessRequestEndpoint()).toBeUndefined()
  })
})

describe('errori HTTP', () => {
  it('mappa limiti, errori server e richieste rifiutate', () => {
    expect(mapAccessRequestStatus(429)).toBe('rateLimited')
    expect(mapAccessRequestStatus(500)).toBe('server')
    expect(mapAccessRequestStatus(503)).toBe('server')
    expect(mapAccessRequestStatus(400)).toBe('rejected')
    expect(mapAccessRequestStatus(422)).toBe('rejected')
    expect(mapAccessRequestStatus(302)).toBe('unknown')
    expect(mapAccessRequestStatus(200)).toBe('unknown')
  })
})

describe('invio della richiesta', () => {
  it('invia JSON con Accept, reply-to e subject', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse())
    const result = await submitAccessRequest(
      'https://formspree.io/f/test-form',
      validInput,
      fetchMock,
    )

    expect(result).toEqual({ ok: true, skipped: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://formspree.io/f/test-form')
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('omit')
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'mario@example.com',
      name: 'Mario',
      message: 'Vorrei usare il cloud condiviso.',
      privacy: true,
      _subject: ACCESS_REQUEST_SUBJECT,
      _replyto: 'mario@example.com',
      _gotcha: '',
    })
  })

  it('mappa 429, 5xx e 4xx', async () => {
    for (const [status, expected] of [
      [429, 'rateLimited'],
      [500, 'server'],
      [422, 'rejected'],
    ] as const) {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(status))
      await expect(
        submitAccessRequest('https://formspree.io/f/test-form', validInput, fetchMock),
      ).resolves.toEqual({ ok: false, error: expected })
    }
  })

  it('tratta un errore di rete come recuperabile', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    await expect(
      submitAccessRequest('https://formspree.io/f/test-form', validInput, fetchMock),
    ).resolves.toEqual({ ok: false, error: 'network' })
  })

  it('non invia nulla se l’endpoint manca', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(submitAccessRequest(undefined, validInput, fetchMock)).resolves.toEqual({
      ok: false,
      error: 'notConfigured',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tratta un honeypot compilato come spam senza rete', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(
      submitAccessRequest(
        'https://formspree.io/f/test-form',
        { ...validInput, gotcha: 'bot' },
        fetchMock,
      ),
    ).resolves.toEqual({ ok: true, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
