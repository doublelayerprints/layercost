import { useState } from 'react'
import type { Extra } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, Card, EmptyState, Modal, PageHeader, TableScroll } from '@/components/ui'
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
    <div>
      <PageHeader
        title="Extra"
        description="Imballaggio, etichette, spedizione, calamite, viti: tutto ciò che si aggiunge al costo della stampa."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi extra</Button>}
      />

      <p className="mt-4 max-w-2xl text-sm leading-snug text-muted">
        Un extra “per pezzo” viene moltiplicato per la quantità della riga. Un extra “per lavoro”
        viene applicato una volta al preventivo, ad esempio la spedizione.
      </p>

      {extras.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nessun extra configurato"
            description="Puoi calcolare anche senza extra. Aggiungili quando inizi a spedire o confezionare."
            action={<Button onClick={() => setEditing('new')}>Aggiungi extra</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {extras.length} {extras.length === 1 ? 'voce' : 'voci'}
          </p>

          <TableScroll label="Costi extra configurati" className="mt-3 hidden sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Costi extra configurati</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Extra
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Categoria
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Unità
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Importo
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {extras.map((extra) => (
                  <tr key={extra.id} className="border-t border-rule align-middle">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{extra.name}</span>
                        {extra.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                      </div>
                    </th>
                    <td className="py-3 pr-4 text-muted">{extra.category ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted">{labelExtraUnit(extra.unit)}</td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                      {formatCurrency(extra.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(extra)}>
                          Modifica
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => archiveExtra(extra.id)}>
                          {extra.archived ? 'Ripristina' : 'Archivia'}
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
                      {extra.archived ? <Badge tone="warning">Archiviato</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {labelExtraUnit(extra.unit)}
                      {extra.category ? ` · ${extra.category}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-medium tabular-nums text-ink">
                    {formatCurrency(extra.amount)}
                  </p>
                </div>
                <div className="mt-2 flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(extra)}>
                    Modifica
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => archiveExtra(extra.id)}>
                    {extra.archived ? 'Ripristina' : 'Archivia'}
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
