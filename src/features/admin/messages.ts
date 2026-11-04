import type { MessageKey } from '@/i18n'
import type { WorkspaceErrorCode } from '@/data/cloud/gateway'

/**
 * Error messages for the admin console. The cloud error microcopy stays in the
 * workspace area; the console maps every code it can surface.
 */
export const adminErrorKeys: Record<WorkspaceErrorCode, MessageKey> = {
  network: 'workspace.error.network',
  auth: 'workspace.error.auth',
  workspaceLimit: 'workspace.error.unknown',
  memberLimit: 'workspace.error.unknown',
  quoteLimit: 'workspace.error.unknown',
  invalidName: 'workspace.error.unknown',
  invalidLimit: 'workspace.error.invalidLimit',
  inviteInvalid: 'workspace.error.unknown',
  inviteExpired: 'workspace.error.unknown',
  inviteRevoked: 'workspace.error.unknown',
  inviteExhausted: 'workspace.error.unknown',
  lastOwner: 'workspace.error.unknown',
  notOwner: 'workspace.error.notAdmin',
  notMember: 'workspace.error.notAdmin',
  notAdmin: 'workspace.error.notAdmin',
  unknown: 'workspace.error.unknown',
}
