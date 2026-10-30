import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger in milliseconds, used for heading → text → picture. */
  delay?: number
  style?: CSSProperties
}

/**
 * Progressive entrance. The markup is visible before hydration; the CSS only
 * hides elements after `data-reveal-ready` is set and only until they enter the
 * viewport. Reduced motion leaves everything in place.
 */
export function Reveal({ children, className, delay = 0, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      node.dataset.reveal = 'in'
      return
    }

    const rect = node.getBoundingClientRect()
    const inView = rect.top < window.innerHeight && rect.bottom > 0
    if (inView) node.dataset.reveal = 'in'

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          node.dataset.reveal = 'in'
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-reveal=""
      className={cn(className)}
      style={{ '--reveal-delay': `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </div>
  )
}
