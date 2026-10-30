import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface hover:bg-ink/90',
  secondary: 'bg-raised text-ink hover:bg-line',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  danger: 'bg-negative text-surface hover:bg-negative/90',
  subtle: 'text-data hover:bg-raised',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs max-sm:h-10',
  md: 'h-9 px-4 text-sm max-sm:h-11',
  lg: 'h-10 px-5 text-sm max-sm:h-11',
}

/** Shared button geometry for links that navigate and must stay real anchors. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-feedback disabled:cursor-not-allowed disabled:opacity-50',
    buttonVariants[variant],
    buttonSizes[size],
    className,
  )
}
