export interface LandingRouteState {
  /** `/welcome` always shows the landing, even for returning users. */
  forced: boolean
  hasVisited: boolean
  authenticated: boolean
}

export type LandingRedirect = '/calculator' | undefined

/**
 * Pure decision used by the public route and by its unit tests. Local data and
 * the visit marker are checked outside; this function only owns the rule.
 */
export function landingRedirect(state: LandingRouteState): LandingRedirect {
  if (state.forced) return undefined
  if (state.authenticated || state.hasVisited) return '/calculator'
  return undefined
}
