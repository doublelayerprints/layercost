import { describe, expect, it } from 'vitest'
import { mapWorkspaceError } from './gateway'

describe('mapWorkspaceError', () => {
  it('riconosce gli errori di business prima dello status HTTP', () => {
    expect(
      mapWorkspaceError({ message: 'workspace_limit', code: 'P0001', status: 400 }).code,
    ).toBe('workspaceLimit')
    expect(mapWorkspaceError({ message: 'member_limit', code: 'P0001', status: 400 }).code).toBe(
      'memberLimit',
    )
    expect(mapWorkspaceError({ message: 'not_owner', code: '42501', status: 403 }).code).toBe(
      'notOwner',
    )
    expect(mapWorkspaceError({ message: 'not_member', code: '42501', status: 403 }).code).toBe(
      'notMember',
    )
  })

  it('riconosce gli errori degli inviti', () => {
    expect(mapWorkspaceError({ message: 'invite_invalid' }).code).toBe('inviteInvalid')
    expect(mapWorkspaceError({ message: 'invite_expired' }).code).toBe('inviteExpired')
    expect(mapWorkspaceError({ message: 'invite_revoked' }).code).toBe('inviteRevoked')
    expect(mapWorkspaceError({ message: 'invite_exhausted' }).code).toBe('inviteExhausted')
    expect(mapWorkspaceError({ message: 'last_owner' }).code).toBe('lastOwner')
  })

  it('distingue rete, sessione scaduta e errore sconosciuto', () => {
    expect(mapWorkspaceError({ message: 'Failed to fetch' }).code).toBe('network')
    expect(mapWorkspaceError(new TypeError('Failed to fetch')).code).toBe('network')
    expect(mapWorkspaceError({ message: 'JWT expired', status: 401 }).code).toBe('auth')
    expect(mapWorkspaceError(new Error('boom')).code).toBe('unknown')
  })
})
