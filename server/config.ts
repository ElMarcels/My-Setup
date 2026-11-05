import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Permite desarrollo local sin depender de variables exportadas en la shell.
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file)
    } catch {
      // Archivo ilegible o variables ya definidas: seguimos con el entorno actual.
    }
  }
}

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

export const PORT = Number(process.env.PORT || 4000)
export const IS_PROD = process.env.NODE_ENV === 'production'
export const IS_VERCEL = Boolean(process.env.VERCEL)
export const SESSION_DAYS = 30
export const SESSION_COOKIE = 'ms_session'
export const COOKIE_SECURE = process.env.COOKIE_SECURE === '1' || IS_VERCEL

export const MAX_IMAGES = 8
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const MAX_TOTAL_UPLOAD_BYTES = 60 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]
