import { useI18n } from '@/app/i18n-context'
import { isCloudConfigured } from '@/data/cloud/client'
import { WorkspaceMenu } from '@/features/workspace/WorkspaceMenu'
import { useAuthStore } from '@/state/auth-store'
import { TopBarControls } from './TopBarControls'

/**
 * Contextual top bar for connected mode. It only exists when a cloud account
 * is authenticated, so guest mode keeps the original local-first layout.
 */
export function TopBar() {
  const { t } = useI18n()
  const authStatus = useAuthStore((state) => state.status)

  if (!isCloudConfigured() || authStatus !== 'authenticated') return null

  return (
    <header
      aria-label={t('workspace.topbarAria')}
      className="no-print sticky top-0 z-30 hidden h-14 border-b border-line bg-ground/95 backdrop-blur lg:block"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-4 px-8">
        <WorkspaceMenu />
        <TopBarControls />
      </div>
    </header>
  )
}
