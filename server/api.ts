import { del } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
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
} from '../shared/types.js'
import { createSession, destroySession, mapUser, requireAuth, type UserRow } from './auth.js'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_AVATAR_BYTES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
} from './config.js'
import { newId, nowIso, sql } from './db.js'
import { HttpError, parseBody, rateLimit } from './http.js'

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

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com'

interface SetupRow {
  id: string
  title: string
  description: string
  created_at: string
  author_id: string
  username: string
  author_bio: string
  avatar_color: AvatarColor
  avatar_url: string | null
  author_created_at: string
  image_count: number
  like_count: number
  comment_count: number
  cover: string | null
  liked: boolean
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
  avatar_url: string | null
  author_created_at: string
  owner_id: string
}

interface ImageRow {
  id: string
  url: string
}

function setupSelect(viewerId: string) {
  return sql`
    SELECT
      s.id,
      s.title,
      s.description,
      s.created_at,
      u.id AS author_id,
      u.username,
      u.bio AS author_bio,
      u.avatar_color,
      u.avatar_url,
      u.created_at AS author_created_at,
      (SELECT COUNT(*)::int FROM setup_images i WHERE i.setup_id = s.id) AS image_count,
      (SELECT COUNT(*)::int FROM likes l WHERE l.setup_id = s.id) AS like_count,
      (SELECT COUNT(*)::int FROM comments c WHERE c.setup_id = s.id) AS comment_count,
      (SELECT i.url FROM setup_images i WHERE i.setup_id = s.id ORDER BY i.position ASC LIMIT 1) AS cover,
      EXISTS(SELECT 1 FROM likes lv WHERE lv.setup_id = s.id AND lv.user_id = ${viewerId}) AS liked
    FROM setups s
    JOIN users u ON u.id = s.user_id
  `
}

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
      avatarUrl: row.avatar_url,
      createdAt: row.author_created_at,
    },
    cover: row.cover,
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
      avatarUrl: row.avatar_url,
      createdAt: row.author_created_at,
    },
    canDelete: Boolean(viewerId && (viewerId === row.comment_user_id || viewerId === row.owner_id)),
  }
}

function validateImageUrl(value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new HttpError(400, 'Una de las imágenes no tiene una URL válida.')
  }

  if (url.protocol !== 'https:' || !url.hostname.endsWith(BLOB_HOST_SUFFIX)) {
    throw new HttpError(400, 'Una de las imágenes no pertenece al almacenamiento de la plataforma.')
  }

  if (!url.pathname.startsWith('/setups/')) {
    throw new HttpError(400, 'Una de las imágenes tiene una ruta no permitida.')
  }

  return url.toString()
}

function validateAvatarUrl(value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new HttpError(400, 'La foto de perfil no tiene una URL válida.')
  }

  if (url.protocol !== 'https:' || !url.hostname.endsWith(BLOB_HOST_SUFFIX)) {
    throw new HttpError(400, 'La foto de perfil no pertenece al almacenamiento de la plataforma.')
  }

  if (!url.pathname.startsWith('/avatars/')) {
    throw new HttpError(400, 'La foto de perfil tiene una ruta no permitida.')
  }

  return url.toString()
}

