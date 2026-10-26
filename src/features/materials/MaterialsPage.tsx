import { useState } from 'react'
import type { Material } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useI18n } from '@/app/i18n-context'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  TableScroll,
} from '@/components/ui'
import { materialFamilyLabel } from '@/lib/labels'
import { formatCurrency, formatPercent } from '@/lib/format'
import { MaterialForm } from './MaterialForm'

export function MaterialsPage() {
  const { t } = useI18n()
  const config = useAppStore((state) => state.config)
  const addMaterial = useAppStore((state) => state.addMaterial)
  const updateMaterial = useAppStore((state) => state.updateMaterial)
  const archiveMaterial = useAppStore((state) => state.archiveMaterial)
  const [editing, setEditing] = useState<Material | 'new' | null>(null)

  const materials = config.materials

  const handleSave = (data: Omit<Material, 'id'>) => {
    if (editing === 'new') {
      addMaterial(data)
    } else if (editing) {
      updateMaterial(editing.id, data)
    }
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.materials')}
        description={t('materials.description')}
        actions={<Button onClick={() => setEditing('new')}>{t('materials.add')}</Button>}
      />

      <div className="mt-6">
        <Alert tone="info" title={t('materials.priceNoteTitle')}>
          {t('materials.priceNoteBody')}
        </Alert>
      </div>

      {materials.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('materials.emptyTitle')}
            description={t('materials.emptyBody')}
            action={<Button onClick={() => setEditing('new')}>{t('materials.add')}</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {materials.length === 1
              ? t('materials.count.one', { count: materials.length })
              : t('materials.count.other', { count: materials.length })}{' '}
            ·{' '}
            {t('materials.archivedCount', {
              count: materials.filter((material) => material.archived).length,
            })}
          </p>

          <TableScroll label={t('materials.tableLabel')} className="mt-3 hidden sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('materials.tableLabel')}</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('materials.colMaterial')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    {t('materials.colFamily')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('materials.colPricePerKg')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('materials.colPricePerGram')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('materials.colSpool')}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t('materials.colFailure')}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">{t('materials.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="border-t border-rule align-middle">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{material.name}</span>
                        {material.archived ? (
                          <Badge tone="warning">{t('materials.archived')}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {material.supplier ?? t('materials.supplierMissing')}
                        {material.color ? ` · ${material.color}` : ''}
                      </p>
                    </th>
                    <td className="py-3 pr-4 text-muted">
                      {materialFamilyLabel(material.family, t)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                      {formatCurrency(material.pricePerKg)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {formatCurrency(material.pricePerKg / 1000, 4)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {material.spoolNetWeightG} g
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {material.failureRateBp === undefined
                        ? t('materials.failureGlobal')
                        : formatPercent(material.failureRateBp)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(material)}>
                          {t('materials.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveMaterial(material.id)}
                        >
                          {material.archived ? t('materials.restore') : t('materials.archive')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          <ul className="mt-3 border-t border-line sm:hidden">
            {materials.map((material) => (
              <li key={material.id} className="border-b border-rule py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{material.name}</p>
                      {material.archived ? (
                        <Badge tone="warning">{t('materials.archived')}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[
                        materialFamilyLabel(material.family, t) !== material.name
                          ? materialFamilyLabel(material.family, t)
                          : null,
                        material.supplier,
                        material.color,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {material.spoolNetWeightG} g · {t('materials.failuresLabel')}{' '}
                      {material.failureRateBp === undefined
                        ? t('materials.failureGlobalLower')
                        : formatPercent(material.failureRateBp)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-medium tabular-nums text-ink">
                      {formatCurrency(material.pricePerKg)}
                      <span className="text-xs font-normal text-muted">/kg</span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatCurrency(material.pricePerKg / 1000, 4)}/g
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(material)}>
                    {t('materials.edit')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveMaterial(material.id)}>
                    {material.archived ? t('materials.restore') : t('materials.archive')}
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
        title={editing === 'new' ? t('material.newTitle') : t('material.editTitle')}
      >
        <MaterialForm
          material={editing && editing !== 'new' ? editing : undefined}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}
