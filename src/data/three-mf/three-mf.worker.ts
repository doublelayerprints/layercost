import { parseThreeMf } from './parse'
import { toThreeMfErrorPayload } from './errors'
import type { ThreeMfWorkerRequest, ThreeMfWorkerResponse } from './worker-protocol'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ThreeMfWorkerRequest>) => void) | null
  postMessage: (message: ThreeMfWorkerResponse) => void
}

scope.onmessage = (event) => {
  const { id, fileName, bytes, limits } = event.data
  try {
    const summary = parseThreeMf(fileName, new Uint8Array(bytes), { limits })
    scope.postMessage({ id, ok: true, summary })
  } catch (error) {
    scope.postMessage({ id, ok: false, error: toThreeMfErrorPayload(error) })
  }
}
