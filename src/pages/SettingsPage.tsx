import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut, Save } from 'lucide-react'
import { AVATAR_COLORS, type AvatarColor, type AuthResponse } from '@shared/types'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/lib/hooks'
import { AVATAR_PALETTE } from '@/lib/avatar'
import { cn, formatLongDate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Field, TextArea } from '@/components/ui/Field'

export function SettingsPage() {
  useDocumentTitle('Ajustes')
  const { user, logout, refresh } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(user?.avatarColor ?? 'lime')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  if (!user) return null

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await api<AuthResponse>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio: bio.trim(), avatarColor }),
      })
      await refresh()
      push('Perfil actualizado.', 'success')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLeaving(true)
    try {
      await logout()
      push('Sesión cerrada. Hasta pronto.', 'info')
      navigate('/')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">// ajustes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-paper sm:text-4xl">
          Ajustes de cuenta
        </h1>
        <p className="mt-1.5 text-sm text-dim">
          Personaliza cómo te ve la comunidad y gestiona tu sesión.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-8">
        <form onSubmit={handleSave} className="rounded-xl border border-line bg-surface/70 p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <Avatar user={{ username: user.username, avatarColor }} size="xl" />
            <div className="min-w-0">
              <p className="truncate font-mono text-base text-paper">@{user.username}</p>
              <p className="truncate text-[12px] text-faint">{user.email}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                cuenta creada el {formatLongDate(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <Field label="bio" htmlFor="bio" hint={`${bio.length}/160 · opcional`}>
              <TextArea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value.slice(0, 160))}
                placeholder="Dev, fotógrafo, gamer o simplemente alguien con un escritorio bonito."
                maxLength={160}
                className="min-h-24"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-dim">
                  color de avatar
                </span>
                <span className="font-mono text-[10px] text-faint">
                  {AVATAR_PALETTE[avatarColor].label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => {
                  const palette = AVATAR_PALETTE[color]
                  const selected = avatarColor === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-md border-2 transition',
                        selected
                          ? 'border-paper scale-105'
                          : 'border-transparent hover:scale-105 hover:border-line-bright',
                      )}
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                      }}
                      aria-label={`Color ${palette.label}`}
                      aria-pressed={selected}
                    >
                      {selected ? <Check size={14} style={{ color: palette.text }} /> : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-[11px] text-danger">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end border-t border-line pt-5">
              <Button type="submit" loading={saving} leftIcon={<Save size={13} />}>
                guardar cambios
              </Button>
            </div>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-lg border border-line bg-panel/40 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-acid">// sesión</p>
            <p className="mt-2 text-[12px] leading-relaxed text-dim">
              Has iniciado sesión como{' '}
              <span className="font-mono text-paper">@{user.username}</span>. La sesión se mantiene
              durante 30 días.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              onClick={handleLogout}
              loading={leaving}
              leftIcon={<LogOut size={13} />}
            >
              cerrar sesión
            </Button>
          </div>

          <div className="rounded-lg border border-line bg-panel/40 p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">// atajos</p>
            <ul className="mt-3 space-y-2 font-mono text-[10px] text-dim">
              <li className="flex items-center justify-between gap-2">
                <span>publicar</span>
                <span className="rounded border border-line bg-ink px-1.5 py-0.5 text-[9px] text-faint">
                  /new
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>mi perfil</span>
                <span className="rounded border border-line bg-ink px-1.5 py-0.5 text-[9px] text-faint">
                  /u/{user.username}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>feed</span>
                <span className="rounded border border-line bg-ink px-1.5 py-0.5 text-[9px] text-faint">
                  /
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
