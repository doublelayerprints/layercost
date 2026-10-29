import { describe, expect, it } from 'vitest'
import { ThreeMfImportError } from '@/data/three-mf/errors'
import { translate, type InterpolationParams, type MessageKey } from '@/i18n'
import { threeMfErrorMessage } from './three-mf-messages'

function translator(locale: 'it' | 'en') {
  return (key: MessageKey, params?: InterpolationParams) => translate(locale, key, params)
}

describe('messaggi import .3mf', () => {
  it('indica i limiti correnti quando l’archivio è troppo grande', () => {
    const error = new ThreeMfImportError('ARCHIVE_TOO_LARGE', 'troppo grande')

    expect(threeMfErrorMessage(error, translator('it'))).toBe(
      'Il file supera i limiti di dimensione (250 MB compressi, 1 GB decompressi). Esporta un solo piatto o riduci il progetto.',
    )
    expect(threeMfErrorMessage(error, translator('en'))).toBe(
      'The file exceeds the size limits (250 MB compressed, 1 GB uncompressed). Export a single plate or reduce the project.',
    )
  })
})
