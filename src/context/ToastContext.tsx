import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const KIND_STYLES: Record<ToastKind, { icon: typeof Check; className: string; iconClass: string }> = {
  success: {
    icon: Check,
    className: 'border-acid/35',
    iconClass: 'border-acid/30 bg-acid/10 text-acid',
  },
  error: {
    icon: AlertTriangle,
    className: 'border-danger/35',
    iconClass: 'border-danger/30 bg-danger/10 text-danger',
  },
  info: {
    icon: Info,
    className: 'border-cyan/30',
    iconClass: 'border-cyan/30 bg-cyan/10 text-cyan',
  },
}

let nextToastId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextToastId++
      setToasts((current) => [...current.slice(-3), { id, message, kind }])
      window.setTimeout(() => remove(id), 4600)
    },
    [remove],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const styles = KIND_STYLES[toast.kind]
          const Icon = styles.icon
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex animate-rise items-start gap-3 rounded-lg border bg-panel/95 p-3 shadow-2xl shadow-black/50 backdrop-blur',
                styles.className,
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border',
                  styles.iconClass,
                )}
              >
                <Icon size={13} strokeWidth={2.2} />
              </span>
              <p className="flex-1 pt-0.5 font-mono text-[11px] leading-relaxed text-paper/90">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded p-1 text-faint transition hover:bg-white/5 hover:text-paper"
                aria-label="Cerrar aviso"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider.')
  return context
}
