import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/auth-store'

/**
 * The OAuth callback lands on the site root, outside the hash route. When the
 * provider returns an error, move the user to the login page so the mapped
 * message is visible instead of leaving them on the calculator.
 */
export function OAuthCallbackRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useAuthStore((state) => state.oauthCallback?.navigateToLogin ?? false)
  const acknowledge = useAuthStore((state) => state.acknowledgeOAuthCallback)

  useEffect(() => {
    if (!pending) return
    if (location.pathname !== '/login') navigate('/login', { replace: true })
    acknowledge()
  }, [acknowledge, location.pathname, navigate, pending])

  return null
}
