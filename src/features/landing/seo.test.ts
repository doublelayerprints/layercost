import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): string => readFileSync(path, 'utf8')

describe('SEO e pre-render della landing', () => {
  it('index.html espone canonical, Open Graph, Twitter e indicizzazione', () => {
    const html = read('index.html')
    expect(html).toContain('rel="canonical" href="https://layercost.vercel.app/"')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain('content="index,follow')
    expect(html).not.toContain('content="noindex"')
    expect(html).toContain('content="it_IT"')
  })

  it('non c’è più l’header X-Robots-Tag noindex', () => {
    expect(read('vercel.json')).not.toContain('X-Robots-Tag')
  })

  it('robots.txt e sitemap aprono la root', () => {
    const robots = read('public/robots.txt')
    expect(robots).toContain('Allow: /')
    expect(robots).not.toContain('Disallow: /')
    expect(robots).toContain('https://layercost.vercel.app/sitemap.xml')

    const sitemap = read('public/sitemap.xml')
    expect(sitemap).toContain('<loc>https://layercost.vercel.app/</loc>')
  })

  it('la pagina statica contiene la landing italiana completa', () => {
    const html = read('src/features/landing/landing-static.html')
    expect(html).toContain('<h1')
    expect(html).toContain('Il costo vero delle stampe 3D.')
    expect(html).toContain('Tutto quello che serve al prezzo.')
    expect(html).toContain('I tuoi numeri restano tuoi.')
    expect(html).toContain('Domande prima di iniziare.')
    expect(html).toContain('href="#/calculator"')
    expect(html).toContain('href="#/request-access"')
    expect(html).not.toContain('The real cost of 3D prints.')
    expect(html).not.toContain('layercost:data')
  })
})
