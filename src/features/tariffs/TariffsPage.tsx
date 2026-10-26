import { useState } from 'react'
import type { EnergyTariff } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, TableScroll } from '@/components/ui'
import { todayIsoDate } from '@/lib/date'
import { TariffForm } from './TariffForm'

export function TariffsPage() {
  const { t } = useI18n()
  const format = useFormat()
  const config = useAppStore((state) => state.config)
  const addTariff = useAppStore((state) => state.addTariff)
  const updateTariff = useAppStore((state) => state.updateTariff)
  const removeTariff = useAppStore((state) => state.removeTariff)
  const [editing, setEditing] = useState<EnergyTariff | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EnergyTariff>()

  const tariffs = [...config.settings.tariffs].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  )
  const today = todayIsoDate()
  const current = [...config.settings.tariffs]
    .filter((tariff) => tariff.effectiveFrom <= today)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .at(-1)

  const handleSave = (data: Omit<EnergyTariff, 'id'>) => {
    if (editing === 'new') {
      addTariff(data)
    } else if (editing) {
      updateTariff(editing.id, data)
    }
    setEditing(null)
  }

  const handleRemove = (tariff: EnergyTariff) => {
    if (config.settings.tariffs.length <= 1) return
    setPendingDelete(tariff)
  }

  const confirmRemove = () => {
    if (!pendingDelete) return
    removeTariff(pendingDelete.id)
    setPendingDelete(undefined)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.tariffs')}
        description={t('tariffs.description')}
        actions={<Button onClick={() => setEditing('new')}>{t('tariffs.add')}</Button>}
      />

      <Card className="mt-6 border-l-4 border-l-data p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">{t('tariff.current')}</p>
            {current ? (
              <>
                <p className="mt-1 text-base font-semibold text-ink">{current.label}</p>
                <p className="mt-1 text-2xl font-medium tabular-nums text-ink">
                  {format.currency(current.pricePerKWh, 4)}
                  <span className="text-sm font-normal text-muted">/kWh</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {t('tariff.inForceSince', { date: format.dateOnly(current.effectiveFrom) })}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-negative">{t('tariff.noneToday')}</p>
            )}
          </div>
          {current ? <Badge tone="success">{t('tariff.inUse')}</Badge> : null}
        </div>
      </Card>

      {tariffs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('tariffs.emptyTitle')}
            description={t('tariffs.emptyBody')}
            action={<Button onClick={() => setEditing('new')}>{t('tariffs.add')}</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {tariffs.length === 1
              ? t('tariffs.count.one', { count: tariffs.length })
              : t('tariffs.count.other', { count: tariffs.length })}
          </p>
          {tariffs.length === 1 ? (
            <p className="mt-1 text-xs text-muted">{t('tariffs.lastRemaining')}</p>
          ) : null}
          <TableScroll label={t('tariffs.tableLabel')} className="mt-3">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('tariffs.tableLabel')}</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('tariffs.colLabel')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('tariffs.colPrice')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('tariffs.colEffectiveFrom')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('tariffs.colStatus')}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">{t('tariffs.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((tariff) => (
                  <tr key={tariff.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <p className="font-medium text-ink">{tariff.label}</p>
                      {tariff.notes ? (
                        <p className="mt-0.5 text-xs text-muted">{tariff.notes}</p>
                      ) : null}
                    </th>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                      {format.currency(tariff.pricePerKWh, 4)}/kWh
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {format.dateOnly(tariff.effectiveFrom)}
                    </td>
                    <td className="py-3 pr-4">
                      {current?.id === tariff.id ? (
                        <Badge tone="success">{t('tariff.statusCurrent')}</Badge>
                      ) : tariff.effectiveFrom > today ? (
                        <Badge tone="info">{t('tariff.statusFuture')}</Badge>
                      ) : (
                        <Badge tone="neutral">{t('tariff.statusPast')}</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(tariff)}>
                          {t('tariffs.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(tariff)}
                          disabled={config.settings.tariffs.length <= 1}
                          className="text-negative hover:bg-raised"
                        >
                          {t('tariffs.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      )}

      <p className="mt-4 max-w-2xl text-sm leading-snug text-muted">{t('tariffs.note')}</p>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('tariff.newTitle') : t('tariff.editTitle')}
      >
        <TariffForm
          tariff={editing && editing !== 'new' ? editing : undefined}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      <Modal
        open={pendingDelete !== undefined}
        onClose={() => setPendingDelete(undefined)}
        title={t('tariff.deleteTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(undefined)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              {t('tariff.deleteConfirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>{t('tariff.deleteBody', { label: pendingDelete?.label ?? '' })}</p>
          <p>{t('tariff.deleteQuotes')}</p>
        </div>
      </Modal>
    </div>
  )
}
