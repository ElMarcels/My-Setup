import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { upload } from '@vercel/blob/client'
import { Camera, Check, LogOut, Save, Trash2 } from 'lucide-react'
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

const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function SettingsPage() {
  useDocumentTitle('Ajustes')
  const { user, logout, refresh } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(user?.avatarColor ?? 'lime')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  if (!user) return null

  const previewUrl = avatarPreview ?? avatarUrl

  const handleAvatarFile = (files: FileList | null) => {
    const file = files?.[0]
    if (avatarInputRef.current) avatarInputRef.current.value = ''
    if (!file) return

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError('La foto debe ser JPG, PNG, WebP, GIF o AVIF.')
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError('La foto de perfil no puede superar los 5 MB.')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError(null)
  }

  const removeAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarUrl(null)
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let nextAvatarUrl = avatarUrl

      if (avatarFile) {
        const extension = AVATAR_EXTENSIONS[avatarFile.type] ?? ''
        const blob = await upload(
          `avatars/${user.id}/${crypto.randomUUID()}${extension}`,
          avatarFile,
          {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
            contentType: avatarFile.type,
            multipart: false,
          },
        )
        nextAvatarUrl = blob.url
      }

      await api<AuthResponse>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio: bio.trim(), avatarColor, avatarUrl: nextAvatarUrl }),
      })

      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      setAvatarFile(null)
      setAvatarUrl(nextAvatarUrl)

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
          <input
            ref={avatarInputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(',')}
            onChange={(event) => handleAvatarFile(event.target.files)}
            className="sr-only"
            aria-label="Seleccionar foto de perfil"
          />

          <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start">
              <Avatar
                user={{ username: user.username, avatarColor, avatarUrl: previewUrl }}
                size="xl"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-line bg-panel text-dim shadow-lg shadow-black/40 transition hover:border-line-bright hover:text-acid"
                aria-label="Cambiar foto de perfil"
              >
                <Camera size={13} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-base text-paper">@{user.username}</p>
              <p className="truncate text-[12px] text-faint">{user.email}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                cuenta creada el {formatLongDate(user.createdAt)}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded border border-line bg-panel px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-dim transition hover:border-line-bright hover:text-paper"
                >
                  cambiar foto
                </button>
                {previewUrl ? (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="inline-flex items-center gap-1 rounded border border-line bg-panel px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-dim transition hover:border-danger/40 hover:text-danger"
                  >
                    <Trash2 size={10} />
                    quitar
                  </button>
                ) : null}
                <span className="font-mono text-[9px] text-faint/70">JPG · PNG · WebP · 5 MB</span>
              </div>
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
              {previewUrl ? (
                <p className="font-mono text-[9px] leading-relaxed text-faint">
                  Si tienes foto, el color queda como respaldo si la quitas.
                </p>
              ) : null}
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
