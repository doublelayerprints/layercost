import { describe, expect, it } from 'vitest'
import { translate } from '@/i18n'
import { quoteMemberName } from './quote-audit'

const t = (key: Parameters<typeof translate>[1]) => translate('it', key)
const members = [
  {
    userId: 'user-a',
    role: 'owner' as const,
    displayName: 'Marco Rossi',
    joinedAt: '2026-10-30T00:00:00.000Z',
  },
  {
    userId: 'user-b',
    role: 'editor' as const,
    displayName: '  ',
    joinedAt: '2026-10-30T00:00:00.000Z',
  },
]

describe('quoteMemberName', () => {
  it('mostra “te” per l’utente corrente', () => {
    expect(quoteMemberName('user-a', 'user-a', members, t)).toBe('te')
  })

  it('mostra il nome visibile degli altri membri', () => {
    expect(quoteMemberName('user-a', 'user-b', members, t)).toBe('Marco Rossi')
  })

  it('usa il fallback quando il nome manca o la directory non è caricata', () => {
    expect(quoteMemberName('user-b', 'user-a', members, t)).toBe('un altro membro')
    expect(quoteMemberName('user-c', 'user-a', members, t)).toBe('un altro membro')
  })

  it('ignora un utente assente', () => {
    expect(quoteMemberName(undefined, 'user-a', members, t)).toBeUndefined()
  })
})
