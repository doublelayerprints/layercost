import LZString from 'lz-string'
import type { Quote } from '@/domain/types'
import { quoteSchema } from '@/data/schemas'

interface SharedPayload {
  app: 'LayerCost'
  quote: Quote
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

export function encodeSharedQuote(quote: Quote): string {
  const payload: SharedPayload = {
    app: 'LayerCost',
    // Audit metadata belongs to the workspace, not to the shared document.
    quote: { ...quote, createdBy: undefined, updatedBy: undefined },
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeSharedQuote(encoded: string): Quote {
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

  const result = quoteSchema.safeParse(quote)
  if (!result.success) {
    throw new ShareError('invalidQuote', 'Il preventivo condiviso non è valido o è incompleto.')
  }
  return result.data as unknown as Quote
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
