import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { translate } from '../../i18n'
import { buildEnglishIndexHtml, EN_DESCRIPTION, EN_IMAGE_ALT, EN_TITLE, LANDING_BASE_URL } from './en-page'

const read = (path: string): string => readFileSync(path, 'utf8')

const itStatic = '<h1>Il costo vero delle stampe 3D.</h1>'
const enStatic = '<h1>The real cost of 3D prints.</h1>'

/** Same strings the checked-in template owns; keeps the fixture in sync. */
function fixture(): string {
  return [
    '<!doctype html>',
    `<html lang="it">`,
    '  <head>',
    `    <link rel="canonical" href="${LANDING_BASE_URL}/" />`,
    `    <link rel="alternate" hreflang="it" href="${LANDING_BASE_URL}/" />`,
    `    <link rel="alternate" hreflang="en" href="${LANDING_BASE_URL}/en/" />`,
    `    <link rel="alternate" hreflang="x-default" href="${LANDING_BASE_URL}/" />`,
    `    <meta name="description" content="${'Calcola costo e prezzo delle stampe 3D con materiali, energia, usura, manodopera, sconti e IVA. Local-first, senza account obbligatorio.'}" />`,
    `    <meta property="og:url" content="${LANDING_BASE_URL}/" />`,
    `    <meta property="og:title" content="LayerCost — Il costo vero delle stampe 3D" />`,
    `    <meta\n      property="og:description"\n      content="Calcola costo e prezzo delle stampe 3D con materiali, energia, usura, manodopera, sconti e IVA. Local-first, senza account obbligatorio."\n    />`,
    `    <meta property="og:image" content="${LANDING_BASE_URL}/og-image.jpg" />`,
    `    <meta\n      property="og:image:alt"\n      content="LayerCost: il calcolatore del costo e del prezzo delle stampe 3D."\n    />`,
    '    <meta property="og:locale" content="it_IT" />',
    '    <meta property="og:locale:alternate" content="en_GB" />',
    `    <meta name="twitter:title" content="LayerCost — Il costo vero delle stampe 3D" />`,
    `    <meta\n      name="twitter:description"\n      content="Calcola costo e prezzo delle stampe 3D con materiali, energia, usura, manodopera, sconti e IVA. Local-first, senza account obbligatorio."\n    />`,
    `    <meta name="twitter:image" content="${LANDING_BASE_URL}/og-image.jpg" />`,
    '    <script type="application/ld+json">',
    '      {',
    `        "url": "${LANDING_BASE_URL}/",`,
    '        "description": "Calcolatore local-first del costo e del prezzo delle stampe 3D, con materiali, energia, usura, manodopera, sconti e IVA.",',
    '        "inLanguage": "it",',
    '      }',
    '    </script>',
    `    <title>LayerCost — Il costo vero delle stampe 3D</title>`,
    '  </head>',
    `<body><div id="root">${itStatic}</div></body>`,
    '</html>',
  ].join('\n')
}

describe('la pagina inglese deriva il documento italiano', () => {
  it('riscrive lingua, canonical, hreflang, OG, Twitter e JSON-LD', () => {
    const html = buildEnglishIndexHtml(fixture(), itStatic, enStatic)

    expect(html).toContain('<html lang="en">')
    expect(html).not.toContain('<html lang="it">')

    expect(html).toContain(`<link rel="canonical" href="${LANDING_BASE_URL}/en/" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="it" href="${LANDING_BASE_URL}/" />`)
    expect(html).toContain(`<link rel="alternate" hreflang="en" href="${LANDING_BASE_URL}/en/" />`)
    expect(html).toContain(
      `<link rel="alternate" hreflang="x-default" href="${LANDING_BASE_URL}/" />`,
    )

    expect(html).toContain(EN_TITLE)
    expect(html).toContain(EN_DESCRIPTION)
    expect(html).not.toContain('LayerCost — Il costo vero delle stampe 3D')

    expect(html).toContain(`<meta property="og:url" content="${LANDING_BASE_URL}/en/" />`)
    expect(html).toContain(`${LANDING_BASE_URL}/og-image-en.jpg`)
    expect(html).toContain(EN_IMAGE_ALT)
    expect(html).not.toContain(`${LANDING_BASE_URL}/og-image.jpg`)

    expect(html).toContain('<meta property="og:locale" content="en_GB" />')
    expect(html).toContain('<meta property="og:locale:alternate" content="it_IT" />')

    expect(html).toContain(`"url": "${LANDING_BASE_URL}/en/",`)
    expect(html).toContain(`"description": "${EN_DESCRIPTION}"`)
    expect(html).toContain('"inLanguage": "en"')

    expect(html).toContain(`<div id="root">${enStatic}</div>`)
    expect(html).not.toContain(itStatic)
  })

  it('fallisce se il template non contiene più la stringa attesa', () => {
    const drifted = fixture().replace('<html lang="it">', '<html lang="fr">')
    expect(() => buildEnglishIndexHtml(drifted, itStatic, enStatic)).toThrow(/lang/)
  })
})

describe('i goldens della pagina inglese esistono e sono coerenti', () => {
  it('il golden statico inglese è inglese e non contiene contenuti italiani', () => {
    const en = read('src/features/landing/landing-static-en.html')
    expect(en).toContain('href="#/calculator"')
    expect(en).not.toContain('Il costo vero delle stampe 3D.')
    expect(en).toContain('.jpg')
  })

  it('il golden italiano resta al suo posto', () => {
    const itGolden = read('src/features/landing/landing-static.html')
    expect(itGolden).toContain('Il costo vero delle stampe 3D.')
  })
})

describe("la copia EN del modulo resta allineata ai dizionari i18n", () => {
  it("EN_TITLE e EN_DESCRIPTION coincidono con translate en", () => {
    expect(EN_TITLE).toEqual(translate("en", "landing.meta.title"))
    expect(EN_DESCRIPTION).toEqual(translate("en", "landing.meta.description"))
  })
})
