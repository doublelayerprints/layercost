import { translate, type Locale } from '@/i18n'

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
 * App routes keep the interface title and description. The landing sets its own
 * public metadata and the two never run on the same screen.
 */
export function applyAppMeta(locale: Locale): void {
  if (typeof document === 'undefined') return
  const title = translate(locale, 'meta.title')
  const description = translate(locale, 'meta.description')
  document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:locale', locale === 'it' ? 'it_IT' : 'en_GB')
}
