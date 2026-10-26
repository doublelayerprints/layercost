import { DOMParser as XmlDomParser, onErrorStopParsing } from '@xmldom/xmldom'
import { parseThreeMf } from './parse'
import { toThreeMfErrorPayload } from './errors'
import type { XmlDocumentLike, XmlParser } from './xml'
import type { ThreeMfWorkerRequest, ThreeMfWorkerResponse } from './worker-protocol'

// DOMParser non è disponibile nei Web Worker: usiamo xmldom nel worker.
const xmlParser: XmlParser = (source) =>
  new XmlDomParser({ onError: onErrorStopParsing }).parseFromString(
    source,
    'application/xml',
  ) as unknown as XmlDocumentLike

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ThreeMfWorkerRequest>) => void) | null
  postMessage: (message: ThreeMfWorkerResponse) => void
}

scope.onmessage = (event) => {
  const { id, fileName, bytes, limits } = event.data
  try {
    const summary = parseThreeMf(fileName, new Uint8Array(bytes), { limits, xmlParser })
    scope.postMessage({ id, ok: true, summary })
  } catch (error) {
    scope.postMessage({ id, ok: false, error: toThreeMfErrorPayload(error) })
  }
}
