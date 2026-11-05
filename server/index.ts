import { createApp } from './app.js'
import { IS_PROD, PORT } from './config.js'
import { sql } from './db.js'

const app = createApp()

const server = app.listen(PORT, () => {
  console.log(`\n  my_setup  ·  api lista en http://localhost:${PORT}`)
  if (!IS_PROD) console.log('  web       ·  http://localhost:5173 (vite)\n')
})

const shutdown = () => {
  server.close(async () => {
    try {
      await sql.end({ timeout: 5 })
    } catch {
      // La conexión ya estaba cerrada.
    }
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
