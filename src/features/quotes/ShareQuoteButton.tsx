import { useId, useState } from 'react'
import type { Quote, QuoteResult } from '@/domain/types'
import type { CostConfig } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Button, Field, Input, Modal, Alert } from '@/components/ui'
import { buildShareUrl, copyText } from '@/lib/share'
import { nowIso } from '@/lib/date'

export function ShareQuoteButton({
  quote,
  result,
  label = 'Condividi',
  size = 'md',
  variant = 'secondary',
}: {
  quote: Quote
  result?: QuoteResult
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
}) {
  const config = useAppStore((state) => state.config)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string>()
  const linkId = useId()

  const handleOpen = () => {
    if (!result) {
      setError('Completa il calcolo prima di condividere il preventivo.')
      setOpen(true)
      return
    }
    const shareable: Quote = {
      ...quote,
      status: 'saved',
      snapshot:
        quote.snapshot ??
        ({
          config: structuredClone(config) as CostConfig,
          capturedAt: nowIso(),
          engineVersion: result.engineVersion,
        } satisfies Quote['snapshot']),
      result: quote.result ?? result,
      engineVersion: quote.engineVersion ?? result.engineVersion,
    }
    try {
      setUrl(buildShareUrl(shareable))
      setError(undefined)
      setCopied(false)
      setOpen(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossibile creare il link.')
      setOpen(true)
    }
  }

  const handleCopy = async () => {
    try {
      await copyText(url)
      setCopied(true)
    } catch {
      setError('Copia non riuscita. Seleziona il link e copialo manualmente.')
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleOpen}>
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Condividi preventivo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
            <Button onClick={handleCopy} disabled={!url}>
              {copied ? 'Copiato' : 'Copia link'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <Alert tone="danger" title="Attenzione">
              {error}
            </Alert>
          ) : null}
          {url ? (
            <>
              <p className="text-sm text-muted">
                Il link contiene una copia del preventivo, non i tuoi dati di configurazione. Chi lo
                riceve può leggerlo e importarlo nel proprio archivio.
              </p>
              <Field label="Link" htmlFor={linkId}>
                <Input
                  id={linkId}
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Field>
              <Alert tone="info" title="Privacy">
                Chiunque abbia il link può leggere i dati del preventivo. Non inserire dati
                sensibili.
              </Alert>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
