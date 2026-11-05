import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTROL =
  'w-full rounded-md border border-line bg-ink/70 px-3 py-2.5 text-sm text-paper placeholder:text-faint/75 transition focus:border-acid/50 focus:bg-ink focus:outline-none focus:ring-2 focus:ring-acid/10'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-dim"
        >
          {label}
        </label>
        {hint ? <span className="font-mono text-[10px] text-faint">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-danger">
          <AlertCircle size={11} />
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(CONTROL, 'min-h-28 resize-y', className)} {...props} />
  },
)

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(CONTROL, 'pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-faint transition hover:bg-white/5 hover:text-paper"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    )
  },
)
