import type { MessageKey } from '@/i18n'
import type { WorkspaceErrorCode } from '@/data/cloud/gateway'

export const workspaceErrorKeys: Record<WorkspaceErrorCode, MessageKey> = {
  network: 'workspace.error.network',
  auth: 'workspace.error.auth',
  workspaceLimit: 'workspace.error.workspaceLimit',
  memberLimit: 'workspace.error.memberLimit',
  invalidName: 'workspace.error.invalidName',
  inviteInvalid: 'workspace.error.inviteInvalid',
  inviteExpired: 'workspace.error.inviteExpired',
  inviteRevoked: 'workspace.error.inviteRevoked',
  inviteExhausted: 'workspace.error.inviteExhausted',
  lastOwner: 'workspace.error.lastOwner',
  notOwner: 'workspace.error.notOwner',
  notMember: 'workspace.error.notMember',
  unknown: 'workspace.error.unknown',
}
