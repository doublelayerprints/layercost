import type { Quote } from '@/domain/types'
import { EMPTY_DRAFT_NAMES, EMPTY_LINE_NAMES } from './quote-defaults'

/**
 * True when the draft holds work the user would lose by starting over.
 * The draft is persisted, but it is not in the archive until it is saved.
 */
export function draftHasContent(draft: Quote): boolean {
  const emptyDraftName = EMPTY_DRAFT_NAMES[draft.locale]
  const emptyLineName = EMPTY_LINE_NAMES[draft.locale]
  // Any store edit bumps updatedAt, including pricing-only changes.
  if (draft.updatedAt !== draft.createdAt) return true
  if (draft.name.trim() !== emptyDraftName) return true
  if (draft.customer?.trim()) return true
  if (draft.lines.length > 1) return true

  const line = draft.lines[0]
  if (line) {
    if (line.name.trim() !== emptyLineName) return true
    if (line.timeSeconds > 0 || line.finishingSecondsPerUnit > 0) return true
    if (line.quantity !== 1) return true
    if (line.materials.some((usage) => usage.grams > 0)) return true
    if (line.color) return true
    if (line.discount) return true
    if (line.extraIds.length > 0) return true
    if (line.notes?.trim()) return true
    if (Object.values(line.overrides).some((value) => value !== undefined)) return true
  }

  if (draft.job.setupSeconds > 0 || draft.job.designSeconds > 0) return true
  if (draft.job.extraIds.length > 0) return true
  if (draft.job.notes?.trim()) return true

  return false
}
