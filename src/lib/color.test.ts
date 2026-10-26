import { describe, expect, it } from 'vitest'
import { isHexColor } from './color'

describe('colore esadecimale', () => {
  it('accetta sei cifre esadecimali in maiuscolo o minuscolo', () => {
    expect(isHexColor('#ff0000')).toBe(true)
    expect(isHexColor('#A1B2C3')).toBe(true)
  })

  it('rifiuta nomi, forme brevi e valori non testuali', () => {
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('#f00')).toBe(false)
    expect(isHexColor('#ff0000ff')).toBe(false)
    expect(isHexColor(undefined)).toBe(false)
  })
})
