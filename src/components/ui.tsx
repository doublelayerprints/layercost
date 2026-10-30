import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentPropsWithRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/app/i18n-context'
import { cn } from '@/lib/cn'
import { FieldContext, useFieldIds, type FieldIds } from './field-context'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './button-styles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line bg-surface', className)} {...props} />
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'info' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-pill-neutral-bg text-pill-neutral-ink',
  success: 'bg-pill-success-bg text-pill-success-ink',
  warning: 'bg-pill-warning-bg text-pill-warning-ink',
  info: 'bg-pill-info-bg text-pill-info-ink',
  danger: 'bg-pill-danger-bg text-pill-danger-ink',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const errorId = error ? `${baseId}-error` : undefined
  const hintId = !error && hint ? `${baseId}-hint` : undefined

  return (
    <FieldContext.Provider value={{ labelId, hintId, errorId }}>
      <div className={cn('space-y-1.5', className)}>
        {label ? (
          htmlFor ? (
            <label htmlFor={htmlFor} id={labelId} className="block text-sm font-medium text-ink">
              {label}
              {required ? (
                <span className="ml-0.5 text-negative" aria-hidden="true">
                  *
                </span>
              ) : null}
            </label>
          ) : (
            <span id={labelId} className="block text-sm font-medium text-ink">
              {label}
              {required ? (
                <span className="ml-0.5 text-negative" aria-hidden="true">
                  *
                </span>
              ) : null}
            </span>
          )
        ) : null}
        {children}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-negative">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

function describedBy(ariaDescribedBy: string | undefined, ids: FieldIds): string | undefined {
  return [ariaDescribedBy, ids.errorId, ids.hintId].filter(Boolean).join(' ') || undefined
}

const controlClasses =
  'w-full rounded-control border border-control bg-surface px-3 text-sm text-ink transition-feedback placeholder:text-muted disabled:bg-raised disabled:text-muted'

export function Input({ className, ...props }: ComponentPropsWithRef<'input'>) {
  const ids = useFieldIds()
  return (
    <input
      {...props}
      aria-describedby={describedBy(props['aria-describedby'], ids)}
      aria-invalid={ids.errorId ? true : props['aria-invalid']}
      className={cn(controlClasses, 'h-9 max-sm:h-11', className)}
    />
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const ids = useFieldIds()
  return (
    <select
      {...props}
      aria-describedby={describedBy(props['aria-describedby'], ids)}
      aria-invalid={ids.errorId ? true : props['aria-invalid']}
      className={cn(controlClasses, 'h-9 max-sm:h-11', className)}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  const ids = useFieldIds()
  return (
    <textarea
      {...props}
      aria-describedby={describedBy(props['aria-describedby'], ids)}
      aria-invalid={ids.errorId ? true : props['aria-invalid']}
      className={cn(controlClasses, 'min-h-20 py-2', className)}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-control transition-feedback peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-data peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  onClose,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  title?: ReactNode
  children?: ReactNode
  onClose?: () => void
}) {
  const { t } = useI18n()
  const tones = {
    info: 'border-l-data',
    warning: 'border-l-warning',
    danger: 'border-l-negative',
    success: 'border-l-positive',
  }
  return (
    <div
      className={cn(
        'rounded-card border border-l-4 border-line bg-surface px-4 py-3 text-sm text-ink',
        tones[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? <p className="font-medium">{title}</p> : null}
          {children ? <div className="mt-1 text-sm text-ink">{children}</div> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-control p-1 text-muted hover:bg-raised hover:text-ink"
            aria-label={t('common.closeAlert')}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const { t } = useI18n()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null)

    focusable()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActive?.focus()
    }
  }, [open])

  if (!open) return null

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim p-3 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card bg-surface shadow-overlay',
          widths[size],
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1.5 text-muted hover:bg-raised hover:text-ink"
            aria-label={t('common.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-raised px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'warning'
}) {
  const valueTone =
    tone === 'accent' ? 'text-data' : tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('mt-1 text-2xl font-medium tabular-nums', valueTone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function Price({
  label,
  value,
  hint,
  size = 'lg',
  className,
}: {
  label?: ReactNode
  value: ReactNode
  hint?: ReactNode
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={className}>
      {label ? <p className="text-xs font-medium text-muted">{label}</p> : null}
      <p
        className={cn(
          'font-serif font-semibold tracking-price tabular-nums text-ink',
          size === 'lg' ? 'text-price max-sm:text-price-sm' : 'text-2xl leading-tight',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function PageHeader({
  title,
  titleAction,
  titleClassName,
  description,
  actions,
  meta,
}: {
  title: ReactNode
  titleAction?: ReactNode
  titleClassName?: string
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-1">
          <h1
            className={cn('min-w-0 text-2xl font-semibold tracking-title text-ink', titleClassName)}
          >
            {title}
          </h1>
          {titleAction ? <div className="shrink-0">{titleAction}</div> : null}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        {meta ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">{meta}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  actions,
  id,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div>
        <h2 id={id} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 max-w-2xl text-sm leading-snug text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/**
 * Card with a compact header that can collapse its body into a single row.
 * The header title stays a real heading; a transparent button covers the row so
 * the whole header toggles, while actions remain clickable above it.
 */
export function CollapsibleCard({
  title,
  description,
  summary,
  meta,
  actions,
  defaultOpen = true,
  headingId,
  className,
  contentClassName,
  children,
  ...cardProps
}: {
  title: string
  description?: ReactNode
  summary?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  headingId?: string
  className?: string
  contentClassName?: string
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const generatedHeadingId = useId()
  const titleId = headingId ?? generatedHeadingId
  const panelId = useId()

  return (
    <Card className={className} {...cardProps}>
      <div className="group relative flex items-start gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {open ? null : summary ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug text-muted">
                {summary}
              </div>
            ) : null}
            {open || !meta ? null : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug text-muted">
                {meta}
              </div>
            )}
          </div>
          {open && description ? (
            <p className="mt-0.5 max-w-2xl text-sm leading-snug text-muted">{description}</p>
          ) : null}
          {open && meta ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug text-muted">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
        <CollapseChevron open={open} />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            open ? t('common.collapse', { name: title }) : t('common.expand', { name: title })
          }
          className="absolute inset-0 cursor-pointer rounded-card"
        />
      </div>
      <div
        id={panelId}
        hidden={!open}
        className={cn('px-5 pb-5 sm:px-6 sm:pb-6', contentClassName)}
      >
        {children}
      </div>
    </Card>
  )
}

/**
 * Visible affordance for a collapsible header. It looks like a control but is
 * decorative: the transparent overlay button owns the interaction and the label.
 */
export function CollapseChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-muted transition-feedback group-hover:bg-raised group-hover:text-ink',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'h-5 w-5 transition-transform motion-reduce:transition-none',
          open && 'rotate-180',
        )}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}

export function InfoDot({ label }: { label: string }) {
  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-control text-xs font-semibold text-muted"
    >
      i
    </span>
  )
}

export function TableScroll({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  // A scroll container must be reachable by keyboard, otherwise the table is unreadable on narrow screens.
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn('relative overflow-x-auto', className)}
    >
      {children}
    </div>
  )
}

export function Table({
  label,
  className,
  containerClassName,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { label: string; containerClassName?: string }) {
  return (
    <TableScroll label={label} className={containerClassName}>
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </TableScroll>
  )
}

export interface TabItem {
  id: string
  label: string
}

export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  label: string
  className?: string
}) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length
    const nextItem = items[next]
    if (nextItem) {
      onChange(nextItem.id)
      document.getElementById(`tab-${nextItem.id}`)?.focus()
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-4 overflow-x-auto border-b border-line', className)}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`tab-${item.id}`}
          aria-selected={value === item.id}
          aria-controls={`panel-${item.id}`}
          tabIndex={value === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={cn(
            '-mb-px shrink-0 border-b-2 px-1 py-2 text-sm font-medium transition-feedback',
            value === item.id
              ? 'border-data text-ink'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
