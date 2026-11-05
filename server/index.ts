import { existsSync } from 'node:fs'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler } from 'express'
import multer from 'multer'
import { apiRouter } from './api'
import { attachUser } from './auth'
import { IS_PROD, PORT, ROOT, UPLOADS_DIR } from './config'
import { db } from './db'
import { HttpError } from './http'

const app = express()
const distDir = path.join(ROOT, 'dist')

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
})

// En producción la web se sirve desde el mismo origen: bloqueamos peticiones mutables externas.
if (IS_PROD) {
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

    const origin = req.headers.origin
    if (!origin) return next()

    try {
      const originUrl = new URL(origin)
      if (originUrl.host !== req.headers.host) {
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
app.use(attachUser)

app.use(
  '/media',
  express.static(UPLOADS_DIR, {
    index: false,
    fallthrough: false,
    maxAge: '1y',
    immutable: true,
  }),
)

app.use('/api', apiRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' })
})

if (existsSync(distDir)) {
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

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Cada imagen debe pesar menos de 15 MB.' })
      return
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({ error: 'Puedes subir hasta 8 imágenes por setup.' })
      return
    }
    res.status(400).json({ error: 'No se pudo procesar la subida de imágenes.' })
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

const server = app.listen(PORT, () => {
  console.log(`\n  my_setup  ·  api lista en http://localhost:${PORT}`)
  if (!IS_PROD) console.log('  web       ·  http://localhost:5173 (vite)\n')
})

const shutdown = () => {
  server.close(() => {
    try {
      db.close()
    } catch {
      // La base de datos ya estaba cerrada.
    }
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
