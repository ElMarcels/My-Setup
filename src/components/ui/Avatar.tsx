import type { AvatarColor, PublicUser } from '@shared/types'
import { AVATAR_PALETTE } from '@/lib/avatar'
import { cn, initials } from '@/lib/utils'

const SIZES = {
  xs: 'h-6 w-6 rounded text-[9px]',
  sm: 'h-8 w-8 rounded-md text-[10px]',
  md: 'h-10 w-10 rounded-md text-xs',
  lg: 'h-14 w-14 rounded-lg text-base',
  xl: 'h-20 w-20 rounded-xl text-2xl',
  '2xl': 'h-28 w-28 rounded-2xl text-4xl',
} as const

interface AvatarProps {
  user: Pick<PublicUser, 'username' | 'avatarColor'> | { username: string; avatarColor: AvatarColor }
  size?: keyof typeof SIZES
  className?: string
}

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const palette = AVATAR_PALETTE[user.avatarColor] ?? AVATAR_PALETTE.lime

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-mono font-bold uppercase tracking-tight',
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        color: palette.text,
      }}
    >
      {initials(user.username)}
    </span>
  )
}
