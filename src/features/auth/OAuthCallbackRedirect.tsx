import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/auth-store'

/**
 * The OAuth and recovery callbacks land on the site root, outside the hash
 * route. A provider error moves the user to the login page so the mapped
 * message is visible; a password-recovery link moves them to the form that
 * asks for the new password (EVO-11).
 */
export function OAuthCallbackRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const pending = useAuthStore((state) => state.oauthCallback?.navigateToLogin ?? false)
  const recovery = useAuthStore((state) => state.recovery)
  const acknowledge = useAuthStore((state) => state.acknowledgeOAuthCallback)

  useEffect(() => {
    if (recovery === 'pending' && location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true })
      return
    }
    if (!pending) return
    if (location.pathname !== '/login') navigate('/login', { replace: true })
    acknowledge()
  }, [acknowledge, location.pathname, navigate, pending, recovery])

  return null
}