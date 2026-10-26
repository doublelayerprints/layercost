import { useId, useState } from 'react'
import type { Quote, QuoteResult } from '@/domain/types'
import type { CostConfig } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { Button, Field, Input, Modal, Alert } from '@/components/ui'
import { buildShareUrl, copyText } from '@/lib/share'
import { nowIso } from '@/lib/date'

export function ShareQuoteButton({
  quote,
  result,
  label,
  size = 'md',
  variant = 'secondary',
}: {
  quote: Quote
  result?: QuoteResult
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
}) {
  const { t } = useI18n()
  const config = useAppStore((state) => state.config)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string>()
  const linkId = useId()

  const handleOpen = () => {
    if (!result) {
      setError(t('share.error.incomplete'))
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
    } catch {
      setError(t('share.error.create'))
      setOpen(true)
    }
  }

  const handleCopy = async () => {
    try {
      await copyText(url)
      setCopied(true)
    } catch {
      setError(t('share.error.copy'))
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleOpen}>
        {label ?? t('share.button')}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('share.title')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.close')}
            </Button>
            <Button onClick={handleCopy} disabled={!url}>
              {copied ? t('share.copied') : t('share.copy')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <Alert tone="danger" title={t('common.warning')}>
              {error}
            </Alert>
          ) : null}
          {url ? (
            <>
              <p className="text-sm text-muted">{t('share.link.description')}</p>
              <Field label={t('share.link.label')} htmlFor={linkId}>
                <Input
                  id={linkId}
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Field>
              <Alert tone="info" title={t('share.privacy.title')}>
                {t('share.privacy.body')}
              </Alert>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
