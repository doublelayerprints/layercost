import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { Button, EmptyState, PageHeader } from '@/components/ui'

export function NotFoundPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <PageHeader title={t('notFound.title')} />
      <EmptyState
        title={t('notFound.emptyTitle')}
        description={t('notFound.description')}
        action={<Button onClick={() => navigate('/')}>{t('notFound.back')}</Button>}
      />
    </div>
  )
}
