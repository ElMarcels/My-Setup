import { closeSync, openSync, readSync, unlinkSync } from 'node:fs'
import { extname } from 'node:path'
import multer from 'multer'
import type { Express } from 'express'
import { MAX_IMAGES, MAX_IMAGE_BYTES, MAX_TOTAL_UPLOAD_BYTES, UPLOADS_DIR } from './config'
import { newId } from './db'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(MIME_EXTENSIONS)

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
  filename: (_req, file, callback) => {
    const extension = MIME_EXTENSIONS[file.mimetype] ?? (extname(file.originalname).toLowerCase() || '.img')
    callback(null, `${newId('img')}${extension}`)
  },
})

export const uploadImages = multer({
  storage,
  limits: {
    files: MAX_IMAGES,
    fileSize: MAX_IMAGE_BYTES,
    fields: 12,
  },
  fileFilter: (_req, file, callback) => {
    if (!MIME_EXTENSIONS[file.mimetype]) {
      callback(new Error('Formato no permitido. Usa JPG, PNG, WebP, GIF o AVIF.'))
      return
    }
    callback(null, true)
  },
}).array('images', MAX_IMAGES)

export function hasValidImageSignature(filePath: string, mimetype: string): boolean {
  const buffer = Buffer.alloc(16)
  let bytesRead = 0
  let fd: number | undefined

  try {
    fd = openSync(filePath, 'r')
    bytesRead = readSync(fd, buffer, 0, buffer.length, 0)
  } catch {
    return false
  } finally {
    if (fd !== undefined) closeSync(fd)
  }

  if (bytesRead < 12) return false

  switch (mimetype) {
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/gif':
      return buffer.toString('ascii', 0, 3) === 'GIF'
    case 'image/webp':
      return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
    case 'image/avif':
      return buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12))
    default:
      return false
  }
}

export function removeUploadedFiles(files: Express.Multer.File[] | undefined) {
  for (const file of files ?? []) {
    try {
      unlinkSync(file.path)
    } catch {
      // El archivo ya no existe: nada que limpiar.
    }
  }
}

export function totalUploadSize(files: Express.Multer.File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0)
}

export { MAX_TOTAL_UPLOAD_BYTES }
