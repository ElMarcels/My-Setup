import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import type { AvatarColor, MeUser } from '../shared/types.js'
import { COOKIE_SECURE, SESSION_COOKIE, SESSION_DAYS } from './config.js'
import { nowIso, sql } from './db.js'

export interface AuthUser extends MeUser {
  passwordHash?: string
}

export interface UserRow {
  id: string
  username: string
  email: string
  password_hash: string
  bio: string
  avatar_color: AvatarColor
  avatar_url: string | null
  created_at: string
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser | null
    }
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    bio: row.bio,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}

export async function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('base64url')
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()

  await sql`DELETE FROM sessions WHERE expires_at <= ${createdAt}`
  await sql`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${createdAt}, ${expiresAt})
  `

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: SESSION_DAYS * 86_400_000,
    path: '/',
  })
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) {
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export async function readSession(req: Request): Promise<AuthUser | null> {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null

  const [row] = await sql<UserRow[]>`
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > ${nowIso()}
    LIMIT 1
  `

  return row ? mapUser(row) : null
}

export const attachUser: import('express').RequestHandler = async (req, _res, next) => {
  req.user = await readSession(req)
  next()
}

export const requireAuth: import('express').RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Necesitas iniciar sesión para hacer esto.' })
    return
  }
  next()
}
