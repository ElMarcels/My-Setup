import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Settings2 } from 'lucide-react'
import type { ProfileResponse } from '@shared/types'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/lib/hooks'
import { formatShortDate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { LinkButton } from '@/components/ui/Button'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { SetupCard } from '@/components/SetupCard'

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuth()
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useDocumentTitle(data ? `@${data.user.username}` : 'Perfil')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api<ProfileResponse>(`/api/users/${encodeURIComponent(username ?? '')}`)
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el perfil.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username, reloadKey])

  if (loading) return <PageLoader label="cargando perfil" />

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      </div>
    )
  }

  if (!data) return null

  const { user, stats, setups } = data
  const isMe = me?.id === user.id

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface/70">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-40 mask-fade" />
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-acid/[0.05] blur-3xl"
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar user={user} size="2xl" className="shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">// perfil</p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="truncate font-mono text-2xl tracking-tight text-paper sm:text-3xl">
                  @{user.username}
                </h1>
                {isMe ? (
                  <span className="rounded border border-acid/25 bg-acid/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-acid">
                    tú
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
                {user.bio || 'Sin bio todavía.'}
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                miembro desde {formatShortDate(user.createdAt)}
              </p>
            </div>

            {isMe ? (
              <LinkButton
                to="/settings"
                variant="secondary"
                size="sm"
                className="self-start sm:self-auto"
                leftIcon={<Settings2 size={13} />}
              >
                editar perfil
              </LinkButton>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
            <ProfileStat value={stats.setups} label="setups" />
            <ProfileStat value={stats.likes} label="likes recibidos" />
            <ProfileStat value={stats.comments} label="comentarios" />
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper">// setups</h2>
          <span className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9px] text-dim">
            {setups.length}
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {setups.length === 0 ? (
          <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              // sin publicaciones
            </p>
            <p className="mt-2 text-base font-medium text-paper">
              {isMe ? 'Todavía no has publicado tu setup.' : 'Este perfil aún no tiene setups.'}
            </p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-dim">
              {isMe
                ? 'Sube una o varias fotos de tu escritorio y abre tu primer hilo.'
                : 'Cuando publique algo, aparecerá aquí.'}
            </p>
            {isMe ? (
              <LinkButton to="/new" size="sm" className="mt-5" leftIcon={<Plus size={13} />}>
                publicar mi setup
              </LinkButton>
            ) : (
              <Link
                to="/"
                className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-dim underline-offset-4 hover:text-paper hover:underline"
              >
                ← volver al feed
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {setups.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ProfileStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-3 text-center">
      <p className="font-mono text-xl leading-none text-paper">{value}</p>
      <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-faint">{label}</p>
    </div>
  )
}
