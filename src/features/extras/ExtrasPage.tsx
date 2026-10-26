import { useState } from 'react'
import type { Extra } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, TableScroll } from '@/components/ui'
import { ExtraForm } from './ExtraForm'

export function ExtrasPage() {
  const { t } = useI18n()
  const format = useFormat()
  const config = useAppStore((state) => state.config)
  const addExtra = useAppStore((state) => state.addExtra)
  const updateExtra = useAppStore((state) => state.updateExtra)
  const archiveExtra = useAppStore((state) => state.archiveExtra)
  const [editing, setEditing] = useState<Extra | 'new' | null>(null)

  const extras = config.extras

  const handleSave = (data: Omit<Extra, 'id'>) => {
    if (editing === 'new') {
      addExtra(data)
    } else if (editing) {
      updateExtra(editing.id, data)
    }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.extras')}
        description={t('extras.description')}
        actions={<Button onClick={() => setEditing('new')}>{t('extras.add')}</Button>}
      />

      <p className="mt-4 max-w-2xl text-sm leading-snug text-muted">{t('extras.note')}</p>

      {extras.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('extras.emptyTitle')}
            description={t('extras.emptyBody')}
            action={<Button onClick={() => setEditing('new')}>{t('extras.add')}</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {extras.length === 1
              ? t('extras.count.one', { count: extras.length })
              : t('extras.count.other', { count: extras.length })}
          </p>

          <TableScroll label={t('extras.tableLabel')} className="mt-3 hidden sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('extras.tableLabel')}</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('extras.colExtra')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('extras.colCategory')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('extras.colUnit')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('extras.colAmount')}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">{t('extras.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {extras.map((extra) => (
                  <tr key={extra.id} className="border-t border-rule align-middle">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{extra.name}</span>
                        {extra.archived ? (
                          <Badge tone="warning">{t('extras.archived')}</Badge>
                        ) : null}
                      </div>
                    </th>
                    <td className="py-3 pr-4 text-muted">{extra.category ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted">
                      {t(extra.unit === 'perUnit' ? 'extra.unitPerUnit' : 'extra.unitPerJob')}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                      {format.currency(extra.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(extra)}>
                          {t('extras.edit')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => archiveExtra(extra.id)}>
                          {extra.archived ? t('extras.restore') : t('extras.archive')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          <ul className="mt-3 border-t border-line sm:hidden">
            {extras.map((extra) => (
              <li key={extra.id} className="border-b border-rule py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{extra.name}</p>
                      {extra.archived ? <Badge tone="warning">{t('extras.archived')}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {t(extra.unit === 'perUnit' ? 'extra.unitPerUnit' : 'extra.unitPerJob')}
                      {extra.category ? ` · ${extra.category}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-medium tabular-nums text-ink">
                    {format.currency(extra.amount)}
                  </p>
                </div>
                <div className="mt-2 flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(extra)}>
                    {t('extras.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveExtra(extra.id)}>
                    {extra.archived ? t('extras.restore') : t('extras.archive')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('extra.newTitle') : t('extra.editTitle')}
      >
        <ExtraForm
          extra={editing && editing !== 'new' ? editing : undefined}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}
