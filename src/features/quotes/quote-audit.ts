import type { WorkspaceMember } from '@/data/cloud/gateway'
import type { MessageKey } from '@/i18n'

type Translate = (key: MessageKey) => string

/**
 * Resolves the name shown in quote audit labels. The current user is always
 * "you"; other members use their visible profile name. A missing directory or
 * profile falls back to the generic member label, never to the email.
 */
export function quoteMemberName(
  userId: string | undefined,
  currentUserId: string | undefined,
  members: WorkspaceMember[],
  t: Translate,
): string | undefined {
  if (!userId) return undefined
  if (currentUserId && userId === currentUserId) return t('quote.audit.you')

  const member = members.find((candidate) => candidate.userId === userId)
  const name = member?.displayName?.trim()
  return name ? name : t('quote.audit.member')
}
