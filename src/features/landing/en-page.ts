/**
 * Builds `dist/en/index.html` out of the built `dist/index.html` (which
 * already carries the Italian static landing) and the English static golden
 * (ADR-0035). Every head rewrite is exact-replace: a template drift fails the
 * build instead of shipping an inconsistent page.
 *
 * The module is deliberately import-free: it is part of the Node program that
 * compiles `vite.config.ts`, which has no `@` path alias and no DOM lib. The
 * English copy lives here and the unit test keeps it in sync with the i18n
 * dictionaries — one trade-off documented in the plan.
 */
export const LANDING_BASE_URL = 'https://layercost.vercel.app'

/** Same value as `translate('en', 'landing.meta.title')` (kept in sync by test). */
export const EN_TITLE = 'LayerCost — The real cost of 3D prints'
/** Same value as `translate('en', 'landing.meta.description')` (kept in sync by test). */
export const EN_DESCRIPTION =
  'Calculate the cost and price of 3D prints with materials, energy, wear, labor, discounts and VAT. Local-first, no account required.'

const IT_TITLE = 'LayerCost — Il costo vero delle stampe 3D'
const IT_DESCRIPTION =
  'Calcola costo e prezzo delle stampe 3D con materiali, energia, usura, manodopera, sconti e IVA. Local-first, senza account obbligatorio.'
const IT_JSONLD_DESCRIPTION =
  'Calcolatore local-first del costo e del prezzo delle stampe 3D, con materiali, energia, usura, manodopera, sconti e IVA.'
const IT_IMAGE_ALT = 'LayerCost: il calcolatore del costo e del prezzo delle stampe 3D.'
/** The English og:image keeps the same layout with the English headline (ADR-0035). */
export const EN_IMAGE_ALT = 'LayerCost: the calculator of the cost and price of 3D prints.'

function replaceExactly(html: string, from: string, to: string, expected = 1): string {
  const found = html.split(from).length - 1
  if (found !== expected) {
    throw new Error(
      `en-page: expected ${expected} occurrence(s) of ${JSON.stringify(from)}, found ${found}`,
    )
  }
  return html.replaceAll(from, to)
}

export function buildEnglishIndexHtml(
  itIndexHtml: string,
  itStaticLanding: string,
  enStaticLanding: string,
): string {
  let html = itIndexHtml

  html = replaceExactly(html, itStaticLanding, enStaticLanding)
  html = replaceExactly(html, '<html lang="it">', '<html lang="en">')

  html = replaceExactly(
    html,
    `<link rel="canonical" href="${LANDING_BASE_URL}/" />`,
    `<link rel="canonical" href="${LANDING_BASE_URL}/en/" />`,
  )

  html = replaceExactly(html, IT_TITLE, EN_TITLE, 3)
  html = replaceExactly(html, IT_DESCRIPTION, EN_DESCRIPTION, 3)
  html = replaceExactly(html, `"url": "${LANDING_BASE_URL}/",`, `"url": "${LANDING_BASE_URL}/en/",`)
  html = replaceExactly(
    html,
    `"description": "${IT_JSONLD_DESCRIPTION}"`,
    `"description": "${EN_DESCRIPTION}"`,
  )
  html = replaceExactly(html, '"inLanguage": "it"', '"inLanguage": "en"')
  html = replaceExactly(
    html,
    `<meta property="og:url" content="${LANDING_BASE_URL}/" />`,
    `<meta property="og:url" content="${LANDING_BASE_URL}/en/" />`,
  )
  html = replaceExactly(
    html,
    `${LANDING_BASE_URL}/og-image.jpg`,
    `${LANDING_BASE_URL}/og-image-en.jpg`,
    2,
  )
  html = replaceExactly(html, IT_IMAGE_ALT, EN_IMAGE_ALT)
  html = replaceExactly(
    html,
    '<meta property="og:locale" content="it_IT" />',
    '<meta property="og:locale" content="en_GB" />',
  )
  html = replaceExactly(
    html,
    '<meta property="og:locale:alternate" content="en_GB" />',
    '<meta property="og:locale:alternate" content="it_IT" />',
  )

  return html
}
