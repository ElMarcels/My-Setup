import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { safeNextPath } from '@/lib/utils'
import { useDocumentTitle } from '@/lib/hooks'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/Button'
import { Field, PasswordInput, TextInput } from '@/components/ui/Field'

export function RegisterPage() {
  useDocumentTitle('Crear cuenta')
  const { user, loading, register } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true })
  }, [loading, user, navigate, next])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      setError('El usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await register(username.trim(), email.trim(), password)
      push('Cuenta creada. Ya puedes publicar tu setup.', 'success')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      mode="register"
      title="Crear cuenta"
      subtitle="Un usuario, una identidad y todos los setups que quieras compartir."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link
            to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-mono text-[12px] text-acid underline-offset-4 hover:underline"
          >
            iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}

        <Field label="usuario" htmlFor="username" hint="3–20 · a-z 0-9 _">
          <TextInput
            id="username"
            name="username"
            autoComplete="username"
            autoFocus
            required
            maxLength={20}
            placeholder="marcel_dev"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>

        <Field label="email" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="contraseña" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="mín. 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field label="repetir" htmlFor="confirm">
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </Field>
        </div>

        <Button
          type="submit"
          className="mt-2 w-full"
          size="lg"
          loading={submitting}
          rightIcon={<ArrowRight size={14} />}
        >
          crear cuenta
        </Button>

        <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          sin spam · sin algoritmos · solo setups
        </p>
      </form>
    </AuthShell>
  )
}
