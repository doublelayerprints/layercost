import { describe, expect, it } from 'vitest'
import { DEFAULT_THREE_MF_LIMITS } from './limits'
import { parseThreeMfFile } from './worker-client'

function fakeFile(size: number): File {
  const file = new File([], 'big.gcode.3mf')
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('limiti import .3mf', () => {
  it('accetta file compressi fino a 250 MiB e contenuti decompressi fino a 1 GiB', () => {
    expect(DEFAULT_THREE_MF_LIMITS.maxCompressedBytes).toBe(250 * 1024 * 1024)
    expect(DEFAULT_THREE_MF_LIMITS.maxTotalUncompressedBytes).toBe(1024 * 1024 * 1024)
  })

  it('rifiuta un file oltre il limite predefinito senza leggerlo', async () => {
    await expect(parseThreeMfFile(fakeFile(250 * 1024 * 1024 + 1))).rejects.toMatchObject({
      code: 'ARCHIVE_TOO_LARGE',
    })
  })

  it('accetta un file esattamente al limite e passa al parser ZIP', async () => {
    await expect(parseThreeMfFile(fakeFile(250 * 1024 * 1024))).rejects.toMatchObject({
      code: 'NOT_A_ZIP',
    })
  })
})
