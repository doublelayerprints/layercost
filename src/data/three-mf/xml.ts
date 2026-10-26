import { ThreeMfImportError, type ThreeMfImportErrorCode } from './errors'

export interface XmlElementLike {
  readonly tagName: string
  getAttribute(name: string): string | null
  getElementsByTagName(name: string): ArrayLike<XmlElementLike>
  readonly textContent: string | null
}

export interface XmlDocumentLike {
  readonly documentElement: XmlElementLike | null
  getElementsByTagName(name: string): ArrayLike<XmlElementLike>
}

export type XmlParser = (source: string) => XmlDocumentLike

export const defaultXmlParser: XmlParser = (source) => {
  if (typeof DOMParser === 'undefined') {
    throw new ThreeMfImportError(
      'XML_PARSER_UNAVAILABLE',
      'Il parser XML non è disponibile in questo ambiente.',
    )
  }
  return new DOMParser().parseFromString(source, 'application/xml') as unknown as XmlDocumentLike
}

export function parseXml(
  source: string,
  parser: XmlParser,
  rootName: string,
  errorCode: ThreeMfImportErrorCode,
  fileName: string,
): XmlElementLike {
  if (/<!DOCTYPE/i.test(source) || /<!ENTITY/i.test(source)) {
    throw new ThreeMfImportError(
      'UNSAFE_XML',
      `Il file ${fileName} contiene una definizione XML non supportata.`,
    )
  }

  let document: XmlDocumentLike
  try {
    document = parser(source)
  } catch (error) {
    throw new ThreeMfImportError(errorCode, `Il file ${fileName} contiene XML non valido.`, {
      cause: error,
    })
  }

  const root = document.documentElement
  if (!root || root.tagName.toLowerCase() === 'parsererror') {
    throw new ThreeMfImportError(errorCode, `Il file ${fileName} contiene XML non valido.`)
  }
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new ThreeMfImportError(errorCode, `Il file ${fileName} contiene XML non valido.`)
  }
  if (root.tagName !== rootName) {
    throw new ThreeMfImportError(
      errorCode,
      `Il file ${fileName} non contiene la struttura attesa (${rootName}).`,
    )
  }
  return root
}

export function readMetadataMap(element: XmlElementLike): Map<string, string> {
  const result = new Map<string, string>()
  const metadata = element.getElementsByTagName('metadata')
  for (let index = 0; index < metadata.length; index += 1) {
    const item = metadata[index]
    if (!item) continue
    const key = item.getAttribute('key')
    if (!key || result.has(key)) continue
    result.set(key, item.getAttribute('value') ?? item.textContent?.trim() ?? '')
  }
  return result
}

export function readHeaderItems(root: XmlElementLike): Map<string, string> {
  const result = new Map<string, string>()
  const items = root.getElementsByTagName('header_item')
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (!item) continue
    const key = item.getAttribute('key')
    if (!key || result.has(key)) continue
    result.set(key, item.getAttribute('value') ?? '')
  }
  return result
}

export function readNamedMetadata(root: XmlElementLike): Map<string, string> {
  const result = new Map<string, string>()
  const metadata = root.getElementsByTagName('metadata')
  for (let index = 0; index < metadata.length; index += 1) {
    const item = metadata[index]
    if (!item) continue
    const name = item.getAttribute('name')
    if (!name || result.has(name)) continue
    result.set(name, item.textContent?.trim() ?? '')
  }
  return result
}

export function elementsByTag(root: XmlElementLike, tagName: string): XmlElementLike[] {
  const elements = root.getElementsByTagName(tagName)
  const result: XmlElementLike[] = []
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index]
    if (element) result.push(element)
  }
  return result
}
