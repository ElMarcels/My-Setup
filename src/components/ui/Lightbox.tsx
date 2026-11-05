import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { SetupImage } from '@shared/types'
import { cn } from '@/lib/utils'

interface LightboxProps {
  images: SetupImage[]
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const open = index !== null

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && images.length > 1) {
        onIndexChange(((index ?? 0) + 1) % images.length)
      }
      if (event.key === 'ArrowLeft' && images.length > 1) {
        onIndexChange(((index ?? 0) - 1 + images.length) % images.length)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, index, images.length, onClose, onIndexChange])

  if (index === null) return null
  const image = images[index]
  if (!image) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex flex-col bg-ink/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
    >
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          // visor
        </span>
        <span className="font-mono text-xs text-dim">
          <span className="text-acid">{String(index + 1).padStart(2, '0')}</span>
          <span className="mx-1 text-faint">/</span>
          {String(images.length).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-md border border-line text-dim transition hover:border-line-bright hover:bg-white/5 hover:text-paper"
          aria-label="Cerrar visor"
        >
          <X size={17} />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center p-4 md:p-10"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <img
          key={image.id}
          src={image.url}
          alt={`Imagen ${index + 1} del setup`}
          className="max-h-full max-w-full animate-rise rounded-md object-contain shadow-2xl shadow-black/70"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/85 text-paper backdrop-blur transition hover:border-acid/50 hover:text-acid md:left-6"
              aria-label="Imagen anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % images.length)}
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/85 text-paper backdrop-blur transition hover:border-acid/50 hover:text-acid md:right-6"
              aria-label="Imagen siguiente"
            >
              <ChevronRight size={20} />
            </button>
          </>
        ) : null}
      </div>

      <div className="scrollbar-none flex items-center justify-center gap-2 overflow-x-auto border-t border-line/70 px-4 py-3">
        {images.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onIndexChange(itemIndex)}
            className={cn(
              'h-12 w-16 shrink-0 overflow-hidden rounded border transition',
              itemIndex === index
                ? 'border-acid opacity-100'
                : 'border-line opacity-50 hover:opacity-100',
            )}
            aria-label={`Ver imagen ${itemIndex + 1}`}
          >
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
