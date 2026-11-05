import { sql } from './db.js'

const url = process.env.DATABASE_URL ?? ''
const isLocal = /^postgres(ql)?:\/\/(localhost|127\.0\.0\.1)/.test(url)

if (!isLocal && process.env.ALLOW_REMOTE_RESET !== '1') {
  console.error(
    'Por seguridad, db:reset solo vacía bases de datos locales.\n' +
      'Si de verdad quieres vaciar una base remota, ejecuta ALLOW_REMOTE_RESET=1 npm run db:reset.',
  )
  process.exit(1)
}

await sql.unsafe(`
  DROP TABLE IF EXISTS likes, comments, setup_images, setups, sessions, users CASCADE;
`)

await sql.end({ timeout: 5 })
console.log('Base de datos vaciada. Las tablas se recrearán al arrancar el servidor.')