async function deleteBlobs(urls: string[]) {
  if (urls.length === 0) return

  try {
    await del(urls)
  } catch (error) {
    console.error('[my-setup] no se pudieron eliminar las imágenes:', error)
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

  const [usernameTaken] = await sql`
    SELECT 1 FROM users WHERE LOWER(username) = LOWER(${body.username}) LIMIT 1
  `
  if (usernameTaken) throw new HttpError(409, 'Ese usuario ya está en uso.')

  const [emailTaken] = await sql`
    SELECT 1 FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `
  if (emailTaken) throw new HttpError(409, 'Ese email ya está registrado.')

  const id = newId('usr')
  const passwordHash = await bcrypt.hash(body.password, 11)
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  try {
    await sql`
      INSERT INTO users (id, username, email, password_hash, bio, avatar_color, created_at)
      VALUES (${id}, ${body.username}, ${email}, ${passwordHash}, '', ${avatarColor}, ${nowIso()})
    `
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new HttpError(409, 'Ese usuario o email ya está registrado.')
    }
    throw error
  }

  const [row] = await sql<UserRow[]>`SELECT * FROM users WHERE id = ${id}`
  await createSession(res, id)

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

  const [row] = await sql<UserRow[]>`
    SELECT * FROM users
    WHERE LOWER(email) = LOWER(${body.identifier}) OR LOWER(username) = LOWER(${body.identifier})
    LIMIT 1
  `

  const valid = await bcrypt.compare(body.password, row?.password_hash ?? DUMMY_HASH)
  if (!row || !valid) {
    throw new HttpError(401, 'Credenciales incorrectas.')
  }

  await createSession(res, row.id)
  res.json({ user: mapUser(row) satisfies MeUser })
})

apiRouter.post('/auth/logout', async (req, res) => {
  await destroySession(req, res)
  res.json({ ok: true })
})

apiRouter.get('/auth/me', (req, res) => {
  res.json({ user: req.user ?? null })
})

apiRouter.patch('/me', requireAuth, async (req, res) => {
  const body = parseBody(
    z.object({
      bio: z.string().trim().max(160, 'La bio no puede superar los 160 caracteres.').optional(),
      avatarColor: z.enum(AVATAR_COLORS).optional(),
      avatarUrl: z.string().max(2048).nullable().optional(),
    }),
    req.body,
  )

  const user = req.user!
  const bio = body.bio ?? user.bio
  const avatarColor = body.avatarColor ?? user.avatarColor
  const avatarUrl =
    body.avatarUrl === undefined
      ? user.avatarUrl
      : body.avatarUrl === null
        ? null
        : validateAvatarUrl(body.avatarUrl)

  await sql`
    UPDATE users
    SET bio = ${bio}, avatar_color = ${avatarColor}, avatar_url = ${avatarUrl}
    WHERE id = ${user.id}
  `

  if (user.avatarUrl && user.avatarUrl !== avatarUrl) {
    await deleteBlobs([user.avatarUrl])
  }

  res.json({
    user: { ...user, bio, avatarColor, avatarUrl } satisfies MeUser,
  })
})

/* ------------------------------------------------------------------ */
/* Subidas a Vercel Blob                                              */
/* ------------------------------------------------------------------ */

apiRouter.post('/blob/upload', requireAuth, async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new HttpError(503, 'El almacenamiento de imágenes no está configurado.')
  }

  const body = req.body as HandleUploadBody

  if (!body || typeof body !== 'object' || !('type' in body)) {
    throw new HttpError(400, 'Solicitud de subida no válida.')
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const isAvatar = pathname.startsWith('avatars/')

        if (!isAvatar && !pathname.startsWith('setups/')) {
          throw new HttpError(400, 'Ruta de subida no válida.')
        }

        return {
          allowedContentTypes: ACCEPTED_IMAGE_TYPES,
          maximumSizeInBytes: isAvatar ? MAX_AVATAR_BYTES : MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        }
      },
    })

    res.json(result)
  } catch (error) {
    if (error instanceof HttpError) throw error
    console.error('[my-setup] error al generar el token de subida:', error)
    throw new HttpError(400, 'No se pudo iniciar la subida de la imagen.')
  }
})

/* ------------------------------------------------------------------ */
/* Setups                                                             */
/* ------------------------------------------------------------------ */

