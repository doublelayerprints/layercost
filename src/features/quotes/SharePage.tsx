import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { Alert, Button, EmptyState, PageHeader } from '@/components/ui'
import { decodeSharedQuote, ShareError } from '@/lib/share'
import { QuoteOverview } from './QuoteOverview'
import { QuotePrint } from './QuotePrint'

const SHARE_ERROR_KEYS = {
  empty: 'share.error.empty',
  invalidData: 'share.error.invalidData',
  noQuote: 'share.error.noQuote',
  invalidQuote: 'share.error.invalidQuote',
} as const

export function SharePage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const payload = searchParams.get('d')
  const importSharedQuote = useAppStore((state) => state.importSharedQuote)
  const navigate = useNavigate()
  const [importError, setImportError] = useState<string>()

  const decoded = useMemo(() => {
    if (!payload) {
      return { error: t('share.error.noPayload') }
    }
    try {
      return { quote: decodeSharedQuote(payload) }
    } catch (error) {
      return {
        error:
          error instanceof ShareError ? t(SHARE_ERROR_KEYS[error.code]) : t('share.error.invalid'),
      }
    }
  }, [payload, t])

  if (!decoded.quote) {
    return (
      <div>
        <PageHeader title={t('share.invalid.title')} />
        <div className="mt-6">
          <EmptyState
            title={t('share.invalid.heading')}
            description={decoded.error ?? t('share.invalid.description')}
            action={<Button onClick={() => navigate('/')}>{t('share.invalid.action')}</Button>}
          />
        </div>
      </div>
    )
  }

  const quote = decoded.quote
  const handleImport = () => {
    try {
      const id = importSharedQuote(quote)
      navigate(`/quotes/${id}`, { state: { saved: true } })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('import.errorTitle'))
    }
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={quote.name}
          description={t('share.description')}
          meta={<span className="text-xs text-muted">{t('share.badge')}</span>}
          actions={
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                {t('print.action')}
              </Button>
              <Button onClick={handleImport}>{t('share.import')}</Button>
            </>
          }
        />

        {importError ? (
          <div className="mt-5">
            <Alert tone="danger" title={t('import.errorTitle')}>
              {importError}
            </Alert>
          </div>
        ) : null}

        <div className="mt-5">
          <Alert tone="info" title={t('share.info.title')}>
            {t('share.info.body')}
          </Alert>
        </div>

        <div className="mt-6">
          <QuoteOverview quote={quote} result={quote.result} />
        </div>
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
