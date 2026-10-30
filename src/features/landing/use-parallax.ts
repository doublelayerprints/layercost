import { useEffect, type RefObject } from 'react'

/**
 * A slow scroll-linked drift on the hero screenshot. Transform only, no
 * layout read on every event, and nothing at all with reduced motion.
 */
export function useParallax(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const shift = Math.min(42, window.scrollY * 0.06)
      node.style.setProperty('--hero-shift', `${shift}px`)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [ref])
}
