import { unlinkSync } from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import {
  AVATAR_COLORS,
  type AvatarColor,
  type Comment,
  type MeUser,
  type ProfileResponse,
  type SetupSummary,
} from '@shared/types'
import { createSession, destroySession, mapUser, requireAuth, type UserRow } from './auth'
import {
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_IMAGES,
  UPLOADS_DIR,
} from './config'
import { db, newId, nowIso } from './db'
import { HttpError, parseBody, rateLimit } from './http'
import {
  hasValidImageSignature,
  removeUploadedFiles,
  totalUploadSize,
  uploadImages,
} from './images'

export const apiRouter = Router()

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres.')
  .max(20, 'El usuario no puede superar los 20 caracteres.')
  .regex(/^[a-zA-Z0-9_]+$/, 'El usuario solo puede tener letras, números y guion bajo.')

const emailSchema = z.string().trim().min(1, 'Introduce tu email.').email('Introduce un email válido.')
const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña es demasiado larga.')

const authLimiter = rateLimit({ windowMs: 10 * 60_000, max: 40, scope: 'auth' })
const commentLimiter = rateLimit({ windowMs: 5 * 60_000, max: 40, scope: 'comment' })
const setupLimiter = rateLimit({ windowMs: 60 * 60_000, max: 20, scope: 'setup' })
const likeLimiter = rateLimit({ windowMs: 5 * 60_000, max: 150, scope: 'like' })

interface SetupRow {
  id: string
  title: string
  description: string
  created_at: string
  author_id: string
  username: string
  author_bio: string
  avatar_color: AvatarColor
  author_created_at: string
  image_count: number
  like_count: number
  comment_count: number
  cover: string | null
  liked: number
}

interface CommentRow {
  id: string
  body: string
  created_at: string
  comment_user_id: string
  author_id: string
  username: string
  author_bio: string
  avatar_color: AvatarColor
  author_created_at: string
  owner_id: string
}

interface ImageRow {
  id: string
  filename: string
}

const SETUP_SELECT = `
  SELECT
    s.id,
    s.title,
    s.description,
    s.created_at,
    u.id AS author_id,
    u.username,
    u.bio AS author_bio,
    u.avatar_color,
    u.created_at AS author_created_at,
    (SELECT COUNT(*) FROM setup_images i WHERE i.setup_id = s.id) AS image_count,
    (SELECT COUNT(*) FROM likes l WHERE l.setup_id = s.id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.setup_id = s.id) AS comment_count,
    (SELECT i.filename FROM setup_images i WHERE i.setup_id = s.id ORDER BY i.position ASC LIMIT 1) AS cover,
    EXISTS(SELECT 1 FROM likes lv WHERE lv.setup_id = s.id AND lv.user_id = ?) AS liked
  FROM setups s
  JOIN users u ON u.id = s.user_id
`

function mapSetupRow(row: SetupRow): SetupSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.username,
      bio: row.author_bio,
      avatarColor: row.avatar_color,
      createdAt: row.author_created_at,
    },
    cover: row.cover ? `/media/${encodeURIComponent(row.cover)}` : null,
    imageCount: Number(row.image_count),
    likeCount: Number(row.like_count),
    commentCount: Number(row.comment_count),
    liked: Boolean(row.liked),
  }
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function mapCommentRow(row: CommentRow, viewerId: string | null): Comment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.username,
      bio: row.author_bio,
      avatarColor: row.avatar_color,
      createdAt: row.author_created_at,
    },
    canDelete: Boolean(viewerId && (viewerId === row.comment_user_id || viewerId === row.owner_id)),
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */

apiRouter.post('/auth/register', authLimiter, async (req, res) => {
  const body = parseBody(
    z.object({
      username: usernameSchema,
      email: emailSchema,
      password: passwordSchema,
    }),
    req.body,
  )

  const email = body.email.toLowerCase()

  const usernameTaken = db
    .prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE')
    .get(body.username)
  if (usernameTaken) throw new HttpError(409, 'Ese usuario ya está en uso.')

  const emailTaken = db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(email)
  if (emailTaken) throw new HttpError(409, 'Ese email ya está registrado.')

  const id = newId('usr')
  const passwordHash = await bcrypt.hash(body.password, 11)
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash, bio, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, body.username, email, passwordHash, '', avatarColor, nowIso())

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow
  createSession(res, id)

  res.status(201).json({ user: mapUser(row) satisfies MeUser })
})

apiRouter.post('/auth/login', authLimiter, async (req, res) => {
  const body = parseBody(
    z.object({
      identifier: z.string().trim().min(1, 'Introduce tu email o usuario.'),
      password: z.string().min(1, 'Introduce tu contraseña.'),
    }),
    req.body,
  )

  const row = db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE')
    .get(body.identifier, body.identifier) as unknown as UserRow | undefined

  const valid = await bcrypt.compare(body.password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !valid) {
    throw new HttpError(401, 'Credenciales incorrectas.')
  }

  createSession(res, row.id)
  res.json({ user: mapUser(row) satisfies MeUser })
})

