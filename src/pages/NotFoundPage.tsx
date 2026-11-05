import { useLocation } from 'react-router-dom'
import { LinkButton } from '@/components/ui/Button'

export function NotFoundPage() {
  const location = useLocation()

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-line bg-panel/70 px-3.5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-danger/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-acid/70" />
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            ~/404
          </span>
        </div>

        <div className="p-8 text-center sm:p-10">
          <p className="truncate font-mono text-[10px] text-faint">$ cd {location.pathname}</p>
          <p className="mt-3 font-mono text-6xl font-semibold tracking-tight text-paper">
            4<span className="text-acid">0</span>4
          </p>
          <p className="mt-4 text-sm leading-relaxed text-dim">
            La ruta que buscas no existe o el setup ya no está disponible.
          </p>
          <p className="mt-2 font-mono text-[10px] text-faint">
            &gt; error: path not found
            <span className="ml-1 inline-block h-2.5 w-1 animate-blink bg-acid align-middle" />
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <LinkButton to="/" size="sm">
              volver al feed
            </LinkButton>
            <LinkButton to="/new" variant="secondary" size="sm">
              publicar setup
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}
