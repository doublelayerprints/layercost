import { translate, type Locale } from '../../i18n'

function setMeta(attribute: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

/**
 * The landing owns the public document metadata. The static HTML already
 * carries the Italian version for crawlers; this keeps title, description and
 * Open Graph fields in sync when the visitor switches language.
 */
export function applyLandingMeta(locale: Locale): void {
  if (typeof document === 'undefined') return
  const title = translate(locale, 'landing.meta.title')
  const description = translate(locale, 'landing.meta.description')
  document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:locale', locale === 'it' ? 'it_IT' : 'en_GB')
}