apiRouter.post('/auth/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

apiRouter.get('/auth/me', (req, res) => {
  res.json({ user: req.user ?? null })
})

apiRouter.patch('/me', requireAuth, (req, res) => {
  const body = parseBody(
    z.object({
      bio: z.string().trim().max(160, 'La bio no puede superar los 160 caracteres.').optional(),
      avatarColor: z.enum(AVATAR_COLORS).optional(),
    }),
    req.body,
  )

  const user = req.user!
  const bio = body.bio ?? user.bio
  const avatarColor = body.avatarColor ?? user.avatarColor

  db.prepare('UPDATE users SET bio = ?, avatar_color = ? WHERE id = ?').run(bio, avatarColor, user.id)

  res.json({
    user: { ...user, bio, avatarColor } satisfies MeUser,
  })
})

/* ------------------------------------------------------------------ */
/* Setups                                                             */
/* ------------------------------------------------------------------ */

apiRouter.get('/setups', (req, res) => {
  const viewerId = req.user?.id ?? ''
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
  const sort = req.query.sort === 'popular' ? 'popular' : 'recent'
  const page = Math.max(1, Math.min(10_000, Number(req.query.page) || 1))
  const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 12))
  const offset = (page - 1) * limit

  const where: string[] = []
  const whereParams: string[] = []

  if (q) {
    where.push('(s.title LIKE ? OR s.description LIKE ? OR u.username LIKE ?)')
    const like = `%${q}%`
    whereParams.push(like, like, like)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderSql =
    sort === 'popular'
      ? 'ORDER BY like_count DESC, comment_count DESC, s.created_at DESC'
      : 'ORDER BY s.created_at DESC'

  const rows = db
    .prepare(`${SETUP_SELECT} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(viewerId, ...whereParams, limit, offset) as unknown as SetupRow[]

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM setups s JOIN users u ON u.id = s.user_id ${whereSql}`)
    .get(...whereParams) as unknown as { total: number }

  const total = Number(totalRow.total)

  res.json({
    items: rows.map(mapSetupRow),
    total,
    page,
    limit,
    hasMore: offset + rows.length < total,
  })
})

apiRouter.get('/setups/:id', (req, res) => {
  const viewerId = req.user?.id ?? ''
  const setupId = routeParam(req.params.id)
  const row = db
    .prepare(`${SETUP_SELECT} WHERE s.id = ?`)
    .get(viewerId, setupId) as unknown as SetupRow | undefined

  if (!row) throw new HttpError(404, 'Ese setup no existe o fue eliminado.')

  const images = db
    .prepare('SELECT id, filename FROM setup_images WHERE setup_id = ? ORDER BY position ASC')
    .all(row.id) as unknown as ImageRow[]

  const commentRows = db
    .prepare(
      `SELECT
         c.id, c.body, c.created_at, c.user_id AS comment_user_id,
         u.id AS author_id, u.username, u.bio AS author_bio, u.avatar_color, u.created_at AS author_created_at,
         s.user_id AS owner_id
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN setups s ON s.id = c.setup_id
       WHERE c.setup_id = ?
       ORDER BY c.created_at ASC`,
    )
    .all(row.id) as unknown as CommentRow[]

  res.json({
    setup: {
      ...mapSetupRow(row),
      images: images.map((image) => ({
        id: image.id,
        url: `/media/${encodeURIComponent(image.filename)}`,
      })),
    },
    comments: commentRows.map((comment) => mapCommentRow(comment, req.user?.id ?? null)),
  })
})

apiRouter.post('/setups', requireAuth, setupLimiter, uploadImages, (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? []

  try {
    const body = parseBody(
      z.object({
        title: z
          .string()
          .trim()
          .min(3, 'El título debe tener al menos 3 caracteres.')
          .max(90, 'El título no puede superar los 90 caracteres.'),
        description: z
          .string()
          .trim()
          .max(2500, 'La descripción no puede superar los 2500 caracteres.')
          .optional()
          .default(''),
      }),
      req.body,
    )

    if (files.length === 0) throw new HttpError(400, 'Añade al menos una foto de tu setup.')
    if (files.length > MAX_IMAGES) throw new HttpError(400, `Puedes subir hasta ${MAX_IMAGES} fotos.`)
    if (totalUploadSize(files) > MAX_TOTAL_UPLOAD_BYTES) {
      throw new HttpError(413, 'Las fotos ocupan demasiado. Intenta con archivos más pequeños.')
    }

    for (const file of files) {
      if (!hasValidImageSignature(file.path, file.mimetype)) {
        throw new HttpError(400, 'Uno de los archivos no parece una imagen válida.')
      }
    }

    const user = req.user!
    const id = newId('stp')
    const createdAt = nowIso()

    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare(
        'INSERT INTO setups (id, user_id, title, description, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(id, user.id, body.title, body.description, createdAt)

      const insertImage = db.prepare(
        'INSERT INTO setup_images (id, setup_id, filename, position, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      files.forEach((file, index) => {
        insertImage.run(newId('img'), id, file.filename, index, createdAt)
      })

      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }

    res.status(201).json({ id })
  } catch (error) {
    removeUploadedFiles(files)
    throw error
  }
})

