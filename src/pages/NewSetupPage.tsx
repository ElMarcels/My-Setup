import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { upload } from '@vercel/blob/client'
import {
  AlertTriangle,
  Check,
  Heart,
  Images,
  MessageSquare,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { ApiError, createSetup } from '@/lib/api'
import { useDocumentTitle } from '@/lib/hooks'
import { cn, fileSize } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, TextArea, TextInput } from '@/components/ui/Field'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}
const MAX_IMAGES = 8
const MAX_BYTES = 15 * 1024 * 1024
const MULTIPART_THRESHOLD = 4 * 1024 * 1024

interface PickedImage {
  id: string
  file: File
  preview: string
}

export function NewSetupPage() {
  useDocumentTitle('Nuevo setup')
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<PickedImage[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<PickedImage[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview))
    }
  }, [])

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming)
      if (files.length === 0) return

      let slots = MAX_IMAGES - images.length
      const accepted: PickedImage[] = []

      for (const file of files) {
        if (slots <= 0) {
          push('Máximo 8 fotos por setup.', 'error')
          break
        }
        if (!ACCEPTED_TYPES.includes(file.type)) {
          push(`“${file.name}” no es un formato permitido.`, 'error')
          continue
        }
        if (file.size > MAX_BYTES) {
          push(`“${file.name}” supera los 15 MB.`, 'error')
          continue
        }

        accepted.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
        })
        slots -= 1
      }

      if (accepted.length > 0) {
        setImages((current) => [...current, ...accepted].slice(0, MAX_IMAGES))
        setError(null)
      }
    },
    [images.length, push],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (files.length > 0) {
        event.preventDefault()
        addFiles(files)
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  if (!user) return null

  const openPicker = () => inputRef.current?.click()

  const handleInput = (files: FileList | null) => {
    if (files) addFiles(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return current.filter((image) => image.id !== id)
    })
  }

  const makeCover = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (!target) return current
      return [target, ...current.filter((image) => image.id !== id)]
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (images.length === 0) {
      setError('Añade al menos una foto de tu setup.')
      return
    }
    if (title.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres.')
      return
    }

    setSubmitting(true)
    setProgress(0)

    try {
      const uploaded: { url: string }[] = []
      const total = images.length

      for (const [index, image] of images.entries()) {
        const extension = EXTENSIONS[image.file.type] ?? ''
        const blob = await upload(`setups/${user.id}/${image.id}${extension}`, image.file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
          contentType: image.file.type,
          multipart: image.file.size > MULTIPART_THRESHOLD,
          onUploadProgress: (event) => {
            setProgress((index + event.percentage / 100) / total)
          },
        })

        uploaded.push({ url: blob.url })
      }

      setProgress(1)

      const response = await createSetup({
        title: title.trim(),
        description: description.trim(),
        images: uploaded,
      })

      push('Setup publicado. El hilo está abierto.', 'success')
      navigate(`/setup/${response.id}`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron subir las fotos. Revisa tu conexión e inténtalo de nuevo.',
      )
      setSubmitting(false)
      setProgress(0)
    }
  }

  const canSubmit = images.length > 0 && title.trim().length >= 3 && !submitting

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
            // nueva publicación
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-paper sm:text-4xl">
            Comparte tu setup
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-dim">
            Sube una o varias fotos, cuéntanos qué hay en tu escritorio y abre el hilo.
          </p>
        </div>
        <Link
          to="/"
          className="self-start font-mono text-[10px] uppercase tracking-[0.14em] text-faint transition hover:text-paper sm:self-auto"
        >
          ← volver al feed
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Panel step="01" title="fotos" description="la primera será la portada">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              onChange={(event) => handleInput(event.target.files)}
              className="sr-only"
              aria-label="Seleccionar fotos"
            />

            <div
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openPicker()
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
              }}
              onDrop={handleDrop}
              className={cn(
                'group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition',
                dragging
                  ? 'border-acid/70 bg-acid/[0.06]'
                  : 'border-line bg-ink/40 hover:border-line-bright hover:bg-panel/40',
              )}
            >
              <span
                className={cn(
                  'grid h-12 w-12 place-items-center rounded-lg border transition',
                  dragging
                    ? 'border-acid/40 bg-acid/10 text-acid'
                    : 'border-line bg-panel text-dim group-hover:text-acid',
                )}
              >
                <UploadCloud size={22} />
              </span>
              <p className="mt-3 text-sm text-paper">
                <span className="font-medium">arrastra tus fotos</span> o haz clic para elegir
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                JPG · PNG · WebP · GIF · AVIF — hasta 8 · 15 MB c/u
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded border border-line bg-panel/60 px-2 py-1 font-mono text-[9px] text-faint">
                también puedes pegar con <kbd className="text-dim">⌘V</kbd>
              </p>
            </div>

            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-md border border-line bg-ink"
                  >
                    <img
                      src={image.preview}
                      alt={`Vista previa ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute left-1.5 top-1.5 rounded border border-white/10 bg-ink/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-paper/80 backdrop-blur">
                      {index === 0 ? 'portada' : String(index + 1).padStart(2, '0')}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded border border-white/10 bg-ink/80 text-paper/80 backdrop-blur transition hover:border-danger/40 hover:text-danger"
                      aria-label={`Quitar imagen ${index + 1}`}
                    >
                      <X size={12} />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/90 to-transparent px-2 py-1.5">
                      <span className="font-mono text-[8px] text-paper/60">
                        {fileSize(image.file.size)}
                      </span>
                      {index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => makeCover(image.id)}
                          className="rounded border border-white/10 bg-ink/70 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-dim transition hover:border-acid/40 hover:text-acid"
                        >
                          portada
                        </button>
                      ) : (
                        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-acid">
                          cover
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {images.length < MAX_IMAGES ? (
                  <button
                    type="button"
                    onClick={openPicker}
                    className="grid aspect-square place-items-center rounded-md border border-dashed border-line bg-ink/30 text-faint transition hover:border-line-bright hover:bg-panel/40 hover:text-paper"
                    aria-label="Añadir más fotos"
                  >
                    <span className="flex flex-col items-center gap-1.5">
                      <Plus size={18} />
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em]">añadir</span>
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
              <span>{images.length} / {MAX_IMAGES} fotos</span>
              <span>{images.length === 0 ? 'pendiente' : 'listo'}</span>
            </div>
          </Panel>

          <Panel step="02" title="detalles" description="título y contexto">
            <div className="space-y-4">
              <Field label="título" htmlFor="title" hint={`${title.length}/90`}>
                <TextInput
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value.slice(0, 90))}
                  placeholder="Mi rincón de código"
                  maxLength={90}
                  required
                />
              </Field>

              <Field
                label="descripción"
                htmlFor="description"
                hint={`${description.length}/2500 · opcional`}
              >
                <TextArea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 2500))}
                  placeholder="Qué hay en tu escritorio, qué usas para trabajar, qué te inspira..."
                  maxLength={2500}
                  className="min-h-36"
                />
              </Field>
            </div>
          </Panel>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                loading={submitting}
                disabled={!canSubmit}
                leftIcon={<UploadCloud size={15} />}
              >
                {submitting ? `publicando ${Math.round(progress * 100)}%` : 'publicar y abrir hilo'}
              </Button>
              <LinkButton to="/" variant="ghost" size="lg">
                cancelar
              </LinkButton>
            </div>

            {submitting ? (
              <div className="h-1 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-acid transition-all duration-200"
                  style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                />
              </div>
            ) : null}
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line bg-panel/50 px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                // vista previa
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-acid/80">
                <span className="h-1 w-1 rounded-full bg-acid" />
                en vivo
              </span>
            </div>

            <div className="aspect-[4/3] bg-ink">
              {images[0] ? (
                <img
                  src={images[0].preview}
                  alt="Portada del setup"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-grid-sm text-faint/60">
                  <span className="flex flex-col items-center gap-2">
                    <Images size={24} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
                      sin portada
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="p-3.5">
              <div className="flex items-center gap-2">
                <Avatar user={user} size="xs" />
                <span className="truncate font-mono text-[10px] text-dim">@{user.username}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-faint" />
                <span className="font-mono text-[9px] text-faint">ahora</span>
              </div>
              <h3 className="mt-2 line-clamp-1 text-sm font-medium text-paper">
                {title.trim() || 'Título de tu setup'}
              </h3>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-dim">
                {description.trim() || 'Una descripción breve de lo que hay sobre tu escritorio.'}
              </p>
              <div className="mt-3 flex items-center gap-4 border-t border-line pt-2.5 font-mono text-[9px] text-faint">
                <span className="inline-flex items-center gap-1">
                  <Heart size={10} /> 0
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={10} /> 0
                </span>
                <span className="ml-auto text-faint/60">#nuevo</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-panel/40 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-acid">// checklist</p>
            <ul className="mt-3 space-y-2">
              <CheckItem done={images.length > 0}>al menos 1 foto</CheckItem>
              <CheckItem done={title.trim().length >= 3}>título de 3+ caracteres</CheckItem>
              <CheckItem done={description.trim().length > 0} optional>
                descripción
              </CheckItem>
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">// tip</p>
              <p className="mt-1 text-[11px] leading-relaxed text-dim">
                La primera foto será la portada del hilo. Puedes cambiarla tocando{' '}
                <span className="text-paper">portada</span> en cualquier miniatura.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Panel({
  step,
  title,
  description,
  children,
}: {
  step: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-surface/70 p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded border border-acid/25 bg-acid/10 font-mono text-[10px] text-acid">
          {step}
        </span>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper">{title}</h2>
          <p className="font-mono text-[9px] text-faint">{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

function CheckItem({
  done,
  optional = false,
  children,
}: {
  done: boolean
  optional?: boolean
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-2 font-mono text-[10px]">
      <span
        className={cn(
          'grid h-4 w-4 place-items-center rounded border',
          done ? 'border-acid/40 bg-acid/10 text-acid' : 'border-line text-transparent',
        )}
      >
        <Check size={10} />
      </span>
      <span className={done ? 'text-paper/90' : 'text-faint'}>{children}</span>
      {optional ? <span className="ml-auto text-[8px] text-faint/60">opcional</span> : null}
    </li>
  )
}
