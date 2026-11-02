import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Printer } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useI18n } from '@/app/i18n-context'
import { Alert, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { buttonClassName } from '@/components/button-styles'
import { PrinterForm } from './PrinterForm'
import { PrinterList } from './PrinterList'

export function PrintersPage() {
  const { t } = useI18n()
  const config = useAppStore((state) => state.config)
  const addPrinter = useAppStore((state) => state.addPrinter)
  const updatePrinter = useAppStore((state) => state.updatePrinter)
  const archivePrinter = useAppStore((state) => state.archivePrinter)
  const [editing, setEditing] = useState<Printer | 'new' | null>(null)

  const printers = config.printers
  const tariffs = config.settings.tariffs
  const hasPrinters = printers.length > 0

  const handleSave = (data: Omit<Printer, 'id'>) => {
    if (editing === 'new') {
      addPrinter(data)
    } else if (editing) {
      updatePrinter(editing.id, data)
    }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.printers')}
        description={t('printers.description')}
        actions={
          <>
            <Link to="/printers/catalog" className={buttonClassName({ variant: 'secondary' })}>
              {t('printers.catalog')}
            </Link>
            <Button onClick={() => setEditing('new')}>{t('printers.add')}</Button>
          </>
        }
      />

      {hasPrinters ? <CatalogPromo /> : null}

      <div className={hasPrinters ? 'mt-4' : 'mt-6'}>
        <Alert tone="info" title={t('printers.estimatesTitle')}>
          {t('printers.estimatesBody')}
        </Alert>
      </div>

      {hasPrinters ? (
        <div className="mt-6">
          <PrinterList
            printers={printers}
            tariffs={tariffs}
            onEdit={(printer) => setEditing(printer)}
            onArchive={(printer) => archivePrinter(printer.id)}
          />
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={t('printers.emptyTitle')}
            description={t('printers.emptyBody')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/printers/catalog" className={buttonClassName()}>
                  {t('printers.catalog')}
                </Link>
                <Button variant="secondary" onClick={() => setEditing('new')}>
                  {t('printers.add')}
                </Button>
              </div>
            }
          />
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('printer.newTitle') : t('printer.editTitle')}
        size="lg"
      >
        <PrinterForm
          printer={editing && editing !== 'new' ? editing : undefined}
          tariffs={tariffs}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}

function CatalogPromo() {
  const { t } = useI18n()

  return (
    <Card className="mt-6 border-l-4 border-l-data p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('printers.catalog')}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-ink">
            {t('printers.catalogPromoTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('printers.catalogPromoBody')}</p>
        </div>
        <Link
          to="/printers/catalog"
          className={buttonClassName({
            variant: 'secondary',
            className: 'w-full shrink-0 sm:w-auto',
          })}
        >
          {t('printers.catalogPromoCta')}
        </Link>
      </div>
    </Card>
  )
}
