import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/button-styles'
import { cn } from '@/lib/cn'

/**
 * Landing buttons use the app geometry but the page's body size (16px). The
 * app's compact controls stay at 14px inside the interface.
 */
export function landingButtonClassName({
  variant,
  size,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}): string {
  return buttonClassName({ variant, size, className: cn('landing-button', className) })
}
