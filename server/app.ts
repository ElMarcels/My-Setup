import { existsSync } from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler, type Request } from 'express'
import { apiRouter } from './api.js'
import { attachUser } from './auth.js'
import { IS_PROD, IS_VERCEL, ROOT } from './config.js'
import { ensureSchema } from './db.js'
import { HttpError } from './http.js'

function requestHost(req: Request): string {
  const forwarded = req.headers['x-forwarded-host']
  const raw = Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? req.headers.host ?? '')
  return String(raw).split(',')[0].trim()
}

export function createApp() {
  const app = express()
  const distDir = path.join(ROOT, 'dist')

  app.disable('x-powered-by')
  if (IS_VERCEL || process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })

  // La web y la API comparten origen: bloqueamos peticiones mutables externas.
  if (IS_PROD || IS_VERCEL) {
    app.use((req, res, next) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

      const origin = req.headers.origin
      if (!origin) return next()

      try {
        const originUrl = new URL(origin)
        if (originUrl.host !== requestHost(req)) {
          res.status(403).json({ error: 'Origen no permitido.' })
          return
        }
      } catch {
        res.status(403).json({ error: 'Origen no válido.' })
        return
      }

      next()
    })
  }

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use(async (_req, _res, next) => {
    try {
      await ensureSchema()
      next()
    } catch (error) {
      next(error)
    }
  })

  app.use(attachUser)

  app.use('/api', apiRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' })
  })

  if (!IS_VERCEL && existsSync(distDir)) {
    app.use(express.static(distDir, { index: false }))
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next()
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error)
      return
    }

    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }

    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'El cuerpo de la petición no es válido.' })
      return
    }

    const status = typeof error?.status === 'number' ? error.status : 500
    if (status >= 500) {
      console.error('[my-setup] error inesperado:', error)
      res.status(500).json({ error: 'Algo falló en el servidor. Inténtalo de nuevo.' })
      return
    }

    res.status(status).json({ error: error?.message || 'Solicitud no válida.' })
  }

  app.use(errorHandler)

  return app
}
