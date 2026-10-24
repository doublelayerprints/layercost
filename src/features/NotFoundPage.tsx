import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, PageHeader } from '@/components/ui'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <PageHeader title="Pagina non trovata" />
      <EmptyState
        title="Questa pagina non esiste"
        description="Il link potrebbe essere vecchio o incompleto."
        action={<Button onClick={() => navigate('/')}>Torna al calcolatore</Button>}
      />
    </div>
  )
}
