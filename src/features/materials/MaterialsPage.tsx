import { useState } from 'react'
import type { Material } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione"
        title="Materiali"
        description="Prezzo al kg, peso netto della bobina e tasso guasti. I grammi si inseriscono dal totale dello slicer."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi materiale</Button>}
      />

      <Alert tone="info" title="Il prezzo è quello effettivo">
        Inserisci il prezzo che paghi davvero, eventualmente comprensivo di spedizione. Se la bobina
        non è da 1 kg, indica il peso netto reale: il prezzo al grammo si adegua.
      </Alert>

      {materials.length === 0 ? (
        <EmptyState
          title="Nessun materiale configurato"
          description="Aggiungi almeno un materiale per poter calcolare una stampa."
          action={<Button onClick={() => setEditing('new')}>Aggiungi materiale</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <Card key={material.id} className={material.archived ? 'opacity-70' : undefined}>
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{material.name}</h2>
                    <Badge tone="neutral">{materialFamilyLabels[material.family]}</Badge>
                    {material.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {material.supplier ?? 'Fornitore non indicato'}
                    {material.color ? ` · ${material.color}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(material)}>
                    Modifica
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveMaterial(material.id)}>
                    {material.archived ? 'Ripristina' : 'Archivia'}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Prezzo
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                    {formatCurrency(material.pricePerKg)}/kg
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(material.pricePerKg / 1000, 4)}/g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Bobina
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">
                    {material.spoolNetWeightG} g netti
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Guasti:{' '}
                    {material.failureRateBp === undefined
                      ? 'globale'
                      : formatPercent(material.failureRateBp)}
                  </p>
                </div>
              </div>
              {material.notes ? (
                <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                  {material.notes}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
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
