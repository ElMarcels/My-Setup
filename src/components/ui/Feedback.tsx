import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function PageLoader({ label = 'cargando' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-dim">
        <span className="text-acid">&gt;</span>
        {label}
        <span className="inline-block h-3.5 w-1.5 animate-blink bg-acid" />
      </div>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-danger/20 bg-danger/[0.04] px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-lg border border-danger/30 bg-danger/10 text-danger">
        <AlertTriangle size={20} />
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger">error</p>
        <p className="mt-2 text-sm text-dim">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RefreshCw size={13} />}>
          reintentar
        </Button>
      ) : null}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="aspect-[4/3] animate-pulse bg-raised" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-pulse rounded bg-raised" />
          <div className="h-3 w-24 animate-pulse rounded bg-raised" />
        </div>
        <div className="h-4 w-3/4 animate-pulse rounded bg-raised" />
        <div className="h-3 w-full animate-pulse rounded bg-raised" />
        <div className="h-3 w-20 animate-pulse rounded bg-raised" />
      </div>
    </div>
  )
}
