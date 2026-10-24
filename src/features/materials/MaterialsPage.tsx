import { useState } from 'react'
import type { Material } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
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
import { materialFamilyLabels } from '@/lib/labels'
import { formatCurrency, formatPercent } from '@/lib/format'
import { MaterialForm } from './MaterialForm'

export function MaterialsPage() {
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
        title="Materiali"
        description="Prezzo al kg, peso netto della bobina e tasso guasti. I grammi si inseriscono dal totale dello slicer."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi materiale</Button>}
      />

      <div className="mt-6">
        <Alert tone="info" title="Il prezzo è quello effettivo">
          Inserisci il prezzo che paghi davvero, eventualmente comprensivo di spedizione. Se la
          bobina non è da 1 kg, indica il peso netto reale: il prezzo al grammo si adegua.
        </Alert>
      </div>

      {materials.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nessun materiale configurato"
            description="Aggiungi almeno un materiale per poter calcolare una stampa."
            action={<Button onClick={() => setEditing('new')}>Aggiungi materiale</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {materials.length} {materials.length === 1 ? 'materiale' : 'materiali'} ·{' '}
            {materials.filter((material) => material.archived).length} archiviati
          </p>

          <TableScroll label="Materiali configurati" className="mt-3 hidden sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Materiali configurati</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Materiale
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Famiglia
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Prezzo al kg
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Al grammo
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Bobina
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Guasti
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="border-t border-rule align-middle">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{material.name}</span>
                        {material.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {material.supplier ?? 'Fornitore non indicato'}
                        {material.color ? ` · ${material.color}` : ''}
                      </p>
                    </th>
                    <td className="py-3 pr-4 text-muted">
                      {materialFamilyLabels[material.family]}
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
                        ? 'Globale'
                        : formatPercent(material.failureRateBp)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(material)}>
                          Modifica
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveMaterial(material.id)}
                        >
                          {material.archived ? 'Ripristina' : 'Archivia'}
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
                      {material.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[
                        materialFamilyLabels[material.family] !== material.name
                          ? materialFamilyLabels[material.family]
                          : null,
                        material.supplier,
                        material.color,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {material.spoolNetWeightG} g · guasti{' '}
                      {material.failureRateBp === undefined
                        ? 'globali'
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
                    Modifica
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveMaterial(material.id)}>
                    {material.archived ? 'Ripristina' : 'Archivia'}
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
        title={editing === 'new' ? 'Nuovo materiale' : 'Modifica materiale'}
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
