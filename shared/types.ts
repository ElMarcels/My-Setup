export const AVATAR_COLORS = ['lime', 'cyan', 'violet', 'amber', 'rose', 'blue'] as const

export type AvatarColor = (typeof AVATAR_COLORS)[number]

export interface PublicUser {
  id: string
  username: string
  bio: string
  avatarColor: AvatarColor
  createdAt: string
}

export interface MeUser extends PublicUser {
  email: string
}

export interface SetupImage {
  id: string
  url: string
}

export interface Comment {
  id: string
  body: string
  createdAt: string
  author: PublicUser
  canDelete: boolean
}

export interface SetupSummary {
  id: string
  title: string
  description: string
  createdAt: string
  author: PublicUser
  cover: string | null
  imageCount: number
  likeCount: number
  commentCount: number
  liked: boolean
}

export interface SetupDetail extends SetupSummary {
  images: SetupImage[]
}

export interface FeedResponse {
  items: SetupSummary[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ProfileStats {
  setups: number
  likes: number
  comments: number
}

export interface ProfileResponse {
  user: PublicUser
  stats: ProfileStats
  setups: SetupSummary[]
}

export interface SetupDetailResponse {
  setup: SetupDetail
  comments: Comment[]
}

export interface AuthResponse {
  user: MeUser | null
}

export type FeedSort = 'recent' | 'popular'
