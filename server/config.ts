import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data')

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
export const DB_PATH = path.join(DATA_DIR, 'mysetup.db')

export const PORT = Number(process.env.PORT || 4000)
export const IS_PROD = process.env.NODE_ENV === 'production'
export const SESSION_DAYS = 30
export const SESSION_COOKIE = 'ms_session'
export const COOKIE_SECURE = process.env.COOKIE_SECURE === '1'

export const MAX_IMAGES = 8
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const MAX_TOTAL_UPLOAD_BYTES = 60 * 1024 * 1024
