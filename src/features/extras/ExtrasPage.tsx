import { useState } from 'react'
import type { Extra } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { labelExtraUnit } from '@/lib/labels'
import { ExtraForm } from './ExtraForm'

export function ExtrasPage() {
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione"
        title="Extra"
        description="Imballaggio, etichette, spedizione, calamite, viti: tutto ciò che si aggiunge al costo della stampa."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi extra</Button>}
      />

      <Card className="bg-slate-50 p-4 text-sm text-slate-600">
        Un extra “per pezzo” viene moltiplicato per la quantità della riga. Un extra “per lavoro”
        viene applicato una volta al preventivo, ad esempio la spedizione.
      </Card>

      {extras.length === 0 ? (
        <EmptyState
          title="Nessun extra configurato"
          description="Puoi calcolare anche senza extra. Aggiungili quando inizi a spedire o confezionare."
          action={<Button onClick={() => setEditing('new')}>Aggiungi extra</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {extras.map((extra) => (
            <Card key={extra.id} className={extra.archived ? 'opacity-70' : undefined}>
              <div className="flex items-start justify-between gap-2 p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{extra.name}</h2>
                    <Badge tone={extra.unit === 'perUnit' ? 'info' : 'neutral'}>
                      {labelExtraUnit(extra.unit)}
                    </Badge>
                    {extra.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                  </div>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {formatCurrency(extra.amount)}
                  </p>
                  {extra.category ? (
                    <p className="text-xs text-slate-500">{extra.category}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(extra)}>
                    Modifica
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveExtra(extra.id)}>
                    {extra.archived ? 'Ripristina' : 'Archivia'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuovo extra' : 'Modifica extra'}
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
