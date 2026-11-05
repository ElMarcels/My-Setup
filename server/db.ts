import { randomBytes } from 'node:crypto'
import postgres from 'postgres'
import './config.js'

const connectionString = process.env.DATABASE_URL?.trim()

if (!connectionString || connectionString === '[SENSITIVE]') {
  throw new Error(
    'Falta DATABASE_URL. Configura una base de datos PostgreSQL en DATABASE_URL (Neon en Vercel o una instancia local para desarrollo).',
  )
}

export const sql = postgres(connectionString, {
  max: process.env.VERCEL ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Neon y otros poolers en modo transaction no admiten prepared statements.
  prepare: false,
  onnotice: () => {},
})

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    bio           TEXT NOT NULL DEFAULT '',
    avatar_color  TEXT NOT NULL DEFAULT 'lime',
    created_at    TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setups (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setup_images (
    id         TEXT PRIMARY KEY,
    setup_id   TEXT NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    position   INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    setup_id   TEXT NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS likes (
    setup_id   TEXT NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (setup_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_setups_created ON setups(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_setups_user ON setups(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_images_setup ON setup_images(setup_id, position);
  CREATE INDEX IF NOT EXISTS idx_comments_setup ON comments(setup_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
  CREATE INDEX IF NOT EXISTS idx_likes_setup ON likes(setup_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`

let schemaPromise: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = sql
      .unsafe(SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = null
        throw error
      })
  }

  return schemaPromise
}

export const nowIso = () => new Date().toISOString()

export const newId = (prefix: string) =>
  `${prefix}_${randomBytes(8).toString('base64url')}`
