import type { Quote } from '@/domain/types'
import type { MessageKey } from '@/i18n'

export interface QuoteStatusDisplay {
  labelKey: MessageKey
  tone: 'neutral' | 'success' | 'warning' | 'info' | 'danger'
}

/** One badge for the archive list, the detail page and the print header. */
export function quoteStatusDisplay(quote: Quote): QuoteStatusDisplay {
  if (!quote.result) return { labelKey: 'quote.status.notRecalculable', tone: 'danger' }
  if (quote.archived) return { labelKey: 'quote.status.archived', tone: 'warning' }
  switch (quote.status) {
    case 'sent':
      return { labelKey: 'quote.status.sent', tone: 'info' }
    case 'completed':
      return { labelKey: 'quote.status.completed', tone: 'success' }
    case 'draft':
      return { labelKey: 'quote.status.draft', tone: 'neutral' }
    default:
      return { labelKey: 'quote.status.saved', tone: 'success' }
  }
}
