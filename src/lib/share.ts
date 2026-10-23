import LZString from 'lz-string'
import type { Quote } from '@/domain/types'
import { quoteSchema } from '@/data/schemas'

interface SharedPayload {
  app: 'LayerCost'
  quote: Quote
}

export function encodeSharedQuote(quote: Quote): string {
  const payload: SharedPayload = {
    app: 'LayerCost',
    quote,
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeSharedQuote(encoded: string): Quote {
  const decompressed = LZString.decompressFromEncodedURIComponent(encoded)
  if (!decompressed) {
    throw new Error('Il link condiviso è vuoto o danneggiato.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decompressed) as unknown
  } catch {
    throw new Error('Il link condiviso non contiene dati validi.')
  }

  if (typeof parsed !== 'object' || parsed === null || !('quote' in parsed)) {
    throw new Error('Il link condiviso non contiene un preventivo.')
  }

  const result = quoteSchema.safeParse((parsed as { quote: unknown }).quote)
  if (!result.success) {
    throw new Error('Il preventivo condiviso non è valido o è incompleto.')
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
