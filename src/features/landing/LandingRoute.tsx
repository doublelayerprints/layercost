import { Navigate, useLocation } from 'react-router-dom'
import { hasVisited } from '@/data/visit'
import { useAuthStore } from '@/state/auth-store'
import { LandingPage } from './LandingPage'
import { landingRedirect } from './routing'

/**
 * Public entry point. Returning visitors (local data or the visit marker) and
 * authenticated users go straight to the calculator. `/welcome` bypasses the
 * rule so the landing stays reachable from the app.
 */
export function LandingRoute() {
  const { pathname } = useLocation()
  const status = useAuthStore((state) => state.status)
  const forced = pathname === '/welcome'

  const target = landingRedirect({
    forced,
    hasVisited: hasVisited(),
    authenticated: status === 'authenticated',
  })

  if (target) return <Navigate to={target} replace />
  return <LandingPage />
}
