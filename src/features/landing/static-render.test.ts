import { describe, expect, it } from 'vitest'
import type { Locale } from '../../i18n'
import { renderStaticLanding } from './static-render'

// The build injects these files into #root: the Italian golden into
// index.html (ADR-0029) and the English one into /en/ (ADR-0035).
// Update them with:
//   npx vitest run src/features/landing/static-render.test.ts -u
describe('la landing pre-renderizzata resta allineata ai contenuti', () => {
  it('italiana: golden byte-for-byte con i contenuti italiani', async () => {
    await expect(renderStaticLanding()).toMatchFileSnapshot('./landing-static.html')
  })

  it.each([
    ['en', '../', './landing-static-en.html'],
  ] satisfies Array<[Locale, string, string]>)(
    'inglese: golden di /en/ con i percorsi immagine dedicati',
    async (locale, assetBase, golden) => {
      await expect(renderStaticLanding(locale, assetBase)).toMatchFileSnapshot(golden)
    },
  )

  it('l’italiano non contiene inglese e viceversa i goldens restano separati', () => {
    const itLanding = renderStaticLanding()
    const enLanding = renderStaticLanding('en', '../')
    expect(itLanding).toContain('<img src="landing/calculator.jpg"')
    expect(enLanding).toContain('<img src="../landing/en/calculator.jpg"')
    expect(enLanding).not.toContain('Il costo vero delle stampe 3D.')
    expect(itLanding).not.toContain('The real cost of 3D prints.')
  })
})
