import { hasStoredData } from './storage'

/**
 * `layercost:hasVisited` separates "has opened the app" from "has used the
 * calculator". The landing is public and must not create `layercost:data`, so
 * the marker is the cheapest way to send a returning visitor straight back to
 * the app without touching the repository.
 */
export const VISIT_MARKER_KEY = 'layercost:hasVisited'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function hasVisitMarker(): boolean {
  return getStorage()?.getItem(VISIT_MARKER_KEY) === '1'
}

export function markVisited(): void {
  try {
    getStorage()?.setItem(VISIT_MARKER_KEY, '1')
  } catch {
    // A blocked storage must not stop the app from opening.
  }
}

export function hasVisited(): boolean {
  return hasVisitMarker() || hasStoredData()
}
