import { useEffect } from 'react'
import { useAuthStore } from '@/state/auth-store'
import { useSyncStore } from '@/state/sync-store'

/**
 * Bridges the auth lifecycle to the cloud sync engine. It is mounted inside
 * HydrationGate, so the local repository has already been loaded before the
 * first pull.
 */
export function SyncController() {
  const initialized = useAuthStore((state) => state.initialized)
  const authStatus = useAuthStore((state) => state.status)
  const userId = useAuthStore((state) => state.user?.id)
  const connect = useSyncStore((state) => state.connect)
  const disconnect = useSyncStore((state) => state.disconnect)
  const markExpired = useSyncStore((state) => state.markExpired)
  const markOffline = useSyncStore((state) => state.markOffline)
  const syncNow = useSyncStore((state) => state.syncNow)

  useEffect(() => {
    if (!initialized) return
    if (authStatus === 'authenticated' && userId) {
      void connect()
      return
    }
    if (authStatus === 'expired') {
      markExpired()
      return
    }
    if (authStatus === 'idle') {
      void disconnect()
    }
  }, [authStatus, connect, disconnect, initialized, markExpired, userId])

  useEffect(() => {
    if (authStatus !== 'authenticated') return

    const sync = () => {
      if (useAuthStore.getState().status === 'authenticated') void syncNow()
    }
    const handleOnline = () => sync()
    const handleOffline = () => markOffline()
    const handleFocus = () => {
      if (document.visibilityState === 'visible') sync()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [authStatus, markOffline, syncNow])

  return null
}
