import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { draftHasContent } from '@/lib/draft'
import { Button, Modal, type ButtonProps } from '@/components/ui'

export function NewDraftButton({
  label = 'Nuovo',
  variant = 'secondary',
  size = 'md',
  className,
}: {
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}) {
  const draft = useAppStore((state) => state.draft)
  const newDraft = useAppStore((state) => state.newDraft)
  const { locale } = useI18n()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const startNewDraft = () => {
    newDraft(locale)
    setConfirmOpen(false)
    navigate('/')
  }

  const handleClick = () => {
    if (draftHasContent(draft)) {
      setConfirmOpen(true)
      return
    }
    startNewDraft()
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={handleClick}>
        {label}
      </Button>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Iniziare un nuovo preventivo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Continua a modificare
            </Button>
            <Button variant="danger" onClick={startNewDraft}>
              Scarta la bozza
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            La bozza attuale non è ancora nello storico. Se vuoi conservarla, salvala prima di
            continuare.
          </p>
          <p>La nuova bozza parte dai valori predefiniti delle impostazioni.</p>
        </div>
      </Modal>
    </>
  )
}
