import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import type { AvatarColor, MeUser } from '@shared/types'
import { COOKIE_SECURE, SESSION_COOKIE, SESSION_DAYS } from './config'
import { db, nowIso } from './db'

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
    createdAt: row.created_at,
  }
}

export function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('base64url')
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(createdAt)
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashToken(token), userId, createdAt, expiresAt)

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: SESSION_DAYS * 86_400_000,
    path: '/',
  })
}

export function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export function readSession(req: Request): AuthUser | null {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null

  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), nowIso()) as unknown as UserRow | undefined

  return row ? mapUser(row) : null
}

export const attachUser: import('express').RequestHandler = (req, _res, next) => {
  req.user = readSession(req)
  next()
}

export const requireAuth: import('express').RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Necesitas iniciar sesión para hacer esto.' })
    return
  }
  next()
}
