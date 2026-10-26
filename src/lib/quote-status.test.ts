import { describe, expect, it } from 'vitest'
import { canTransitionQuoteStatus, isQuoteEditable, isQuoteLocked } from './quote-status'

describe('stato del preventivo', () => {
  it('solo i preventivi salvati e non archiviati sono modificabili', () => {
    expect(isQuoteEditable('saved')).toBe(true)
    expect(isQuoteEditable('saved', true)).toBe(false)
    expect(isQuoteEditable('sent')).toBe(false)
    expect(isQuoteEditable('completed')).toBe(false)
    expect(isQuoteEditable('draft')).toBe(false)
  })

  it('inviato e completato sono bloccati', () => {
    expect(isQuoteLocked('saved')).toBe(false)
    expect(isQuoteLocked('sent')).toBe(true)
    expect(isQuoteLocked('completed')).toBe(true)
  })

  it('le transizioni vanno solo in avanti', () => {
    expect(canTransitionQuoteStatus('saved', 'sent')).toBe(true)
    expect(canTransitionQuoteStatus('saved', 'completed')).toBe(true)
    expect(canTransitionQuoteStatus('sent', 'completed')).toBe(true)
    expect(canTransitionQuoteStatus('sent', 'saved')).toBe(false)
    expect(canTransitionQuoteStatus('completed', 'saved')).toBe(false)
    expect(canTransitionQuoteStatus('draft', 'saved')).toBe(false)
  })
})
