import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { ENGINE_VERSION } from '@/domain/version'
import { draftHasContent } from '@/lib/draft'
import { isQuoteEditable, isQuoteLocked } from '@/lib/quote-status'
import { QuoteOverview } from './QuoteOverview'
import { QuotePrint } from './QuotePrint'
import { ShareQuoteButton } from './ShareQuoteButton'
import { quoteStatusDisplay } from './quote-status'
import { plural } from '@/i18n'

const STATUS_CONFIRM = {
  sent: {
    title: 'quote.markSentConfirm.title',
    body: 'quote.markSentConfirm.body',
    confirm: 'quote.markSent',
  },
  completed: {
    title: 'quote.markCompletedConfirm.title',
    body: 'quote.markCompletedConfirm.body',
    confirm: 'quote.markCompleted',
  },
} as const

export function QuoteDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const quotes = useAppStore((state) => state.quotes)
  const draft = useAppStore((state) => state.draft)
  const duplicateQuote = useAppStore((state) => state.duplicateQuote)
  const refreshQuote = useAppStore((state) => state.refreshQuote)
  const archiveQuote = useAppStore((state) => state.archiveQuote)
  const deleteQuote = useAppStore((state) => state.deleteQuote)
  const editQuote = useAppStore((state) => state.editQuote)
  const setQuoteStatus = useAppStore((state) => state.setQuoteStatus)
  const navigate = useNavigate()
  const location = useLocation()
  const cameFromSave = Boolean((location.state as { saved?: boolean } | null)?.saved)
  const cameFromEdit = Boolean((location.state as { edited?: boolean } | null)?.edited)
  const [savedFor, setSavedFor] = useState<string | undefined>(cameFromSave ? id : undefined)
  const [savedWasEdit, setSavedWasEdit] = useState(cameFromEdit)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusToSet, setStatusToSet] = useState<'sent' | 'completed'>()
  const [pendingDraftAction, setPendingDraftAction] = useState<'duplicate' | 'refresh' | 'edit'>()

  // The confirmation is for this visit only: drop it from history so a reload does not repeat it.
  useEffect(() => {
    if (cameFromSave) navigate(location.pathname, { replace: true, state: null })
  }, [cameFromSave, location.pathname, navigate])

  const quote = quotes.find((candidate) => candidate.id === id)
  const format = useFormat(quote?.locale)

  if (!quote) {
    return (
      <div>
        <PageHeader title={t('quote.notFound.title')} />
        <div className="mt-6">
          <EmptyState
            title={t('quote.notFound.heading')}
            description={t('quote.notFound.description')}
            action={<Button onClick={() => navigate('/quotes')}>{t('quote.backToArchive')}</Button>}
          />
        </div>
      </div>
    )
  }

  const statusDisplay = quoteStatusDisplay(quote)
  const canEdit = isQuoteEditable(quote.status, quote.archived)
  const locked = isQuoteLocked(quote.status) && !quote.archived

  const runDraftAction = (action: 'duplicate' | 'refresh' | 'edit') => {
    if (action === 'edit') {
      if (!editQuote(quote.id)) return
    } else if (action === 'duplicate') {
      duplicateQuote(quote.id)
    } else {
      refreshQuote(quote.id)
    }
    setPendingDraftAction(undefined)
    navigate('/')
  }

  const requestDraftAction = (action: 'duplicate' | 'refresh' | 'edit') => {
    if (draftHasContent(draft)) {
      setPendingDraftAction(action)
      return
    }
    runDraftAction(action)
  }

  const confirmDelete = () => {
    deleteQuote(quote.id)
    setDeleteOpen(false)
    navigate('/quotes')
  }

  return (
    <>
      <div className="print:hidden">
        <Link
          to="/quotes"
          className="inline-flex min-h-8 items-center gap-1 text-sm font-medium text-muted transition-feedback hover:text-ink"
        >
          <span aria-hidden="true">‹</span> {t('quotes.title')}
        </Link>

        <div className="mt-2">
          <PageHeader
            title={quote.name}
            description={`${format.dateOnly(quote.quoteDate)}${
              quote.customer ? ` · ${quote.customer}` : ''
            } · ${plural(quote.locale, quote.lines.length, {
              one: 'quote.lineCount.one',
              other: 'quote.lineCount.other',
            })}`}
            meta={
              <>
                <Badge tone={statusDisplay.tone}>{t(statusDisplay.labelKey)}</Badge>
                {quote.engineVersion ? (
                  <span className="text-xs text-muted">
                    {t('app.engineVersion', { version: quote.engineVersion })}
                  </span>
                ) : null}
              </>
            }
            actions={
              <>
                {quote.result ? (
                  <ShareQuoteButton quote={quote} result={quote.result} variant="secondary" />
                ) : null}
                <Button variant="secondary" onClick={() => window.print()} disabled={!quote.result}>
                  {t('print.action')}
                </Button>
              </>
            }
          />
        </div>

        {savedFor === quote.id ? (
          <div className="mt-5">
            <Alert
              tone="success"
              title={savedWasEdit ? t('quote.updated.title') : t('quote.saved.title')}
              onClose={() => {
                setSavedFor(undefined)
                setSavedWasEdit(false)
              }}
            >
              {savedWasEdit ? t('quote.updated.body') : t('quote.saved.body')}
            </Alert>
          </div>
        ) : null}

        {quote.engineVersion && quote.engineVersion !== ENGINE_VERSION ? (
          <div className="mt-5">
            <Alert tone="info" title={t('quote.engineMismatch.title')}>
              {t('quote.engineMismatch.body', {
                savedVersion: quote.engineVersion,
                currentVersion: ENGINE_VERSION,
              })}
            </Alert>
          </div>
        ) : null}

        <Card className="mt-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">{t('quote.manage.title')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('quote.manage.description')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit ? (
              <Button onClick={() => requestDraftAction('edit')}>{t('quote.edit')}</Button>
            ) : null}
            {canEdit ? (
              <Button variant="secondary" onClick={() => setStatusToSet('sent')}>
                {t('quote.markSent')}
              </Button>
            ) : null}
            {quote.status === 'sent' && !quote.archived ? (
              <Button variant="secondary" onClick={() => setStatusToSet('completed')}>
                {t('quote.markCompleted')}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => requestDraftAction('duplicate')}>
              {t('quote.duplicate')}
            </Button>
            <Button variant="secondary" onClick={() => archiveQuote(quote.id)}>
              {quote.archived ? t('quote.restore') : t('quote.archive')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-negative hover:bg-raised"
            >
              {t('quote.delete')}
            </Button>
          </div>
          {locked ? (
            <p className="mt-3 text-sm text-muted">
              {quote.status === 'sent' ? t('quote.locked.sent') : t('quote.locked.completed')}
            </p>
          ) : null}
        </Card>

        <div className="mt-6">
          <QuoteOverview
            quote={quote}
            result={quote.result}
            snapshotAction={
              quote.snapshot ? (
                <Button variant="ghost" size="sm" onClick={() => requestDraftAction('refresh')}>
                  {t('quote.refresh')}
                </Button>
              ) : undefined
            }
          />
        </div>

        <Modal
          open={pendingDraftAction !== undefined}
          onClose={() => setPendingDraftAction(undefined)}
          title={t('quote.replaceDraft.title')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingDraftAction(undefined)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (pendingDraftAction) runDraftAction(pendingDraftAction)
                }}
              >
                {pendingDraftAction === 'edit' ? t('quote.edit') : t('quote.replaceDraft.confirm')}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-muted">
            <p>
              {pendingDraftAction === 'edit'
                ? t('quote.editDraft.body', { name: quote.name })
                : t('quote.replaceDraft.body', { name: quote.name })}
            </p>
            <p>{t('quote.replaceDraft.hint')}</p>
          </div>
        </Modal>

        <Modal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title={t('quote.deleteConfirm.title')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                {t('quote.delete')}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-muted">
            <p>{t('quote.deleteConfirm.body', { name: quote.name })}</p>
            <p>{t('quote.deleteConfirm.hint')}</p>
          </div>
        </Modal>
        <Modal
          open={statusToSet !== undefined}
          onClose={() => setStatusToSet(undefined)}
          title={statusToSet ? t(STATUS_CONFIRM[statusToSet].title) : ''}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStatusToSet(undefined)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (!statusToSet) return
                  setQuoteStatus(quote.id, statusToSet)
                  setStatusToSet(undefined)
                }}
              >
                {statusToSet ? t(STATUS_CONFIRM[statusToSet].confirm) : ''}
              </Button>
            </>
          }
        >
          {statusToSet ? (
            <p className="text-sm text-muted">{t(STATUS_CONFIRM[statusToSet].body)}</p>
          ) : null}
        </Modal>
      </div>

      <QuotePrint quote={quote} result={quote.result} />
    </>
  )
}