apiRouter.get('/setups', async (req, res) => {
  const viewerId = req.user?.id ?? ''
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
  const sort = req.query.sort === 'popular' ? 'popular' : 'recent'
  const page = Math.max(1, Math.min(10_000, Number(req.query.page) || 1))
  const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 12))
  const offset = (page - 1) * limit

  const filters = []

  if (q) {
    const like = `%${q}%`
    filters.push(
      sql`(s.title ILIKE ${like} OR s.description ILIKE ${like} OR u.username ILIKE ${like})`,
    )
  }

  const where = filters.length ? sql`WHERE ${sql` AND `.join(filters)}` : sql``
  const order =
    sort === 'popular'
      ? sql`ORDER BY like_count DESC, comment_count DESC, s.created_at DESC`
      : sql`ORDER BY s.created_at DESC`

  const rows = await sql<SetupRow[]>`
    ${setupSelect(viewerId)}
    ${where}
    ${order}
    LIMIT ${limit} OFFSET ${offset}
  `

  const [totalRow] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM setups s
    JOIN users u ON u.id = s.user_id
    ${where}
  `

  const total = Number(totalRow?.total ?? 0)

  res.json({
    items: rows.map(mapSetupRow),
    total,
    page,
    limit,
    hasMore: offset + rows.length < total,
  })
})

apiRouter.get('/setups/:id', async (req, res) => {
  const viewerId = req.user?.id ?? ''
  const setupId = routeParam(req.params.id)

  const [row] = await sql<SetupRow[]>`
    ${setupSelect(viewerId)}
    WHERE s.id = ${setupId}
  `

  if (!row) throw new HttpError(404, 'Ese setup no existe o fue eliminado.')

  const images = await sql<ImageRow[]>`
    SELECT id, url FROM setup_images WHERE setup_id = ${row.id} ORDER BY position ASC
  `

  const commentRows = await sql<CommentRow[]>`
    SELECT
      c.id, c.body, c.created_at, c.user_id AS comment_user_id,
      u.id AS author_id, u.username, u.bio AS author_bio, u.avatar_color, u.avatar_url,
      u.created_at AS author_created_at,
      s.user_id AS owner_id
    FROM comments c
    JOIN users u ON u.id = c.user_id
    JOIN setups s ON s.id = c.setup_id
    WHERE c.setup_id = ${row.id}
    ORDER BY c.created_at ASC
  `

  res.json({
    setup: {
      ...mapSetupRow(row),
      images: images.map((image) => ({ id: image.id, url: image.url })),
    },
    comments: commentRows.map((comment) => mapCommentRow(comment, req.user?.id ?? null)),
  })
})

apiRouter.post('/setups', requireAuth, setupLimiter, async (req, res) => {
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
      images: z
        .array(z.object({ url: z.string().min(1) }))
        .min(1, 'Añade al menos una foto de tu setup.')
        .max(MAX_IMAGES, `Puedes subir hasta ${MAX_IMAGES} fotos.`),
    }),
    req.body,
  )

  const imageUrls = body.images.map((image) => validateImageUrl(image.url))
  const user = req.user!
  const id = newId('stp')
  const createdAt = nowIso()

  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO setups (id, user_id, title, description, created_at)
        VALUES (${id}, ${user.id}, ${body.title}, ${body.description}, ${createdAt})
      `

      for (const [index, url] of imageUrls.entries()) {
        await tx`
          INSERT INTO setup_images (id, setup_id, url, position, created_at)
          VALUES (${newId('img')}, ${id}, ${url}, ${index}, ${createdAt})
        `
      }
    })
  } catch (error) {
    await deleteBlobs(imageUrls)
    throw error
  }

  res.status(201).json({ id })
})

