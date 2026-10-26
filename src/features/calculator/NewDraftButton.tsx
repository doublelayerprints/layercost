import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { draftHasContent } from '@/lib/draft'
import { Button, Modal, type ButtonProps } from '@/components/ui'

export function NewDraftButton({
  label,
  variant = 'secondary',
  size = 'md',
  className,
}: {
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}) {
  const { t } = useI18n()
  const draft = useAppStore((state) => state.draft)
  const newDraft = useAppStore((state) => state.newDraft)
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const buttonLabel = label ?? t('calculator.newDraft')

  const startNewDraft = () => {
    newDraft()
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
        {buttonLabel}
      </Button>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('calculator.newDraftTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t('calculator.continueEditing')}
            </Button>
            <Button variant="danger" onClick={startNewDraft}>
              {t('calculator.discardDraft')}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>{t('calculator.newDraftBody')}</p>
          <p>{t('calculator.newDraftDefaults')}</p>
        </div>
      </Modal>
    </>
  )
}
