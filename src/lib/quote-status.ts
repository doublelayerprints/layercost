import type { QuoteStatus } from '@/domain/types'

/** Saved quotes are editable; sent and completed quotes are locked. */
export function isQuoteLocked(status: QuoteStatus): boolean {
  return status === 'sent' || status === 'completed'
}

export function isQuoteEditable(status: QuoteStatus, archived = false): boolean {
  return !archived && status === 'saved'
}

/** Status changes only move forward: saved → sent/completed, sent → completed. */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: [],
  saved: ['sent', 'completed'],
  sent: ['completed'],
  completed: [],
}

export function canTransitionQuoteStatus(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_STATUS_TRANSITIONS[from].includes(to)
}
