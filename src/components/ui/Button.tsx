import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-mono font-medium uppercase tracking-[0.12em] transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-45'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-acid text-ink hover:bg-[#d6ff6e] shadow-[0_0_28px_-10px_rgba(200,247,81,0.55)] hover:shadow-[0_0_34px_-8px_rgba(200,247,81,0.65)] active:translate-y-px',
  secondary:
    'border border-line bg-panel text-paper hover:border-line-bright hover:bg-raised active:translate-y-px',
  ghost: 'text-dim hover:bg-white/5 hover:text-paper',
  danger:
    'border border-danger/30 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/15 active:translate-y-px',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[10px]',
  md: 'h-10 px-4 text-[11px]',
  lg: 'h-12 px-6 text-xs',
}

export function buttonClasses(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}): string {
  return cn(
    BASE,
    VARIANTS[options?.variant ?? 'primary'],
    SIZES[options?.size ?? 'md'],
    options?.className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

interface LinkButtonProps {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onClick?: () => void
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  leftIcon,
  rightIcon,
  onClick,
}: LinkButtonProps) {
  return (
    <Link to={to} onClick={onClick} className={buttonClasses({ variant, size, className })}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  )
}
