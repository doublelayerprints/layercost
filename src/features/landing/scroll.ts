export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** In-page navigation for section links; HashRouter owns the fragment. */
export function scrollToSection(id: string): void {
  const node = document.getElementById(id)
  if (!node) return
  node.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
}
