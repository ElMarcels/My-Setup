import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'eliminar',
  cancelLabel = 'cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 40)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      window.clearTimeout(timer)
    }
  }, [open, loading, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md animate-rise overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/60"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-danger/80" />
          <span className="h-2 w-2 rounded-full bg-line-bright" />
          <span className="h-2 w-2 rounded-full bg-line-bright" />
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            confirmar
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-danger/30 bg-danger/10 text-danger">
              <AlertTriangle size={17} />
            </span>
            <div>
              <h2 id="confirm-title" className="text-base font-medium tracking-tight text-paper">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-dim">{description}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              variant="danger"
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