apiRouter.delete('/setups/:id', requireAuth, async (req, res) => {
  const setupId = routeParam(req.params.id)
  const [setup] = await sql<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM setups WHERE id = ${setupId}
  `

  if (!setup) throw new HttpError(404, 'Ese setup no existe.')
  if (setup.user_id !== req.user!.id) {
    throw new HttpError(403, 'Solo puedes eliminar tus propios setups.')
  }

  const images = await sql<{ url: string }[]>`
    SELECT url FROM setup_images WHERE setup_id = ${setup.id}
  `

  await sql`DELETE FROM setups WHERE id = ${setup.id}`
  await deleteBlobs(images.map((image) => image.url))

  res.json({ ok: true })
})

apiRouter.post('/setups/:id/like', requireAuth, likeLimiter, async (req, res) => {
  const setupId = routeParam(req.params.id)
  const [setup] = await sql`SELECT id FROM setups WHERE id = ${setupId}`
  if (!setup) throw new HttpError(404, 'Ese setup no existe.')

  const userId = req.user!.id
  const existing = await sql`
    SELECT 1 FROM likes WHERE setup_id = ${setupId} AND user_id = ${userId} LIMIT 1
  `

  if (existing.length > 0) {
    await sql`DELETE FROM likes WHERE setup_id = ${setupId} AND user_id = ${userId}`
  } else {
    await sql`
      INSERT INTO likes (setup_id, user_id, created_at)
      VALUES (${setupId}, ${userId}, ${nowIso()})
      ON CONFLICT DO NOTHING
    `
  }

  const [countRow] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM likes WHERE setup_id = ${setupId}
  `

  res.json({ liked: existing.length === 0, likeCount: Number(countRow?.count ?? 0) })
})

/* ------------------------------------------------------------------ */
/* Comments                                                           */
/* ------------------------------------------------------------------ */

apiRouter.post('/setups/:id/comments', requireAuth, commentLimiter, async (req, res) => {
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
  const [setup] = await sql<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM setups WHERE id = ${setupId}
  `
  if (!setup) throw new HttpError(404, 'Ese setup no existe.')

  const user = req.user!
  const id = newId('cmt')
  const createdAt = nowIso()

  await sql`
    INSERT INTO comments (id, setup_id, user_id, body, created_at)
    VALUES (${id}, ${setup.id}, ${user.id}, ${body.body}, ${createdAt})
  `

  const comment: Comment = {
    id,
    body: body.body,
    createdAt,
    author: {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    canDelete: true,
  }

  res.status(201).json({ comment })
})

apiRouter.delete('/comments/:id', requireAuth, async (req, res) => {
  const commentId = routeParam(req.params.id)
  const [row] = await sql<{ id: string; user_id: string; owner_id: string }[]>`
    SELECT c.id, c.user_id, s.user_id AS owner_id
    FROM comments c
    JOIN setups s ON s.id = c.setup_id
    WHERE c.id = ${commentId}
  `

  if (!row) throw new HttpError(404, 'Ese comentario no existe.')
  if (row.user_id !== req.user!.id && row.owner_id !== req.user!.id) {
    throw new HttpError(403, 'No puedes eliminar este comentario.')
  }

  await sql`DELETE FROM comments WHERE id = ${row.id}`
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ */
/* Profiles                                                           */
/* ------------------------------------------------------------------ */

apiRouter.get('/users/:username', async (req, res) => {
  const viewerId = req.user?.id ?? ''
  const username = routeParam(req.params.username)

  const [user] = await sql<UserRow[]>`
    SELECT * FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1
  `

  if (!user) throw new HttpError(404, 'Ese usuario no existe.')

  const [stats] = await sql<{ setups: number; likes: number; comments: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM setups WHERE user_id = ${user.id}) AS setups,
      (SELECT COUNT(*)::int FROM likes l JOIN setups s ON s.id = l.setup_id WHERE s.user_id = ${user.id}) AS likes,
      (SELECT COUNT(*)::int FROM comments WHERE user_id = ${user.id}) AS comments
  `

  const setups = await sql<SetupRow[]>`
    ${setupSelect(viewerId)}
    WHERE s.user_id = ${user.id}
    ORDER BY s.created_at DESC
    LIMIT 100
  `

  const payload: ProfileResponse = {
    user: {
      id: user.id,
      username: user.username,
      bio: user.bio,
      avatarColor: user.avatar_color,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    },
    stats: {
      setups: Number(stats?.setups ?? 0),
      likes: Number(stats?.likes ?? 0),
      comments: Number(stats?.comments ?? 0),
    },
    setups: setups.map(mapSetupRow),
  }

  res.json(payload)
})
