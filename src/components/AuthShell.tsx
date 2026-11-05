import type { ReactNode } from 'react'
import { Camera, MessageSquare, Users } from 'lucide-react'

interface AuthShellProps {
  mode: 'login' | 'register'
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

const FEATURES = [
  { icon: Camera, label: 'hasta 8 fotos', detail: 'por setup' },
  { icon: MessageSquare, label: 'hilos abiertos', detail: 'sin límites' },
  { icon: Users, label: 'comunidad', detail: 'cuenta propia' },
]

export function AuthShell({ mode, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      <div className="hidden lg:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
          // acceso a la plataforma
        </p>
        <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-paper xl:text-6xl">
          Tu espacio.
          <br />
          <span className="text-acid text-glow">Tu hilo.</span>
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-dim">
          Publica una o varias fotos de tu escritorio. Al instante se abre un hilo para que toda la
          comunidad lo vea y comente todo lo que quiera.
        </p>

        <div className="mt-8 max-w-lg overflow-hidden rounded-lg border border-line bg-surface/80">
          <div className="flex items-center gap-1.5 border-b border-line bg-panel/70 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-danger/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-acid/70" />
            <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              ~/manifiesto.txt
            </span>
          </div>
          <div className="space-y-1.5 p-4 font-mono text-[11px] leading-relaxed">
            <p>
              <span className="text-acid">$</span>{' '}
              <span className="text-paper">cat manifiesto.txt</span>
            </p>
            <p className="text-dim">&gt; enseña tu escritorio, no lo escondas.</p>
            <p className="text-dim">&gt; cuenta la historia detrás del setup.</p>
            <p className="text-dim">&gt; abre el hilo. deja que pregunten.</p>
            <p className="pt-1">
              <span className="text-acid">$</span>{' '}
              <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-acid" />
            </p>
          </div>
        </div>

        <div className="mt-5 grid max-w-lg grid-cols-3 gap-2.5">
          {FEATURES.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="rounded-md border border-line bg-panel/50 px-3 py-3">
              <Icon size={14} className="text-acid/80" />
              <p className="mt-2 font-mono text-[10px] text-paper/90">{label}</p>
              <p className="font-mono text-[9px] text-faint">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/60">
          <div className="flex h-9 items-center gap-1.5 border-b border-line bg-panel/70 px-3.5">
            <span className="h-2 w-2 rounded-full bg-danger/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-acid/70" />
            <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              auth/{mode}
            </span>
            <span className="ml-auto font-mono text-[9px] text-faint/60">localhost</span>
          </div>

          <div className="p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              $ auth --{mode}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-paper">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-dim">{subtitle}</p>

            <div className="mt-6">{children}</div>

            <div className="mt-6 border-t border-line pt-5 text-center text-[13px] text-dim">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
