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

export function LoginPage() {
  useDocumentTitle('Iniciar sesión')
  const { user, loading, login } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true })
  }, [loading, user, navigate, next])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(identifier.trim(), password)
      push('Sesión iniciada. Bienvenido de vuelta.', 'success')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      mode="login"
      title="Iniciar sesión"
      subtitle="Entra para publicar tu setup y unirte a los hilos."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link
            to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-mono text-[12px] text-acid underline-offset-4 hover:underline"
          >
            crear cuenta
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

        <Field label="email o usuario" htmlFor="identifier">
          <TextInput
            id="identifier"
            name="identifier"
            autoComplete="username"
            autoFocus
            required
            placeholder="tu@email.com"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </Field>

        <Field label="contraseña" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button
          type="submit"
          className="mt-2 w-full"
          size="lg"
          loading={submitting}
          rightIcon={<ArrowRight size={14} />}
        >
          entrar
        </Button>
      </form>
    </AuthShell>
  )
}
