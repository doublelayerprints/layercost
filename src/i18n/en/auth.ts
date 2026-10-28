import type { authIt } from '../it/auth'

export const authEn: Record<keyof typeof authIt, string> = {
  'auth.title': 'Sign in',
  'auth.description':
    'Sign in to sync configuration and quotes across your devices. The cloud is optional: without an account the app stays local.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.submit': 'Sign in',
  'auth.submitting': 'Signing in…',
  'auth.noSignup': 'Registration is closed. Accounts are created by the administrator.',
  'auth.forgotPassword': 'Forgot your password? Ask the administrator.',
  'auth.backToApp': 'Back to the calculator',
  'auth.unconfigured.title': 'Cloud not configured',
  'auth.unconfigured.body':
    'This build does not include Supabase credentials. The app runs locally.',
  'auth.expired.title': 'Session expired',
  'auth.expired.body':
    'Sign in again to keep using the cloud. Local data remains available.',
  'auth.loginAction': 'Sign in',
  'auth.error.invalidCredentials': 'Email or password is incorrect.',
  'auth.error.emailNotConfirmed': 'Confirm your email before signing in.',
  'auth.error.tooManyRequests': 'Too many attempts. Try again in a few minutes.',
  'auth.error.network': 'Could not reach the cloud. Check your connection.',
  'auth.error.notConfigured': 'Cloud not configured.',
  'auth.error.unknown': 'Sign-in failed. Try again.',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',

  'sync.title': 'Sync',
  'sync.description':
    'Connect your account to find configuration and quotes on other devices. The cloud is optional.',
  'sync.status.idle': 'Not connected',
  'sync.status.loading': 'Connecting…',
  'sync.status.authenticated': 'Connected',
  'sync.status.expired': 'Session expired',
  'sync.status.error': 'Connection error',
  'sync.account': 'Account',
  'sync.lastSync': 'Last sync',
  'sync.never': 'Never',
  'sync.login': 'Sign in',
  'sync.logout': 'Sign out',
  'sync.logoutTitle': 'Sign out?',
  'sync.logoutDescription':
    'Local changes will be saved before signing out. Data stays in this browser.',
  'sync.logoutConfirm': 'Sign out',
  'sync.localOnly':
    'Without an account the app stays local. Data is not deleted.',
  'sync.comingSoon': 'Data sync will be enabled in the next version.',
  'sync.pending': 'Pending changes: {count}',
  'sync.retry': 'Try again',
  'sync.syncNow': 'Sync now',
  'sync.syncNowHint': 'Available once sync is enabled.',
}
