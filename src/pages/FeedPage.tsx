import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Flame,
  MessageSquare,
  Plus,
  Search,
  Terminal,
  X,
} from 'lucide-react'
import type { FeedResponse, FeedSort, SetupSummary } from '@shared/types'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useDebouncedValue } from '@/lib/hooks'
import { countLabel } from '@/lib/utils'
import { SetupCard } from '@/components/SetupCard'
import { ErrorState, SkeletonCard } from '@/components/ui/Feedback'
import { Button, LinkButton } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

export function FeedPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [sort, setSort] = useState<FeedSort>('recent')

  const [items, setItems] = useState<SetupSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const query = `/api/setups?page=1&limit=${PAGE_SIZE}&sort=${sort}&q=${encodeURIComponent(debouncedSearch)}`

    api<FeedResponse>(query)
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setPage(1)
        setHasMore(data.hasMore)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el feed.')
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, sort, reloadKey])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = await api<FeedResponse>(
        `/api/setups?page=${nextPage}&limit=${PAGE_SIZE}&sort=${sort}&q=${encodeURIComponent(debouncedSearch)}`,
      )
      setItems((current) => [...current, ...data.items])
      setPage(nextPage)
      setHasMore(data.hasMore)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar más setups.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {!user ? <Hero /> : <FeedHeader />}

      <div className="flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="grep setups, personas..."
            aria-label="Buscar setups"
            className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-9 font-mono text-[11px] text-paper placeholder:text-faint/70 transition focus:border-acid/50 focus:bg-panel focus:outline-none focus:ring-2 focus:ring-acid/10 [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-faint transition hover:bg-white/5 hover:text-paper"
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
            <SortButton
              active={sort === 'recent'}
              onClick={() => setSort('recent')}
              icon={<Clock size={11} />}
            >
              recientes
            </SortButton>
            <SortButton
              active={sort === 'popular'}
              onClick={() => setSort('popular')}
              icon={<Flame size={11} />}
            >
              populares
            </SortButton>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {loading ? 'cargando…' : countLabel(total, 'setup', 'setups')}
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-10">
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        </div>
      ) : loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          hasQuery={Boolean(debouncedSearch)}
          query={debouncedSearch}
          isLoggedIn={Boolean(user)}
          onClear={() => setSearch('')}
        />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            {hasMore ? (
              <Button
                variant="secondary"
                onClick={loadMore}
                loading={loadingMore}
                leftIcon={<ChevronDown size={14} />}
              >
                cargar más
              </Button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint/70">
                // fin del feed
              </span>
            )}
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint/50">
              mostrando {items.length} de {total}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function FeedHeader() {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">// feed</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-paper sm:text-4xl">
          Setups de la comunidad
        </h1>
        <p className="mt-1.5 text-sm text-dim">
          Explora los escritorios, abre un hilo y deja tu comentario.
        </p>
      </div>
      <LinkButton to="/new" leftIcon={<Plus size={14} />} className="self-start sm:self-auto">
        publicar setup
      </LinkButton>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative mb-10 overflow-hidden rounded-xl border border-line bg-surface/70">
      <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-50 mask-fade" />
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-acid/[0.06] blur-3xl"
      />

      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink/60 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-dim">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acid" />
            plataforma de setups
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.03] tracking-[-0.045em] text-paper sm:text-5xl lg:text-[3.6rem]">
            Tu escritorio.
            <br />
            Un <span className="text-acid text-glow">hilo</span> abierto.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-dim">
            Sube una o varias fotos de tu setup. Se publica al instante y toda la comunidad puede
            entrar a verlo y comentar sin límites.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <LinkButton to="/register" size="lg" rightIcon={<ArrowRight size={15} />}>
              crear cuenta
            </LinkButton>
            <LinkButton to="/login" variant="secondary" size="lg">
              ya tengo cuenta
            </LinkButton>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            <span>fotos reales</span>
            <span className="h-0.5 w-0.5 rounded-full bg-faint/60" />
            <span>hilos abiertos</span>
            <span className="h-0.5 w-0.5 rounded-full bg-faint/60" />
            <span>comentarios sin límite</span>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div
            aria-hidden="true"
            className="absolute -inset-8 rounded-full bg-acid/[0.04] blur-3xl"
          />
          <div className="relative overflow-hidden rounded-lg border border-line bg-ink/85 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5 border-b border-line bg-panel/70 px-3.5 py-2.5">
              <span className="h-2 w-2 rounded-full bg-danger/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-acid/70" />
              <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                ~/my-setup
              </span>
              <span className="ml-auto font-mono text-[9px] text-faint/60">bash</span>
            </div>
            <div className="space-y-2 p-5 font-mono text-[11px] leading-relaxed">
              <p>
                <span className="mr-2 text-faint/50">01</span>
                <span className="text-acid">$</span> my-setup --init
              </p>
              <p className="text-dim">
                <span className="mr-2 text-faint/50">02</span>&gt; cargando fotos...
              </p>
              <p className="text-dim">
                <span className="mr-2 text-faint/50">03</span>&gt; escribiendo título...
              </p>
              <p className="text-dim">
                <span className="mr-2 text-faint/50">04</span>&gt; preparando publicación...
              </p>
              <div className="my-3 h-px bg-line" />
              <p>
                <span className="mr-2 text-faint/50">05</span>
                <span className="text-acid">$</span> publicar --thread
              </p>
              <p className="text-dim">
                <span className="mr-2 text-faint/50">06</span>&gt; hilo abierto.
              </p>
              <p className="text-dim">
                <span className="mr-2 text-faint/50">07</span>&gt; esperando comentarios
                <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-acid" />
              </p>
              <p className="pt-1">
                <span className="mr-2 text-faint/50">08</span>
                <span className="text-acid">$</span>
              </p>
            </div>
          </div>
          <div className="absolute -bottom-3 -right-3 rotate-2 rounded border border-acid/30 bg-ink px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-acid shadow-lg shadow-black/40">
            hilo abierto
          </div>
        </div>
      </div>
    </section>
  )
}

function SortButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition',
        active ? 'bg-raised text-paper shadow-sm' : 'text-faint hover:text-dim',
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  )
}

function EmptyState({
  hasQuery,
  query,
  isLoggedIn,
  onClear,
}: {
  hasQuery: boolean
  query: string
  isLoggedIn: boolean
  onClear: () => void
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-panel text-faint">
        {hasQuery ? <Search size={20} /> : <Terminal size={20} />}
      </span>

      {hasQuery ? (
        <>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            // 0 resultados
          </p>
          <h3 className="mt-2 text-lg font-medium text-paper">Nada coincide con “{query}”</h3>
          <p className="mt-1 max-w-sm text-sm text-dim">
            Prueba con otra palabra o vuelve al feed completo.
          </p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={onClear}>
            limpiar búsqueda
          </Button>
        </>
      ) : (
        <>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            // feed vacío
          </p>
          <h3 className="mt-2 text-lg font-medium text-paper">El primer setup está por escribir.</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-dim">
            Todavía no hay publicaciones. Comparte tu escritorio y abre el primer hilo de la
            plataforma.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {isLoggedIn ? (
              <LinkButton to="/new" size="sm" leftIcon={<Plus size={13} />}>
                publicar mi setup
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/register" size="sm">
                  crear cuenta
                </LinkButton>
                <Link to="/login" className="font-mono text-[11px] text-dim underline-offset-4 hover:text-paper hover:underline">
                  ya tengo cuenta
                </Link>
              </>
            )}
          </div>
          <div className="mt-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-faint/60">
            <MessageSquare size={11} />
            cada setup abre su propio hilo
          </div>
        </>
      )}
    </div>
  )
}
