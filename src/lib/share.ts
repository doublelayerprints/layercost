import LZString from 'lz-string'
import type { Quote } from '@/domain/types'
import { quoteSchema, sharedQuoteSchema } from '@/data/schemas'
import { projectSharedQuote, type SharedQuote } from './share-projection'

interface SharedPayload {
  app: 'LayerCost'
  quote: SharedQuote
}

export type ShareErrorCode = 'empty' | 'invalidData' | 'noQuote' | 'invalidQuote'

export class ShareError extends Error {
  readonly code: ShareErrorCode

  constructor(code: ShareErrorCode, message: string) {
    super(message)
    this.name = 'ShareError'
    this.code = code
  }
}

/**
 * Builds the public payload. It carries a customer projection, never the whole
 * quote: the economic snapshot and the internal result stay in the workspace.
 */
export function encodeSharedQuote(quote: Quote): string {
  const payload: SharedPayload = {
    app: 'LayerCost',
    quote: projectSharedQuote(quote, quote.result),
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

/**
 * Reads a shared document. New links carry the customer projection; links built
 * before the audit fix carry the whole quote and are still accepted.
 */
export function decodeSharedQuote(encoded: string): SharedQuote {
  const decompressed = LZString.decompressFromEncodedURIComponent(encoded)
  if (!decompressed) {
    throw new ShareError('empty', 'Il link condiviso è vuoto o danneggiato.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decompressed) as unknown
  } catch {
    throw new ShareError('invalidData', 'Il link condiviso non contiene dati validi.')
  }

  if (typeof parsed !== 'object' || parsed === null || !('quote' in parsed)) {
    throw new ShareError('noQuote', 'Il link condiviso non contiene un preventivo.')
  }

  // Shared links created before schema v2 have no locale: keep them working as Italian.
  const candidate = (parsed as { quote: unknown }).quote
  const quote =
    typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
      ? { locale: 'it', ...candidate }
      : candidate

  const current = sharedQuoteSchema.safeParse(quote)
  if (current.success) return current.data as SharedQuote

  // Legacy links: re-project the old payload so the view receives the same
  // customer-safe shape instead of the full internal quote.
  const legacy = quoteSchema.safeParse(quote)
  if (legacy.success) {
    const full = legacy.data as unknown as Quote
    return projectSharedQuote(full, full.result)
  }
  throw new ShareError('invalidQuote', 'Il preventivo condiviso non è valido o è incompleto.')
}

export function buildShareUrl(quote: Quote): string {
  const encoded = encodeSharedQuote(quote)
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/share?d=${encoded}`
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
