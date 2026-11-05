import { Link } from 'react-router-dom'
import { Heart, Images, MessageSquare } from 'lucide-react'
import type { SetupSummary } from '@shared/types'
import { Avatar } from './ui/Avatar'
import { timeAgo } from '@/lib/utils'

export function SetupCard({ setup }: { setup: SetupSummary }) {
  return (
    <article className="group relative animate-rise overflow-hidden rounded-lg border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-line-bright hover:shadow-2xl hover:shadow-black/40">
      <span className="pointer-events-none absolute left-0 top-0 z-10 h-3 w-3 border-l border-t border-acid/0 transition duration-200 group-hover:border-acid/70" />
      <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-3 w-3 border-b border-r border-acid/0 transition duration-200 group-hover:border-acid/70" />

      <Link to={`/setup/${setup.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-ink">
          {setup.cover ? (
            <img
              src={setup.cover}
              alt={`Setup: ${setup.title}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-grid-sm text-faint">
              <Images size={28} />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent opacity-70" />

          {setup.imageCount > 1 ? (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded border border-white/10 bg-ink/75 px-1.5 py-1 font-mono text-[9px] text-paper/85 backdrop-blur">
              <Images size={11} />
              {setup.imageCount}
            </span>
          ) : null}

          <span className="absolute bottom-2.5 left-2.5 translate-y-1 rounded border border-acid/25 bg-ink/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-acid opacity-0 backdrop-blur transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            abrir hilo →
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <Avatar user={setup.author} size="xs" />
            <span className="truncate font-mono text-[11px] text-dim">@{setup.author.username}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-faint" />
            <time className="shrink-0 font-mono text-[10px] text-faint" dateTime={setup.createdAt}>
              {timeAgo(setup.createdAt)}
            </time>
          </div>

          <h3 className="mt-2.5 line-clamp-1 text-[15px] font-medium tracking-tight text-paper transition group-hover:text-acid">
            {setup.title}
          </h3>

          {setup.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-dim">
              {setup.description}
            </p>
          ) : (
            <p className="mt-1 font-mono text-[11px] text-faint/70">sin descripción</p>
          )}

          <div className="mt-3 flex items-center gap-4 border-t border-line/70 pt-3 font-mono text-[10px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Heart size={12} className={setup.liked ? 'fill-acid text-acid' : ''} />
              {setup.likeCount}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare size={12} />
              {setup.commentCount}
            </span>
            <span className="ml-auto text-faint/60">#{setup.id.slice(-4)}</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
