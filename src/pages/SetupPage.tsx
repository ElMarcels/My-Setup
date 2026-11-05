import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Heart,
  Images,
  Link2,
  Maximize2,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react'
import type { Comment, SetupDetailResponse } from '@shared/types'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/lib/hooks'
import { cn, formatShortDate, timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button, LinkButton } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { Lightbox } from '@/components/ui/Lightbox'

export function SetupPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [data, setData] = useState<SetupDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [liking, setLiking] = useState(false)

  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [confirmSetup, setConfirmSetup] = useState(false)
  const [deletingSetup, setDeletingSetup] = useState(false)
  const [confirmComment, setConfirmComment] = useState<Comment | null>(null)
  const [deletingComment, setDeletingComment] = useState(false)

  useDocumentTitle(data?.setup.title ?? 'Setup')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api<SetupDetailResponse>(`/api/setups/${id}`)
      .then((response) => {
        if (cancelled) return
        setData(response)
        setActiveImage(0)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el setup.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  if (loading) return <PageLoader label="abriendo hilo" />

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      </div>
    )
  }

  if (!data) return null

  const { setup, comments } = data
  const isOwner = user?.id === setup.author.id
  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`
  const registerHref = `/register?next=${encodeURIComponent(location.pathname)}`
  const image = setup.images[activeImage] ?? setup.images[0]

  const toggleLike = async () => {
    if (!user) {
      push('Inicia sesión para reaccionar a este setup.', 'info')
      navigate(loginHref)
      return
    }
    if (liking) return

    setLiking(true)
    const optimistic = !setup.liked
    setData((current) =>
      current
        ? {
            ...current,
            setup: {
              ...current.setup,
              liked: optimistic,
              likeCount: current.setup.likeCount + (optimistic ? 1 : -1),
            },
          }
        : current,
    )

    try {
      const response = await api<{ liked: boolean; likeCount: number }>(
        `/api/setups/${setup.id}/like`,
        { method: 'POST' },
      )
      setData((current) =>
        current
          ? {
              ...current,
              setup: {
                ...current.setup,
                liked: response.liked,
                likeCount: response.likeCount,
              },
            }
          : current,
      )
    } catch (err) {
      setData((current) =>
        current
          ? {
              ...current,
              setup: {
                ...current.setup,
                liked: !optimistic,
                likeCount: current.setup.likeCount + (optimistic ? -1 : 1),
              },
            }
          : current,
      )
      push(err instanceof ApiError ? err.message : 'No se pudo guardar tu reacción.', 'error')
    } finally {
      setLiking(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      push('Enlace copiado al portapapeles.', 'success')
    } catch {
      push('No se pudo copiar el enlace.', 'error')
    }
  }

  const submitComment = async () => {
    const body = commentBody.trim()
    if (!body || posting) return

    setPosting(true)
    try {
      const response = await api<{ comment: Comment }>(`/api/setups/${setup.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      setData((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, response.comment],
              setup: { ...current.setup, commentCount: current.setup.commentCount + 1 },
            }
          : current,
      )
      setCommentBody('')
      push('Comentario publicado en el hilo.', 'success')
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'No se pudo publicar el comentario.', 'error')
    } finally {
      setPosting(false)
    }
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submitComment()
    }
  }

  const deleteSetup = async () => {
    setDeletingSetup(true)
    try {
      await api(`/api/setups/${setup.id}`, { method: 'DELETE' })
      push('Setup eliminado. El hilo se ha cerrado.', 'info')
      navigate('/')
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'No se pudo eliminar el setup.', 'error')
      setDeletingSetup(false)
      setConfirmSetup(false)
    }
  }

  const deleteComment = async () => {
    if (!confirmComment) return
    setDeletingComment(true)
    try {
      await api(`/api/comments/${confirmComment.id}`, { method: 'DELETE' })
      setData((current) =>
        current
          ? {
              ...current,
              comments: current.comments.filter((comment) => comment.id !== confirmComment.id),
              setup: { ...current.setup, commentCount: Math.max(0, current.setup.commentCount - 1) },
            }
          : current,
      )
      push('Comentario eliminado.', 'info')
      setConfirmComment(null)
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'No se pudo eliminar el comentario.', 'error')
    } finally {
      setDeletingComment(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-5 flex items-center gap-2 overflow-hidden font-mono text-[10px] text-faint">
        <Link to="/" className="shrink-0 transition hover:text-paper">
          ~/feed
        </Link>
        <span className="text-faint/50">/</span>
        <Link
          to={`/u/${setup.author.username}`}
          className="shrink-0 transition hover:text-paper"
        >
          @{setup.author.username}
        </Link>
        <span className="text-faint/50">/</span>
        <span className="truncate text-dim">#{setup.id.slice(-6)}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:gap-10">
        <div>
          <div className="group relative overflow-hidden rounded-xl border border-line bg-ink">
            <button
              type="button"
              onClick={() => setLightboxIndex(activeImage)}
              className="block w-full cursor-zoom-in"
              aria-label="Abrir imagen a pantalla completa"
            >
              <div className="relative aspect-[4/3] w-full bg-grid-sm">
                {image ? (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={`${setup.title} — imagen ${activeImage + 1}`}
                    className="h-full w-full animate-rise object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-faint">
                    <Images size={32} />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
              </div>
            </button>

            <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded border border-white/10 bg-ink/75 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-paper/80 backdrop-blur">
              <Maximize2 size={11} />
              ampliar
            </div>

            {setup.images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage(
                      (activeImage - 1 + setup.images.length) % setup.images.length,
                    )
                  }
                  className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/80 text-paper backdrop-blur transition hover:border-acid/50 hover:text-acid"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((activeImage + 1) % setup.images.length)}
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-ink/80 text-paper backdrop-blur transition hover:border-acid/50 hover:text-acid"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-3 right-3 rounded border border-white/10 bg-ink/80 px-2 py-1 font-mono text-[10px] text-paper/85 backdrop-blur">
                  <span className="text-acid">{String(activeImage + 1).padStart(2, '0')}</span>
                  <span className="mx-1 text-faint">/</span>
                  {String(setup.images.length).padStart(2, '0')}
                </div>
              </>
            ) : null}
          </div>

          {setup.images.length > 1 ? (
            <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
              {setup.images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'relative h-16 w-20 shrink-0 overflow-hidden rounded-md border transition',
                    index === activeImage
                      ? 'border-acid opacity-100'
                      : 'border-line opacity-55 hover:opacity-100',
                  )}
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={index === activeImage}
                >
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/80 px-1 font-mono text-[8px] text-paper/80">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">// setup</p>
          <h1 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-paper sm:text-4xl">
            {setup.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Link
              to={`/u/${setup.author.username}`}
              className="group inline-flex items-center gap-2"
            >
              <Avatar user={setup.author} size="xs" />
              <span className="font-mono text-[11px] text-dim transition group-hover:text-acid">
                @{setup.author.username}
              </span>
            </Link>
            <span className="h-0.5 w-0.5 rounded-full bg-faint" />
            <time className="font-mono text-[10px] text-faint" dateTime={setup.createdAt}>
              {formatShortDate(setup.createdAt)}
            </time>
          </div>

          {setup.description ? (
            <p className="mt-5 whitespace-pre-wrap text-[14px] leading-relaxed text-dim">
              {setup.description}
            </p>
          ) : (
            <p className="mt-5 font-mono text-[11px] text-faint">// sin descripción.</p>
          )}

          <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
            <Stat value={setup.likeCount} label="likes" />
            <Stat value={comments.length} label="comentarios" />
            <Stat value={setup.images.length} label="fotos" />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant={setup.liked ? 'secondary' : 'primary'}
              onClick={toggleLike}
              loading={liking}
              className={cn('flex-1', setup.liked && 'border-acid/40 text-acid')}
              leftIcon={
                <Heart
                  size={14}
                  className={setup.liked ? 'fill-acid text-acid' : ''}
                />
              }
            >
              {setup.liked ? 'te gusta' : 'me gusta'}
            </Button>
            <Button
              variant="secondary"
              onClick={copyLink}
              leftIcon={<Link2 size={14} />}
              aria-label="Copiar enlace del setup"
            >
              enlace
            </Button>
          </div>

          <AuthorCard setup={setup} />

          <a
            href="#hilo"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface/60 px-4 py-3 transition hover:border-line-bright hover:bg-panel"
          >
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">// hilo</p>
              <p className="mt-1 text-[13px] text-dim">
                {comments.length === 0
                  ? 'Todavía nadie ha comentado.'
                  : `${comments.length} ${comments.length === 1 ? 'comentario' : 'comentarios'} en el hilo.`}
              </p>
            </div>
            <CornerDownRight size={15} className="shrink-0 text-acid" />
          </a>

          {isOwner ? (
            <div className="mt-4 border-t border-line pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmSetup(true)}
                className="text-danger/80 hover:bg-danger/10 hover:text-danger"
                leftIcon={<Trash2 size={13} />}
              >
                eliminar setup
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      <section id="hilo" className="mx-auto mt-14 w-full max-w-4xl scroll-mt-24">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper">// hilo</h2>
          <span className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9px] text-dim">
            {comments.length}
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {user ? (
          <div className="mt-5 rounded-lg border border-line bg-surface p-4">
            <div className="flex gap-3">
              <Avatar user={user} size="sm" />
              <div className="min-w-0 flex-1">
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value.slice(0, 1200))}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="> escribe tu comentario..."
                  rows={3}
                  className="w-full resize-y rounded-md border border-line bg-ink/60 px-3 py-2.5 font-mono text-xs leading-relaxed text-paper placeholder:text-faint/70 transition focus:border-acid/50 focus:outline-none focus:ring-2 focus:ring-acid/10"
                  aria-label="Escribe un comentario"
                />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                    {commentBody.length}/1200 · ⌘↵ para enviar
                  </span>
                  <Button
                    size="sm"
                    onClick={submitComment}
                    loading={posting}
                    disabled={!commentBody.trim()}
                    leftIcon={<Send size={12} />}
                  >
                    publicar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-start gap-4 rounded-lg border border-dashed border-line bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                // acceso requerido
              </p>
              <p className="mt-1 text-sm text-dim">
                Inicia sesión para unirte al hilo y comentar.
              </p>
            </div>
            <div className="flex gap-2">
              <LinkButton to={loginHref} size="sm">
                entrar
              </LinkButton>
              <LinkButton to={registerHref} variant="secondary" size="sm">
                crear cuenta
              </LinkButton>
            </div>
          </div>
        )}

        <div className="mt-7">
          {comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface/30 px-5 py-10 text-center">
              <MessageSquare size={22} className="mx-auto text-faint/70" />
              <p className="mt-3 font-mono text-[11px] text-dim">
                &gt; sin comentarios todavía.
              </p>
              <p className="mt-1 font-mono text-[10px] text-faint">
                sé el primero en romper el silencio
                <span className="ml-1 inline-block h-2.5 w-1 animate-blink bg-acid align-middle" />
              </p>
            </div>
          ) : (
            <div>
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className="group flex gap-3 border-t border-line py-5 first:border-t-0 first:pt-1"
                >
                  <Link to={`/u/${comment.author.username}`} className="shrink-0">
                    <Avatar user={comment.author} size="sm" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <header className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/u/${comment.author.username}`}
                        className="font-mono text-[11px] text-paper transition hover:text-acid"
                      >
                        @{comment.author.username}
                      </Link>
                      {comment.author.id === setup.author.id ? (
                        <span className="rounded border border-acid/25 bg-acid/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-acid">
                          autor
                        </span>
                      ) : null}
                      <time className="font-mono text-[9px] text-faint" dateTime={comment.createdAt}>
                        {timeAgo(comment.createdAt)}
                      </time>
                      {comment.canDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmComment(comment)}
                          className="ml-auto grid h-6 w-6 place-items-center rounded text-faint opacity-0 transition hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                          aria-label="Eliminar comentario"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
                    </header>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-paper/85">
                      {comment.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Lightbox
        images={setup.images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <ConfirmDialog
        open={confirmSetup}
        title="¿Eliminar este setup?"
        description="Se borrarán las fotos, los likes y todos los comentarios del hilo. Esta acción no se puede deshacer."
        confirmLabel="eliminar setup"
        loading={deletingSetup}
        onConfirm={deleteSetup}
        onCancel={() => setConfirmSetup(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmComment)}
        title="¿Eliminar comentario?"
        description="El comentario desaparecerá del hilo para todos. Esta acción no se puede deshacer."
        confirmLabel="eliminar"
        loading={deletingComment}
        onConfirm={deleteComment}
        onCancel={() => setConfirmComment(null)}
      />
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="font-mono text-lg leading-none text-paper">{value}</p>
      <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">{label}</p>
    </div>
  )
}

function AuthorCard({ setup }: { setup: SetupDetailResponse['setup'] }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Link to={`/u/${setup.author.username}`} className="shrink-0">
          <Avatar user={setup.author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/u/${setup.author.username}`}
              className="truncate font-mono text-[11px] text-paper transition hover:text-acid"
            >
              @{setup.author.username}
            </Link>
            <Link
              to={`/u/${setup.author.username}`}
              className="shrink-0 font-mono text-[9px] text-faint transition hover:text-paper"
            >
              ver perfil →
            </Link>
          </div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-dim">
            {setup.author.bio || 'Sin bio todavía.'}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
            miembro desde {formatShortDate(setup.author.createdAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
