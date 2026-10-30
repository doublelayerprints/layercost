import { useEffect } from 'react'
import { applyAppMeta } from '@/app/meta'
import { HydrationGate } from '@/app/HydrationGate'
import { Layout } from '@/app/Layout'
import { markVisited } from '@/data/visit'
import { FirstLoginDialog } from '@/features/sync/FirstLoginDialog'
import { SyncConflictDialog } from '@/features/sync/SyncConflictDialog'
import { SyncController } from '@/features/sync/SyncController'
import { useAppStore } from '@/state/app-store'
import { useLocaleStore } from '@/state/locale-store'

/**
 * The app shell owns hydration, cloud sync and the sidebar. The public landing
 * lives outside it, so it can never create `layercost:data` or mount a cloud
 * dialog.
 */
export function AppShell() {
  const hydrate = useAppStore((state) => state.hydrate)
  const hydrated = useAppStore((state) => state.hydrated)
  const adoptLocale = useAppStore((state) => state.adoptLocale)
  const locale = useLocaleStore((state) => state.locale)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    markVisited()
  }, [])

  useEffect(() => {
    applyAppMeta(locale)
  }, [locale])

  useEffect(() => {
    if (hydrated) adoptLocale(locale)
  }, [adoptLocale, hydrated, locale])

  return (
    <HydrationGate>
      <SyncController />
      <FirstLoginDialog />
      <SyncConflictDialog />
      <Layout />
    </HydrationGate>
  )
}
