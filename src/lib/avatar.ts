import type { AvatarColor } from '@shared/types'

export const AVATAR_PALETTE: Record<
  AvatarColor,
  { from: string; to: string; text: string; label: string }
> = {
  lime: { from: '#dcff78', to: '#6b9b18', text: '#0a0b0d', label: 'Lima' },
  cyan: { from: '#8bf5e7', to: '#0e7490', text: '#04110f', label: 'Cian' },
  violet: { from: '#c9bcff', to: '#6d28d9', text: '#0d0817', label: 'Violeta' },
  amber: { from: '#ffe59a', to: '#b45309', text: '#140d03', label: 'Ámbar' },
  rose: { from: '#ffb3c0', to: '#be123c', text: '#180409', label: 'Rosa' },
  blue: { from: '#a8ceff', to: '#1d4ed8', text: '#040b18', label: 'Azul' },
}
