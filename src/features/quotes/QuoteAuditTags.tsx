import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import type { Quote } from '@/domain/types'
import { Badge } from '@/components/ui'
import { useAppStore } from '@/state/app-store'
import { useAuthStore } from '@/state/auth-store'
import { useWorkspaceStore } from '@/state/workspace-store'
import { cn } from '@/lib/cn'
import { quoteMemberName } from './quote-audit'

/**
 * Creator and last-editor tags for the quotes archive. They are meaningful only
 * inside a shared cloud workspace: personal spaces, guest mode and quotes
 * without audit metadata render nothing.
 */
export function QuoteAuditTags({ quote, className }: { quote: Quote; className?: string }) {
  const { locale, t } = useI18n()
  const format = useFormat(locale)
  const appMode = useAppStore((state) => state.mode)
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeId = useWorkspaceStore((state) => state.activeId)
  const members = useWorkspaceStore((state) => state.members)
  const userId = useAuthStore((state) => state.user?.id)

  const workspace = workspaces.find((candidate) => candidate.id === activeId)
  if (appMode !== 'cloud' || workspace?.kind !== 'shared') return null

  const createdBy = quoteMemberName(quote.createdBy, userId, members, t)
  const updatedBy = quoteMemberName(quote.updatedBy, userId, members, t)
  if (!createdBy && !updatedBy) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {createdBy ? (
        <Badge tone="neutral" className="max-w-full">
          <span className="truncate">
            {t('quote.audit.createdTag', { name: createdBy })}
            <span aria-hidden="true"> · </span>
            <time
              dateTime={quote.createdAt}
              title={format.dateTime(quote.createdAt)}
              className="tabular-nums"
            >
              {format.dateOnly(quote.createdAt)}
            </time>
          </span>
        </Badge>
      ) : null}
      {updatedBy ? (
        <Badge tone="neutral" className="max-w-full">
          <span className="truncate">
            {t('quote.audit.updatedTag', { name: updatedBy })}
            <span aria-hidden="true"> · </span>
            <time
              dateTime={quote.updatedAt}
              title={format.dateTime(quote.updatedAt)}
              className="tabular-nums"
            >
              {format.dateOnly(quote.updatedAt)}
            </time>
          </span>
        </Badge>
      ) : null}
    </div>
  )
}
