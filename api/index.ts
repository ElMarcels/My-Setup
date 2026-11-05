import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app.js'

const app = createApp()

/**
 * Vercel no soporta rutas catch-all en `/api` fuera de Next.js, así que
 * `vercel.json` reescribe cualquier `/api/...` a esta función añadiendo la
 * ruta original en `?path=`. Aquí la restauramos antes de pasar la petición
 * a Express.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.searchParams.get('path')

  if (path !== null) {
    url.searchParams.delete('path')
    const search = url.searchParams.toString()
    const suffix = path.replace(/^\/+/, '')
    req.url = `/api/${suffix}${search ? `?${search}` : ''}`
  }

  app(req as never, res as never)
}
