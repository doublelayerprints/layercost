import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FEEDBACK_SUBJECT,
  buildFeedbackPayload,
  hasFeedbackErrors,
  mapFeedbackStatus,
  normalizeFeedbackEndpoint,
  readFeedbackEndpoint,
  submitFeedback,
  validateFeedback,
  type FeedbackInput,
} from './feedback'

const validInput: FeedbackInput = {
  type: 'improvement',
  area: 'calculator',
  title: 'Ricordare l’ultima stampante usata',
  description: 'Quando apro il calcolatore vorrei ritrovare la stampante selezionata.',
  email: 'mario@example.com',
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

describe('validazione del suggerimento', () => {
  it('accetta un input valido anche senza email', () => {
    expect(validateFeedback(validInput)).toEqual({})
    expect(validateFeedback({ ...validInput, email: '' })).toEqual({})
    expect(hasFeedbackErrors(validateFeedback(validInput))).toBe(false)
  })

  it('richiede titolo e descrizione', () => {
    expect(validateFeedback({ ...validInput, title: '   ', description: '  ' })).toEqual({
      title: 'titleRequired',
      description: 'descriptionRequired',
    })
  })

  it('conta i limiti dopo il trim', () => {
    expect(validateFeedback({ ...validInput, title: 'a'.repeat(120) })).toEqual({})
    expect(validateFeedback({ ...validInput, title: 'a'.repeat(121) })).toEqual({
      title: 'titleTooLong',
    })
    expect(validateFeedback({ ...validInput, description: 'a'.repeat(2000) })).toEqual({})
    expect(validateFeedback({ ...validInput, description: 'a'.repeat(2001) })).toEqual({
      description: 'descriptionTooLong',
    })
    expect(validateFeedback({ ...validInput, title: `  ${'a'.repeat(120)}  ` })).toEqual({})
  })

  it('valida l’email solo se presente', () => {
    expect(validateFeedback({ ...validInput, email: 'mario@example' })).toEqual({
      email: 'emailInvalid',
    })
    expect(validateFeedback({ ...validInput, email: `${'a'.repeat(250)}@b.co` })).toEqual({
      email: 'emailTooLong',
    })
    expect(validateFeedback({ ...validInput, email: '   ' })).toEqual({})
  })

  it('richiede il consenso privacy', () => {
    expect(validateFeedback({ ...validInput, privacy: false })).toEqual({
      privacy: 'privacyRequired',
    })
  })
})

describe('payload Formspree', () => {
  it('mappa i campi, il subject e il reply-to', () => {
    expect(
      buildFeedbackPayload({
        ...validInput,
        title: ' Titolo ',
        description: ' Descrizione ',
        email: ' mario@example.com ',
        gotcha: ' bot ',
      }),
    ).toEqual({
      type: 'improvement',
      area: 'calculator',
      title: 'Titolo',
      description: 'Descrizione',
      email: 'mario@example.com',
      privacy: true,
      _subject: FEEDBACK_SUBJECT,
      _replyto: 'mario@example.com',
      _gotcha: 'bot',
    })
    expect(FEEDBACK_SUBJECT).toBe('LayerCost — suggerimento')
  })

  it('omette email e reply-to se l’email è vuota', () => {
    const payload = buildFeedbackPayload({ ...validInput, email: '   ', gotcha: '' })
    expect(payload).toEqual({
      type: 'improvement',
      area: 'calculator',
      title: validInput.title,
      description: validInput.description,
      privacy: true,
      _subject: FEEDBACK_SUBJECT,
      _gotcha: '',
    })
    expect('email' in payload).toBe(false)
    expect('_replyto' in payload).toBe(false)
  })
})

describe('endpoint Formspree', () => {
  it('accetta solo un form Formspree https', () => {
    expect(normalizeFeedbackEndpoint('https://formspree.io/f/abc123')).toBe(
      'https://formspree.io/f/abc123',
    )
    expect(normalizeFeedbackEndpoint(' https://formspree.io/f/abc-123/ ')).toBe(
      'https://formspree.io/f/abc-123/',
    )
    expect(normalizeFeedbackEndpoint(undefined)).toBeUndefined()
    expect(normalizeFeedbackEndpoint('')).toBeUndefined()
    expect(normalizeFeedbackEndpoint('http://formspree.io/f/abc123')).toBeUndefined()
    expect(normalizeFeedbackEndpoint('https://example.com/f/abc123')).toBeUndefined()
    expect(normalizeFeedbackEndpoint('https://formspree.io/f/')).toBeUndefined()
  })

  it('legge la variabile pubblica a runtime', () => {
    vi.stubEnv('VITE_FEEDBACK_ENDPOINT', 'https://formspree.io/f/test-feedback')
    expect(readFeedbackEndpoint()).toBe('https://formspree.io/f/test-feedback')

    vi.stubEnv('VITE_FEEDBACK_ENDPOINT', 'off')
    expect(readFeedbackEndpoint()).toBeUndefined()
  })
})

describe('errori HTTP', () => {
  it('mappa limiti, errori server e richieste rifiutate', () => {
    expect(mapFeedbackStatus(429)).toBe('rateLimited')
    expect(mapFeedbackStatus(500)).toBe('server')
    expect(mapFeedbackStatus(503)).toBe('server')
    expect(mapFeedbackStatus(400)).toBe('rejected')
    expect(mapFeedbackStatus(422)).toBe('rejected')
    expect(mapFeedbackStatus(302)).toBe('unknown')
    expect(mapFeedbackStatus(200)).toBe('unknown')
  })
})

describe('invio del suggerimento', () => {
  it('invia JSON con Accept, reply-to e subject', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse())
    const result = await submitFeedback(
      'https://formspree.io/f/test-feedback',
      validInput,
      fetchMock,
    )

    expect(result).toEqual({ ok: true, skipped: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://formspree.io/f/test-feedback')
    expect(init?.method).toBe('POST')
    expect(init?.credentials).toBe('omit')
    expect(new Headers(init?.headers).get('Accept')).toBe('application/json')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({
      type: 'improvement',
      area: 'calculator',
      title: validInput.title,
      description: validInput.description,
      email: 'mario@example.com',
      privacy: true,
      _subject: FEEDBACK_SUBJECT,
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
        submitFeedback('https://formspree.io/f/test-feedback', validInput, fetchMock),
      ).resolves.toEqual({ ok: false, error: expected })
    }
  })

  it('tratta un errore di rete come recuperabile', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    await expect(
      submitFeedback('https://formspree.io/f/test-feedback', validInput, fetchMock),
    ).resolves.toEqual({ ok: false, error: 'network' })
  })

  it('non invia nulla se l’endpoint manca', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(submitFeedback(undefined, validInput, fetchMock)).resolves.toEqual({
      ok: false,
      error: 'notConfigured',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('tratta un honeypot compilato come spam senza rete', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    await expect(
      submitFeedback(
        'https://formspree.io/f/test-feedback',
        { ...validInput, gotcha: 'bot' },
        fetchMock,
      ),
    ).resolves.toEqual({ ok: true, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
