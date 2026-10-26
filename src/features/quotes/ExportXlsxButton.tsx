import { useId } from 'react'
import { useI18n } from '@/app/i18n-context'
import { Button, type ButtonProps } from '@/components/ui'
import { useAppStore } from '@/state/app-store'
import { downloadQuotesXlsx } from './export-xlsx'

export function ExportXlsxButton({ variant = 'secondary' }: { variant?: ButtonProps['variant'] }) {
  const { t, locale } = useI18n()
  const quotes = useAppStore((state) => state.quotes)
  const config = useAppStore((state) => state.config)
  const hintId = useId()
  const empty = quotes.length === 0

  return (
    <>
      <Button
        variant={variant}
        onClick={() => downloadQuotesXlsx(quotes, config, locale)}
        disabled={empty}
        aria-describedby={hintId}
      >
        {t('xlsx.export')}
      </Button>
      <span id={hintId} className="sr-only">
        {t(empty ? 'xlsx.exportEmptyHint' : 'xlsx.exportHint')}
      </span>
    </>
  )
}
