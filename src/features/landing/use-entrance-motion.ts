import { useEffect } from 'react'

/** Enables the CSS entrance rules after mount; the static HTML stays visible. */
export function useEntranceMotion(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.documentElement.dataset.revealReady = 'true'
    return () => {
      delete document.documentElement.dataset.revealReady
    }
  }, [])
}
