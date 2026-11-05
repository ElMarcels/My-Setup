import { Link } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="My Setup — inicio"
    >
      <span className="grid h-7 w-7 place-items-center rounded border border-acid/30 bg-acid/10 text-acid transition group-hover:border-acid/60 group-hover:bg-acid/15">
        <Terminal size={14} strokeWidth={2.2} />
      </span>
      <span className="font-mono text-[13px] font-medium tracking-tight text-paper">
        <span className="text-acid">~/</span>my-setup
        <span className="ml-1 inline-block h-3.5 w-[6px] translate-y-[1px] animate-blink bg-acid align-middle" />
      </span>
    </Link>
  )
}