apiRouter.delete('/setups/:id', requireAuth, (req, res) => {
  const setupId = routeParam(req.params.id)
  const setup = db
    .prepare('SELECT id, user_id FROM setups WHERE id = ?')
    .get(setupId) as unknown as { id: string; user_id: string } | undefined

  if (!setup) throw new HttpError(404, 'Ese setup no existe.')
  if (setup.user_id !== req.user!.id) {
    throw new HttpError(403, 'Solo puedes eliminar tus propios setups.')
  }

  const images = db
    .prepare('SELECT filename FROM setup_images WHERE setup_id = ?')
    .all(setup.id) as unknown as { filename: string }[]

  db.prepare('DELETE FROM setups WHERE id = ?').run(setup.id)

  for (const image of images) {
    try {
      unlinkSync(path.join(UPLOADS_DIR, image.filename))
    } catch {
      // Archivo ya eliminado.
    }
  }

  res.json({ ok: true })
})

apiRouter.post('/setups/:id/like', requireAuth, likeLimiter, (req, res) => {
  const setupId = routeParam(req.params.id)
  const setup = db.prepare('SELECT id FROM setups WHERE id = ?').get(setupId)
  if (!setup) throw new HttpError(404, 'Ese setup no existe.')

  const userId = req.user!.id
  const existing = db
    .prepare('SELECT 1 FROM likes WHERE setup_id = ? AND user_id = ?')
    .get(setupId, userId)

  if (existing) {
    db.prepare('DELETE FROM likes WHERE setup_id = ? AND user_id = ?').run(setupId, userId)
  } else {
    db.prepare('INSERT INTO likes (setup_id, user_id, created_at) VALUES (?, ?, ?)').run(
      setupId,
      userId,
      nowIso(),
    )
  }

  const countRow = db
    .prepare('SELECT COUNT(*) AS count FROM likes WHERE setup_id = ?')
    .get(setupId) as unknown as { count: number }

  res.json({ liked: !existing, likeCount: Number(countRow.count) })
})

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

apiRouter.post('/setups/:id/comments', requireAuth, commentLimiter, (req, res) => {
  const body = parseBody(
    z.object({
      body: z
        .string()
        .trim()
        .min(1, 'Escribe algo antes de comentar.')
        .max(1200, 'El comentario no puede superar los 1200 caracteres.'),
    }),
    req.body,
  )

  const setupId = routeParam(req.params.id)
  const setup = db
    .prepare('SELECT id, user_id FROM setups WHERE id = ?')
    .get(setupId) as unknown as { id: string; user_id: string } | undefined
  if (!setup) throw new HttpError(404, 'Ese setup no existe.')

  const user = req.user!
  const id = newId('cmt')
  const createdAt = nowIso()

  db.prepare(
    'INSERT INTO comments (id, setup_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, setup.id, user.id, body.body, createdAt)

  const comment: Comment = {
    id,
    body: body.body,
    createdAt,
    author: {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    },
    canDelete: true,
  }

  res.status(201).json({ comment })
})

apiRouter.delete('/comments/:id', requireAuth, (req, res) => {
  const commentId = routeParam(req.params.id)
  const row = db
    .prepare(
      `SELECT c.id, c.user_id, s.user_id AS owner_id
       FROM comments c JOIN setups s ON s.id = c.setup_id
       WHERE c.id = ?`,
    )
    .get(commentId) as unknown as
    | { id: string; user_id: string; owner_id: string }
    | undefined

  if (!row) throw new HttpError(404, 'Ese comentario no existe.')
  if (row.user_id !== req.user!.id && row.owner_id !== req.user!.id) {
    throw new HttpError(403, 'No puedes eliminar este comentario.')
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(row.id)
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Profiles                                                           */
/* ------------------------------------------------------------------ */

apiRouter.get('/users/:username', (req, res) => {
  const viewerId = req.user?.id ?? ''
  const username = routeParam(req.params.username)
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .get(username) as unknown as UserRow | undefined

  if (!user) throw new HttpError(404, 'Ese usuario no existe.')

  const stats = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM setups WHERE user_id = ?) AS setups,
         (SELECT COUNT(*) FROM likes l JOIN setups s ON s.id = l.setup_id WHERE s.user_id = ?) AS likes,
         (SELECT COUNT(*) FROM comments WHERE user_id = ?) AS comments`,
    )
    .get(user.id, user.id, user.id) as unknown as {
    setups: number
    likes: number
    comments: number
  }

  const setups = db
    .prepare(`${SETUP_SELECT} WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 100`)
    .all(viewerId, user.id) as unknown as SetupRow[]

  const payload: ProfileResponse = {
    user: {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarColor: user.avatar_color,
      createdAt: user.created_at,
    },
    stats: {
      setups: Number(stats.setups),
      likes: Number(stats.likes),
      comments: Number(stats.comments),
    },
    setups: setups.map(mapSetupRow),
  }

  res.json(payload)
})
