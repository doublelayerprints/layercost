import { useI18n } from '@/app/i18n-context'
import type { Quote } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import { quoteMemberName } from './quote-audit'

/**
 * Audit metadata is meaningful only inside a shared cloud workspace: personal
 * spaces and guest mode show no creator or editor information.
 */
export function useQuoteAuditVisible(): boolean {
  const appMode = useAppStore((state) => state.mode)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeId = useWorkspaceStore((state) => state.activeId)
  const workspace = workspaces.find((candidate) => candidate.id === activeId)
  return appMode === 'cloud' && workspace?.kind === 'shared'
}

/** Resolves the creator and last-editor names with the same fallbacks as the detail. */
export function useQuoteAuditNames(quote: Quote): {
  createdBy: string | undefined
  updatedBy: string | undefined
} {
  const { t } = useI18n()
  const members = useWorkspaceStore((state) => state.members)
  const userId = useAuthStore((state) => state.user?.id)
  return {
    createdBy: quoteMemberName(quote.createdBy, userId, members, t),
    updatedBy: quoteMemberName(quote.updatedBy, userId, members, t),
  }
}
