import type { AuthErrorCode } from '@/data/cloud/auth'
import type { CloudConflictReason } from '@/data/cloud/gateway'
import type { CloudEntity } from '@/data/cloud/sync'
import type { MessageKey } from '@/i18n'
import type { SyncErrorCode, SyncStatus } from '@/state/sync-store'

export const syncStatusKeys: Record<SyncStatus, MessageKey> = {
  disabled: 'sync.status.disabled',
  idle: 'sync.status.idle',
  connecting: 'sync.status.connecting',
  firstLogin: 'sync.status.firstLogin',
  syncing: 'sync.status.syncing',
  synced: 'sync.status.synced',
  pending: 'sync.status.pending',
  offline: 'sync.status.offline',
  conflict: 'sync.status.conflict',
  error: 'sync.status.error',
}

export const syncStatusTones: Record<SyncStatus, string> = {
  disabled: 'bg-muted',
  idle: 'bg-muted',
  connecting: 'bg-data',
  firstLogin: 'bg-data',
  syncing: 'bg-data',
  synced: 'bg-positive',
  pending: 'bg-warning',
  offline: 'bg-warning',
  conflict: 'bg-data',
  error: 'bg-negative',
}

export const syncErrorKeys: Record<SyncErrorCode, MessageKey> = {
  network: 'sync.error.network',
  auth: 'sync.error.auth',
  noWorkspace: 'sync.error.noWorkspace',
  rateLimited: 'sync.error.rateLimited',
  limit: 'sync.error.limit',
  quoteLimit: 'sync.error.quoteLimit',
  invalidData: 'sync.error.invalidData',
  backupFailed: 'sync.error.backupFailed',
  unknown: 'sync.error.unknown',
}

export const syncEntityKeys: Record<CloudEntity, MessageKey> = {
  settings: 'sync.entity.settings',
  energyTariff: 'sync.entity.energyTariff',
  printer: 'sync.entity.printer',
  material: 'sync.entity.material',
  extra: 'sync.entity.extra',
  quote: 'sync.entity.quote',
}

export const syncConflictReasonKeys: Record<CloudConflictReason, MessageKey> = {
  updated: 'sync.conflict.updated',
  deleted: 'sync.conflict.deleted',
  exists: 'sync.conflict.exists',
  locked: 'sync.conflict.locked',
}

/**
 * Auth error code → message. Kept typed so a new `AuthErrorCode` cannot be
 * forgotten: TypeScript fails until the map covers it (the recovery codes use
 * the `auth.recovery.*` keys, not `auth.error.*`).
 */
export const authErrorKeys: Record<AuthErrorCode, MessageKey> = {
  invalidCredentials: 'auth.error.invalidCredentials',
  emailNotConfirmed: 'auth.error.emailNotConfirmed',
  tooManyRequests: 'auth.error.tooManyRequests',
  network: 'auth.error.network',
  notConfigured: 'auth.error.notConfigured',
  signupLimitReached: 'auth.error.signupLimitReached',
  emailExists: 'auth.error.emailExists',
  oauthCancelled: 'auth.error.oauthCancelled',
  oauthProviderDisabled: 'auth.error.oauthProviderDisabled',
  oauthSignupDisabled: 'auth.error.oauthSignupDisabled',
  oauthIdentityExists: 'auth.error.oauthIdentityExists',
  oauthConfig: 'auth.error.oauthConfig',
  oauthCallback: 'auth.error.oauthCallback',
  manualLinkingDisabled: 'auth.error.manualLinkingDisabled',
  weakPassword: 'auth.error.weakPassword',
  recoveryLinkInvalid: 'auth.recovery.linkInvalid',
  unknown: 'auth.error.unknown',
}
