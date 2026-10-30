import { expect, it } from 'vitest'
import { renderStaticLanding } from './static-render'

// The build injects this file into #root. Update it with:
//   npx vitest run src/features/landing/static-render.test.ts -u
it('la landing pre-renderizzata è allineata ai contenuti italiani', async () => {
  await expect(renderStaticLanding()).toMatchFileSnapshot('./landing-static.html')
})
