import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function parseBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new HttpError(400, issue?.message || 'Datos inválidos.')
  }
  return result.data
}

interface RateLimitOptions {
  windowMs: number
  max: number
  scope: string
}

const buckets = new Map<string, number[]>()

export function rateLimit({ windowMs, max, scope }: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const key = `${scope}:${req.ip ?? 'unknown'}`
    const now = Date.now()
    const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs)

    if (recent.length >= max) {
      res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' })
      return
    }

    recent.push(now)
    buckets.set(key, recent)

    if (buckets.size > 5000) {
      for (const [bucketKey, times] of buckets) {
        if (!times.some((time) => now - time < windowMs)) buckets.delete(bucketKey)
      }
    }

    next()
  }
}
